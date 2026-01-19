// Vercel Serverless Function - Express API
// Este archivo es el punto de entrada para todas las rutas /api/*

const express = require('express');
const QRCode = require('qrcode');
const bodyParser = require('body-parser');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno desde .env en desarrollo/local
if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
  require('dotenv').config();
}

// Usar Supabase si está configurado, sino usar SQLite
const isTestEnv = process.env.NODE_ENV === 'test';
const wantsSupabase = !isTestEnv && (process.env.USE_SUPABASE === 'true' || !!process.env.SUPABASE_URL);
const hasSupabaseConfig = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const useSupabase = wantsSupabase && hasSupabaseConfig;

if (wantsSupabase && !hasSupabaseConfig) {
  console.warn('⚠️  Supabase solicitado pero faltan variables de entorno.');
  console.warn('   Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY. Usando SQLite como fallback.');
}
let modelosDB, contactosDB, usuariosDB, modeloFotosDB, auditLogsDB, initDatabase;

if (useSupabase) {
  console.log('📦 Usando Supabase como base de datos');
  const db = require('../database-supabase');
  modelosDB = db.modelosDB;
  contactosDB = db.contactosDB;
  usuariosDB = db.usuariosDB;
  modeloFotosDB = db.modeloFotosDB;
  auditLogsDB = db.auditLogsDB;
  initDatabase = db.initDatabase;
} else {
  console.log('📦 Usando SQLite como base de datos');
  const db = require('../database');
  modelosDB = db.modelosDB;
  contactosDB = db.contactosDB;
  usuariosDB = db.usuariosDB;
  modeloFotosDB = db.modeloFotosDB;
  auditLogsDB = db.auditLogsDB;
  initDatabase = db.initDatabase;
}

const { validateContacto, validateModelo, validateLogin } = require('../middleware/validation');

const app = express();
app.disable('x-powered-by');

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'modelos';
const MAX_SIGNED_UPLOADS = 10;
const AUTH_COOKIE_NAME = 'adminToken';
const CSRF_COOKIE_NAME = 'csrfToken';

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase no configurado (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  }
  return createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
}

function getImageExtension(filename, mimeType) {
  const ext = (path.extname(filename || '') || '').toLowerCase();
  const allowed = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
  if (allowed.has(ext)) return ext;

  const type = String(mimeType || '').toLowerCase();
  if (type === 'image/jpeg') return '.jpg';
  if (type === 'image/png') return '.png';
  if (type === 'image/webp') return '.webp';
  if (type === 'image/gif') return '.gif';
  return '.jpg';
}

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Importante para cookies "secure" detrás del proxy de Vercel
app.set('trust proxy', 1);

// Headers de seguridad (sin CSP para no romper assets)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  })
);

// Configurar sesiones para Vercel
// IMPORTANTE: En producción, usar variable de entorno SESSION_SECRET
const DEFAULT_SESSION_SECRET = 'agencia-modelos-secret-key-change-in-production';
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === 'production' ? null : DEFAULT_SESSION_SECRET);

if (!SESSION_SECRET) {
  throw new Error('SESSION_SECRET es obligatoria en producción.');
}

// En Vercel, usar MemoryStore para sesiones (compatible con serverless)
let sessionConfig = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  proxy: true,
  cookie: { 
    secure: true, // HTTPS en Vercel
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    // Misma app/origen (Vercel + dominio custom) → Lax protege mejor contra CSRF
    sameSite: 'lax'
  }
};

// Solo usar MemoryStore si está disponible (para Vercel)
try {
  const MemoryStore = require('memorystore')(session);
  sessionConfig.store = new MemoryStore({
    checkPeriod: 86400000 // 24 horas
  });
} catch (e) {
  // Si memorystore no está disponible, usar default store
  console.log('Usando default session store');
}

app.use(session(sessionConfig));

