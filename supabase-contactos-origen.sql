-- ============================================
-- Migración incremental: origen en contactos (contacto | sorteo)
-- Ejecutar en el SQL Editor de Supabase (proyectos ya migrados)
-- ============================================

ALTER TABLE public.contactos
  ADD COLUMN IF NOT EXISTS origen TEXT DEFAULT 'contacto';

UPDATE public.contactos SET origen = 'contacto' WHERE origen IS NULL;

CREATE INDEX IF NOT EXISTS idx_contactos_origen ON public.contactos (origen);
