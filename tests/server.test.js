const request = require('supertest');
const path = require('path');
const fs = require('fs');

// Mock de la base de datos para tests
const mockDatabase = {
  modelosDB: {
    getAll: jest.fn(),
    getAllAdmin: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  modeloFotosDB: {
    getByModeloId: jest.fn(),
    createMultiple: jest.fn(),
    deleteByModeloId: jest.fn()
  },
  contactosDB: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn()
  },
  usuariosDB: {
    getByUsername: jest.fn(),
    verifyPassword: jest.fn()
  }
};

// Mock del módulo database
jest.mock('../database', () => mockDatabase);

// Importar el servidor después del mock
const app = require('../server');

describe('Server API Tests', () => {
  let sessionCookie;
  
  beforeEach(() => {
    // Limpiar mocks antes de cada test
    jest.clearAllMocks();
    sessionCookie = null;
  });

  afterAll(() => {
    // Limpiar después de todos los tests
  });

  // Helper para crear una sesión autenticada
  const createAuthenticatedSession = async () => {
    const userMock = {
      id: 1,
      username: 'admin',
      nombre: 'Administrador',
      password: '$2b$10$hashedpassword'
    };

    mockDatabase.usuariosDB.getByUsername.mockResolvedValue(userMock);
    mockDatabase.usuariosDB.verifyPassword.mockResolvedValue(true);

    const response = await request(app)
      .post('/api/login')
      .send({ username: 'admin', password: 'admin123' });

    // Extraer cookie de sesión
    const cookies = response.headers['set-cookie'];
    if (cookies && cookies.length > 0) {
      sessionCookie = cookies[0].split(';')[0];
    }
    
    return sessionCookie;
  };

  describe('GET /', () => {
    it('debería servir la página home', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.type).toMatch(/html/);
    });
  });

  describe('GET /contacto', () => {
    it('debería servir la página de contacto', async () => {
      const response = await request(app)
        .get('/contacto')
        .expect(200);
      
      expect(response.type).toMatch(/html/);
    });
  });

  describe('GET /login', () => {
    it('debería servir la página de login', async () => {
      const response = await request(app)
        .get('/login')
        .expect(200);
      
      expect(response.type).toMatch(/html/);
    });
  });

  describe('GET /api/modelos', () => {
    it('debería retornar lista de modelos activos', async () => {
      const modelosMock = [
        { id: 1, nombre: 'Modelo 1', activa: 1 },
        { id: 2, nombre: 'Modelo 2', activa: 1 }
      ];
      
      mockDatabase.modelosDB.getAll.mockResolvedValue(modelosMock);

      const response = await request(app)
        .get('/api/modelos')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.modelos).toHaveLength(2);
      expect(mockDatabase.modelosDB.getAll).toHaveBeenCalled();
    });

    it('debería manejar errores correctamente', async () => {
      mockDatabase.modelosDB.getAll.mockRejectedValue(new Error('DB Error'));

      const response = await request(app)
        .get('/api/modelos')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Error obteniendo modelos');
    });
  });

  describe('GET /api/modelos/:id', () => {
    it('debería retornar un modelo específico', async () => {
      const modeloMock = { id: 1, nombre: 'Modelo 1', activa: 1 };
      mockDatabase.modelosDB.getById.mockResolvedValue(modeloMock);

      const response = await request(app)
        .get('/api/modelos/1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.modelo.id).toBe(1);
    });

    it('debería retornar 404 si el modelo no existe', async () => {
      mockDatabase.modelosDB.getById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/modelos/999')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('debería retornar 400 para ID inválido', async () => {
      const response = await request(app)
        .get('/api/modelos/abc')
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('debería retornar 404 si el modelo está inactivo', async () => {
      const modeloMock = { id: 1, nombre: 'Modelo 1', activa: 0 };
      mockDatabase.modelosDB.getById.mockResolvedValue(modeloMock);

      const response = await request(app)
        .get('/api/modelos/1')
        .expect(404);
    });
  });

  describe('POST /api/contacto', () => {
    it('debería crear un contacto válido', async () => {
      const contactoData = {
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        telefono: '123456789',
        empresa: 'Empresa Test',
        mensaje: 'Mensaje de prueba'
      };

      mockDatabase.contactosDB.create.mockResolvedValue({ lastID: 1, changes: 1 });
      mockDatabase.contactosDB.getById.mockResolvedValue({ id: 1, ...contactoData });

      const response = await request(app)
        .post('/api/contacto')
        .send(contactoData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.contacto.nombre).toBe(contactoData.nombre);
    });

    it('debería rechazar contacto sin nombre', async () => {
      const response = await request(app)
        .post('/api/contacto')
        .send({ email: 'test@example.com' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('nombre');
    });

    it('debería rechazar contacto sin email', async () => {
      const response = await request(app)
        .post('/api/contacto')
        .send({ nombre: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('email');
    });

    it('debería rechazar email inválido', async () => {
      const response = await request(app)
        .post('/api/contacto')
        .send({ nombre: 'Test', email: 'email-invalido' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('formato');
    });
  });

  describe('POST /api/login', () => {
    it('debería hacer login con credenciales válidas', async () => {
      const userMock = {
        id: 1,
        username: 'admin',
        nombre: 'Administrador',
        password: '$2b$10$hashedpassword'
      };

      mockDatabase.usuariosDB.getByUsername.mockResolvedValue(userMock);
      mockDatabase.usuariosDB.verifyPassword.mockResolvedValue(true);

      const response = await request(app)
        .post('/api/login')
        .send({ username: 'admin', password: 'admin123' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.username).toBe('admin');
    });

    it('debería rechazar login sin credenciales', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('debería rechazar login con usuario incorrecto', async () => {
      mockDatabase.usuariosDB.getByUsername.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/login')
        .send({ username: 'wrong', password: 'wrong' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('debería rechazar login con contraseña incorrecta', async () => {
      const userMock = {
        id: 1,
        username: 'admin',
        password: '$2b$10$hashedpassword'
      };

      mockDatabase.usuariosDB.getByUsername.mockResolvedValue(userMock);
      mockDatabase.usuariosDB.verifyPassword.mockResolvedValue(false);

      const response = await request(app)
        .post('/api/login')
        .send({ username: 'admin', password: 'wrong' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/session', () => {
    it('debería retornar false si no hay sesión', async () => {
      const response = await request(app)
        .get('/api/session')
        .expect(200);

      expect(response.body.authenticated).toBe(false);
    });
  });

  describe('Rutas protegidas /api/admin/*', () => {
    it('debería requerir autenticación para /api/admin/modelos', async () => {
      const response = await request(app)
        .get('/api/admin/modelos')
        .expect(401); // Unauthorized (mejora: JSON en lugar de redirect)

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('autorizado');
    });

    it('debería permitir acceso con sesión válida', async () => {
      await createAuthenticatedSession();
      const modelosMock = [{ id: 1, nombre: 'Modelo 1' }];
      mockDatabase.modelosDB.getAllAdmin.mockResolvedValue(modelosMock);

      const response = await request(app)
        .get('/api/admin/modelos')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('debería crear modelo con autenticación', async () => {
      await createAuthenticatedSession();
      const modeloData = {
        nombre: 'Nuevo Modelo',
        apellido: 'Test',
        email: 'test@example.com'
      };

      mockDatabase.modelosDB.create.mockResolvedValue({ lastID: 1, changes: 1 });
      mockDatabase.modelosDB.getById.mockResolvedValue({ id: 1, ...modeloData });

      const response = await request(app)
        .post('/api/admin/modelos')
        .set('Cookie', sessionCookie)
        .send(modeloData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.modelo.nombre).toBe(modeloData.nombre);
    });

    it('debería rechazar crear modelo sin nombre', async () => {
      await createAuthenticatedSession();

      const response = await request(app)
        .post('/api/admin/modelos')
        .set('Cookie', sessionCookie)
        .send({ apellido: 'Test' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('nombre');
    });
  });

  describe('POST /api/admin/generar-qr', () => {
    it('debería generar QR con autenticación', async () => {
      await createAuthenticatedSession();

      const response = await request(app)
        .post('/api/admin/generar-qr')
        .set('Cookie', sessionCookie)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.qr).toBeDefined();
      expect(response.body.url).toBeDefined();
    });

    it('debería requerir autenticación para generar QR', async () => {
      const response = await request(app)
        .post('/api/admin/generar-qr')
        .expect(401); // Unauthorized (mejora: JSON en lugar de redirect)

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('autorizado');
    });
  });
});
