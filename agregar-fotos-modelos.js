// Script para agregar 4 fotos adicionales a modelos existentes
const { modelosDB, modeloFotosDB, initDatabase } = require('./database');

const fotosAdicionales = [
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400'
];

async function agregarFotosAModelos() {
  try {
    await initDatabase();
    console.log('📸 Agregando fotos adicionales a modelos existentes...\n');
    
    const modelos = await modelosDB.getAllAdmin();
    
    if (modelos.length === 0) {
      console.log('⚠️  No hay modelos en la base de datos.');
      console.log('   Ejecuta primero: npm run seed');
      process.exit(0);
      return;
    }
    
    console.log(`📋 Encontrados ${modelos.length} modelos\n`);
    
    for (const modelo of modelos) {
      try {
        // Verificar si ya tiene fotos
        const fotosExistentes = await modeloFotosDB.getByModeloId(modelo.id);
        
        if (fotosExistentes.length >= 5) {
          console.log(`⏭️  ${modelo.nombre} ${modelo.apellido} ya tiene ${fotosExistentes.length} fotos, saltando...`);
          continue;
        }
        
        // Crear array con foto principal (si existe) + fotos adicionales
        const todasLasFotos = [];
        
        // Agregar foto principal si existe y no está en la tabla de fotos
        if (modelo.foto && !fotosExistentes.some(f => f.url === modelo.foto)) {
          todasLasFotos.push(modelo.foto);
        }
        
        // Agregar fotos adicionales
        todasLasFotos.push(...fotosAdicionales);
        
        // Agregar solo las que faltan
        const fotosAAgregar = todasLasFotos.filter(foto => 
          !fotosExistentes.some(f => f.url === foto)
        );
        
        if (fotosAAgregar.length > 0) {
          await modeloFotosDB.createMultiple(modelo.id, fotosAAgregar);
          console.log(`✅ ${modelo.nombre} ${modelo.apellido}: ${fotosAAgregar.length} fotos agregadas (total: ${fotosExistentes.length + fotosAAgregar.length})`);
        } else {
          console.log(`ℹ️  ${modelo.nombre} ${modelo.apellido}: Ya tiene todas las fotos`);
        }
      } catch (error) {
        console.error(`❌ Error agregando fotos a ${modelo.nombre}:`, error.message);
      }
    }
    
    console.log(`\n✨ Proceso completado!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    process.exit(1);
  }
}

agregarFotosAModelos();
