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
      const { error: insertError } = await supabase
        .from('usuarios')
        .insert({
          username: 'admin',
          password: hashedPassword,
          nombre: 'Administrador'
        });

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
    const { data: result, error } = await supabase
      .from('contactos')
      .insert({
        nombre: data.nombre,
        email: data.email,
        telefono: data.telefono || null,
        empresa: data.empresa || null,
        mensaje: data.mensaje || null
      })
      .select()
      .single();

    if (error) throw error;
    return { lastID: result.id, changes: 1 };
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

module.exports = {
  initDatabase,
  usuariosDB,
  modelosDB,
  contactosDB,
  modeloFotosDB
};
