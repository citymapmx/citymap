// Slugs de ciudad viejos que quedaron en la base (cities.slug) con
// mayúsculas y tildes: se corrigen a minúsculas sin tildes con 308 y con
// el SQL del PR de la Fase 3 (punto 6). La forma canónica es la
// normalizada; el sitemap y og.js solo emiten esa.
export const LEGACY_CITY_SLUGS = {
  'Barcelona': 'barcelona',
  'San-Pedro-Garza-García': 'san-pedro-garza-garcia',
  'San-Miguel-de-allende': 'san-miguel-de-allende',
};

// Forma canónica de un slug de ciudad: minúsculas sin tildes. Es
// idempotente y deja intactos los slugs ya normalizados; cualquier
// segmento de ciudad con mayúsculas o tildes es una forma vieja.
export function normalizeCitySlug(slug) {
  const s = String(slug || '');
  return LEGACY_CITY_SLUGS[s] || s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Forma vieja de un slug ya normalizado, para buscar en base mientras
// no se aplica el SQL que corrige cities.slug (og.js busca por ambas
// formas y así la URL nueva funciona antes y después del SQL). null si
// no hay forma vieja conocida.
export function legacyCitySlug(slug) {
  const s = String(slug || '');
  for (const [oldSlug, normalized] of Object.entries(LEGACY_CITY_SLUGS)) {
    if (normalized === s) return oldSlug;
  }
  return null;
}

export function seoSite(host = '') {
  const hostname = host.toLowerCase().split(':')[0];
  const isWorld = hostname === 'citymap.world' || hostname === 'www.citymap.world';
  return { isWorld, origin: isWorld ? 'https://www.citymap.world' : 'https://citymap.mx' };
}

// Ciudades fuera de México: viven en citymap.world (la versión
// internacional); citymap.mx es solo México. Verificado por PostgREST:
// de las 33 ciudades en base, 22 son MX y 11 internacionales (las de
// esta lista). La base (tabla cities, country_code) es la fuente de
// verdad; esta lista es la copia que usan el middleware y og.js para
// decidir el dominio sin consultar la base en cada petición. Al dar de
// alta una ciudad fuera de México, añadir su slug y su código de país
// aquí (y quitarla si se da de baja).
export const WORLD_CITIES = {
  barcelona: 'es', bogota: 'co', 'buenos-aires': 'ar', londres: 'gb',
  'los-angeles': 'us', madrid: 'es', medellin: 'co', paris: 'fr',
  'san-antonio': 'us', 'san-diego': 'us', vancouver: 'ca',
};

export function isWorldCitySlug(slug = '') {
  return Object.prototype.hasOwnProperty.call(WORLD_CITIES, String(slug || '').toLowerCase());
}

// Código de país de una ciudad internacional (p. ej. 'fr' para París);
// null si la ciudad no es internacional.
export function worldCityCountry(slug = '') {
  return WORLD_CITIES[String(slug || '').toLowerCase()] || null;
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
  return normalizeCitySlug(first);
}