function getUserFromAuthCookie(req) {
  try {
    const token = req.cookies?.[AUTH_COOKIE_NAME];
    if (!token) return null;
    const payload = jwt.verify(token, SESSION_SECRET);
    if (!payload || !payload.userId) return null;
    return {
      id: payload.userId,
      username: payload.username,
      nombre: payload.nombre
    };
  } catch (_) {
    return null;
  }
}

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  const raw = Array.isArray(xff) ? xff[0] : xff;
  if (raw && typeof raw === 'string') {
    return raw.split(',')[0].trim();
  }
  return req.ip || null;
}

function auditLogSafe(req, entry) {
  try {
    if (!auditLogsDB || typeof auditLogsDB.create !== 'function') return;

    const actor =
      req?.authUser ||
      (req.session && req.session.userId
        ? { id: req.session.userId, username: req.session.username, nombre: req.session.nombre }
        : null);

    const payload = {
      event_type: entry?.event_type || 'unknown',
      severity: entry?.severity || 'info',
      actor_user_id: actor?.id ?? null,
      actor_username: actor?.username ?? null,
      ip: getClientIp(req),
      user_agent: req.get('user-agent') || null,
      path: req.path || null,
      method: req.method || null,
      meta: entry?.meta || null
    };

    Promise.resolve(auditLogsDB.create(payload)).catch(() => {});
  } catch (_) {
    // nunca romper el flujo principal por auditoría
  }
}

function ensureCsrfTokenCookie(req, res) {
  const existing = req.cookies?.[CSRF_COOKIE_NAME];
  if (existing && typeof existing === 'string' && existing.length >= 16) return existing;

  const token = crypto.randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // debe ser accesible desde el frontend para enviarlo en header
    secure: true, // HTTPS en Vercel
    sameSite: 'lax',
    maxAge: 2 * 60 * 60 * 1000, // 2 horas
    path: '/'
  });
  return token;
}

function requireCsrf(req, res, next) {
  const method = String(req.method || '').toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return next();

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken =
    req.get('x-csrf-token') ||
    req.get('x-xsrf-token') ||
    req.get('csrf-token') ||
    req.get('xsrf-token');

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      message: 'CSRF token inválido o faltante'
    });
  }

  return next();
}

function parseAllowedOrigins(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((o) => o.replace(/\/+$/, ''));
}

function getDefaultAllowedOrigins() {
  const out = new Set();

  // Producción Vercel (si está disponible)
  if (process.env.VERCEL_URL) out.add(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_BRANCH_URL) out.add(`https://${process.env.VERCEL_BRANCH_URL}`);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) out.add(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);

  // Fallback del proyecto (por si no vienen vars de Vercel)
  out.add('https://agencia-modelos.vercel.app');

  // Permitir local para dev manual (no afecta producción si no se usa)
  out.add('http://localhost:3000');
  out.add('http://127.0.0.1:3000');

  return [...out];
}

const ALLOWED_ORIGINS = new Set([
  ...getDefaultAllowedOrigins(),
  ...parseAllowedOrigins(process.env.ALLOWED_ORIGINS)
]);

// CORS estricto (evita exponer endpoints con credentials a terceros)
app.use((req, res, next) => {
  const origin = req.headers.origin ? String(req.headers.origin) : '';

  // Requests sin Origin (curl, navegación, etc.)
  if (!origin) {
    return next();
  }

  const originNorm = origin.replace(/\/+$/, '');
  const xfProto = String(req.headers['x-forwarded-proto'] || 'https');
  const xfHost = String(req.headers['x-forwarded-host'] || req.headers.host || '');
  const selfOrigin = xfHost ? `${xfProto}://${xfHost}`.replace(/\/+$/, '') : '';

  // Permitimos siempre el mismo origin del request (incluye dominios custom de Vercel)
  const allowed = (selfOrigin && originNorm === selfOrigin) || ALLOWED_ORIGINS.has(originNorm);

  if (allowed) {
    res.setHeader('Access-Control-Allow-Origin', originNorm);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    return next();
  }

  if (req.method === 'OPTIONS') {
    return res.status(403).end();
  }

  return res.status(403).json({ success: false, message: 'Origen no permitido' });
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({ success: false, message: 'Demasiados intentos. Intenta más tarde.' })
});

const contactoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({ success: false, message: 'Demasiadas solicitudes. Intenta más tarde.' })
});

const adminLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({ success: false, message: 'Rate limit excedido. Intenta más tarde.' })
});

app.use('/api/admin', adminLimiter);

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
  const cookieUser = getUserFromAuthCookie(req);
  if (cookieUser) {
    req.authUser = cookieUser;
    return next();
  }

  if (req.session && req.session.userId) {
    return next();
  }

  if (req.path.startsWith('/api/')) {
    return res.status(401).json({
      success: false,
      message: 'No autorizado. Por favor, inicia sesión.'
    });
  }
  res.redirect('/login');
}

// CSRF token (admin)
app.get('/api/admin/csrf', requireAuth, (req, res) => {
  const token = ensureCsrfTokenCookie(req, res);
  res.json({ success: true, token });
});

// API - Login
app.post('/api/login', loginLimiter, validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;

    auditLogSafe(req, { event_type: 'login_attempt', severity: 'info', meta: { username } });
    
    const user = await usuariosDB.getByUsername(username);
    
    if (!user) {
      auditLogSafe(req, { event_type: 'login_failure', severity: 'warn', meta: { username } });
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario o contraseña incorrectos' 
      });
    }
    
    if (!user.password) {
      return res.status(401).json({ 
        success: false, 
        message: 'Error de autenticación' 
      });
    }
    
    const isValidPassword = await usuariosDB.verifyPassword(password, user.password);
    
    if (!isValidPassword) {
      auditLogSafe(req, { event_type: 'login_failure', severity: 'warn', meta: { username } });
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario o contraseña incorrectos' 
      });
    }
    
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.nombre = user.nombre;

    // Cookie firmada (stateless) para que funcione en serverless sin store compartido
    const token = jwt.sign(
      { userId: user.id, username: user.username, nombre: user.nombre },
      SESSION_SECRET,
      { expiresIn: '24h' }
    );

    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000,
      path: '/'
    });

    req.session.save(() => {
      auditLogSafe(req, { event_type: 'login_success', severity: 'info', meta: { userId: user.id, username: user.username } });
      res.json({ 
        success: true, 
        message: 'Login exitoso',
        user: { id: user.id, username: user.username, nombre: user.nombre }
      });
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error en el login'
    });
  }
});

// API - Verificar sesión
app.get('/api/session', (req, res) => {
  const cookieUser = getUserFromAuthCookie(req);
  if (cookieUser) {
    return res.json({
      authenticated: true,
      user: cookieUser
    });
  }

  if (req.session && req.session.userId) {
    res.json({ 
      authenticated: true, 
      user: {
        id: req.session.userId,
        username: req.session.username,
        nombre: req.session.nombre
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});

// API - Logout
app.get('/api/logout', (req, res) => {
  auditLogSafe(req, { event_type: 'logout', severity: 'info' });
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' });
  if (req.session) {
    req.session.destroy(() => {
      res.redirect('/login');
    });
  } else {
    res.redirect('/login');
  }
});

// API - Modelos (público)
app.get('/api/modelos', async (req, res) => {
  try {
    const modelos = await modelosDB.getAll();
    
    for (let modelo of modelos) {
      const fotos = (await modeloFotosDB.getByModeloId(modelo.id)) || [];
      modelo.fotos = fotos;
      if (!modelo.foto && fotos.length > 0) {
        modelo.foto = fotos[0].url;
      }
    }
    
    res.json({ success: true, modelos: modelos || [] });
  } catch (error) {
    console.error('Error obteniendo modelos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo modelos. Por favor, intenta más tarde.' 
    });
  }
});

// API - Obtener modelo por ID (público)
app.get('/api/modelos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const modeloId = parseInt(id);
    
    if (isNaN(modeloId) || modeloId <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de modelo inválido' 
      });
    }
    
    const modelo = await modelosDB.getById(modeloId);
    
    if (!modelo) {
      return res.status(404).json({ 
        success: false, 
        message: 'Modelo no encontrada' 
      });
    }
    
    // Solo devolver modelos activas para usuarios públicos
    if (modelo.activa !== true && modelo.activa !== 1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Modelo no encontrada' 
      });
    }
    
    const fotos = await modeloFotosDB.getByModeloId(modeloId);
    modelo.fotos = fotos || [];
    
    res.json({ success: true, modelo });
  } catch (error) {
    console.error('Error obteniendo modelo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo modelo. Por favor, intenta más tarde.' 
    });
  }
});

