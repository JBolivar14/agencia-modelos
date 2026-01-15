/**
 * Script para generar modelos de prueba en Supabase
 * 
 * ⚠️ IMPORTANTE: Este es un script de Node.js, NO lo ejecutes en SQL Editor
 * 
 * Uso desde terminal:
 *   node scripts/generar-modelos-prueba.js
 *   O: npm run generar-modelos
 * 
 * Requiere variables de entorno:
 *   - SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY
 * 
 * Alternativa: Si prefieres usar SQL directamente, usa el archivo
 * scripts/insertar-modelos-prueba.sql en el SQL Editor de Supabase
 */

const { createClient } = require('@supabase/supabase-js');

// Configuración
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Variables de entorno de Supabase no configuradas.');
  console.error('   Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Datos de modelos de prueba
const modelosPrueba = [
  {
    nombre: 'Sofia',
    apellido: 'Martínez',
    email: 'sofia.martinez@example.com',
    telefono: '+1 234 567 8901',
    edad: 24,
    altura: '175 cm',
    medidas: '90-60-90',
    ciudad: 'Madrid',
    foto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400',
    descripcion: 'Modelo profesional con experiencia en moda y publicidad. Especializada en fotografía de catálogo y editorial.',
    activa: true,
    fotos: [
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800'
    ]
  },
  {
    nombre: 'Emma',
    apellido: 'Johnson',
    email: 'emma.johnson@example.com',
    telefono: '+1 234 567 8902',
    edad: 22,
    altura: '170 cm',
    medidas: '88-58-88',
    ciudad: 'Barcelona',
    foto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400',
    descripcion: 'Modelo versátil con experiencia en desfiles y campañas publicitarias. Trabajando en la industria desde hace 3 años.',
    activa: true,
    fotos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800'
    ]
  },
  {
    nombre: 'Isabella',
    apellido: 'García',
    email: 'isabella.garcia@example.com',
    telefono: '+1 234 567 8903',
    edad: 26,
    altura: '178 cm',
    medidas: '92-62-92',
    ciudad: 'Valencia',
    foto: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400',
    descripcion: 'Modelo de alta costura con experiencia internacional. Ha trabajado en París, Milán y Nueva York.',
    activa: true,
    fotos: [
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800'
    ]
  },
  {
    nombre: 'Olivia',
    apellido: 'Williams',
    email: 'olivia.williams@example.com',
    telefono: '+1 234 567 8904',
    edad: 28,
    altura: '172 cm',
    medidas: '86-59-87',
    ciudad: 'Sevilla',
    foto: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400',
    descripcion: 'Modelo comercial especializada en catálogos y e-commerce. Experiencia en fotografía de producto y lifestyle.',
    activa: true,
    fotos: [
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800'
    ]
  },
  {
    nombre: 'Mia',
    apellido: 'Brown',
    email: 'mia.brown@example.com',
    telefono: '+1 234 567 8905',
    edad: 23,
    altura: '168 cm',
    medidas: '87-59-89',
    ciudad: 'Madrid',
    foto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400',
    descripcion: 'Modelo emergente con gran potencial. Trabajando en proyectos de moda joven y street style.',
    activa: true,
    fotos: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'
    ]
  },
  {
    nombre: 'Charlotte',
    apellido: 'Davis',
    email: 'charlotte.davis@example.com',
    telefono: '+1 234 567 8906',
    edad: 25,
    altura: '174 cm',
    medidas: '89-61-90',
    ciudad: 'Bilbao',
    foto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
    descripcion: 'Modelo profesional con experiencia en editorial y publicidad. Especializada en belleza y cosmética.',
    activa: true,
    fotos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800',
      'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=800'
    ]
  },
  {
    nombre: 'Amelia',
    apellido: 'Miller',
    email: 'amelia.miller@example.com',
    telefono: '+1 234 567 8907',
    edad: 27,
    altura: '176 cm',
    medidas: '91-63-91',
    ciudad: 'Barcelona',
    foto: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400',
    descripcion: 'Modelo de pasarela con experiencia en desfiles internacionales. Ha trabajado para importantes casas de moda.',
    activa: true,
    fotos: [
      'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=800',
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800',
      'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800'
    ]
  },
  {
    nombre: 'Harper',
    apellido: 'Wilson',
    email: 'harper.wilson@example.com',
    telefono: '+1 234 567 8908',
    edad: 21,
    altura: '169 cm',
    medidas: '85-58-86',
    ciudad: 'Valencia',
    foto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400',
    descripcion: 'Modelo joven con estilo único. Especializada en moda alternativa y editorial artística.',
    activa: true,
    fotos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800'
    ]
  }
];

async function generarModelosPrueba() {
  console.log('🚀 Iniciando generación de modelos de prueba...\n');

  try {
    // Verificar conexión
    const { data: testData, error: testError } = await supabase
      .from('modelos')
      .select('id')
      .limit(1);

    if (testError && testError.code !== 'PGRST116') {
      throw testError;
    }

    console.log('✅ Conexión a Supabase establecida\n');

    let creados = 0;
    let errores = 0;

    for (const modeloData of modelosPrueba) {
      try {
        const { fotos, ...datosModelo } = modeloData;

        // Crear modelo
        const { data: modelo, error: modeloError } = await supabase
          .from('modelos')
          .insert({
            nombre: datosModelo.nombre,
            apellido: datosModelo.apellido,
            email: datosModelo.email,
            telefono: datosModelo.telefono,
            edad: datosModelo.edad,
            altura: datosModelo.altura,
            medidas: datosModelo.medidas,
            ciudad: datosModelo.ciudad,
            foto: datosModelo.foto,
            descripcion: datosModelo.descripcion,
            activa: datosModelo.activa
          })
          .select()
          .single();

        if (modeloError) {
          throw modeloError;
        }

        const modeloId = modelo.id;
        console.log(`✅ Modelo creado: ${datosModelo.nombre} ${datosModelo.apellido} (ID: ${modeloId})`);

        // Crear fotos
        if (fotos && fotos.length > 0) {
          const fotosData = fotos.map((url, index) => ({
            modelo_id: modeloId,
            url: url,
            orden: index
          }));

          const { error: fotosError } = await supabase
            .from('modelo_fotos')
            .insert(fotosData);

          if (fotosError) {
            console.warn(`⚠️  Error creando fotos para ${datosModelo.nombre}:`, fotosError.message);
          } else {
            console.log(`   📷 ${fotos.length} fotos agregadas`);
          }
        }

        creados++;
      } catch (error) {
        console.error(`❌ Error creando modelo ${modeloData.nombre}:`, error.message);
        errores++;
      }
    }

    console.log('\n📊 Resumen:');
    console.log(`   ✅ Modelos creados: ${creados}`);
    console.log(`   ❌ Errores: ${errores}`);
    console.log(`   📝 Total procesados: ${modelosPrueba.length}\n`);

    if (creados > 0) {
      console.log('🎉 ¡Modelos de prueba generados exitosamente!');
      console.log('   Puedes verlos en tu aplicación en Vercel.\n');
    }

  } catch (error) {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar
generarModelosPrueba();
