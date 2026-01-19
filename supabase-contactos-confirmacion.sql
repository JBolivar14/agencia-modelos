-- ============================================
-- Migración incremental: confirmación de email en contactos
-- Ejecutar en el SQL Editor de Supabase (proyectos ya migrados)
-- ============================================

ALTER TABLE public.contactos
  ADD COLUMN IF NOT EXISTS confirmado BOOLEAN DEFAULT false;

ALTER TABLE public.contactos
  ADD COLUMN IF NOT EXISTS confirm_token TEXT;

ALTER TABLE public.contactos
  ADD COLUMN IF NOT EXISTS confirm_token_expira TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.contactos
  ADD COLUMN IF NOT EXISTS confirmado_en TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_contactos_confirmado ON public.contactos (confirmado);
CREATE INDEX IF NOT EXISTS idx_contactos_confirm_token ON public.contactos (confirm_token);