// API - Modelos (admin - todos)
app.get('/api/admin/modelos', requireAuth, async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const ciudad = typeof req.query.ciudad === 'string' ? req.query.ciudad : '';

    let activa;
    if (req.query.activa === 'true') activa = true;
    if (req.query.activa === 'false') activa = false;

    const page = Number.isFinite(Number(req.query.page)) ? parseInt(req.query.page, 10) : 1;
    const pageSize = Number.isFinite(Number(req.query.pageSize)) ? parseInt(req.query.pageSize, 10) : 20;
    const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'creado_en';
    const sortDir = typeof req.query.sortDir === 'string' ? req.query.sortDir : 'desc';

    const result = await modelosDB.getAllAdmin({ q, ciudad, activa, page, pageSize, sortBy, sortDir });
    const modelos = Array.isArray(result) ? result : (result?.rows || []);
    const total = Array.isArray(result) ? modelos.length : (result?.total ?? modelos.length);
    
    for (let modelo of modelos) {
      const fotos = await modeloFotosDB.getByModeloId(modelo.id);
      modelo.fotos = fotos || [];
    }
    
    const safePage = Math.max(1, page || 1);
    const safePageSize = Math.min(100, Math.max(1, pageSize || 20));
    res.json({
      success: true,
      modelos,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / safePageSize))
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo modelos: ' + error.message 
    });
  }
});

// API - Supabase Storage: crear signed upload URLs (admin)
app.post('/api/admin/storage/modelo-fotos/signed-urls', requireAuth, requireCsrf, async (req, res) => {
  try {
    if (!useSupabase) {
      return res.status(400).json({ success: false, message: 'Supabase no está habilitado en este entorno' });
    }

    const { files } = req.body || {};
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, message: 'files debe ser un array con al menos un elemento' });
    }
    if (files.length > MAX_SIGNED_UPLOADS) {
      return res.status(400).json({ success: false, message: `Máximo ${MAX_SIGNED_UPLOADS} archivos por request` });
    }

    const supabase = createSupabaseAdminClient();

    const now = new Date();
    const yyyy = String(now.getUTCFullYear());
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');

    const items = [];
    for (const f of files) {
      const originalName = typeof f?.name === 'string' ? f.name : 'image.jpg';
      const mimeType = typeof f?.type === 'string' ? f.type : 'image/jpeg';

      if (!mimeType.startsWith('image/')) {
        return res.status(400).json({ success: false, message: 'Solo se permiten imágenes' });
      }

      const ext = getImageExtension(originalName, mimeType);
      const objectPath = `${yyyy}/${mm}/${crypto.randomUUID()}${ext}`;
      const fullPath = `${objectPath}`;

      const { data: signed, error: signError } = await supabase
        .storage
        .from(STORAGE_BUCKET)
        .createSignedUploadUrl(fullPath, { upsert: false });

      if (signError || !signed?.signedUrl) {
        throw new Error(signError?.message || 'Error creando signed upload URL');
      }

      const { data: publicData } = supabase
        .storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(fullPath);

      items.push({
        name: originalName,
        contentType: mimeType,
        path: fullPath,
        signedUrl: signed.signedUrl,
        publicUrl: publicData?.publicUrl || null
      });
    }

    auditLogSafe(req, { event_type: 'admin_storage_signed_urls', severity: 'info', meta: { bucket: STORAGE_BUCKET, count: items.length } });
    res.json({ success: true, bucket: STORAGE_BUCKET, items });
  } catch (error) {
    console.error('Error creando signed upload URLs:', error);
    res.status(500).json({ success: false, message: 'Error creando signed upload URLs: ' + error.message });
  }
});

