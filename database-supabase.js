const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcrypt');

// Configuración de Supabase desde variables de entorno
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    'Variables de entorno de Supabase no configuradas. ' +
    'Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.'
  );
}

// Cliente de Supabase (usar service role para operaciones admin)
const supabase = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      persistSession: false
    }
  }
);

// Inicializar base de datos (crear usuario admin si no existe)
async function initDatabase() {
  try {
    // Verificar si existe usuario admin
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id')
      .limit(1);

    if (error && error.code !== 'PGRST116') { // PGRST116 = tabla no existe
      throw error;
    }

    // Si no hay usuarios, crear admin
    if (!usuarios || usuarios.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const payloads = [
        { username: 'admin', password: hashedPassword, nombre: 'Administrador', rol: 'admin', confirmado: true },
        { username: 'admin', password: hashedPassword, nombre: 'Administrador' }
      ];

      let insertError = null;
      for (const p of payloads) {
        // eslint-disable-next-line no-await-in-loop
        const { error } = await supabase.from('usuarios').insert(p);
        if (!error) {
          insertError = null;
          break;
        }
        insertError = error;
        const msg = String(error?.message || '').toLowerCase();
        const isColumnProblem = msg.includes('column') || msg.includes('does not exist') || msg.includes('unknown');
        if (!isColumnProblem) break;
      }

      if (insertError) {
        console.error('Error creando usuario admin:', insertError);
      } else {
        console.log('✅ Usuario admin creado (username: admin, password: admin123)');
      }
    }
  } catch (error) {
    console.error('Error inicializando base de datos:', error);
    throw error;
  }
}

