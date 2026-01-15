-- Script SQL para insertar modelos de prueba en Supabase
-- Ejecuta este script en el SQL Editor de Supabase

-- Insertar modelos de prueba
INSERT INTO modelos (nombre, apellido, email, telefono, edad, altura, medidas, ciudad, foto, descripcion, activa) VALUES
('Sofia', 'Martínez', 'sofia.martinez@example.com', '+1 234 567 8901', 24, '175 cm', '90-60-90', 'Madrid', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400', 'Modelo profesional con experiencia en moda y publicidad. Especializada en fotografía de catálogo y editorial.', true),
('Emma', 'Johnson', 'emma.johnson@example.com', '+1 234 567 8902', 22, '170 cm', '88-58-88', 'Barcelona', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400', 'Modelo versátil con experiencia en desfiles y campañas publicitarias. Trabajando en la industria desde hace 3 años.', true),
('Isabella', 'García', 'isabella.garcia@example.com', '+1 234 567 8903', 26, '178 cm', '92-62-92', 'Valencia', 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400', 'Modelo de alta costura con experiencia internacional. Ha trabajado en París, Milán y Nueva York.', true),
('Olivia', 'Williams', 'olivia.williams@example.com', '+1 234 567 8904', 28, '172 cm', '86-59-87', 'Sevilla', 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400', 'Modelo comercial especializada en catálogos y e-commerce. Experiencia en fotografía de producto y lifestyle.', true),
('Mia', 'Brown', 'mia.brown@example.com', '+1 234 567 8905', 23, '168 cm', '87-59-89', 'Madrid', 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400', 'Modelo emergente con gran potencial. Trabajando en proyectos de moda joven y street style.', true),
('Charlotte', 'Davis', 'charlotte.davis@example.com', '+1 234 567 8906', 25, '174 cm', '89-61-90', 'Bilbao', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400', 'Modelo profesional con experiencia en editorial y publicidad. Especializada en belleza y cosmética.', true),
('Amelia', 'Miller', 'amelia.miller@example.com', '+1 234 567 8907', 27, '176 cm', '91-63-91', 'Barcelona', 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=400', 'Modelo de pasarela con experiencia en desfiles internacionales. Ha trabajado para importantes casas de moda.', true),
('Harper', 'Wilson', 'harper.wilson@example.com', '+1 234 567 8908', 21, '169 cm', '85-58-86', 'Valencia', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400', 'Modelo joven con estilo único. Especializada en moda alternativa y editorial artística.', true)
RETURNING id, nombre, apellido;

-- Nota: Después de ejecutar esto, necesitarás insertar las fotos usando los IDs retornados
-- Puedes ver los IDs en los resultados de la query anterior
-- Ejemplo (reemplaza MODELO_ID con el ID real):
-- INSERT INTO modelo_fotos (modelo_id, url, orden) VALUES
-- (MODELO_ID, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800', 0),
-- (MODELO_ID, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800', 1),
-- (MODELO_ID, 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=800', 2);
