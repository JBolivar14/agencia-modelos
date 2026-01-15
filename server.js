const express = require('express');
const QRCode = require('qrcode');
const bodyParser = require('body-parser');
const session = require('express-session');
const path = require('path');

// Usar Supabase si está configurado, sino usar SQLite
const useSupabase = process.env.USE_SUPABASE === 'true' || process.env.SUPABASE_URL;
let modelosDB, contactosDB, usuariosDB, modeloFotosDB, initDatabase;

if (useSupabase) {
  console.log('📦 Usando Supabase como base de datos');
  const db = require('./database-supabase');
  modelosDB = db.modelosDB;
  contactosDB = db.contactosDB;
  usuariosDB = db.usuariosDB;
  modeloFotosDB = db.modeloFotosDB;
  initDatabase = db.initDatabase;
} else {
  console.log('📦 Usando SQLite como base de datos');
  const db = require('./database');
  modelosDB = db.modelosDB;
  contactosDB = db.contactosDB;
  usuariosDB = db.usuariosDB;
  modeloFotosDB = db.modeloFotosDB;
  initDatabase = db.initDatabase;
}

const { validateContacto, validateModelo, validateLogin } = require('./middleware/validation');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configurar sesiones
// IMPORTANTE: En producción, usar variable de entorno SESSION_SECRET
const SESSION_SECRET = process.env.SESSION_SECRET || 'agencia-modelos-secret-key-change-in-production';
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId', // Cambiar nombre de cookie para seguridad
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // true en producción con HTTPS
    httpOnly: true, // Prevenir acceso desde JavaScript
    maxAge: 24 * 60 * 60 * 1000, // 24 horas
    sameSite: 'strict' // Protección CSRF
  }
}));

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    return next();
  } else {
    // Si es una petición AJAX/API, retornar JSON en lugar de redirect
    if (req.path.startsWith('/api/')) {
      return res.status(401).json({
        success: false,
        message: 'No autorizado. Por favor, inicia sesión.'
      });
    }
    res.redirect('/login');
  }
}

// Ruta para favicon (evitar error 404)
app.get('/favicon.ico', (req, res) => {
  res.status(204).end(); // No Content - el navegador no mostrará error
});

// Servir archivos estáticos de public (para assets durante desarrollo)
app.use(express.static('public', {
  maxAge: '1d',
  etag: true,
  lastModified: true
}));

// Servir archivos estáticos de React en producción
// En desarrollo, Vite sirve los archivos estáticos en puerto 5173
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'dist')));
}

// Rutas de API (deben estar antes de las rutas de React)
// Las rutas de API ya están definidas arriba

// Ruta de logout
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// En producción, servir la app React para todas las rutas no-API
// En desarrollo, estas rutas son manejadas por Vite
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    // No servir React para rutas de API
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ success: false, message: 'Ruta no encontrada' });
    }
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
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

// API - Modelos (público)
app.get('/api/modelos', async (req, res) => {
  try {
    const modelos = await modelosDB.getAll();
    
    // Agregar primera foto de cada modelo (para compatibilidad)
    for (let modelo of modelos) {
      const fotos = await modeloFotosDB.getByModeloId(modelo.id);
      modelo.fotos = fotos || [];
      // Mantener compatibilidad: si hay fotos pero no hay foto principal, usar la primera
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
    if (modelo.activa !== 1) {
      return res.status(404).json({ 
        success: false, 
        message: 'Modelo no encontrada' 
      });
    }
    
    // Obtener fotos del modelo
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
    
    // Agregar fotos a cada modelo
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

// API - Crear modelo (admin)
app.post('/api/admin/modelos', requireAuth, validateModelo, async (req, res) => {
  try {
    const { fotos, ...modeloData } = req.body;
    
    const result = await modelosDB.create(modeloData);
    const modeloId = result.lastID;
    
    // Si hay fotos, guardarlas
    if (fotos && Array.isArray(fotos) && fotos.length > 0) {
      const fotosValidas = fotos.filter(foto => foto && foto.trim());
      if (fotosValidas.length > 0) {
        await modeloFotosDB.createMultiple(modeloId, fotosValidas);
      }
    }
    
    // Obtener modelo con fotos
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
    
    // Si se proporcionan fotos, actualizar
    if (fotos !== undefined) {
      // Eliminar fotos existentes
      await modeloFotosDB.deleteByModeloId(modeloId);
      
      // Agregar nuevas fotos
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
    
    try {
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
    } catch (dbError) {
      console.error('Error en base de datos:', dbError);
      res.status(500).json({ 
        success: false, 
        message: 'Error guardando contacto en la base de datos' 
      });
    }
  } catch (error) {
    console.error('Error en endpoint /api/contacto:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error procesando la solicitud. Por favor, intenta más tarde.' 
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
    const protocol = req.protocol;
    const host = req.get('host');
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

// Nota: Los archivos estáticos se sirven arriba, antes de las rutas de React

// Inicializar base de datos
initDatabase().catch(err => {
  console.error('Error inicializando base de datos:', err);
});

// Función para iniciar el servidor
function startServer() {
  app.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const networkInterfaces = os.networkInterfaces();
    let localIP = 'localhost';
    
    // Buscar la IP local
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      for (const iface of interfaces) {
        if (iface.family === 'IPv4' && !iface.internal) {
          localIP = iface.address;
          break;
        }
      }
      if (localIP !== 'localhost') break;
    }
    
    console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
    console.log(`🌐 Acceso desde red local: http://${localIP}:${PORT}`);
    console.log(`🏠 Home: http://${localIP}:${PORT}`);
    console.log(`🔐 Login: http://${localIP}:${PORT}/login`);
    console.log(`\n📋 CREDENCIALES DE ADMINISTRADOR:`);
    console.log(`   Usuario: admin`);
    console.log(`   Contraseña: admin123`);
    console.log(`\n📱 Para acceder desde tu celular:`);
    console.log(`   1. Asegúrate de que tu celular esté en la misma red WiFi`);
    console.log(`   2. Abre el navegador en tu celular`);
    console.log(`   3. Ingresa: http://${localIP}:${PORT}`);
    console.log(`\n💡 Nota: Por seguridad, cambia la contraseña después del primer acceso\n`);
  });
}

// Exportar app para testing y Vercel
module.exports = app;

// Iniciar servidor solo si se ejecuta directamente (no en Vercel)
if (require.main === module) {
  startServer();
}