// API - Acciones masivas de modelos (admin)
app.post('/api/admin/modelos/bulk', requireAuth, requireCsrf, async (req, res) => {
  try {
    const { action, ids } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'ids debe ser un array con al menos un elemento' });
    }

    const cleanIds = [...new Set(ids)]
      .map((x) => parseInt(x, 10))
      .filter((x) => Number.isFinite(x) && x > 0);

    if (cleanIds.length === 0) {
      return res.status(400).json({ success: false, message: 'ids inválidos' });
    }

    if (cleanIds.length > 200) {
      return res.status(400).json({ success: false, message: 'Demasiados ids (máximo 200 por operación)' });
    }

    const normalizedAction = String(action || '').toLowerCase();
    if (!['activate', 'deactivate', 'delete'].includes(normalizedAction)) {
      return res.status(400).json({ success: false, message: 'action inválida (activate|deactivate|delete)' });
    }

    let result = { changes: 0 };
    if (normalizedAction === 'delete') {
      if (typeof modelosDB.hardDeleteMany === 'function') {
        result = await modelosDB.hardDeleteMany(cleanIds);
      } else {
        for (const id of cleanIds) {
          if (typeof modelosDB.hardDelete === 'function') await modelosDB.hardDelete(id);
          else await modelosDB.delete(id);
          result.changes += 1;
        }
      }
    } else {
      const activa = normalizedAction === 'activate';
      result = await modelosDB.setActivaMany(cleanIds, activa);
    }

    auditLogSafe(req, { event_type: 'admin_modelos_bulk', severity: 'info', meta: { action: normalizedAction, count: cleanIds.length } });
    res.json({
      success: true,
      changes: result?.changes || 0,
      message:
        normalizedAction === 'activate'
          ? 'Modelos activadas'
          : normalizedAction === 'deactivate'
            ? 'Modelos desactivadas'
            : 'Modelos eliminadas definitivamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error ejecutando acción masiva: ' + error.message
    });
  }
});

// API - Obtener modelo individual (admin - para editar)
app.get('/api/admin/modelos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const modeloId = parseInt(id);
    
    if (isNaN(modeloId) || modeloId <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de modelo inválido' 
      });
    }
    
    const modelo = await modelosDB.getById(modeloId);
    
    if (!modelo) {
      return res.status(404).json({ 
        success: false, 
        message: 'Modelo no encontrada' 
      });
    }
    
    const fotos = await modeloFotosDB.getByModeloId(modeloId);
    modelo.fotos = fotos || [];
    
    res.json({ success: true, modelo });
  } catch (error) {
    console.error('Error obteniendo modelo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo modelo. Por favor, intenta más tarde.' 
    });
  }
});

