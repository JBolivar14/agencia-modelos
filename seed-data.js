// Script para agregar datos de prueba a la base de datos
const { db, modelosDB, modeloFotosDB, initDatabase } = require('./database');

const modelosPrueba = [
  {
    nombre: 'Sofia',
    apellido: 'Martinez',
    email: 'sofia.martinez@email.com',
    telefono: '+1 234 567 8901',
    edad: 24,
    altura: '175 cm',
    medidas: '90-60-90',
    ciudad: 'Madrid',
    foto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    descripcion: 'Modelo profesional con experiencia en moda y editoriales. Especializada en fotografía comercial.',
    activa: 1
  },
  {
    nombre: 'Elena',
    apellido: 'Garcia',
    email: 'elena.garcia@email.com',
    telefono: '+1 234 567 8902',
    edad: 22,
    altura: '172 cm',
    medidas: '88-58-88',
    ciudad: 'Barcelona',
    foto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400',
    descripcion: 'Modelo versátil con gran presencia en pasarelas. Experiencia internacional.',
    activa: 1
  },
  {
    nombre: 'Carmen',
    apellido: 'Lopez',
    email: 'carmen.lopez@email.com',
    telefono: '+1 234 567 8903',
    edad: 26,
    altura: '178 cm',
    medidas: '92-62-92',
    ciudad: 'Valencia',
    foto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400',
    descripcion: 'Modelo con experiencia en publicidad y catálogos. Trabajos para marcas reconocidas.',
    activa: 1
  },
  {
    nombre: 'Isabel',
    apellido: 'Rodriguez',
    email: 'isabel.rodriguez@email.com',
    telefono: '+1 234 567 8904',
    edad: 23,
    altura: '170 cm',
    medidas: '86-56-86',
    ciudad: 'Sevilla',
    foto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    descripcion: 'Modelo elegante especializada en moda de lujo. Gran versatilidad en expresiones.',
    activa: 1
  },
  {
    nombre: 'Laura',
    apellido: 'Fernandez',
    email: 'laura.fernandez@email.com',
    telefono: '+1 234 567 8905',
    edad: 25,
    altura: '174 cm',
    medidas: '89-59-89',
    ciudad: 'Bilbao',
    foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    descripcion: 'Modelo profesional con experiencia en televisión y eventos. Carisma y profesionalismo.',
    activa: 1
  },
  {
    nombre: 'Ana',
    apellido: 'Sanchez',
    email: 'ana.sanchez@email.com',
    telefono: '+1 234 567 8906',
    edad: 21,
    altura: '173 cm',
    medidas: '87-57-87',
    ciudad: 'Málaga',
    foto: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400',
    descripcion: 'Joven modelo con gran proyección. Experiencia en editoriales y redes sociales.',
    activa: 1
  },
  {
    nombre: 'Maria',
    apellido: 'Gonzalez',
    email: 'maria.gonzalez@email.com',
    telefono: '+1 234 567 8907',
    edad: 27,
    altura: '176 cm',
    medidas: '91-61-91',
    ciudad: 'Zaragoza',
    foto: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400',
    descripcion: 'Modelo experimentada con portfolio extenso. Especializada en moda y belleza.',
    activa: 1
  },
  {
    nombre: 'Patricia',
    apellido: 'Perez',
    email: 'patricia.perez@email.com',
    telefono: '+1 234 567 8908',
    edad: 24,
    altura: '171 cm',
    medidas: '85-55-85',
    ciudad: 'Murcia',
    foto: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400',
    descripcion: 'Modelo versátil con experiencia en múltiples formatos. Gran capacidad de adaptación.',
    activa: 1
  }
];

async function seedModelos() {
  try {
    // Esperar a que la BD se inicialice
    await initDatabase();
    console.log('🌱 Agregando modelos de prueba...');
    
    // Verificar cuántos modelos ya existen
    const modelosExistentes = await modelosDB.getAll();
    if (modelosExistentes.length > 0) {
      console.log(`⚠️  Ya existen ${modelosExistentes.length} modelos en la base de datos.`);
      console.log('   Si quieres agregar más, puedes ejecutar este script nuevamente.');
      process.exit(0);
      return;
    }
    
    for (const modelo of modelosPrueba) {
      try {
        const result = await modelosDB.create(modelo);
        const modeloId = result.lastID;
        console.log(`✅ Modelo agregado: ${modelo.nombre} ${modelo.apellido} (ID: ${modeloId})`);
        
        // Agregar 4 fotos adicionales a cada modelo
        const fotosAdicionales = [
          'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400',
          'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
          'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
          'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400'
        ];
        
        // Crear array con la foto principal + 4 adicionales
        const todasLasFotos = [modelo.foto, ...fotosAdicionales].filter(f => f);
        
        if (todasLasFotos.length > 0) {
          await modeloFotosDB.createMultiple(modeloId, todasLasFotos);
          console.log(`   📸 ${todasLasFotos.length} fotos agregadas`);
        }
      } catch (error) {
        console.error(`❌ Error agregando ${modelo.nombre}:`, error.message);
      }
    }
    
    console.log(`\n✨ ${modelosPrueba.length} modelos de prueba agregados exitosamente!`);
    console.log('   Visita http://localhost:3000 para ver las modelos\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    process.exit(1);
  }
}

// Ejecutar
seedModelos();

