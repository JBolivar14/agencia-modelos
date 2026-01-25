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
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');
const { sendEmail, getEmailConfig } = require('../email');

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

const { validateContacto, validateSorteo, validateModelo, validatePerfilModelo, validateLogin } = require('../middleware/validation');

const app = express();
app.disable('x-powered-by');

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'modelos';
const MAX_SIGNED_UPLOADS = 20;
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
    const u = {
      id: payload.userId,
      username: payload.username,
      nombre: payload.nombre,
      rol: payload.rol || 'admin'
    };
    if (payload.modeloId != null) u.modeloId = payload.modeloId;
    return u;
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

function getBaseUrl(req) {
  const env = process.env.APP_BASE_URL;
  if (env && String(env).trim()) return String(env).trim().replace(/\/+$/, '');

  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https').toString().split(',')[0].trim();
  const host = (req.headers['x-forwarded-host'] || req.get('host') || '').toString().split(',')[0].trim();
  if (!host) return '';
  return `${proto}://${host}`;
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

const userRegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) =>
    res.status(429).json({ success: false, message: 'Demasiados registros. Intenta más tarde.' })
});

const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
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
    if (cookieUser.rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acceso solo para administradores' });
    }
    req.authUser = cookieUser;
    return next();
  }

  if (req.session && req.session.userId) {
    const rol = req.session.rol || 'admin';
    if (rol !== 'admin') {
      return res.status(403).json({ success: false, message: 'Acceso solo para administradores' });
    }
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

function requireAnyAuth(req, res, next) {
  const cookieUser = getUserFromAuthCookie(req);
  if (cookieUser) {
    req.authUser = cookieUser;
    return next();
  }
  if (req.session && req.session.userId) {
    req.authUser = {
      id: req.session.userId,
      username: req.session.username,
      nombre: req.session.nombre,
      rol: req.session.rol || 'admin'
    };
    if (req.session.modeloId != null) req.authUser.modeloId = req.session.modeloId;
    return next();
  }
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ success: false, message: 'No autorizado. Iniciá sesión.' });
  }
  res.redirect('/login');
}

function requireModelo(req, res, next) {
  const u = req.authUser;
  if (!u) return res.status(401).json({ success: false, message: 'No autorizado.' });
  if (u.rol !== 'modelo') {
    return res.status(403).json({ success: false, message: 'Solo modelos pueden acceder a esta función.' });
  }
  const modeloId = u.modeloId != null ? u.modeloId : (req.session && req.session.modeloId);
  if (!modeloId) {
    return res.status(403).json({ success: false, message: 'Tu cuenta no está vinculada a un perfil de modelo.' });
  }
  req.modeloId = modeloId;
  return next();
}

// CSRF token (admin)
app.get('/api/admin/csrf', requireAuth, (req, res) => {
  const token = ensureCsrfTokenCookie(req, res);
  res.json({ success: true, token });
});

// CSRF token para cualquier autenticado (admin o modelo). Usado por perfil modelo.
app.get('/api/csrf', requireAnyAuth, (req, res) => {
  const token = ensureCsrfTokenCookie(req, res);
  res.json({ success: true, token });
});

// Nota: el registro de usuarios admin NO es público.
// Los admins se crean desde el panel (tab Usuarios) por un admin ya autenticado.

