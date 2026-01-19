// Vercel Serverless Function - Express API
// Este archivo es el punto de entrada para todas las rutas /api/*

const express = require('express');
const QRCode = require('qrcode');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

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
let modelosDB, contactosDB, usuariosDB, modeloFotosDB, initDatabase;

if (useSupabase) {
  console.log('📦 Usando Supabase como base de datos');
  const db = require('../database-supabase');
  modelosDB = db.modelosDB;
  contactosDB = db.contactosDB;
  usuariosDB = db.usuariosDB;
  modeloFotosDB = db.modeloFotosDB;
  initDatabase = db.initDatabase;
} else {
  console.log('📦 Usando SQLite como base de datos');
  const db = require('../database');
  modelosDB = db.modelosDB;
  contactosDB = db.contactosDB;
  usuariosDB = db.usuariosDB;
  modeloFotosDB = db.modeloFotosDB;
  initDatabase = db.initDatabase;
}

const { validateContacto, validateModelo, validateLogin } = require('../middleware/validation');

const app = express();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configurar sesiones para Vercel
// IMPORTANTE: En producción, usar variable de entorno SESSION_SECRET
const SESSION_SECRET = process.env.SESSION_SECRET || 'agencia-modelos-secret-key-change-in-production';

// En Vercel, usar MemoryStore para sesiones (compatible con serverless)
let sessionConfig = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId',
  cookie: { 
    secure: true, // HTTPS en Vercel
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: 'none' // Necesario para CORS en Vercel
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

// CORS para Vercel
app.use((req, res, next) => {
  const origin = req.headers.origin;
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Por favor, inicia sesión.'
      });
    }
    res.redirect('/login');
  }
}

// API - Login
app.post('/api/login', validateLogin, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await usuariosDB.getByUsername(username);
    
    if (!user) {
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
      return res.status(401).json({ 
        success: false, 
        message: 'Usuario o contraseña incorrectos' 
      });
    }
    
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.nombre = user.nombre;
    
    res.json({ 
      success: true, 
      message: 'Login exitoso',
      user: { id: user.id, username: user.username, nombre: user.nombre }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error en el login: ' + error.message 
    });
  }
});

// API - Verificar sesión
app.get('/api/session', (req, res) => {
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
  req.session.destroy(() => {
    res.redirect('/login');
  });
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
    const modelos = await modelosDB.getAllAdmin();
    
    for (let modelo of modelos) {
      const fotos = await modeloFotosDB.getByModeloId(modelo.id);
      modelo.fotos = fotos || [];
    }
    
    res.json({ success: true, modelos });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo modelos: ' + error.message 
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
app.post('/api/admin/modelos', requireAuth, validateModelo, async (req, res) => {
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
app.put('/api/admin/modelos/:id', requireAuth, validateModelo, async (req, res) => {
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
    
    res.json({ success: true, modelo, message: 'Modelo actualizado exitosamente' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error actualizando modelo: ' + error.message 
    });
  }
});

// API - Eliminar modelo (admin)
app.delete('/api/admin/modelos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const modeloId = parseInt(id);
    
    if (isNaN(modeloId) || modeloId <= 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'ID de modelo inválido' 
      });
    }
    
    await modelosDB.delete(modeloId);
    res.json({ success: true, message: 'Modelo eliminado exitosamente' });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error eliminando modelo: ' + error.message 
    });
  }
});

// API - Guardar contacto (público)
app.post('/api/contacto', validateContacto, async (req, res) => {
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
    const contactos = await contactosDB.getAll();
    res.json({ success: true, contactos });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error obteniendo contactos: ' + error.message 
    });
  }
});

// API - Generar QR (admin)
app.post('/api/admin/generar-qr', requireAuth, async (req, res) => {
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
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error generando QR: ' + error.message 
    });
  }
});

// Inicializar base de datos
initDatabase().catch(err => {
  console.error('Error inicializando base de datos:', err);
});

// Exportar app para Vercel (NO llamar app.listen())
module.exports = app;
