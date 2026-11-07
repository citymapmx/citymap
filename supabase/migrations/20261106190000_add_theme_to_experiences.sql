-- Separación de tipos de publicación y temáticas (PR #20).
-- La tabla `experiences` mezclaba tipos (Blog, Guía, Tour, Experiencia) y
-- temáticas (Naturaleza, Cultura, Deportes, Entretenimiento, Boleto...) en la
-- columna `activity_type`, con valores libres y con/sin emoji.
--
-- Cambios:
--  1. Nueva columna `theme` (slug de temática o NULL = sin temática).
--  2. `activity_type` queda con solo 4 valores canónicos: Blog, Guía, Tour,
--     Experiencia (sin emoji; la etiqueta con emoji vive en el código).
--
-- Reglas de migración (62 filas, 17 valores distintos, nov 2026):
--  - Blog / Guía: el tipo manda; sin temática (no hay información suficiente).
--  - Tours: Tour; 'Ruta de Senderismo' es un Tour con temática Rutas y recorridos.
--  - Las temáticas del valor anterior pasan a la columna `theme`.
--  - 'Boleto' y 'Playa' no tienen temática equivalente en la lista: quedan sin
--    temática (no se inventa clasificación).
-- No se toca id, slug, city_slug, biz_id ni ninguna otra columna.
-- Idempotente: se puede correr dos veces sin cambiar el resultado.

alter table experiences add column if not exists theme text;

-- Blog / Guía (sin temática)
update experiences set activity_type = 'Blog'
where activity_type in ('📝 Blog', '📝 Blog / Guía');

update experiences set activity_type = 'Guía'
where activity_type in ('📖 Guía', 'Guía', 'Guía Urbana');

-- Tours (sin temática, salvo la ruta de senderismo)
update experiences set activity_type = 'Tour'
where activity_type in ('Tour', '🗺️ Tours', 'Tour Guiado', 'Tour / Experiencia');

update experiences set activity_type = 'Tour', theme = 'rutas-recorridos'
where activity_type = 'Ruta de Senderismo';

-- Experiencias sin temática equivalente
update experiences set activity_type = 'Experiencia'
where activity_type in ('✨ Experiencias', 'Experiencia', '🎟️ Boleto', 'Playa');

-- Experiencias cuya temática estaba en el valor anterior
update experiences set activity_type = 'Experiencia', theme = 'naturaleza'
where activity_type = '🌿 Naturaleza';

update experiences set activity_type = 'Experiencia', theme = 'cultura'
where activity_type = '🏛️ Cultura';

update experiences set activity_type = 'Experiencia', theme = 'deportes'
where activity_type = '🏃 Deportes';

update experiences set activity_type = 'Experiencia', theme = 'entretenimiento'
where activity_type = '🥳 Entretenimiento';