// API - Crear modelo (admin)
app.post('/api/admin/modelos', requireAuth, requireCsrf, validateModelo, async (req, res) => {
  try {
    const { fotos, ...modeloData } = req.body;
    
    const result = await modelosDB.create(modeloData);
    const modeloId = result.lastID;
    
    if (fotos && Array.isArray(fotos) && fotos.length > 0) {
      const fotosValidas = fotos.filter(foto => foto && foto.trim());
      if (fotosValidas.length > 0) {
        await modeloFotosDB.createMultiple(modeloId, fotosValidas);
      }
    }
    
    const modelo = await modelosDB.getById(modeloId);
    if (modelo) {
      const fotosModelo = await modeloFotosDB.getByModeloId(modeloId);
      modelo.fotos = fotosModelo || [];
    }
    
    if (!modelo) {
      return res.status(500).json({ 
        success: false, 
        message: 'Error obteniendo el modelo creado' 
      });
    }
    
    auditLogSafe(req, { event_type: 'admin_modelo_create', severity: 'info', meta: { modeloId, nombre: modelo?.nombre } });
    res.json({ success: true, modelo, message: 'Modelo creado exitosamente' });
  } catch (error) {
    console.error('Error creando modelo:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error creando modelo: ' + error.message 
    });
  }
});

// API - Actualizar modelo (admin)
app.put('/api/admin/modelos/:id', requireAuth, requireCsrf, validateModelo, async (req, res) => {
  try {
    const { id } = req.params;
    const modeloId = parseInt(id);
    
    if (isNaN(modeloId) || modeloId <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de modelo inválido' 
      });
    }
    
    const { fotos, ...modeloData } = req.body;
    
    await modelosDB.update(modeloId, modeloData);
    
    if (fotos !== undefined) {
      await modeloFotosDB.deleteByModeloId(modeloId);
      
      if (Array.isArray(fotos) && fotos.length > 0) {
        const fotosValidas = fotos.filter(foto => foto && foto.trim());
        if (fotosValidas.length > 0) {
          await modeloFotosDB.createMultiple(modeloId, fotosValidas);
        }
      }
    }
    
    const modelo = await modelosDB.getById(modeloId);
    if (modelo) {
      const fotosModelo = await modeloFotosDB.getByModeloId(modeloId);
      modelo.fotos = fotosModelo || [];
    }
    
    if (!modelo) {
      return res.status(404).json({ 
        success: false, 
        message: 'Modelo no encontrada' 
      });
    }
    
    auditLogSafe(req, { event_type: 'admin_modelo_update', severity: 'info', meta: { modeloId } });
    res.json({ success: true, modelo, message: 'Modelo actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error actualizando modelo: ' + error.message 
    });
  }
});

// API - Eliminar modelo (admin)
app.delete('/api/admin/modelos/:id', requireAuth, requireCsrf, async (req, res) => {
  try {
    const { id } = req.params;
    const modeloId = parseInt(id);
    
    if (isNaN(modeloId) || modeloId <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de modelo inválido' 
      });
    }
    
    if (typeof modelosDB.hardDelete === 'function') {
      await modelosDB.hardDelete(modeloId);
    } else {
      await modelosDB.delete(modeloId);
    }
    auditLogSafe(req, { event_type: 'admin_modelo_delete', severity: 'warn', meta: { modeloId, hard: true } });
    res.json({ success: true, message: 'Modelo eliminada definitivamente' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error eliminando modelo: ' + error.message 
    });
  }
});

// API - Guardar contacto (público)
app.post('/api/contacto', contactoLimiter, validateContacto, async (req, res) => {
  try {
    const { nombre, email, telefono, empresa, mensaje } = req.body;
    
    const result = await contactosDB.create({ 
      nombre, 
      email, 
      telefono, 
      empresa, 
      mensaje 
    });
    
    const contacto = await contactosDB.getById(result.lastID);
    
    res.json({ 
      success: true, 
      message: '¡Gracias! Tu información ha sido recibida.',
      contacto
    });

    const emailDomain = typeof email === 'string' && email.includes('@') ? email.split('@').pop() : null;
    auditLogSafe(req, { event_type: 'contact_submit', severity: 'info', meta: { contactoId: contacto?.id, emailDomain } });
  } catch (error) {
    console.error('Error guardando contacto:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error guardando contacto. Por favor, intenta más tarde.' 
    });
  }
});