// Registro público: crear usuario modelo (NO admin)
app.post('/api/usuarios/register', userRegisterLimiter, async (req, res) => {
  try {
    const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
    const emailRaw = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    const email = emailRaw.toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!nombre) return res.status(400).json({ success: false, message: 'El nombre es requerido' });
    if (!emailOk) return res.status(400).json({ success: false, message: 'El email no es válido' });
    if (!password || password.trim().length < 8) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
    }

    if (!usuariosDB || typeof usuariosDB.create !== 'function' || typeof usuariosDB.getByEmail !== 'function') {
      return res.status(500).json({ success: false, message: 'Registro no disponible' });
    }

    const existing = await usuariosDB.getByEmail(email);
    if (existing) {
      const rol = existing.rol || 'admin';
      if (rol === 'admin') {
        return res.status(409).json({ success: false, message: 'Este email ya pertenece a un administrador' });
      }
      if (existing.confirmado) {
        return res.status(409).json({ success: false, message: 'Este email ya está registrado. Iniciá sesión.' });
      }
    }

    // Preparación para "claim": si ya existe un modelo con este email, linkearlo al usuario
    let modeloId = null;
    if (modelosDB && typeof modelosDB.getByEmail === 'function') {
      try {
        const modelo = await modelosDB.getByEmail(email);
        modeloId = modelo?.id ?? null;
      } catch (_) {
        modeloId = null;
      }
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h

    const baseUrl = getBaseUrl(req);
    const confirmPageUrl = baseUrl ? `${baseUrl}/confirmar?type=usuario&token=${encodeURIComponent(token)}` : '';
    const emailCfg = getEmailConfig();

    if (existing && existing.id) {
      if (typeof usuariosDB.setConfirmToken === 'function') {
        await usuariosDB.setConfirmToken({ id: existing.id, token, expiraEn: expiresAt });
      }
    } else {
      const passwordHash = await bcrypt.hash(password.trim(), 10);
      const username = email;
      const result = await usuariosDB.create({
        username,
        email,
        nombre,
        passwordHash,
        rol: 'modelo',
        confirmado: false,
        modelo_id: modeloId,
        confirm_token: token,
        confirm_token_expira: expiresAt
      });
      if (result?.lastID && typeof usuariosDB.setConfirmToken === 'function') {
        await usuariosDB.setConfirmToken({ id: result.lastID, token, expiraEn: expiresAt });
      }
    }

    let emailSent = false;
    if (confirmPageUrl) {
      const r = await sendEmail({
        to: email,
        subject: 'Confirmá tu cuenta - Agencia Modelos Argentinas',
        text:
          `Hola ${nombre},\n\n` +
          `Para confirmar tu cuenta, ingresá acá:\n${confirmPageUrl}\n\n` +
          `Este link vence en 24 horas.\n`,
        html:
          `<p>Hola <strong>${String(nombre)}</strong>,</p>` +
          `<p>Para confirmar tu cuenta, hacé clic acá:</p>` +
          `<p><a href="${confirmPageUrl}">Confirmar mi cuenta</a></p>` +
          `<p>Este link vence en 24 horas.</p>`
      });
      emailSent = !!r?.ok;
    }

    auditLogSafe(req, { event_type: 'modelo_register', severity: 'info', meta: { emailDomain: email.split('@').pop() || null, emailSent, emailCfgOk: !!emailCfg?.ok } });

    return res.json({
      success: true,
      message: emailSent
        ? '¡Listo! Te enviamos un email para confirmar tu cuenta.'
        : 'Tu cuenta fue creada, pero no pudimos enviarte el email de confirmación. Por favor contactanos.'
    });
  } catch (error) {
    console.error('Error en registro de modelo:', error);
    return res.status(500).json({ success: false, message: 'Error registrando usuario. Intentá más tarde.' });
  }
});

// Confirmación pública: usuarios modelo
app.get('/api/usuarios/confirm', async (req, res) => {
  try {
    const token = typeof req.query?.token === 'string' ? req.query.token : '';
    if (!token || !token.trim()) {
      return res.status(400).json({ success: false, message: 'Token inválido' });
    }

    if (!usuariosDB || typeof usuariosDB.confirmByToken !== 'function') {
      return res.status(500).json({ success: false, message: 'Confirmación no disponible' });
    }

    const result = await usuariosDB.confirmByToken({ token });
    if (!result?.ok) {
      const reason = result?.reason || 'invalid';
      const msg =
        reason === 'expired'
          ? 'El link de confirmación expiró'
          : 'Token inválido o ya confirmado';
      return res.status(400).json({ success: false, message: msg, reason });
    }

    auditLogSafe(req, { event_type: 'modelo_confirm_success', severity: 'info', meta: { usuarioId: result.usuarioId } });
    return res.json({ success: true, message: 'Cuenta confirmada' });
  } catch (error) {
    console.error('Error confirmando usuario:', error);
    return res.status(500).json({ success: false, message: 'Error confirmando cuenta' });
  }
});

