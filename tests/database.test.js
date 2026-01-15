const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const { modelosDB, contactosDB, usuariosDB, initDatabase } = require('../database');

describe('Database Tests', () => {
  let testDbPath;
  let testDb;

  beforeAll(async () => {
    // Crear base de datos de prueba
    testDbPath = path.join(__dirname, 'test-agencia.db');
    
    // Eliminar DB de prueba si existe
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Inicializar base de datos de prueba
    await new Promise((resolve, reject) => {
      testDb = new sqlite3.Database(testDbPath, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Crear tablas de prueba
    await new Promise((resolve, reject) => {
      testDb.serialize(() => {
        testDb.run(`
          CREATE TABLE IF NOT EXISTS modelos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            apellido TEXT,
            email TEXT,
            telefono TEXT,
            edad INTEGER,
            altura TEXT,
            medidas TEXT,
            ciudad TEXT,
            foto TEXT,
            descripcion TEXT,
            activa INTEGER DEFAULT 1,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        testDb.run(`
          CREATE TABLE IF NOT EXISTS contactos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            email TEXT NOT NULL,
            telefono TEXT,
            empresa TEXT,
            mensaje TEXT,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);

        testDb.run(`
          CREATE TABLE IF NOT EXISTS usuarios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            nombre TEXT NOT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });
  });

  afterAll((done) => {
    // Cerrar y eliminar base de datos de prueba
    if (testDb) {
      testDb.close((err) => {
        if (err) {
          console.error('Error cerrando DB:', err);
        }
        if (fs.existsSync(testDbPath)) {
          fs.unlinkSync(testDbPath);
        }
        done();
      });
    } else {
      done();
    }
  });

  describe('Modelos DB', () => {
    beforeEach(async () => {
      // Limpiar tabla antes de cada test
      await new Promise((resolve, reject) => {
        testDb.run('DELETE FROM modelos', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('debería crear un modelo', async () => {
      const modeloData = {
        nombre: 'Test Modelo',
        apellido: 'Test Apellido',
        email: 'test@example.com',
        telefono: '123456789',
        edad: 25,
        altura: '170cm',
        medidas: '90-60-90',
        ciudad: 'Ciudad Test',
        foto: 'https://example.com/foto.jpg',
        descripcion: 'Descripción de prueba'
      };

      await new Promise((resolve, reject) => {
        testDb.run(
          `INSERT INTO modelos (nombre, apellido, email, telefono, edad, altura, medidas, ciudad, foto, descripcion)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            modeloData.nombre,
            modeloData.apellido,
            modeloData.email,
            modeloData.telefono,
            modeloData.edad,
            modeloData.altura,
            modeloData.medidas,
            modeloData.ciudad,
            modeloData.foto,
            modeloData.descripcion
          ],
          function(err) {
            if (err) reject(err);
            else {
              expect(this.lastID).toBeGreaterThan(0);
              resolve();
            }
          }
        );
      });
    });

    it('debería obtener todos los modelos activos', async () => {
      // Insertar modelos de prueba
      await new Promise((resolve) => {
        testDb.run('INSERT INTO modelos (nombre, activa) VALUES (?, ?)', ['Modelo 1', 1]);
        testDb.run('INSERT INTO modelos (nombre, activa) VALUES (?, ?)', ['Modelo 2', 1]);
        testDb.run('INSERT INTO modelos (nombre, activa) VALUES (?, ?)', ['Modelo 3', 0], () => {
          resolve();
        });
      });

      await new Promise((resolve, reject) => {
        testDb.all('SELECT * FROM modelos WHERE activa = 1', (err, rows) => {
          if (err) reject(err);
          else {
            expect(rows).toHaveLength(2);
            expect(rows.every(r => r.activa === 1)).toBe(true);
            resolve();
          }
        });
      });
    });

    it('debería obtener un modelo por ID', async () => {
      let modeloId;
      
      await new Promise((resolve, reject) => {
        testDb.run('INSERT INTO modelos (nombre) VALUES (?)', ['Modelo Test'], function(err) {
          if (err) reject(err);
          else {
            modeloId = this.lastID;
            resolve();
          }
        });
      });

      await new Promise((resolve, reject) => {
        testDb.get('SELECT * FROM modelos WHERE id = ?', [modeloId], (err, row) => {
          if (err) reject(err);
          else {
            expect(row).toBeDefined();
            expect(row.id).toBe(modeloId);
            expect(row.nombre).toBe('Modelo Test');
            resolve();
          }
        });
      });
    });

    it('debería actualizar un modelo', async () => {
      let modeloId;
      
      await new Promise((resolve, reject) => {
        testDb.run('INSERT INTO modelos (nombre) VALUES (?)', ['Modelo Original'], function(err) {
          if (err) reject(err);
          else {
            modeloId = this.lastID;
            resolve();
          }
        });
      });

      await new Promise((resolve, reject) => {
        testDb.run(
          'UPDATE modelos SET nombre = ? WHERE id = ?',
          ['Modelo Actualizado', modeloId],
          function(err) {
            if (err) reject(err);
            else {
              expect(this.changes).toBe(1);
              resolve();
            }
          }
        );
      });
    });

    it('debería desactivar un modelo (soft delete)', async () => {
      let modeloId;
      
      await new Promise((resolve, reject) => {
        testDb.run('INSERT INTO modelos (nombre, activa) VALUES (?, ?)', ['Modelo Activo', 1], function(err) {
          if (err) reject(err);
          else {
            modeloId = this.lastID;
            resolve();
          }
        });
      });

      await new Promise((resolve, reject) => {
        testDb.run('UPDATE modelos SET activa = 0 WHERE id = ?', [modeloId], function(err) {
          if (err) reject(err);
          else {
            expect(this.changes).toBe(1);
            resolve();
          }
        });
      });
    });
  });

  describe('Contactos DB', () => {
    beforeEach(async () => {
      await new Promise((resolve, reject) => {
        testDb.run('DELETE FROM contactos', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('debería crear un contacto', async () => {
      const contactoData = {
        nombre: 'Juan Pérez',
        email: 'juan@example.com',
        telefono: '123456789',
        empresa: 'Empresa Test',
        mensaje: 'Mensaje de prueba'
      };

      await new Promise((resolve, reject) => {
        testDb.run(
          `INSERT INTO contactos (nombre, email, telefono, empresa, mensaje)
           VALUES (?, ?, ?, ?, ?)`,
          [
            contactoData.nombre,
            contactoData.email,
            contactoData.telefono,
            contactoData.empresa,
            contactoData.mensaje
          ],
          function(err) {
            if (err) reject(err);
            else {
              expect(this.lastID).toBeGreaterThan(0);
              resolve();
            }
          }
        );
      });
    });

    it('debería obtener todos los contactos', async () => {
      await new Promise((resolve) => {
        testDb.run('INSERT INTO contactos (nombre, email) VALUES (?, ?)', ['Contacto 1', 'c1@test.com']);
        testDb.run('INSERT INTO contactos (nombre, email) VALUES (?, ?)', ['Contacto 2', 'c2@test.com'], () => {
          resolve();
        });
      });

      await new Promise((resolve, reject) => {
        testDb.all('SELECT * FROM contactos ORDER BY fecha DESC', (err, rows) => {
          if (err) reject(err);
          else {
            expect(rows.length).toBeGreaterThanOrEqual(2);
            resolve();
          }
        });
      });
    });
  });

  describe('Usuarios DB', () => {
    beforeEach(async () => {
      await new Promise((resolve, reject) => {
        testDb.run('DELETE FROM usuarios', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('debería crear un usuario con contraseña hasheada', async () => {
      const password = 'test123';
      const hashedPassword = await bcrypt.hash(password, 10);

      await new Promise((resolve, reject) => {
        testDb.run(
          'INSERT INTO usuarios (username, password, nombre) VALUES (?, ?, ?)',
          ['testuser', hashedPassword, 'Test User'],
          function(err) {
            if (err) reject(err);
            else {
              expect(this.lastID).toBeGreaterThan(0);
              resolve();
            }
          }
        );
      });
    });

    it('debería verificar contraseña correctamente', async () => {
      const password = 'test123';
      const hashedPassword = await bcrypt.hash(password, 10);

      let userId;
      await new Promise((resolve, reject) => {
        testDb.run(
          'INSERT INTO usuarios (username, password, nombre) VALUES (?, ?, ?)',
          ['testuser', hashedPassword, 'Test User'],
          function(err) {
            if (err) reject(err);
            else {
              userId = this.lastID;
              resolve();
            }
          }
        );
      });

      await new Promise((resolve, reject) => {
        testDb.get('SELECT * FROM usuarios WHERE id = ?', [userId], async (err, user) => {
          if (err) reject(err);
          else {
            const isValid = await bcrypt.compare(password, user.password);
            expect(isValid).toBe(true);
            
            const isInvalid = await bcrypt.compare('wrongpassword', user.password);
            expect(isInvalid).toBe(false);
            
            resolve();
          }
        });
      });
    });

    it('debería obtener usuario por username', async () => {
      const password = 'test123';
      const hashedPassword = await bcrypt.hash(password, 10);

      await new Promise((resolve, reject) => {
        testDb.run(
          'INSERT INTO usuarios (username, password, nombre) VALUES (?, ?, ?)',
          ['testuser', hashedPassword, 'Test User'],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      await new Promise((resolve, reject) => {
        testDb.get('SELECT * FROM usuarios WHERE username = ?', ['testuser'], (err, user) => {
          if (err) reject(err);
          else {
            expect(user).toBeDefined();
            expect(user.username).toBe('testuser');
            expect(user.nombre).toBe('Test User');
            resolve();
          }
        });
      });
    });
  });
});
