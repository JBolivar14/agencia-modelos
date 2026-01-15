/**
 * Script para migrar datos de SQLite a Supabase
 * 
 * Uso:
 * 1. Configura las variables de entorno de Supabase
 * 2. Asegúrate de que las tablas estén creadas en Supabase
 * 3. Ejecuta: node migrate-to-supabase.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Configuración
const dbPath = path.join(__dirname, 'agencia.db');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Abrir SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ Error abriendo SQLite:', err);
    process.exit(1);
  }
  console.log('✅ Conectado a SQLite');
});

// Función helper para promisificar SQLite
function dbAll(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function migrateModelos() {
  console.log('\n📦 Migrando modelos...');
  const modelos = await dbAll('SELECT * FROM modelos');
  
  for (const modelo of modelos) {
    const { data, error } = await supabase
      .from('modelos')
      .insert({
        id: modelo.id, // Mantener IDs originales si es posible
        nombre: modelo.nombre,
        apellido: modelo.apellido,
        email: modelo.email,
        telefono: modelo.telefono,
        edad: modelo.edad,
        altura: modelo.altura,
        medidas: modelo.medidas,
        ciudad: modelo.ciudad,
        foto: modelo.foto,
        descripcion: modelo.descripcion,
        activa: modelo.activa === 1,
        creado_en: modelo.creado_en
      })
      .select();

    if (error) {
      console.error(`  ❌ Error migrando modelo ${modelo.id}:`, error.message);
    } else {
      console.log(`  ✅ Modelo ${modelo.id}: ${modelo.nombre}`);
    }
  }
  
  console.log(`✅ Migrados ${modelos.length} modelos`);
}

async function migrateFotos() {
  console.log('\n📸 Migrando fotos...');
  const fotos = await dbAll('SELECT * FROM modelo_fotos');
  
  for (const foto of fotos) {
    const { data, error } = await supabase
      .from('modelo_fotos')
      .insert({
        id: foto.id,
        modelo_id: foto.modelo_id,
        url: foto.url,
        orden: foto.orden,
        creado_en: foto.creado_en
      })
      .select();

    if (error) {
      console.error(`  ❌ Error migrando foto ${foto.id}:`, error.message);
    } else {
      console.log(`  ✅ Foto ${foto.id} del modelo ${foto.modelo_id}`);
    }
  }
  
  console.log(`✅ Migradas ${fotos.length} fotos`);
}

async function migrateContactos() {
  console.log('\n📧 Migrando contactos...');
  const contactos = await dbAll('SELECT * FROM contactos');
  
  for (const contacto of contactos) {
    const { data, error } = await supabase
      .from('contactos')
      .insert({
        id: contacto.id,
        nombre: contacto.nombre,
        email: contacto.email,
        telefono: contacto.telefono,
        empresa: contacto.empresa,
        mensaje: contacto.mensaje,
        fecha: contacto.fecha
      })
      .select();

    if (error) {
      console.error(`  ❌ Error migrando contacto ${contacto.id}:`, error.message);
    } else {
      console.log(`  ✅ Contacto ${contacto.id}: ${contacto.nombre}`);
    }
  }
  
  console.log(`✅ Migrados ${contactos.length} contactos`);
}

async function migrateUsuarios() {
  console.log('\n👤 Migrando usuarios...');
  const usuarios = await dbAll('SELECT * FROM usuarios');
  
  for (const usuario of usuarios) {
    const { data, error } = await supabase
      .from('usuarios')
      .insert({
        id: usuario.id,
        username: usuario.username,
        password: usuario.password, // Ya está hasheado
        nombre: usuario.nombre,
        creado_en: usuario.creado_en
      })
      .select();

    if (error) {
      console.error(`  ❌ Error migrando usuario ${usuario.id}:`, error.message);
    } else {
      console.log(`  ✅ Usuario ${usuario.id}: ${usuario.username}`);
    }
  }
  
  console.log(`✅ Migrados ${usuarios.length} usuarios`);
}

async function main() {
  console.log('🚀 Iniciando migración de SQLite a Supabase...\n');
  
  try {
    await migrateModelos();
    await migrateFotos();
    await migrateContactos();
    await migrateUsuarios();
    
    console.log('\n✅ Migración completada exitosamente!');
  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
  } finally {
    db.close();
    process.exit(0);
  }
}

main();