// Funciones para usuarios
const usuariosDB = {
  getByUsername: async (username) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      throw error;
    }
    return data;
  },
  getByEmail: async (email) => {
    const norm = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!norm) return null;

    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', norm)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No encontrado
      // Si la columna email no existe (migración faltante), no romper login por username
      const msg = String(error?.message || '');
      if (msg.toLowerCase().includes('column') && msg.toLowerCase().includes('email')) {
        return null;
      }
      throw error;
    }
    return data;
  },
  create: async ({ username, email, passwordHash, nombre, rol, confirmado, confirm_token, confirm_token_expira, confirmado_en, modelo_id }) => {
    const payload = {
      username: typeof username === 'string' ? username.trim() : null,
      password: passwordHash,
      nombre: typeof nombre === 'string' ? nombre.trim() : null
    };

    if (email !== undefined) {
      payload.email = typeof email === 'string' ? email.trim().toLowerCase() : null;
    }

    if (rol !== undefined) payload.rol = rol;
    if (confirmado !== undefined) payload.confirmado = !!confirmado;
    if (confirm_token !== undefined) payload.confirm_token = confirm_token;
    if (confirm_token_expira !== undefined) payload.confirm_token_expira = confirm_token_expira;
    if (confirmado_en !== undefined) payload.confirmado_en = confirmado_en;
    if (modelo_id !== undefined) payload.modelo_id = modelo_id;

    const minimal = {
      username: payload.username,
      email: payload.email,
      password: payload.password,
      nombre: payload.nombre
    };

    // Intentar insert con columnas nuevas; fallback si aún no existen
    const tryPayloads = [payload, minimal];

    let lastErr = null;
    for (const p of tryPayloads) {
      // eslint-disable-next-line no-await-in-loop
      const { data, error } = await supabase
        .from('usuarios')
        .insert(p)
        .select('id')
        .single();

      if (!error) return { lastID: data?.id, changes: 1 };
      lastErr = error;
      const msg = String(error?.message || '').toLowerCase();
      const isColumnProblem = msg.includes('column') || msg.includes('does not exist') || msg.includes('unknown');
      if (!isColumnProblem) break;
    }

    throw lastErr;
  },
  getAllAdmin: async () => {
    const candidates = [
      { fields: 'id, username, email, nombre, rol, creado_en', order: 'creado_en', map: (u) => u },
      { fields: 'id, username, nombre, rol, creado_en', order: 'creado_en', map: (u) => ({ ...u, email: null }) },
      {
        fields: 'id, username, email, nombre, rol, created_at',
        order: 'created_at',
        map: (u) => {
          const { created_at, ...rest } = u || {};
          return { ...rest, email: rest.email ?? null, creado_en: created_at ?? null };
        }
      },
      {
        fields: 'id, username, nombre, rol, created_at',
        order: 'created_at',
        map: (u) => {
          const { created_at, ...rest } = u || {};
          return { ...rest, email: null, creado_en: created_at ?? null };
        }
      }
    ];

    let lastError = null;
    // 1) Intentar con filtro rol=admin (si la columna existe)
    for (const c of candidates) {
      // eslint-disable-next-line no-await-in-loop
      const { data, error } = await supabase
        .from('usuarios')
        .select(c.fields)
        .eq('rol', 'admin')
        .order(c.order, { ascending: false });

      if (!error) return (data || []).map(c.map);

      const msg = String(error?.message || '').toLowerCase();
      const isColumnProblem = msg.includes('column') || msg.includes('does not exist') || msg.includes('unknown');
      lastError = error;
      if (!isColumnProblem) break;
    }

    // 2) Fallback sin rol (instalaciones viejas) → asumimos que todos son admins
    const legacyCandidates = [
      { fields: 'id, username, email, nombre, creado_en', order: 'creado_en', map: (u) => ({ ...u, rol: 'admin' }) },
      { fields: 'id, username, nombre, creado_en', order: 'creado_en', map: (u) => ({ ...u, email: null, rol: 'admin' }) },
      {
        fields: 'id, username, email, nombre, created_at',
        order: 'created_at',
        map: (u) => {
          const { created_at, ...rest } = u || {};
          return { ...rest, email: rest.email ?? null, rol: 'admin', creado_en: created_at ?? null };
        }
      },
      {
        fields: 'id, username, nombre, created_at',
        order: 'created_at',
        map: (u) => {
          const { created_at, ...rest } = u || {};
          return { ...rest, email: null, rol: 'admin', creado_en: created_at ?? null };
        }
      }
    ];

    for (const c of legacyCandidates) {
      // eslint-disable-next-line no-await-in-loop
      const { data, error } = await supabase
        .from('usuarios')
        .select(c.fields)
        .order(c.order, { ascending: false });
      if (!error) return (data || []).map(c.map);
      lastError = error;
    }

    throw lastError;
  },
  getById: async (id) => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },
  setConfirmToken: async ({ id, token, expiraEn }) => {
    const payload = {
      confirm_token: token,
      confirm_token_expira: expiraEn || null
    };
    const { error } = await supabase.from('usuarios').update(payload).eq('id', id);
    if (error) throw error;
    return { changes: 1 };
  },
  confirmByToken: async ({ token }) => {
    const t = typeof token === 'string' ? token.trim() : '';
    if (!t) return { ok: false, reason: 'invalid' };

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, confirmado, confirm_token_expira')
      .eq('confirm_token', t)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { ok: false, reason: 'invalid' };
    if (data.confirmado === true) return { ok: false, reason: 'already' };

    if (data.confirm_token_expira) {
      const exp = new Date(data.confirm_token_expira);
      if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
        return { ok: false, reason: 'expired' };
      }
    }

    const { error: updErr } = await supabase
      .from('usuarios')
      .update({
        confirmado: true,
        confirm_token: null,
        confirm_token_expira: null,
        confirmado_en: new Date().toISOString()
      })
      .eq('id', data.id);

    if (updErr) throw updErr;
    return { ok: true, usuarioId: data.id };
  },
  setResetToken: async ({ id, token, expiraEn }) => {
    const payload = {
      reset_token: token,
      reset_token_expira: expiraEn || null,
      reset_solicitado_en: new Date().toISOString()
    };
    const { error } = await supabase.from('usuarios').update(payload).eq('id', id);
    if (!error) return { changes: 1 };

    // Compat: si no existe reset_* todavía, usar confirm_token como fallback (solo para usuarios confirmados)
    const msg = String(error?.message || '').toLowerCase();
    const isColumnProblem = msg.includes('column') || msg.includes('does not exist') || msg.includes('unknown');
    if (!isColumnProblem) throw error;

    const { error: fbErr } = await supabase
      .from('usuarios')
      .update({
        confirm_token: token,
        confirm_token_expira: expiraEn || null
      })
      .eq('id', id);

    if (fbErr) throw fbErr;
    return { changes: 1, fallback: 'confirm_token' };
  },
  resetPasswordByToken: async ({ token, passwordHash }) => {
    const t = typeof token === 'string' ? token.trim() : '';
    if (!t || !passwordHash) return { ok: false, reason: 'invalid' };

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, reset_token_expira')
      .eq('reset_token', t)
      .limit(1)
      .maybeSingle();

    if (!error) {
      if (!data) return { ok: false, reason: 'invalid' };

      if (data.reset_token_expira) {
        const exp = new Date(data.reset_token_expira);
        if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
          return { ok: false, reason: 'expired' };
        }
      }

      const { error: updErr } = await supabase
        .from('usuarios')
        .update({
          password: passwordHash,
          reset_token: null,
          reset_token_expira: null,
          reset_solicitado_en: null,
          reset_en: new Date().toISOString()
        })
        .eq('id', data.id);

      if (updErr) throw updErr;
      return { ok: true, usuarioId: data.id };
    }

    // Compat: si no existe reset_* todavía, usar confirm_token como fallback
    const msg = String(error?.message || '').toLowerCase();
    const isColumnProblem = msg.includes('column') || msg.includes('does not exist') || msg.includes('unknown');
    if (!isColumnProblem) throw error;

    const { data: fbData, error: fbError } = await supabase
      .from('usuarios')
      .select('id, confirm_token_expira')
      .eq('confirm_token', t)
      .limit(1)
      .maybeSingle();

    if (fbError) throw fbError;
    if (!fbData) return { ok: false, reason: 'invalid' };

    if (fbData.confirm_token_expira) {
      const exp = new Date(fbData.confirm_token_expira);
      if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
        return { ok: false, reason: 'expired' };
      }
    }

    const { error: updErr } = await supabase
      .from('usuarios')
      .update({
        password: passwordHash,
        confirm_token: null,
        confirm_token_expira: null
      })
      .eq('id', fbData.id);

    if (updErr) throw updErr;
    return { ok: true, usuarioId: fbData.id, fallback: 'confirm_token' };
  },
  verifyPassword: async (plainPassword, hashedPassword) => {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
};

