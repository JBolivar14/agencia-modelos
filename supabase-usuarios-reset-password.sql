-- ============================================
-- Migración incremental: reset de contraseña en usuarios
-- Ejecutar en el SQL Editor de Supabase (proyectos ya migrados)
-- ============================================

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS reset_token TEXT;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS reset_token_expira TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS reset_solicitado_en TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS reset_en TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_usuarios_reset_token ON public.usuarios (reset_token);

