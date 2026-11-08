-- Reacciones y mensaje fijado del chat de eventos privados (fase 2b, 7 Nov 2026)
-- Reacciones: tabla aparte para no exponer el cuerpo del mensaje a UPDATE.
-- Fijar: columna `pinned` en event_messages; solo el anfitrión puede
-- actualizar mensajes de su evento (la UI solo cambia `pinned`).

create table if not exists public.event_message_likes (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.event_messages(id) on delete cascade,
  user_id uuid null,
  created_at timestamptz not null default now()
);

create index if not exists event_message_likes_message_idx
  on public.event_message_likes (message_id);

alter table public.event_message_likes enable row level security;

drop policy if exists "Lectura pública de reacciones" on public.event_message_likes;
create policy "Lectura pública de reacciones"
  on public.event_message_likes for select using (true);

drop policy if exists "Inserción pública de reacciones" on public.event_message_likes;
create policy "Inserción pública de reacciones"
  on public.event_message_likes for insert with check (true);

drop policy if exists "Quitar reacción propia" on public.event_message_likes;
create policy "Quitar reacción propia"
  on public.event_message_likes for delete using (
    user_id is null or user_id = auth.uid()
  );

alter table public.event_messages
  add column if not exists pinned boolean not null default false;

drop policy if exists "El anfitrión fija mensajes" on public.event_messages;
create policy "El anfitrión fija mensajes"
  on public.event_messages for update using (
    exists (
      select 1 from public.events
      where events.id = event_messages.event_id
        and events.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.events
      where events.id = event_messages.event_id
        and events.user_id = auth.uid()
    )
  );
