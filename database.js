const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

const dbPath = path.join(__dirname, 'agencia.db');
const db = new sqlite3.Database(dbPath);

// Inicializar tablas
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Tabla de usuarios (administradores)
      db.run(`
        CREATE TABLE IF NOT EXISTS usuarios (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          nombre TEXT NOT NULL,
          creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Tabla de modelos
      db.run(`
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

      // Tabla de fotos de modelos (múltiples fotos por modelo)
      db.run(`
        CREATE TABLE IF NOT EXISTS modelo_fotos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          modelo_id INTEGER NOT NULL,
          url TEXT NOT NULL,
          orden INTEGER DEFAULT 0,
          creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (modelo_id) REFERENCES modelos(id) ON DELETE CASCADE
        )
      `);

      // Tabla de contactos (prospectos que llenan el formulario)
      db.run(`
        CREATE TABLE IF NOT EXISTS contactos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          email TEXT NOT NULL,
          telefono TEXT,
          empresa TEXT,
          mensaje TEXT,
          fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Crear usuario admin por defecto si no existe
        db.get('SELECT COUNT(*) as count FROM usuarios', (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (row.count === 0) {
            bcrypt.hash('admin123', 10).then(hashedPassword => {
              db.run(
                `INSERT INTO usuarios (username, password, nombre) VALUES (?, ?, ?)`,
                ['admin', hashedPassword, 'Administrador'],
                (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    console.log('✅ Usuario admin creado (username: admin, password: admin123)');
                    resolve();
                  }
                }
              );
            }).catch(reject);
          } else {
            resolve();
          }
        });
      });
    });
  });
}

// Funciones para modelos
const modelosDB = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM modelos WHERE activa = 1 ORDER BY creado_en DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  getAllAdmin: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM modelos ORDER BY creado_en DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM modelos WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  create: (data) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO modelos (nombre, apellido, email, telefono, edad, altura, medidas, ciudad, foto, descripcion)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          data.nombre,
          data.apellido || null,
          data.email || null,
          data.telefono || null,
          data.edad || null,
          data.altura || null,
          data.medidas || null,
          data.ciudad || null,
          data.foto || null,
          data.descripcion || null
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        }
      );
    });
  },
  update: (id, data) => {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE modelos 
         SET nombre = ?, apellido = ?, email = ?, telefono = ?, edad = ?, 
             altura = ?, medidas = ?, ciudad = ?, foto = ?, descripcion = ?, activa = ?
         WHERE id = ?`,
        [
          data.nombre,
          data.apellido || null,
          data.email || null,
          data.telefono || null,
          data.edad || null,
          data.altura || null,
          data.medidas || null,
          data.ciudad || null,
          data.foto || null,
          data.descripcion || null,
          data.activa !== undefined ? data.activa : 1,
          id
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  },
  delete: (id) => {
    return new Promise((resolve, reject) => {
      db.run('UPDATE modelos SET activa = 0 WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }
};

// Funciones para contactos
const contactosDB = {
  getAll: () => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM contactos ORDER BY fecha DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  getById: (id) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM contactos WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  create: (data) => {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO contactos (nombre, email, telefono, empresa, mensaje)
         VALUES (?, ?, ?, ?, ?)`,
        [
          data.nombre,
          data.email,
          data.telefono || null,
          data.empresa || null,
          data.mensaje || null
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        }
      );
    });
  }
};

// Funciones para fotos de modelos
const modeloFotosDB = {
  getByModeloId: (modeloId) => {
    return new Promise((resolve, reject) => {
      db.all('SELECT * FROM modelo_fotos WHERE modelo_id = ? ORDER BY orden ASC, creado_en ASC', [modeloId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  },
  create: (modeloId, url, orden = 0) => {
    return new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO modelo_fotos (modelo_id, url, orden) VALUES (?, ?, ?)',
        [modeloId, url, orden],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        }
      );
    });
  },
  createMultiple: (modeloId, urls) => {
    return new Promise((resolve, reject) => {
      if (!urls || urls.length === 0) {
        resolve({ changes: 0 });
        return;
      }
      
      // Filtrar URLs válidas primero
      const urlsValidas = urls.filter(url => url && url.trim());
      
      if (urlsValidas.length === 0) {
        resolve({ changes: 0 });
        return;
      }
      
      const stmt = db.prepare('INSERT INTO modelo_fotos (modelo_id, url, orden) VALUES (?, ?, ?)');
      let completed = 0;
      let errors = [];
      const total = urlsValidas.length;
      
      urlsValidas.forEach((url, index) => {
        stmt.run([modeloId, url.trim(), index], (err) => {
          if (err) {
            errors.push(err);
            console.error('Error insertando foto:', err);
          }
          completed++;
          
          // Solo finalizar cuando todas las operaciones estén completas
          if (completed === total) {
            stmt.finalize((finalizeErr) => {
              if (finalizeErr) {
                reject(finalizeErr);
              } else if (errors.length > 0) {
                reject(errors[0]);
              } else {
                resolve({ changes: completed });
              }
            });
          }
        });
      });
    });
  },
  delete: (fotoId) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM modelo_fotos WHERE id = ?', [fotoId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },
  deleteByModeloId: (modeloId) => {
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM modelo_fotos WHERE modelo_id = ?', [modeloId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  },
  updateOrden: (fotoId, orden) => {
    return new Promise((resolve, reject) => {
      db.run('UPDATE modelo_fotos SET orden = ? WHERE id = ?', [orden, fotoId], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }
};

// Funciones para usuarios
const usuariosDB = {
  getByUsername: (username) => {
    return new Promise((resolve, reject) => {
      db.get('SELECT * FROM usuarios WHERE username = ?', [username], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  verifyPassword: async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
};

// Inicializar (llamar una vez al inicio)
initDatabase().catch(err => {
  console.error('Error inicializando base de datos:', err);
});

module.exports = { db, modelosDB, contactosDB, usuariosDB, modeloFotosDB, initDatabase };
