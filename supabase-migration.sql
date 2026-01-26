-- ============================================
-- Script de Migración a Supabase
-- Ejecutar en el SQL Editor de Supabase
-- IMPORTANTE: este script es para "primera instalación" (proyecto limpio).
-- Si tu proyecto ya fue migrado, para agregar auditoría usá `supabase-audit-logs.sql`
-- ============================================

-- Tabla de usuarios (admins y modelos)
CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE,
  password TEXT NOT NULL,
  nombre TEXT NOT NULL,
  rol TEXT DEFAULT 'admin',
  confirmado BOOLEAN DEFAULT false,
  confirm_token TEXT,
  confirm_token_expira TIMESTAMP WITH TIME ZONE,
  confirmado_en TIMESTAMP WITH TIME ZONE,
  modelo_id BIGINT,
  reset_token TEXT,
  reset_token_expira TIMESTAMP WITH TIME ZONE,
  reset_solicitado_en TIMESTAMP WITH TIME ZONE,
  reset_en TIMESTAMP WITH TIME ZONE,
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
-- origen: 'contacto' (formulario /contacto) o 'sorteo' (formulario /sorteo)
CREATE TABLE IF NOT EXISTS contactos (
  id BIGSERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL,
  telefono TEXT,
  empresa TEXT,
  mensaje TEXT,
  confirmado BOOLEAN DEFAULT false,
  confirm_token TEXT,
  confirm_token_expira TIMESTAMP WITH TIME ZONE,
  confirmado_en TIMESTAMP WITH TIME ZONE,
  fecha TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  origen TEXT DEFAULT 'contacto'
);

-- Tabla de auditoría (eventos de seguridad/operación)
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT DEFAULT 'info',
  actor_user_id BIGINT,
  actor_username TEXT,
  ip TEXT,
  user_agent TEXT,
  path TEXT,
  method TEXT,
  meta JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_modelos_activa ON modelos(activa);
CREATE INDEX IF NOT EXISTS idx_modelo_fotos_modelo_id ON modelo_fotos(modelo_id);
CREATE INDEX IF NOT EXISTS idx_contactos_fecha ON contactos(fecha);
CREATE INDEX IF NOT EXISTS idx_contactos_origen ON contactos(origen);
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_confirm_token ON usuarios(confirm_token);
CREATE INDEX IF NOT EXISTS idx_usuarios_modelo_id ON usuarios(modelo_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_reset_token ON usuarios(reset_token);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);

-- Habilitar Row Level Security (RLS)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE modelo_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE contactos ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

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

-- Audit logs: solo el backend (service role) debe leer/escribir
CREATE POLICY "Solo servicio puede gestionar audit logs" ON audit_logs
  FOR ALL USING (false);

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
