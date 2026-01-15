-- ============================================
-- Script de Migración a Supabase
-- Ejecutar en el SQL Editor de Supabase
-- ============================================

-- Tabla de usuarios (administradores)
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nombre TEXT NOT NULL,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de modelos
CREATE TABLE IF NOT EXISTS modelos (
  id BIGSERIAL PRIMARY KEY,
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
  activa BOOLEAN DEFAULT true,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de fotos de modelos (múltiples fotos por modelo)
CREATE TABLE IF NOT EXISTS modelo_fotos (
  id BIGSERIAL PRIMARY KEY,
  modelo_id BIGINT NOT NULL REFERENCES modelos(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de contactos (prospectos que llenan el formulario)
CREATE TABLE IF NOT EXISTS contactos (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  empresa TEXT,
  mensaje TEXT,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_modelos_activa ON modelos(activa);
CREATE INDEX IF NOT EXISTS idx_modelo_fotos_modelo_id ON modelo_fotos(modelo_id);
CREATE INDEX IF NOT EXISTS idx_contactos_fecha ON contactos(fecha);
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);

-- Habilitar Row Level Security (RLS)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelo_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS básicas
-- Permitir lectura pública de modelos activos
CREATE POLICY "Modelos públicos son visibles" ON modelos
  FOR SELECT USING (activa = true);

-- Permitir inserción pública de contactos
CREATE POLICY "Cualquiera puede crear contactos" ON contactos
  FOR INSERT WITH CHECK (true);

-- Permitir lectura de contactos solo para autenticados (ajustar según necesidades)
-- Por ahora, deshabilitamos RLS para contactos en lectura (se maneja en el backend)
CREATE POLICY "Contactos visibles para servicio" ON contactos
  FOR SELECT USING (true);

-- Los usuarios solo pueden ser gestionados por el servicio (backend)
-- No permitir operaciones públicas en usuarios
CREATE POLICY "Solo servicio puede gestionar usuarios" ON usuarios
  FOR ALL USING (false);

-- Las fotos de modelos activos son visibles
CREATE POLICY "Fotos de modelos activos visibles" ON modelo_fotos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM modelos 
      WHERE modelos.id = modelo_fotos.modelo_id 
      AND modelos.activa = true
    )
  );

-- ============================================
-- Crear usuario admin por defecto
-- ============================================
-- Nota: La contraseña debe ser hasheada con bcrypt
-- El código JavaScript se encargará de crear el usuario admin
-- con la contraseña hasheada correctamente
