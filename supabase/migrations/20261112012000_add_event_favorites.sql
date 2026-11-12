-- Recordatorios de eventos guardados (PR #213).
-- CORRER EN EL EDITOR SQL DEL PANEL DE SUPABASE antes de que el recordatorio
-- funcione de punta a punta. La app no se rompe si la tabla aún no existe:
-- el guardado local sigue funcionando y la sincronización falla en silencio.
--
-- 1) Tabla event_favorites: qué eventos guardó cada usuario. El cron diario
-- (api/recordatorios-eventos.js) la lee con la clave de servicio para saber
-- a quién avisar el día del evento. La app la escribe con el JWT del usuario
-- (sb.upsert / sb.delWhere2 en App.jsx) y al iniciar sesión sube los
-- guardados locales (cg_saved_ev) que aún no estén.
create table if not exists public.event_favorites (
  user_id uuid not null,
  event_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, event_id)
);
alter table public.event_favorites enable row level security;

-- Cada usuario solo ve y toca sus propias filas (la clave de servicio, que
-- usa el cron, no pasa por RLS).
drop policy if exists "event_favorites_select_own" on public.event_favorites;
create policy "event_favorites_select_own" on public.event_favorites
  for select using (auth.uid() = user_id);
drop policy if exists "event_favorites_insert_own" on public.event_favorites;
create policy "event_favorites_insert_own" on public.event_favorites
  for insert with check (auth.uid() = user_id);
drop policy if exists "event_favorites_delete_own" on public.event_favorites;
create policy "event_favorites_delete_own" on public.event_favorites
  for delete using (auth.uid() = user_id);

-- 2) Cierre de push_tokens: hoy la tabla se puede leer con anon (devuelve
-- los tokens). Ningún código del cliente la lee (grep en src/: cero
-- resultados); solo la tocan api/register-token.js, api/unregister-token.js
-- y api/send-notification.js, todos con la clave de servicio, que no pasa
-- por RLS. Al activar RLS sin políticas, solo la clave de servicio puede
-- leer/escribir la tabla y el envío de push sigue igual.
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'push_tokens' loop
    execute format('drop policy %I on public.push_tokens', pol.policyname);
  end loop;
end $$;
alter table public.push_tokens enable row level security;
-- Sin políticas nuevas: el acceso es solo con la clave de servicio.
