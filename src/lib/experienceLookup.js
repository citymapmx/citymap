// Consultas acotadas para abrir una revista por slug directo (deep link).
// Hallazgo 7 de la auditoría de fluidez (21 nov 2026): TripsView pedía
// `select=*` sin limit ni status y, si el slug no se encontraba, descargaba
// TODA la tabla `experiences` (340 filas pesadas con gallery,
// booking_config, faq...) solo para buscar por título slugificado.

// Solo las columnas que usa ExperienceViewer para la ficha de la revista.
// Quedan fuera las que no usa: status, active, updated_at, rating,
// review_count, title_en y description_en (la búsqueda EN es del listado,
// no de la ficha; la ficha muestra la descripción en español).
export const EXPERIENCE_LOOKUP_COLUMNS =
  "id,title,slug,description,price,duration,people,meeting_point,languages,includes,not_includes,faq,gallery,city_slug,booking_config,activity_type,meeting_url,route_url,author_name,affiliate_products,created_at,biz_id,theme";

// Columnas completas para el formulario de edición del Admin: las del
// lookup más status, active y price_type (el formulario las lee y el
// guardado las manda). La lista del Admin trae el select ligero
// (ADMIN_EXPERIENCES_LIST_SELECT en AdminPanel), así que al abrir el
// formulario se pide la fila completa por id; abrirlo con la fila ligera
// borraría descripción, FAQ e includes al guardar.
export const ADMIN_EXPERIENCE_FULL_COLUMNS =
  `${EXPERIENCE_LOOKUP_COLUMNS},status,active,price_type`;
// El `or` es el mismo de antes (slug exacto o título parecido); ahora con
// select recortado, status y limit.
export function buildExperienceLookupQuery(routeSlug) {
  const isUUID = routeSlug.length === 36 && routeSlug.split("-").length === 5;
  const filter = isUUID
    ? `id=eq.${routeSlug}`
    : `or=(slug.eq.${routeSlug},title.ilike.*${encodeURIComponent(routeSlug.replace(/-/g, " "))}*)`;
  return `?select=${EXPERIENCE_LOOKUP_COLUMNS}&status=eq.approved&limit=5&${filter}`;
}

// Rescate para slugs viejos derivados de un título que ya cambió: el
// `ilike` de arriba no los encuentra y hay que comparar el título
// slugificado en cliente. Antes era `?select=*` sin límite (toda la
// tabla); ahora son solo las 100 aprobadas más recientes, con las mismas
// columnas recortadas. Un slug más viejo que eso ya no se rescata: se
// muestra el estado vacío en vez de descargar la tabla entera.
export const EXPERIENCE_FALLBACK_LIMIT = 100;

export function buildExperienceFallbackQuery() {
  return `?select=${EXPERIENCE_LOOKUP_COLUMNS}&status=eq.approved&limit=${EXPERIENCE_FALLBACK_LIMIT}&order=created_at.desc`;
}
