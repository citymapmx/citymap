-- WhatsApp en lealtad (PR #249).
-- CORRER EN EL EDITOR SQL DEL PANEL DE SUPABASE. Sin esta columna, el
-- campo de WhatsApp del join no se guarda (el join sigue funcionando: la
-- app reintenta sin el número, ver LoyaltyCardView) y el botón de WhatsApp
-- no aparece en la lista de clientes (solo se muestra cuando el cliente
-- tiene número guardado).
--
-- 1) whatsapp en loyalty_members: número del cliente normalizado, solo
--    dígitos con código de país 52 (móvil mexicano de 10 dígitos).
--    Ej: "311 200 8507" -> "523112008507".
alter table public.loyalty_members
  add column if not exists whatsapp text;
