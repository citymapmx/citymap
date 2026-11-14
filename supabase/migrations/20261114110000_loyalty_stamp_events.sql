-- Historial y auditoría de sellos de lealtad (14 Nov 2026, PR lealtad-historial)
--
-- APLICAR EN EL EDITOR SQL DE SUPABASE ANTES DE PROBAR EN PRODUCCIÓN.
-- La migración NO se aplica sola al fusionar la PR.
--
-- Qué crea: tabla `loyalty_stamp_events` (append-only: sin UPDATE ni
-- DELETE) donde cada movimiento de sellos queda con fecha y hora exactas:
--   stamp_added      un sello otorgado (con su número de sello)
--   stamp_removed    un sello quitado; apunta al evento que anula
--                    (voids_event_id) — el sello original NO se borra
--   reward_delivered premio entregado (la tarjeta se reinicia a 0)
--   correction       corrección manual con nota
--   legacy           punto de partida: sellos de antes del historial
--
-- POR QUÉ TABLA NUEVA: la vieja `loyalty_stamps_log` está VACÍA y su
-- INSERT está bloqueado por RLS (verificado 14 Nov 2026: 42501 «new row
-- violates row-level security policy»). Los sellos dados hasta hoy no
-- dejaron ningún registro. Esta tabla nace con sus políticas RLS.
--
-- SELLOS YA EXISTENTES: no se pierden ni se les inventa fecha. El
-- INSERT del final siembra UNA fila 'legacy' por miembro con sellos > 0,
-- con el contador que tenía. En la pantalla se muestra como
-- «Sellos anteriores (sin fecha registrada)».

create table if not exists public.loyalty_stamp_events (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.loyalty_members(id) on delete cascade,
  biz_id uuid not null,
  card_id uuid references public.loyalty_cards(id) on delete set null,
  event_type text not null check (event_type in ('stamp_added', 'stamp_removed', 'reward_delivered', 'correction', 'legacy')),
  stamp_number int,
  stamps_before int not null,
  stamps_after int not null,
  note text,
  created_by uuid,
  voids_event_id uuid references public.loyalty_stamp_events(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists loyalty_stamp_events_member_idx
  on public.loyalty_stamp_events (member_id, created_at desc);
create index if not exists loyalty_stamp_events_biz_idx
  on public.loyalty_stamp_events (biz_id, created_at desc);

alter table public.loyalty_stamp_events enable row level security;

-- Lectura: el dueño del negocio y el propio cliente (su historial).
drop policy if exists "Dueno del negocio ve historial de sellos" on public.loyalty_stamp_events;
create policy "Dueno del negocio ve historial de sellos"
  on public.loyalty_stamp_events for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = biz_id and b.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.loyalty_members m
      where m.id = member_id and m.user_id = auth.uid()
    )
  );

-- Escritura: solo el dueño del negocio registra movimientos.
drop policy if exists "Dueno del negocio registra movimientos de sellos" on public.loyalty_stamp_events;
create policy "Dueno del negocio registra movimientos de sellos"
  on public.loyalty_stamp_events for insert
  with check (
    exists (
      select 1 from public.businesses b
      where b.id = biz_id and b.owner_id = auth.uid()
    )
  );

-- Sin políticas de UPDATE ni DELETE: el historial es solo de agregado.
-- Las correcciones son filas nuevas ('stamp_removed' / 'correction').

-- Sellos ya existentes: punto de partida sin inventar fechas.
-- (Idempotente: no duplica la fila 'legacy' si se corre dos veces.)
insert into public.loyalty_stamp_events
  (member_id, biz_id, card_id, event_type, stamps_before, stamps_after, note)
select
  id, biz_id, card_id, 'legacy', 0, stamps,
  'Sellos otorgados antes del historial con fecha (sin fecha registrada).'
from public.loyalty_members
where stamps > 0
  and not exists (
    select 1 from public.loyalty_stamp_events e
    where e.member_id = loyalty_members.id and e.event_type = 'legacy'
  );
