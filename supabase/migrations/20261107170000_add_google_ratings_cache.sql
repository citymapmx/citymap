-- Caché de calificaciones de Google (solo rating + conteo, sin textos).
-- Se llena una vez al mes con api/actualizar-calificaciones-google.js.
-- Por reglas de Google, el dato vive como caché con vencimiento (30 días),
-- nunca como columna fija de businesses; las filas vencidas se borran en
-- cada refresco y el front solo lee las vigentes (expires_at > now()).
create table if not exists public.google_ratings_cache (
  business_id uuid primary key,
  place_id text not null,
  rating numeric(3,2),
  review_count integer,
  fetched_at timestamptz not null default now(),
  expires_at timestamptz not null
);
alter table public.google_ratings_cache enable row level security;
drop policy if exists "Lectura pública de caché de calificaciones" on public.google_ratings_cache;
create policy "Lectura pública de caché de calificaciones"
  on public.google_ratings_cache for select using (true);
create index if not exists google_ratings_cache_expires_idx
  on public.google_ratings_cache (expires_at);