// Password reset - solicitar link (público)
app.post('/api/usuarios/password/forgot', passwordResetLimiter, async (req, res) => {
  try {
    const emailRaw = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const email = emailRaw.toLowerCase();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res.status(400).json({ success: false, message: 'El email no es válido' });
    }

    const baseUrl = getBaseUrl(req);
    const emailCfg = getEmailConfig();

    const genericOk = () =>
      res.json({
        success: true,
        message: 'Si el email existe, te enviamos un link para restablecer tu contraseña.'
      });

    if (!usuariosDB || typeof usuariosDB.getByEmail !== 'function' || typeof usuariosDB.setResetToken !== 'function') {
      return genericOk();
    }

    const user = await usuariosDB.getByEmail(email);
    if (!user || !user.id) {
      auditLogSafe(req, { event_type: 'password_reset_request', severity: 'info', meta: { emailDomain: email.split('@').pop() || null, found: false } });
      return genericOk();
    }

    const rol = user.rol || 'admin';
    const isConfirmed = user.confirmado === true || user.confirmado === 1;
    if (rol === 'modelo' && !isConfirmed) {
      auditLogSafe(req, { event_type: 'password_reset_request', severity: 'warn', meta: { userId: user.id, rol, blocked: 'not_confirmed' } });
      return genericOk();
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h
    await usuariosDB.setResetToken({ id: user.id, token, expiraEn: expiresAt });

    const resetUrl = baseUrl ? `${baseUrl}/reset-password?token=${encodeURIComponent(token)}` : '';
    let emailSent = false;
    if (resetUrl) {
      const r = await sendEmail({
        to: email,
        subject: 'Restablecer contraseña - Agencia Modelos Argentinas',
        text:
          `Hola ${user.nombre || ''},\n\n` +
          `Para restablecer tu contraseña, ingresá acá:\n${resetUrl}\n\n` +
          `Este link vence en 1 hora.\n`,
        html:
          `<p>Hola <strong>${String(user.nombre || '')}</strong>,</p>` +
          `<p>Para restablecer tu contraseña, hacé clic acá:</p>` +
          `<p><a href="${resetUrl}">Restablecer contraseña</a></p>` +
          `<p>Este link vence en 1 hora.</p>`
      });
      emailSent = !!r?.ok;
    }

    auditLogSafe(req, {
      event_type: 'password_reset_request',
      severity: 'info',
      meta: { userId: user.id, rol, emailDomain: email.split('@').pop() || null, emailSent, emailCfgOk: !!emailCfg?.ok }
    });
    return genericOk();
  } catch (error) {
    console.error('Error solicitando reset password:', error);
    return res.json({
      success: true,
      message: 'Si el email existe, te enviamos un link para restablecer tu contraseña.'
    });
  }
});