// Funciones para modelos
const modelosDB = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('modelos')
      .select('*')
      .eq('activa', true)
      .order('creado_en', { ascending: false });

    if (error) throw error;
    return data || [];
  },
  getByEmail: async (email) => {
    const norm = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (!norm) return null;

    const { data, error } = await supabase
      .from('modelos')
      .select('*')
      .eq('email', norm)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  },
  getAllAdmin: async (options = {}) => {
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
      const { data, error } = await supabase
        .from('modelos')
        .select('*')
        .order('creado_en', { ascending: false });

      if (error) throw error;
      return data || [];
    }

    const q = typeof options.q === 'string' ? options.q.trim() : '';
    const ciudad = typeof options.ciudad === 'string' ? options.ciudad.trim() : '';
    const activa = options.activa;

    const page = Number.isFinite(Number(options.page)) ? Math.max(1, parseInt(options.page, 10)) : 1;
    const pageSize = Number.isFinite(Number(options.pageSize)) ? Math.min(100, Math.max(1, parseInt(options.pageSize, 10))) : 20;

    const allowedSort = new Set(['creado_en', 'nombre', 'ciudad', 'edad']);
    const sortBy = allowedSort.has(options.sortBy) ? options.sortBy : 'creado_en';
    const sortDir = String(options.sortDir || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('modelos')
      .select('*', { count: 'exact' });

    if (typeof activa === 'boolean') {
      query = query.eq('activa', activa);
    }

    if (ciudad) {
      query = query.ilike('ciudad', `%${ciudad}%`);
    }

    if (q) {
      const qSafe = q.replace(/,/g, ' ');
      query = query.or(
        [
          `nombre.ilike.%${qSafe}%`,
          `apellido.ilike.%${qSafe}%`,
          `email.ilike.%${qSafe}%`,
          `telefono.ilike.%${qSafe}%`,
          `ciudad.ilike.%${qSafe}%`
        ].join(',')
      );
    }

    query = query.order(sortBy, { ascending: sortDir === 'asc' }).range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return { rows: data || [], total: count || 0 };
  },
  getById: async (id) => {
    const { data, error } = await supabase
      .from('modelos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },
  create: async (data) => {
    const { data: result, error } = await supabase
      .from('modelos')
      .insert({
        nombre: data.nombre,
        apellido: data.apellido || null,
        email: data.email || null,
        telefono: data.telefono || null,
        edad: data.edad || null,
        altura: data.altura || null,
        medidas: data.medidas || null,
        ciudad: data.ciudad || null,
        foto: data.foto || null,
        descripcion: data.descripcion || null,
        activa: data.activa !== undefined ? data.activa : true
      })
      .select()
      .single();

    if (error) throw error;
    return { lastID: result.id, changes: 1 };
  },
  update: async (id, data) => {
    const { data: result, error } = await supabase
      .from('modelos')
      .update({
        nombre: data.nombre,
        apellido: data.apellido || null,
        email: data.email || null,
        telefono: data.telefono || null,
        edad: data.edad || null,
        altura: data.altura || null,
        medidas: data.medidas || null,
        ciudad: data.ciudad || null,
        foto: data.foto || null,
        descripcion: data.descripcion || null,
        activa: data.activa !== undefined ? data.activa : true
      })
      .eq('id', id)
      .select();

    if (error) throw error;
    return { changes: result?.length || 0 };
  },
  delete: async (id) => {
    // Soft delete: marcar como inactiva
    const { data, error } = await supabase
      .from('modelos')
      .update({ activa: false })
      .eq('id', id)
      .select();

    if (error) throw error;
    return { changes: data?.length || 0 };
  },
  hardDelete: async (id) => {
    // Hard delete: borrar registro (y fotos asociadas)
    // Nota: aunque exista FK cascade, borramos modelo_fotos explícitamente por seguridad
    const modeloId = parseInt(id, 10);
    if (!Number.isFinite(modeloId) || modeloId <= 0) return { changes: 0 };

    const { error: fotosErr } = await supabase.from('modelo_fotos').delete().eq('modelo_id', modeloId);
    if (fotosErr) throw fotosErr;

    const { data, error } = await supabase.from('modelos').delete().eq('id', modeloId).select('id');
    if (error) throw error;
    return { changes: data?.length || 0 };
  },
  hardDeleteMany: async (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return { changes: 0 };

    const cleanIds = [...new Set(ids)]
      .map((x) => parseInt(x, 10))
      .filter((x) => Number.isFinite(x) && x > 0);

    if (cleanIds.length === 0) return { changes: 0 };

    const { error: fotosErr } = await supabase.from('modelo_fotos').delete().in('modelo_id', cleanIds);
    if (fotosErr) throw fotosErr;

    const { data, error } = await supabase.from('modelos').delete().in('id', cleanIds).select('id');
    if (error) throw error;
    return { changes: data?.length || 0 };
  },
  setActivaMany: async (ids, activa) => {
    if (!Array.isArray(ids) || ids.length === 0) return { changes: 0 };

    const cleanIds = [...new Set(ids)]
      .map((x) => parseInt(x, 10))
      .filter((x) => Number.isFinite(x) && x > 0);

    if (cleanIds.length === 0) return { changes: 0 };

    const { data, error } = await supabase
      .from('modelos')
      .update({ activa: !!activa })
      .in('id', cleanIds)
      .select('id');

    if (error) throw error;
    return { changes: data?.length || 0 };
  }
};

// Funciones para contactos
const contactosDB = {
  getAll: async (options = {}) => {
    const hasOptions =
      options &&
      (options.q ||
        options.from ||
        options.to ||
        options.origen ||
        options.page ||
        options.pageSize ||
        options.sortBy ||
        options.sortDir);

    // Compat: si no hay opciones, devolver todo como antes
    if (!hasOptions) {
      const { data, error } = await supabase
        .from('contactos')
        .select('*')
        .order('fecha', { ascending: false });

      if (error) throw error;
      return data || [];
    }

    const q = typeof options.q === 'string' ? options.q.trim() : '';
    const qSafe = q.replace(/,/g, ' ');
    const from = typeof options.from === 'string' ? options.from.trim() : '';
    const to = typeof options.to === 'string' ? options.to.trim() : '';
    const origen = options.origen === 'sorteo' ? 'sorteo' : (options.origen === 'contacto' ? 'contacto' : '');

    const page = Number.isFinite(Number(options.page)) ? Math.max(1, parseInt(options.page, 10)) : 1;
    const pageSize = Number.isFinite(Number(options.pageSize)) ? Math.min(100, Math.max(1, parseInt(options.pageSize, 10))) : 20;

    const allowedSort = new Set(['fecha', 'nombre', 'email']);
    const sortBy = allowedSort.has(options.sortBy) ? options.sortBy : 'fecha';
    const sortDir = String(options.sortDir || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;

    let query = supabase
      .from('contactos')
      .select('*', { count: 'exact' });

    if (from) {
      query = query.gte('fecha', `${from}T00:00:00.000Z`);
    }

    if (to) {
      query = query.lte('fecha', `${to}T23:59:59.999Z`);
    }

    if (origen) {
      query = query.eq('origen', origen);
    }

    if (qSafe) {
      query = query.or(
        [
          `nombre.ilike.%${qSafe}%`,
          `email.ilike.%${qSafe}%`,
          `telefono.ilike.%${qSafe}%`,
          `empresa.ilike.%${qSafe}%`,
          `mensaje.ilike.%${qSafe}%`
        ].join(',')
      );
    }

    query = query.order(sortBy, { ascending: sortDir === 'asc' }).range(fromIdx, toIdx);

    const { data, error, count } = await query;
    if (error) throw error;

    return { rows: data || [], total: count || 0 };
  },
  getById: async (id) => {
    const { data, error } = await supabase
      .from('contactos')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  },
  create: async (data) => {
    const origen = data.origen === 'sorteo' ? 'sorteo' : 'contacto';
    const { data: result, error } = await supabase
      .from('contactos')
      .insert({
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono || null,
        empresa: data.empresa || null,
        mensaje: data.mensaje || null,
        confirmado: data.confirmado === true,
        origen
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase contactos insert error:', error.message, error.code, error.details);
      throw error;
    }
    if (!result || result.id == null) {
      const err = new Error('contactos insert did not return id');
      err.code = 'NO_INSERT_ID';
      throw err;
    }
    return { lastID: result.id, changes: 1 };
  },
  setConfirmToken: async ({ id, token, expiraEn }) => {
    const { data, error } = await supabase
      .from('contactos')
      .update({
        confirm_token: token,
        confirm_token_expira: expiraEn || null,
        confirmado: false,
        confirmado_en: null
      })
      .eq('id', id)
      .select('id')
      .single();

    if (error) throw error;
    return { changes: data ? 1 : 0 };
  },
  confirmByToken: async ({ token }) => {
    const t = typeof token === 'string' ? token.trim() : '';
    if (!t) return { ok: false, reason: 'missing' };

    const { data: row, error } = await supabase
      .from('contactos')
      .select('*')
      .eq('confirm_token', t)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return { ok: false, reason: 'not_found' };
      throw error;
    }

    if (row?.confirm_token_expira) {
      const exp = new Date(row.confirm_token_expira);
      if (!Number.isNaN(exp.getTime()) && exp.getTime() < Date.now()) {
        return { ok: false, reason: 'expired' };
      }
    }

    const { error: updError } = await supabase
      .from('contactos')
      .update({
        confirmado: true,
        confirmado_en: new Date().toISOString(),
        confirm_token: null,
        confirm_token_expira: null
      })
      .eq('id', row.id);

    if (updError) throw updError;
    return { ok: true, contactoId: row.id, email: row.email };
  }
};

// Funciones para fotos de modelos
const modeloFotosDB = {
  getByModeloId: async (modeloId) => {
    const { data, error } = await supabase
      .from('modelo_fotos')
      .select('*')
      .eq('modelo_id', modeloId)
      .order('orden', { ascending: true })
      .order('creado_en', { ascending: true });

    if (error) throw error;
    return data || [];
  },
  create: async (modeloId, url, orden = 0) => {
    const { data: result, error } = await supabase
      .from('modelo_fotos')
      .insert({
        modelo_id: modeloId,
        url: url,
        orden: orden
      })
      .select()
      .single();

    if (error) throw error;
    return { lastID: result.id, changes: 1 };
  },
  createMultiple: async (modeloId, urls) => {
    // Filtrar URLs vacías
    const urlsValidas = urls.filter(url => url && url.trim());
    
    if (urlsValidas.length === 0) {
      return { changes: 0 };
    }

    // Crear registros con orden
    const fotos = urlsValidas.map((url, index) => ({
      modelo_id: modeloId,
      url: url.trim(),
      orden: index
    }));

    const { data, error } = await supabase
      .from('modelo_fotos')
      .insert(fotos)
      .select();

    if (error) throw error;
    return { changes: data?.length || 0 };
  },
  delete: async (id) => {
    const { error } = await supabase
      .from('modelo_fotos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { changes: 1 };
  },
  deleteByModeloId: async (modeloId) => {
    const { error } = await supabase
      .from('modelo_fotos')
      .delete()
      .eq('modelo_id', modeloId);

    if (error) throw error;
    return { changes: 1 };
  },
  updateOrden: async (id, orden) => {
    const { data, error } = await supabase
      .from('modelo_fotos')
      .update({ orden: orden })
      .eq('id', id)
      .select();

    if (error) throw error;
    return { changes: data?.length || 0 };
  }
};

// Funciones para auditoría
const auditLogsDB = {
  create: async (entry) => {
    const payload = {
      event_type: entry?.event_type || 'unknown',
      severity: entry?.severity || 'info',
      actor_user_id: entry?.actor_user_id ?? null,
      actor_username: entry?.actor_username ?? null,
      ip: entry?.ip ?? null,
      user_agent: entry?.user_agent ?? null,
      path: entry?.path ?? null,
      method: entry?.method ?? null,
      meta: entry?.meta ?? null
    };

    const { data, error } = await supabase
      .from('audit_logs')
      .insert(payload)
      .select('id')
      .single();

    if (error) throw error;
    return { lastID: data?.id, changes: 1 };
  },
  getAllAdmin: async (options = {}) => {
    const q = typeof options.q === 'string' ? options.q.trim() : '';
    const qSafe = q.replace(/,/g, ' ');
    const eventType = typeof options.eventType === 'string' ? options.eventType.trim() : '';
    const severity = typeof options.severity === 'string' ? options.severity.trim() : '';
    const from = typeof options.from === 'string' ? options.from.trim() : '';
    const to = typeof options.to === 'string' ? options.to.trim() : '';

    const page = Number.isFinite(Number(options.page)) ? Math.max(1, parseInt(options.page, 10)) : 1;
    const pageSize = Number.isFinite(Number(options.pageSize)) ? Math.min(200, Math.max(1, parseInt(options.pageSize, 10))) : 50;
    const fromIdx = (page - 1) * pageSize;
    const toIdx = fromIdx + pageSize - 1;

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' });

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (from) {
      query = query.gte('created_at', `${from}T00:00:00.000Z`);
    }

    if (to) {
      query = query.lte('created_at', `${to}T23:59:59.999Z`);
    }

    if (qSafe) {
      query = query.or(
        [
          `event_type.ilike.%${qSafe}%`,
          `actor_username.ilike.%${qSafe}%`,
          `ip.ilike.%${qSafe}%`,
          `path.ilike.%${qSafe}%`,
          `method.ilike.%${qSafe}%`
        ].join(',')
      );
    }

    query = query.order('created_at', { ascending: false }).range(fromIdx, toIdx);

    const { data, error, count } = await query;
    if (error) throw error;

    return { rows: data || [], total: count || 0 };
  }
};

module.exports = {
  initDatabase,
  usuariosDB,
  modelosDB,
  contactosDB,
  modeloFotosDB,
  auditLogsDB
};
