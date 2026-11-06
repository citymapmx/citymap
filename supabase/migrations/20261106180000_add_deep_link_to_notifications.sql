-- La bandeja de notificaciones (UserNotifs.jsx) abre el destino con deep_link,
-- pero la columna no existía: los envíos nunca podían guardar el enlace.
-- Aplicado en vivo el 6 nov 2026; este archivo deja el cambio registrado.
alter table public.notifications add column if not exists deep_link text;
