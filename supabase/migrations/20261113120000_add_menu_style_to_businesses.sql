-- Estilo del menú del negocio (PR #291: menú personalizado).
-- CORRER EN EL EDITOR SQL DEL PANEL DE SUPABASE. Sin esta columna, el menú
-- sigue funcionando exacto como hoy: el código lee business.menu_style y
-- si viene vacío o la columna no existe, no aplica ningún estilo.
--
-- menu_style (text, NULL = sin estilo): id de uno de los 30 estilos de las
-- tarjetas de lealtad (p. ej. "perla", "esmeralda", "coral"). Los 30 estilos
-- están en src/lib/loyaltyColorStyles.js y se resuelven en
-- src/lib/menuColorStyles.js. Un id desconocido tampoco rompe nada: el
-- menú se ve como hoy.
alter table public.businesses
  add column if not exists menu_style text null;

-- Verificación por PostgREST después de correrla:
-- GET /rest/v1/businesses?select=id,name,menu_style&id=eq.82c9af20-ef42-4a43-87c4-1831a020aace
-- (Carrito La Paz, Tepic) debe devolver menu_style null hasta que el
-- negocio elija un estilo en "Diseño de mi menú".
