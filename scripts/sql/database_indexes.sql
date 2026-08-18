-- ==========================================
-- 📊 OPTIMIZACIÓN DE ÍNDICES PARA CITYMAP
-- ==========================================
-- Copia y ejecuta este script en el SQL Editor de Supabase
-- para acelerar las consultas, búsquedas y chequeos de RLS.

-- 1. TABLA: businesses (Negocios)
-- Acelera la carga de negocios por ciudad/estado y las consultas del panel de administración
CREATE INDEX IF NOT EXISTS idx_businesses_city_status 
ON public.businesses (city_slug, status);

-- Acelera la validación de políticas de seguridad (RLS) y tableros de dueños de negocios
CREATE INDEX IF NOT EXISTS idx_businesses_owner 
ON public.businesses (owner_id);

-- Acelera la búsqueda exacta de negocios por slug (ej. en cartas de menú y URL directas)
CREATE INDEX IF NOT EXISTS idx_businesses_slug 
ON public.businesses (slug);


-- 2. TABLA: events (Eventos)
-- Acelera la carga de la agenda local por ciudad y filtrados por estado aprobado
CREATE INDEX IF NOT EXISTS idx_events_city_status 
ON public.events (city_slug, status);


-- 3. TABLA: reviews (Reseñas)
-- Acelera la carga de reseñas dentro del visualizador de experiencias y negocios
CREATE INDEX IF NOT EXISTS idx_reviews_biz_id 
ON public.reviews (biz_id);

CREATE INDEX IF NOT EXISTS idx_reviews_experience_id 
ON public.reviews (experience_id);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id 
ON public.reviews (user_id);


-- 4. TABLAS DE ITINERARIOS (user_itineraries e itinerary_items)
-- Acelera la carga de la lista de planes personales de un usuario (Mis Planes)
CREATE INDEX IF NOT EXISTS idx_user_itineraries_user 
ON public.user_itineraries (user_id);

-- Acelera la búsqueda de itinerarios compartidos mediante token público/secreto
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_itineraries_share_token 
ON public.user_itineraries (share_token);

-- Acelera la carga ordenada de puntos de interés dentro de un itinerario
CREATE INDEX IF NOT EXISTS idx_itinerary_items_itin_sort 
ON public.itinerary_items (itinerary_id, sort_order);


-- 5. TABLA: favorites (Favoritos)
-- Acelera el chequeo de corazones/favoritos de un usuario al navegar las listas
CREATE INDEX IF NOT EXISTS idx_favorites_user 
ON public.favorites (user_id);


-- 6. TABLA: reservations (Reservas)
-- Acelera las consultas de disponibilidad y el listado de reservas de negocios por día
CREATE INDEX IF NOT EXISTS idx_reservations_biz_date 
ON public.reservations (biz_id, date);


-- 7. TABLAS DE TIENDA/MENÚ DIGITAL (store_categories y store_products)
-- Acelera la consulta y ordenado del catálogo digital de productos de un negocio
CREATE INDEX IF NOT EXISTS idx_store_categories_biz 
ON public.store_categories (business_id);

CREATE INDEX IF NOT EXISTS idx_store_products_biz 
ON public.store_products (business_id);
