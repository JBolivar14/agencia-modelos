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
          email TEXT,
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
          confirmado INTEGER DEFAULT 0,
          confirm_token TEXT,
          confirm_token_expira DATETIME,
          confirmado_en DATETIME,
          fecha DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Tabla de auditoría (eventos de seguridad/operación)
        db.run(`
          CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            event_type TEXT NOT NULL,
            severity TEXT DEFAULT 'info',
            actor_user_id INTEGER,
            actor_username TEXT,
            ip TEXT,
            user_agent TEXT,
            path TEXT,
            method TEXT,
            meta TEXT,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `, (auditErr) => {
          if (auditErr) {
            reject(auditErr);
            return;
          }

          // Índice para consultas por fecha
          db.run(`CREATE INDEX IF NOT EXISTS idx_audit_logs_creado_en ON audit_logs(creado_en)`);

          // Migración ligera: columnas de confirmación en contactos (instalaciones viejas)
          db.all(`PRAGMA table_info(contactos)`, (schemaErr2, cols2) => {
            if (schemaErr2) {
              reject(schemaErr2);
              return;
            }

            const has = (name) => Array.isArray(cols2) && cols2.some((c) => c && c.name === name);
            const ops = [];

            if (!has('confirmado')) ops.push(`ALTER TABLE contactos ADD COLUMN confirmado INTEGER DEFAULT 0`);
            if (!has('confirm_token')) ops.push(`ALTER TABLE contactos ADD COLUMN confirm_token TEXT`);
            if (!has('confirm_token_expira')) ops.push(`ALTER TABLE contactos ADD COLUMN confirm_token_expira DATETIME`);
            if (!has('confirmado_en')) ops.push(`ALTER TABLE contactos ADD COLUMN confirmado_en DATETIME`);

            const ensureIdx = () => {
              db.run(`CREATE INDEX IF NOT EXISTS idx_contactos_confirmado ON contactos(confirmado)`);
              db.run(`CREATE INDEX IF NOT EXISTS idx_contactos_confirm_token ON contactos(confirm_token)`);
            };

            if (ops.length === 0) {
              ensureIdx();
              return;
            }

            // Ejecutar ALTERs en serie
            db.serialize(() => {
              ops.forEach((sql) => db.run(sql));
              ensureIdx();
            });
          });

          // Migración ligera: agregar email a usuarios si falta (instalaciones viejas)
          db.all(`PRAGMA table_info(usuarios)`, (schemaErr, cols) => {
            if (schemaErr) {
              reject(schemaErr);
              return;
            }

            const hasEmail = Array.isArray(cols) && cols.some((c) => c && c.name === 'email');
            const ensureEmailIndex = (cb) => db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)`, cb);

            if (hasEmail) {
              ensureEmailIndex(() => {});
              // Continuar con creación de admin
              return createDefaultAdmin();
            }

            db.run(`ALTER TABLE usuarios ADD COLUMN email TEXT`, (alterErr) => {
              if (alterErr) {
                reject(alterErr);
                return;
              }
              ensureEmailIndex(() => {});
              return createDefaultAdmin();
            });
          });
        
          function createDefaultAdmin() {
            // Crear usuario admin por defecto si no existe
            db.get('SELECT COUNT(*) as count FROM usuarios', (err, row) => {
              if (err) {
                reject(err);
                return;
              }
              
              if (row.count === 0) {
                bcrypt.hash('admin123', 10).then(hashedPassword => {
                  db.run(
                    `INSERT INTO usuarios (username, email, password, nombre) VALUES (?, ?, ?, ?)`,
                    ['admin', null, hashedPassword, 'Administrador'],
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
  hardDelete: (id) => {
    return new Promise((resolve, reject) => {
      const modeloId = parseInt(id, 10);
      if (!Number.isFinite(modeloId) || modeloId <= 0) {
        resolve({ changes: 0 });
        return;
      }

      db.serialize(() => {
        // Borrar fotos asociadas primero (más seguro si FK no está activo)
        db.run('DELETE FROM modelo_fotos WHERE modelo_id = ?', [modeloId], function (err1) {
          if (err1) {
            reject(err1);
            return;
          }
          db.run('DELETE FROM modelos WHERE id = ?', [modeloId], function (err2) {
            if (err2) reject(err2);
            else resolve({ changes: this.changes || 0 });
          });
        });
      });
    });
  },
  hardDeleteMany: (ids) => {
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

      db.serialize(() => {
        db.run(`DELETE FROM modelo_fotos WHERE modelo_id IN (${placeholders})`, cleanIds, function (err1) {
          if (err1) {
            reject(err1);
            return;
          }
          db.run(`DELETE FROM modelos WHERE id IN (${placeholders})`, cleanIds, function (err2) {
            if (err2) reject(err2);
            else resolve({ changes: this.changes || 0 });
          });
        });
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
        `INSERT INTO contactos (nombre, email, telefono, empresa, mensaje, confirmado)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          data.nombre,
          data.email,
          data.telefono || null,
          data.empresa || null,
          data.mensaje || null,
          data.confirmado ? 1 : 0
        ],
        function(err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        }
      );
    });
  },
  setConfirmToken: ({ id, token, expiraEn }) => {
    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE contactos SET confirm_token = ?, confirm_token_expira = ?, confirmado = 0, confirmado_en = NULL WHERE id = ?`,
        [token, expiraEn || null, id],
        function (err) {
          if (err) reject(err);
          else resolve({ changes: this.changes || 0 });
        }
      );
    });
  },
  confirmByToken: ({ token }) => {
    return new Promise((resolve, reject) => {
      const t = typeof token === 'string' ? token.trim() : '';
      if (!t) {
        resolve({ ok: false, reason: 'missing' });
        return;
      }

      db.get(
        `SELECT * FROM contactos WHERE confirm_token = ?`,
        [t],
        (err, row) => {
          if (err) {
            reject(err);
            return;
          }
          if (!row) {
            resolve({ ok: false, reason: 'not_found' });
            return;
          }

          const exp = row.confirm_token_expira ? new Date(row.confirm_token_expira) : null;
          if (exp && !Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
            resolve({ ok: false, reason: 'expired' });
            return;
          }

          db.run(
            `UPDATE contactos SET confirmado = 1, confirmado_en = CURRENT_TIMESTAMP, confirm_token = NULL, confirm_token_expira = NULL WHERE id = ?`,
            [row.id],
            function (updErr) {
              if (updErr) reject(updErr);
              else resolve({ ok: true, contactoId: row.id, email: row.email });
            }
          );
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
  getByEmail: (email) => {
    return new Promise((resolve, reject) => {
      const norm = typeof email === 'string' ? email.trim().toLowerCase() : '';
      if (!norm) {
        resolve(null);
        return;
      }
      db.get('SELECT * FROM usuarios WHERE LOWER(email) = ?', [norm], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  },
  create: ({ username, email, passwordHash, nombre }) => {
    return new Promise((resolve, reject) => {
      const u = typeof username === 'string' ? username.trim() : '';
      const e = typeof email === 'string' ? email.trim().toLowerCase() : null;
      const n = typeof nombre === 'string' ? nombre.trim() : '';
      if (!u || !passwordHash || !n) {
        reject(new Error('Datos inválidos para crear usuario'));
        return;
      }

      db.run(
        `INSERT INTO usuarios (username, email, password, nombre) VALUES (?, ?, ?, ?)`,
        [u, e || null, passwordHash, n],
        function (err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        }
      );
    });
  },
  getAllAdmin: () => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT id, username, email, nombre, creado_en FROM usuarios ORDER BY creado_en DESC',
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows || []);
        }
      );
    });
  },
  verifyPassword: async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
};

// Funciones para auditoría
const auditLogsDB = {
  create: (entry) => {
    return new Promise((resolve, reject) => {
      const metaJson = entry?.meta ? JSON.stringify(entry.meta).substring(0, 4000) : null;
      db.run(
        `INSERT INTO audit_logs (event_type, severity, actor_user_id, actor_username, ip, user_agent, path, method, meta)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry?.event_type || 'unknown',
          entry?.severity || 'info',
          entry?.actor_user_id ?? null,
          entry?.actor_username ?? null,
          entry?.ip ?? null,
          entry?.user_agent ?? null,
          entry?.path ?? null,
          entry?.method ?? null,
          metaJson
        ],
        function (err) {
          if (err) reject(err);
          else resolve({ lastID: this.lastID, changes: this.changes });
        }
      );
    });
  },
  getAllAdmin: (options = {}) => {
    return new Promise((resolve, reject) => {
      const q = typeof options.q === 'string' ? options.q.trim().toLowerCase() : '';
      const eventType = typeof options.eventType === 'string' ? options.eventType.trim().toLowerCase() : '';
      const severity = typeof options.severity === 'string' ? options.severity.trim().toLowerCase() : '';
      const from = typeof options.from === 'string' ? options.from.trim() : '';
      const to = typeof options.to === 'string' ? options.to.trim() : '';

      const page = Number.isFinite(Number(options.page)) ? Math.max(1, parseInt(options.page, 10)) : 1;
      const pageSize = Number.isFinite(Number(options.pageSize)) ? Math.min(200, Math.max(1, parseInt(options.pageSize, 10))) : 50;
      const offset = (page - 1) * pageSize;

      const where = [];
      const params = [];

      if (eventType) {
        where.push('LOWER(event_type) = ?');
        params.push(eventType);
      }

      if (severity) {
        where.push('LOWER(severity) = ?');
        params.push(severity);
      }

      if (from) {
        where.push(`DATE(creado_en) >= DATE(?)`);
        params.push(from);
      }

      if (to) {
        where.push(`DATE(creado_en) <= DATE(?)`);
        params.push(to);
      }

      if (q) {
        where.push(
          '(' +
            [
              'LOWER(event_type) LIKE ?',
              'LOWER(actor_username) LIKE ?',
              'LOWER(ip) LIKE ?',
              'LOWER(path) LIKE ?',
              'LOWER(method) LIKE ?'
            ].join(' OR ') +
          ')'
        );
        const like = `%${q}%`;
        params.push(like, like, like, like, like);
      }

      const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

      db.get(`SELECT COUNT(*) as count FROM audit_logs ${whereSql}`, params, (countErr, row) => {
        if (countErr) {
          reject(countErr);
          return;
        }

        const total = row?.count || 0;

        db.all(
          `SELECT * FROM audit_logs ${whereSql} ORDER BY creado_en DESC LIMIT ? OFFSET ?`,
          [...params, pageSize, offset],
          (err, rows) => {
            if (err) reject(err);
            else resolve({ rows: rows || [], total });
          }
        );
      });
    });
  }
};

// Inicializar (llamar una vez al inicio)
initDatabase().catch(err => {
  console.error('Error inicializando base de datos:', err);
});

module.exports = { db, modelosDB, contactosDB, usuariosDB, modeloFotosDB, auditLogsDB, initDatabase };
