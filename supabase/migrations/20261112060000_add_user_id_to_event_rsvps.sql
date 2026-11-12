-- Avisos del chat del evento privado (PR #230).
-- CORRER EN EL EDITOR SQL DEL PANEL DE SUPABASE. Sin esta columna, los
-- avisos del chat solo llegan al anfitrión y a quienes ya escribieron: un
-- invitado que confirmó con sesión pero nunca escribió no recibe avisos.
-- La app no se rompe si la columna aún no existe: el RSVP reintenta sin
-- user_id y el servidor ignora la lectura de RSVP (ver PrivateEventRsvp y
-- runChatMessage en api/send-notification.js).
--
-- 1) user_id en event_rsvps: quién confirmó, cuando confirmó con sesión.
--    Las filas viejas (invitados sin cuenta) quedan en null.
alter table public.event_rsvps
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists event_rsvps_user_idx
  on public.event_rsvps (user_id);