// Password reset - aplicar nueva contraseña (público)
app.post('/api/usuarios/password/reset', passwordResetLimiter, async (req, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!token) return res.status(400).json({ success: false, message: 'Token inválido' });
    if (!password || password.trim().length < 8) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
    }

    if (!usuariosDB || typeof usuariosDB.resetPasswordByToken !== 'function') {
      return res.status(500).json({ success: false, message: 'Reset no disponible' });
    }

    const passwordHash = await bcrypt.hash(password.trim(), 10);
    const result = await usuariosDB.resetPasswordByToken({ token, passwordHash });
    if (!result?.ok) {
      const reason = result?.reason || 'invalid';
      const msg = reason === 'expired' ? 'El link expiró. Pedí uno nuevo.' : 'Token inválido';
      return res.status(400).json({ success: false, message: msg, reason });
    }

    auditLogSafe(req, { event_type: 'password_reset_success', severity: 'info', meta: { usuarioId: result.usuarioId } });
    return res.json({ success: true, message: 'Contraseña actualizada. Ya podés iniciar sesión.' });
  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    const msg = String(error?.message || '');
    if (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('reset')) {
      return res.status(500).json({ success: false, message: 'Falta migración de reset de contraseña en Supabase. Ejecutá supabase-usuarios-reset-password.sql' });
    }
    return res.status(500).json({ success: false, message: 'Error reseteando contraseña' });
  }
});

// Admin users (usuarios)
app.get('/api/admin/usuarios', requireAuth, async (req, res) => {
  try {
    if (!usuariosDB || typeof usuariosDB.getAllAdmin !== 'function') {
      return res.json({ success: true, usuarios: [] });
    }
    const usuarios = await usuariosDB.getAllAdmin();
    res.json({ success: true, usuarios: usuarios || [] });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    const msg = String(error?.message || '');
    const safe =
      msg && (
        msg.toLowerCase().includes('column') ||
        msg.toLowerCase().includes('does not exist') ||
        msg.toLowerCase().includes('permission') ||
        msg.toLowerCase().includes('relation') ||
        msg.toLowerCase().includes('schema')
      );
    res.status(500).json({
      success: false,
      message: safe ? `Error obteniendo usuarios: ${msg}` : 'Error obteniendo usuarios'
    });
  }
});

app.post('/api/admin/usuarios', requireAuth, requireCsrf, async (req, res) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const nombre = typeof req.body?.nombre === 'string' ? req.body.nombre.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username) return res.status(400).json({ success: false, message: 'El username es requerido' });
    if (!email) return res.status(400).json({ success: false, message: 'El email es requerido' });
    if (!nombre) return res.status(400).json({ success: false, message: 'El nombre es requerido' });
    if (!password || password.trim().length < 8) {
      return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 8 caracteres' });
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) return res.status(400).json({ success: false, message: 'El formato del email no es válido' });

    if (!usuariosDB || typeof usuariosDB.create !== 'function') {
      return res.status(500).json({ success: false, message: 'DB usuarios no soporta creación' });
    }

    // Evitar duplicados
    const existingByUsername = await usuariosDB.getByUsername(username);
    if (existingByUsername) {
      return res.status(409).json({ success: false, message: 'Ya existe un usuario con ese username' });
    }
    if (typeof usuariosDB.getByEmail === 'function') {
      const existingByEmail = await usuariosDB.getByEmail(email);
      if (existingByEmail) {
        return res.status(409).json({ success: false, message: 'Ya existe un usuario con ese email' });
      }
    }

    const passwordHash = await bcrypt.hash(password.trim(), 10);
    const result = await usuariosDB.create({ username, email, nombre, passwordHash, rol: 'admin', confirmado: true });

    auditLogSafe(req, {
      event_type: 'admin_user_create',
      severity: 'warn',
      meta: { createdUserId: result?.lastID, username, email }
    });

    res.json({ success: true, message: 'Usuario admin creado', id: result?.lastID || null });
  } catch (error) {
    console.error('Error creando usuario admin:', error);
    const msg = String(error?.message || '');
    if (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('email')) {
      return res.status(500).json({
        success: false,
        message: 'Falta la columna email en usuarios. Ejecutá la migración de usuarios/email en Supabase.'
      });
    }
    res.status(500).json({ success: false, message: 'Error creando usuario admin' });
  }
});

