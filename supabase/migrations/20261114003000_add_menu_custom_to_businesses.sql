-- Tema personalizado del menú del negocio (editor universal).
-- CORRER EN EL EDITOR SQL DEL PANEL DE SUPABASE. Sin esta columna, el
-- editor universal no puede guardar colores propios (el guardado falla y
-- se avisa); el menú sigue funcionando exacto como hoy: el código lee
-- business.menu_custom y si viene vacío o la columna no existe, no
-- aplica ningún tema personalizado (cae al estilo predefinido o a nada).
--
-- menu_custom (jsonb, NULL = sin tema propio): { "bg": "#RRGGBB",
-- "primary": "#RRGGBB" }. El fondo es el color base del degradado del
-- menú (la segunda parada se deriva oscureciéndolo) y primary son los
-- botones +, píldoras activas, precios y títulos. El texto NO se guarda:
-- se deriva por contraste (textOnMenuSurface / textOnMenuPrimary en
-- src/lib/menuColorStyles.js). Un tema personalizado manda sobre el
-- estilo predefinido (menu_style); «Sin estilo» limpia ambos.
alter table public.businesses
  add column if not exists menu_custom jsonb null;

-- Verificación por PostgREST después de correrla:
-- GET /rest/v1/businesses?select=id,name,menu_style,menu_custom&id=eq.82c9af20-ef42-4a43-87c4-1831a020aace
-- (Carrito La Paz, Tepic) debe devolver menu_custom null hasta que el
-- negocio elija colores propios en «Diseño de mi menú».
