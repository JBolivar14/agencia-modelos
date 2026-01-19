-- ============================================
-- Migración incremental: usuarios.email
-- Ejecutar en el SQL Editor de Supabase (proyectos ya migrados)
-- ============================================

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Unicidad (Postgres permite múltiples NULL en UNIQUE)
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email
  ON public.usuarios (email);

