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
  getAllAdmin: (options = {}) => {
    return new Promise((resolve, reject) => {
      const hasOptions =
        options &&
        (options.q ||
          options.ciudad ||
          options.activa !== undefined ||
          options.page ||
          options.pageSize ||
          options.sortBy ||
          options.sortDir);

      // Compat: si no hay opciones, devolver todo como antes
      if (!hasOptions) {
        db.all('SELECT * FROM modelos ORDER BY creado_en DESC', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
        return;
      }

      const q = typeof options.q === 'string' ? options.q.trim().toLowerCase() : '';
      const ciudad = typeof options.ciudad === 'string' ? options.ciudad.trim().toLowerCase() : '';
      const activa = options.activa;

      const page = Number.isFinite(Number(options.page)) ? Math.max(1, parseInt(options.page, 10)) : 1;
      const pageSize = Number.isFinite(Number(options.pageSize)) ? Math.min(100, Math.max(1, parseInt(options.pageSize, 10))) : 20;

      const allowedSort = {
        creado_en: 'creado_en',
        nombre: 'nombre',
        ciudad: 'ciudad',
        edad: 'edad'
      };
      const sortBy = allowedSort[options.sortBy] || 'creado_en';
      const sortDir = String(options.sortDir || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const where = [];
      const params = [];

      if (typeof activa === 'boolean') {
        where.push('activa = ?');
        params.push(activa ? 1 : 0);
      }

      if (ciudad) {
        where.push('LOWER(ciudad) LIKE ?');
        params.push(`%${ciudad}%`);
      }

      if (q) {
        where.push(
          '(' +
            [
              'LOWER(nombre) LIKE ?',
              'LOWER(apellido) LIKE ?',
              'LOWER(email) LIKE ?',
              'LOWER(telefono) LIKE ?',
              'LOWER(ciudad) LIKE ?'
            ].join(' OR ') +
          ')'
        );
        const like = `%${q}%`;
        params.push(like, like, like, like, like);
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const offset = (page - 1) * pageSize;

      db.get(`SELECT COUNT(*) as count FROM modelos ${whereSql}`, params, (countErr, row) => {
        if (countErr) {
          reject(countErr);
          return;
        }

        const total = row?.count || 0;

        db.all(
          `SELECT * FROM modelos ${whereSql} ORDER BY ${sortBy} ${sortDir} LIMIT ? OFFSET ?`,
          [...params, pageSize, offset],
          (err, rows) => {
            if (err) reject(err);
            else resolve({ rows: rows || [], total });
          }
        );
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
  },
  setActivaMany: (ids, activa) => {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(ids) || ids.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      const cleanIds = [...new Set(ids)]
        .map((x) => parseInt(x, 10))
        .filter((x) => Number.isFinite(x) && x > 0);

      if (cleanIds.length === 0) {
        resolve({ changes: 0 });
        return;
      }

      const placeholders = cleanIds.map(() => '?').join(',');
      const value = activa ? 1 : 0;

      db.run(
        `UPDATE modelos SET activa = ? WHERE id IN (${placeholders})`,
        [value, ...cleanIds],
        function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes || 0 });
        }
      );
    });
  }
};

// Funciones para contactos
const contactosDB = {
  getAll: (options = {}) => {
    return new Promise((resolve, reject) => {
      const hasOptions =
        options &&
        (options.q ||
          options.from ||
          options.to ||
          options.page ||
          options.pageSize ||
          options.sortBy ||
          options.sortDir);

      // Compat: si no hay opciones, devolver todo como antes
      if (!hasOptions) {
        db.all('SELECT * FROM contactos ORDER BY fecha DESC', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
        return;
      }

      const q = typeof options.q === 'string' ? options.q.trim().toLowerCase() : '';
      const from = typeof options.from === 'string' ? options.from.trim() : '';
      const to = typeof options.to === 'string' ? options.to.trim() : '';

      const page = Number.isFinite(Number(options.page)) ? Math.max(1, parseInt(options.page, 10)) : 1;
      const pageSize = Number.isFinite(Number(options.pageSize)) ? Math.min(100, Math.max(1, parseInt(options.pageSize, 10))) : 20;

      const allowedSort = {
        fecha: 'fecha',
        nombre: 'nombre',
        email: 'email'
      };
      const sortBy = allowedSort[options.sortBy] || 'fecha';
      const sortDir = String(options.sortDir || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

      const where = [];
      const params = [];

      if (from) {
        where.push('DATE(fecha) >= DATE(?)');
        params.push(from);
      }

      if (to) {
        where.push('DATE(fecha) <= DATE(?)');
        params.push(to);
      }

      if (q) {
        where.push(
          '(' +
            [
              'LOWER(nombre) LIKE ?',
              'LOWER(email) LIKE ?',
              'LOWER(telefono) LIKE ?',
              'LOWER(empresa) LIKE ?',
              'LOWER(mensaje) LIKE ?'
            ].join(' OR ') +
          ')'
        );
        const like = `%${q}%`;
        params.push(like, like, like, like, like);
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const offset = (page - 1) * pageSize;

      db.get(`SELECT COUNT(*) as count FROM contactos ${whereSql}`, params, (countErr, row) => {
        if (countErr) {
          reject(countErr);
          return;
        }

        const total = row?.count || 0;

        db.all(
          `SELECT * FROM contactos ${whereSql} ORDER BY ${sortBy} ${sortDir} LIMIT ? OFFSET ?`,
          [...params, pageSize, offset],
          (err, rows) => {
            if (err) reject(err);
            else resolve({ rows: rows || [], total });
          }
        );
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
