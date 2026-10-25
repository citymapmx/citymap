-- =====================================================================
-- TABLE: user_places
-- Pasaporte Urbano — guarda el historial de lugares visitados
-- y lista de "por descubrir" de cada usuario.
-- =====================================================================
-- Ejecuta este script en: Supabase Dashboard → SQL Editor → New Query
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_places (
  id             BIGSERIAL PRIMARY KEY,
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id    TEXT NOT NULL,                        -- ID del negocio en CityMap
  status         TEXT NOT NULL                         -- 'want_to_visit' | 'visited'
                   CHECK (status IN ('want_to_visit', 'visited')),
  visited_at     TIMESTAMPTZ,                          -- Fecha de visita (la puede editar el usuario)
  target_date    TIMESTAMPTZ,                          -- Fecha tentativa para 'want_to_visit' (opcional)
  private_notes  TEXT,                                 -- Nota personal del usuario
  personal_rating INT CHECK (personal_rating BETWEEN 1 AND 5), -- Rating 1-5 (reservado para uso futuro)
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, business_id)                        -- Un registro por usuario+lugar
);

-- ── Migración segura si la tabla ya existe ───────────────────────────
ALTER TABLE public.user_places 
  ADD COLUMN IF NOT EXISTS target_date TIMESTAMPTZ;

-- ── Índices ──────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_places_user_id
  ON public.user_places (user_id);

CREATE INDEX IF NOT EXISTS idx_user_places_business_id
  ON public.user_places (business_id);

CREATE INDEX IF NOT EXISTS idx_user_places_status
  ON public.user_places (user_id, status);

-- ── Trigger: auto-actualizar updated_at ──────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_places_updated_at ON public.user_places;
CREATE TRIGGER trg_user_places_updated_at
  BEFORE UPDATE ON public.user_places
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Row Level Security (RLS) ─────────────────────────────────────────
ALTER TABLE public.user_places ENABLE ROW LEVEL SECURITY;

-- Cada usuario solo puede ver sus propios registros
CREATE POLICY "user_places_select_own"
  ON public.user_places FOR SELECT
  USING (auth.uid() = user_id);

-- Solo el propio usuario puede insertar
CREATE POLICY "user_places_insert_own"
  ON public.user_places FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Solo el propio usuario puede actualizar
CREATE POLICY "user_places_update_own"
  ON public.user_places FOR UPDATE
  USING (auth.uid() = user_id);

-- Solo el propio usuario puede borrar
CREATE POLICY "user_places_delete_own"
  ON public.user_places FOR DELETE
  USING (auth.uid() = user_id);

-- ── Upsert helper (para cuando el app actualiza la nota/fecha) ───────
-- La app usa POST que en el cliente supabase.js hace un upsert con
-- onConflict: 'user_id,business_id'. Asegúrate de que el cliente
-- tenga configurado el upsert correctamente (ver nota abajo).

-- =====================================================================
-- NOTA IMPORTANTE
-- =====================================================================
-- En tu archivo src/lib/supabase.js, el método `post` debe hacer UPSERT
-- cuando actualiza notas/fechas. Verifica que incluya:
--
--   .upsert(data, { onConflict: 'user_id,business_id' })
--
-- en vez de un INSERT simple, para que actualice el registro existente
-- en lugar de duplicarlo.
-- =====================================================================
