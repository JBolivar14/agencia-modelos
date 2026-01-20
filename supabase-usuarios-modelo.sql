-- ============================================
-- Migración incremental: usuarios modelo + confirmación email en usuarios
-- Ejecutar en el SQL Editor de Supabase (proyectos ya migrados)
-- ============================================

-- Rol (admin/modelo)
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS rol TEXT;

-- Confirmación de email en usuarios (para rol=modelo)
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS confirmado BOOLEAN DEFAULT false;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS confirm_token TEXT;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS confirm_token_expira TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS confirmado_en TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_usuarios_confirm_token ON public.usuarios (confirm_token);

UPDATE public.usuarios
  SET rol = 'admin'
  WHERE rol IS NULL;

-- Por compatibilidad, marcar admins como confirmados (no bloquea login aunque quede false)
UPDATE public.usuarios
  SET confirmado = true
  WHERE rol = 'admin' AND (confirmado IS NULL OR confirmado = false);

ALTER TABLE public.usuarios
  ALTER COLUMN rol SET DEFAULT 'admin';

CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON public.usuarios (rol);

-- (Preparación para "claim" del perfil de modelo en el futuro)
ALTER TABLE public.usuarios
  ADD COLUMN IF NOT EXISTS modelo_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_usuarios_modelo_id ON public.usuarios (modelo_id);

