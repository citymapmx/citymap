export function seoSite(host = '') {
  const hostname = host.toLowerCase().split(':')[0];
  const isWorld = hostname === 'citymap.world' || hostname === 'www.citymap.world';
  return { isWorld, origin: isWorld ? 'https://www.citymap.world' : 'https://citymap.mx' };
}

export const SEO_COUNTRIES = new Set(['mx', 'us', 'es', 'ca', 'ar', 'co', 'fr', 'gb']);

// Categorías de nivel superior de la app (useAppInitialization.js validCats):
// las que tienen página propia /:ciudad/:categoria y salen en el sitemap.
// Fuente única de verdad: middleware, sitemap y og la importan de aquí.
export const CATEGORY_SLUGS = [
  'restaurantes', 'cafe', 'salud', 'belleza', 'fitness', 'compras', 'tech',
  'ocio', 'hoteles', 'educacion', 'antros-y-bares', 'servicios', 'mascotas',
];

export function seoSegments(pathname, isWorld) {
  const parts = pathname.split('/').filter(Boolean);
  if (isWorld && SEO_COUNTRIES.has(parts[0])) parts.shift();
  return parts;
}

// Primeros segmentos que NUNCA son ciudad: rutas del sistema y secciones
// de nivel superior. Cualquier otro primer segmento es la ciudad por el
// propio enrutado de la app (/:ciudad, /:ciudad/:categoria,
// /:ciudad/:negocio).
export const SYSTEM_FIRST_SEGMENTS = new Set([
  'mapa', 'admin', 'mis-planes', 'planes', 'cuenta', 'eventos', 'explorar',
  'admin_notifs', 'user_notifs', 'about', 'privacy', 'terms', 'favoritos',
  'explorer', 'itinerarios', 'revista', 'experiencias', 'manage', 'stats',
  'itinerario', 'plan', 'evento', 'precios', 'lealtad', 'wallet', 'scan',
  'login', 'tours', 'negocios',
]);

// Ciudad de la URL, sin depender de la tienda de datos (que carga
// después): en /tepic es 'tepic'; en / y en rutas del sistema es ''.
// La URL es la fuente de verdad de la ciudad — el canonical y el título
// de la página de ciudad deben salir de aquí, no de activeCity, que en
// la primera pintura puede ser la ciudad guardada o venir vacío (en ese
// caso el canonical caía a la raíz y PageSpeed lo marcaba inválido).
export function citySlugFromPath(pathname, isWorld = false) {
  const parts = seoSegments(pathname || '', isWorld);
  if (parts.length === 0) return '';
  const first = String(parts[0] || '').toLowerCase();
  if (SYSTEM_FIRST_SEGMENTS.has(first)) return '';
  return first;
}
