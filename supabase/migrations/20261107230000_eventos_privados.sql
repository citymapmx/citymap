-- Eventos privados, fase 1 (sin álbum) — 7 Nov 2026
-- 1) visibility en events: 'public' (default, todo lo existente) o 'private'.
--    Los privados nunca salen en listas/buscador/sitemap; se abren solo con su
--    enlace (el slug lleva un sufijo aleatorio) y se crean aprobados de inmediato.
-- 2) event_rsvps: confirmaciones de invitados (Voy / Quizás / No voy).
--    Los invitados no tienen cuenta: lectura e inserción públicas. El enlace
--    secreto es la protección; el event_id es un UUID no adivinable.
--    Si un invitado cambia de opinión vuelve a confirmar y se guarda una fila
--    nueva; el cliente se queda con la más reciente por nombre.

alter table public.events
  add column if not exists visibility text not null default 'public';

create table if not exists public.event_rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_name text not null,
  status text not null check (status in ('voy', 'quizas', 'no')),
  companions int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists event_rsvps_event_idx
  on public.event_rsvps (event_id);

alter table public.event_rsvps enable row level security;

drop policy if exists "Lectura pública de RSVP" on public.event_rsvps;
create policy "Lectura pública de RSVP"
  on public.event_rsvps for select using (true);

drop policy if exists "Inserción pública de RSVP" on public.event_rsvps;
create policy "Inserción pública de RSVP"
  on public.event_rsvps for insert with check (true);