// API - Login
app.post('/api/login', loginLimiter, validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;

    auditLogSafe(req, { event_type: 'login_attempt', severity: 'info', meta: { username } });
    
    // Permitir login por username o email (si el usuario escribe un email)
    let user = await usuariosDB.getByUsername(username);
    if (!user && typeof username === 'string' && username.includes('@') && typeof usuariosDB.getByEmail === 'function') {
      user = await usuariosDB.getByEmail(username);
    }
    
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
    
    const rol = user.rol || 'admin';
    if (rol === 'modelo' && user.confirmado !== 1 && user.confirmado !== true) {
      return res.status(403).json({ success: false, message: 'Tenés que confirmar tu email antes de iniciar sesión.' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.nombre = user.nombre;
    req.session.rol = rol;
    if (rol === 'modelo' && user.modelo_id != null) req.session.modeloId = user.modelo_id;

    // Cookie firmada (stateless) para que funcione en serverless sin store compartido
    const jwtPayload = { userId: user.id, username: user.username, nombre: user.nombre, rol };
    if (rol === 'modelo' && user.modelo_id != null) jwtPayload.modeloId = user.modelo_id;
    const token = jwt.sign(jwtPayload, SESSION_SECRET, { expiresIn: '24h' });

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
        user: { id: user.id, username: user.username, nombre: user.nombre, email: user.email || null, rol }
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
    const u = {
      id: req.session.userId,
      username: req.session.username,
      nombre: req.session.nombre,
      rol: req.session.rol || 'admin'
    };
    if (req.session.modeloId != null) u.modeloId = req.session.modeloId;
    res.json({ authenticated: true, user: u });
  } else {
    res.json({ authenticated: false });
  }
});

// API - Perfil modelo (solo rol modelo)
app.get('/api/perfil-modelo', requireAnyAuth, requireModelo, async (req, res) => {
  try {
    const modeloId = req.modeloId;
    const modelo = await modelosDB.getById(modeloId);
    if (!modelo) {
      return res.status(404).json({ success: false, message: 'Perfil de modelo no encontrado.' });
    }
    const fotos = (await modeloFotosDB.getByModeloId(modeloId)) || [];
    modelo.fotos = fotos;
    if (!modelo.foto && fotos.length > 0) modelo.foto = fotos[0].url;
    res.json({ success: true, modelo });
  } catch (err) {
    console.error('Error GET /api/perfil-modelo:', err);
    res.status(500).json({ success: false, message: 'Error al obtener tu perfil.' });
  }
});

app.patch('/api/perfil-modelo', requireAnyAuth, requireModelo, requireCsrf, validatePerfilModelo, async (req, res) => {
  try {
    const modeloId = req.modeloId;
    const {
      nombre, apellido, email, telefono, edad, altura, medidas, ciudad, descripcion, foto
    } = req.body;
    const data = {
      nombre: nombre || '',
      apellido: apellido || null,
      email: email || null,
      telefono: telefono || null,
      edad: edad != null ? edad : null,
      altura: altura || null,
      medidas: medidas || null,
      ciudad: ciudad || null,
      descripcion: descripcion || null,
      foto: foto || null
    };
    await modelosDB.update(modeloId, data);
    const modelo = await modelosDB.getById(modeloId);
    const fotos = (await modeloFotosDB.getByModeloId(modeloId)) || [];
    modelo.fotos = fotos;
    if (!modelo.foto && fotos.length > 0) modelo.foto = fotos[0].url;
    res.json({ success: true, modelo });
  } catch (err) {
    console.error('Error PATCH /api/perfil-modelo:', err);
    res.status(500).json({ success: false, message: 'Error al actualizar tu perfil.' });
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
      const fotosValidas = fotos.filter(foto => foto && foto.trim()).slice(0, 20);
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
        const fotosValidas = fotos.filter(foto => foto && foto.trim()).slice(0, 20);
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
      mensaje,
      confirmado: false
    });
    
    const contacto = await contactosDB.getById(result.lastID);

    // Generar token de confirmación y enviarlo por email
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24h
    if (contactosDB && typeof contactosDB.setConfirmToken === 'function') {
      await contactosDB.setConfirmToken({ id: contacto?.id || result.lastID, token, expiraEn: expiresAt });
    }

    const baseUrl = getBaseUrl(req);
    const confirmPageUrl = baseUrl ? `${baseUrl}/confirmar?token=${encodeURIComponent(token)}` : '';
    const emailCfg = getEmailConfig();

    let emailResult = null;
    let emailSent = false;
    let emailSkipped = false;
    let emailReason = null;

    try {
      if (!confirmPageUrl) {
        emailReason = 'missing_base_url';
      } else {
        emailResult = await sendEmail({
          to: email,
          subject: 'Confirmá tu email - Agencia Modelos Argentinas',
          text:
            `Hola ${nombre},\n\n` +
            `Para confirmar tu email, ingresá acá:\n${confirmPageUrl}\n\n` +
            `Este link vence en 24 horas.\n`,
          html:
            `<p>Hola <strong>${String(nombre)}</strong>,</p>` +
            `<p>Para confirmar tu email, hacé clic acá:</p>` +
            `<p><a href="${confirmPageUrl}">Confirmar mi email</a></p>` +
            `<p>Este link vence en 24 horas.</p>`
        });
        emailSent = !!emailResult?.ok;
        emailSkipped = !!emailResult?.skipped;
        if (emailSkipped && emailResult?.error === 'missing_config') {
          emailReason = 'missing_smtp_config';
        }
        if (!emailSent && !emailSkipped && emailResult?.error) {
          emailReason = 'smtp_send_failed';
        }
      }
    } catch (mailErr) {
      emailReason = 'smtp_send_threw';
      console.error('Error enviando email de confirmación:', mailErr);
    }
    
    res.json({ 
      success: true, 
      message: emailSent
        ? '¡Gracias! Te enviamos un email para confirmar tu dirección.'
        : '¡Gracias! Recibimos tu solicitud, pero no pudimos enviarte el email de confirmación. Por favor contactanos desde la sección Contacto.',
      contacto
    });

    const emailDomain = typeof email === 'string' && email.includes('@') ? email.split('@').pop() : null;
    auditLogSafe(req, { event_type: 'contact_submit', severity: 'info', meta: { contactoId: contacto?.id, emailDomain, confirmado: false, emailSent, emailSkipped, emailReason } });
    if (!emailSent) {
      auditLogSafe(req, {
        event_type: 'contact_email_send_failed',
        severity: 'warn',
        meta: {
          contactoId: contacto?.id,
          emailDomain,
          emailCfgOk: !!emailCfg?.ok,
          emailMissing: Array.isArray(emailCfg?.missing) ? emailCfg.missing : null,
          emailReason,
          smtpCode: emailResult?.code || null
        }
      });
    }
  } catch (error) {
    console.error('Error guardando contacto:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error guardando contacto. Por favor, intenta más tarde.' 
    });
  }
});

