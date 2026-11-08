-- Chat de eventos privados, fase 2 (7 Nov 2026)
-- Modelo: cualquiera con el enlace puede LEER; para ESCRIBIR basta un nombre
-- (como el RSVP). Si el autor inició sesión, su mensaje lleva user_id y se
-- muestra con palomita de verificado. Solo el anfitrión puede borrar mensajes.
-- Los mensajes se actualizan por sondeo cada 5 s (sin Realtime en v1).

create table if not exists public.event_messages (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  guest_name text not null,
  user_id uuid null,
  body text not null check (char_length(body) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists event_messages_event_idx
  on public.event_messages (event_id, created_at);

alter table public.event_messages enable row level security;

drop policy if exists "Lectura pública de mensajes" on public.event_messages;
create policy "Lectura pública de mensajes"
  on public.event_messages for select using (true);

drop policy if exists "Inserción pública de mensajes" on public.event_messages;
create policy "Inserción pública de mensajes"
  on public.event_messages for insert with check (true);

drop policy if exists "El anfitrión borra mensajes" on public.event_messages;
create policy "El anfitrión borra mensajes"
  on public.event_messages for delete using (
    exists (
      select 1 from public.events
      where events.id = event_messages.event_id
        and events.user_id = auth.uid()
    )
  );
