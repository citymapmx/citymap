-- api/register-token.js escribe platform y updated_at en cada registro, pero
-- la tabla no tenía esas columnas y PostgREST rechazaba el alta: ningún
-- dispositivo pudo registrarse desde el 25 oct 2026. Aplicado en vivo el
-- 6 nov 2026; este archivo deja el cambio registrado.
alter table public.push_tokens add column if not exists platform text;
alter table public.push_tokens add column if not exists updated_at timestamptz;