// API - Sorteo (formulario reducido: nombre, email, teléfono)
app.post('/api/sorteo', contactoLimiter, validateSorteo, async (req, res) => {
  try {
    const { nombre, email, telefono } = req.body;

    const result = await contactosDB.create({
      nombre,
      email,
      telefono: telefono || null,
      empresa: null,
      mensaje: null,
      confirmado: false
    });

    const contacto = await contactosDB.getById(result.lastID);

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    if (contactosDB && typeof contactosDB.setConfirmToken === 'function') {
      await contactosDB.setConfirmToken({ id: contacto?.id || result.lastID, token, expiraEn: expiresAt });
    }

    const baseUrl = getBaseUrl(req);
    const confirmPageUrl = baseUrl ? `${baseUrl}/confirmar?token=${encodeURIComponent(token)}` : '';
    const emailCfg = getEmailConfig();

    let emailResult = null;
    let emailSent = false;
    let emailSkipped = false;
    let emailReason = null;

    try {
      if (!confirmPageUrl) {
        emailReason = 'missing_base_url';
      } else {
        emailResult = await sendEmail({
          to: email,
          subject: 'Confirmá tu email - Sorteo - Agencia Modelos Argentinas',
          text:
            `Hola ${nombre},\n\n` +
            `Para confirmar tu participación en el sorteo, ingresá acá:\n${confirmPageUrl}\n\n` +
            `Este link vence en 24 horas.\n`,
          html:
            `<p>Hola <strong>${String(nombre)}</strong>,</p>` +
            `<p>Para confirmar tu participación en el sorteo, hacé clic acá:</p>` +
            `<p><a href="${confirmPageUrl}">Confirmar mi email</a></p>` +
            `<p>Este link vence en 24 horas.</p>`
        });
        emailSent = !!emailResult?.ok;
        emailSkipped = !!emailResult?.skipped;
        if (emailSkipped && emailResult?.error === 'missing_config') emailReason = 'missing_smtp_config';
        if (!emailSent && !emailSkipped && emailResult?.error) emailReason = 'smtp_send_failed';
      }
    } catch (mailErr) {
      emailReason = 'smtp_send_threw';
      console.error('Error enviando email sorteo:', mailErr);
    }

    res.json({
      success: true,
      message: emailSent
        ? '¡Gracias! Te enviamos un email para confirmar tu participación en el sorteo.'
        : '¡Gracias! Recibimos tus datos para el sorteo. No pudimos enviarte el email de confirmación; contactanos si tenés dudas.',
      contacto
    });

    const emailDomain = typeof email === 'string' && email.includes('@') ? email.split('@').pop() : null;
    auditLogSafe(req, { event_type: 'sorteo_submit', severity: 'info', meta: { contactoId: contacto?.id, emailDomain, confirmado: false, emailSent, emailSkipped, emailReason } });
  } catch (dbError) {
    console.error('Error en base de datos sorteo:', dbError);
    res.status(500).json({ success: false, message: 'Error guardando datos. Por favor, intenta más tarde.' });
  }
});

