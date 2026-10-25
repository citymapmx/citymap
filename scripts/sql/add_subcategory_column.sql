-- ==============================================================
-- 📁 MIGRACIÓN: Agregar columna 'subcategory' a negocios
-- ==============================================================
-- Ejecuta este script en el SQL Editor de tu Dashboard de Supabase
-- para habilitar el guardado de subcategorías (ej. Pizzerías, Pádel).

ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Índice para acelerar filtros de subcategorías en la aplicación
CREATE INDEX IF NOT EXISTS idx_businesses_subcategory ON public.businesses (subcategory);