// API - Obtener contactos (admin)
app.get('/api/admin/contactos', requireAuth, async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';

    const page = Number.isFinite(Number(req.query.page)) ? parseInt(req.query.page, 10) : 1;
    const pageSize = Number.isFinite(Number(req.query.pageSize)) ? parseInt(req.query.pageSize, 10) : 20;
    const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy : 'fecha';
    const sortDir = typeof req.query.sortDir === 'string' ? req.query.sortDir : 'desc';

    const result = await contactosDB.getAll({ q, from, to, page, pageSize, sortBy, sortDir });
    const contactos = Array.isArray(result) ? result : (result?.rows || []);
    const total = Array.isArray(result) ? contactos.length : (result?.total ?? contactos.length);

    const safePage = Math.max(1, page || 1);
    const safePageSize = Math.min(100, Math.max(1, pageSize || 20));

    res.json({
      success: true,
      contactos,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / safePageSize))
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo contactos: ' + error.message 
    });
  }
});

// API - Generar QR (admin)
app.post('/api/admin/generar-qr', requireAuth, requireCsrf, async (req, res) => {
  try {
    // En Vercel, usar el hostname de la request
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'tu-dominio.vercel.app';
    const contactUrl = `${protocol}://${host}/contacto`;
    
    const qrCodeDataURL = await QRCode.toDataURL(contactUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    res.json({ 
      success: true, 
      qr: qrCodeDataURL,
      url: contactUrl
    });
    auditLogSafe(req, { event_type: 'admin_qr_generate', severity: 'info', meta: { url: contactUrl } });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error generando QR: ' + error.message 
    });
  }
});

// API - Auditoría (admin)
app.get('/api/admin/audit', requireAuth, async (req, res) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const eventType = typeof req.query.eventType === 'string' ? req.query.eventType : '';
    const severity = typeof req.query.severity === 'string' ? req.query.severity : '';
    const from = typeof req.query.from === 'string' ? req.query.from : '';
    const to = typeof req.query.to === 'string' ? req.query.to : '';

    const page = Number.isFinite(Number(req.query.page)) ? parseInt(req.query.page, 10) : 1;
    const pageSize = Number.isFinite(Number(req.query.pageSize)) ? parseInt(req.query.pageSize, 10) : 50;

    if (!auditLogsDB || typeof auditLogsDB.getAllAdmin !== 'function') {
      return res.json({
        success: true,
        logs: [],
        pagination: { page: 1, pageSize: 50, total: 0, totalPages: 1 }
      });
    }

    let result;
    try {
      result = await auditLogsDB.getAllAdmin({ q, eventType, severity, from, to, page, pageSize });
    } catch (e) {
      console.error('Auditoría no disponible (posible falta tabla audit_logs):', e);
      return res.json({
        success: true,
        logs: [],
        warning: 'Auditoría no disponible. En Supabase, ejecutá la migración para crear la tabla audit_logs.',
        pagination: { page: 1, pageSize: 50, total: 0, totalPages: 1 }
      });
    }
    const rows = Array.isArray(result) ? result : (result?.rows || []);
    const total = Array.isArray(result) ? rows.length : (result?.total ?? rows.length);

    const safePage = Math.max(1, page || 1);
    const safePageSize = Math.min(200, Math.max(1, pageSize || 50));

    res.json({
      success: true,
      logs: rows,
      pagination: {
        page: safePage,
        pageSize: safePageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / safePageSize))
      }
    });
  } catch (error) {
    console.error('Error obteniendo auditoría:', error);
    res.status(500).json({ success: false, message: 'Error obteniendo auditoría' });
  }
});

// Inicializar base de datos
initDatabase().catch(err => {
  console.error('Error inicializando base de datos:', err);
});

// Exportar app para Vercel (NO llamar app.listen())
module.exports = app;
