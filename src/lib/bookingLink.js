// Link directo de reserva por negocio (nov 2026, Jonathan): un link
// limpio que abre la ficha con el modal de Reservar ya abierto, para
// que los clientes reserven sin pasos extra. Formato:
//   https://citymap.mx/<ciudad>/<slug-del-negocio>/reservar
// Solo ciudad + slug, SIN números raros (sin UUIDs ni ids). La canónica
// sigue siendo la ficha (sin /reservar): el sitemap NO lista estas
// URLs y useAppSEO ya calcula el canonical desde el negocio.
import { buildBizUrl, parseSegments } from './domain.js';
import { cleanCityPrefix } from './utils.js';

// ¿La ruta es el link directo de reserva /:ciudad/:slug/reservar?
// Tras quitar el prefijo de país en .world, son 3 segmentos. Un
// negocio cuyo slug sea «reservar» (/tepic/reservar, 2 segmentos) NO
// es link de reserva: el sufijo solo vale como tercer segmento.
export function isBookingPath(pathname) {
  const { segments } = parseSegments(String(pathname || '').split('/').filter(Boolean));
  return segments.length === 3 && segments[2] === 'reservar';
}

// ¿Este booking_config abre el modal nativo de Reservar? Es la misma
// condición del botón «Reservar» de DetailView: reserva activada, sin
// lista de plataformas externas, y sin URL externa única (esa abre la
// plataforma en otra pestaña, no el modal). Con undefined (aún sin
// cargar) no se sabe: nunca es «sin reserva».
export function bookingModalApplies(bookingConfig) {
  if (!bookingConfig?.enabled) return false;
  if (bookingConfig.type === 'external' && bookingConfig.externalUrl) return false;
  if (bookingConfig.type === 'external' && Array.isArray(bookingConfig.externalLinks) && bookingConfig.externalLinks.length > 0) return false;
  return true;
}

// Link limpio para reservar en un negocio. biz: { slug, city_slug }
// (el slug de la base trae el prefijo de ciudad: tepic-eduardo-barber).
// cities: lista de ciudades (para el prefijo de país en citymap.world).
// Sin ciudad o sin slug no hay link (null, nunca un link roto).
export function bookingLinkFor(biz, cities = []) {
  if (!biz?.slug || !biz?.city_slug) return null;
  const cleanSlug = cleanCityPrefix(biz.slug, biz.city_slug);
  if (!cleanSlug) return null;
  return buildBizUrl(biz.city_slug, cleanSlug, cities) + '/reservar';
}