// API - Confirmar email de contacto (público)
app.get('/api/contacto/confirm', async (req, res) => {
  try {
    const token = typeof req.query?.token === 'string' ? req.query.token : '';
    if (!token || !token.trim()) {
      return res.status(400).json({ success: false, message: 'Token inválido' });
    }

    if (!contactosDB || typeof contactosDB.confirmByToken !== 'function') {
      return res.status(500).json({ success: false, message: 'Confirmación no disponible' });
    }

    const result = await contactosDB.confirmByToken({ token });
    if (!result?.ok) {
      const reason = result?.reason || 'invalid';
      const msg =
        reason === 'expired'
          ? 'El link de confirmación expiró'
          : 'Token inválido o ya confirmado';
      return res.status(400).json({ success: false, message: msg, reason });
    }

    auditLogSafe(req, { event_type: 'contact_confirm_success', severity: 'info', meta: { contactoId: result.contactoId } });
    return res.json({ success: true, message: 'Email confirmado' });
  } catch (error) {
    console.error('Error confirmando email:', error);
    return res.status(500).json({ success: false, message: 'Error confirmando email' });
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

// API - Generar QR Sorteo (admin)
app.post('/api/admin/generar-qr-sorteo', requireAuth, requireCsrf, async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'tu-dominio.vercel.app';
    const sorteoUrl = `${protocol}://${host}/sorteo`;

    const qrCodeDataURL = await QRCode.toDataURL(sorteoUrl, {
      width: 400,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' }
    });

    res.json({ success: true, qr: qrCodeDataURL, url: sorteoUrl });
    auditLogSafe(req, { event_type: 'admin_qr_sorteo_generate', severity: 'info', meta: { url: sorteoUrl } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error generando QR sorteo: ' + error.message });
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
