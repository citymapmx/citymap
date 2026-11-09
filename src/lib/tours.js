// Helpers de tours (Revista). Los usan la página /tours (ToursView) y la
// sección "Tours por ciudad" del inicio global (GlobalHomeView).
import { createSlug } from './utils.js';

// "desde $1,475 MXN" / "from $1,475 MXN" (con separador de miles; sin
// decimales si es entero). Sin precio válido devuelve null (el tour se
// muestra sin precio). lang 'es' por defecto para no romper los llamados
// existentes; las tarjetas pasan el idioma activo.
export function formatTourPrice(price, lang = 'es') {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return null;
  const locale = lang === 'en' ? 'en-US' : 'es-MX';
  const prefix = lang === 'en' ? 'from' : 'desde';
  return `${prefix} $${value.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} MXN`;
}

// URL del artículo del tour en la Revista (igual que las tarjetas del muro).
export function tourCardUrl(tour) {
  return `/revista/${tour?.city_slug || ''}/${createSlug(tour?.title || '')}`;
}

// ¿El tour tiene enlace de reserva externo (Civitatis, Viator, GetYourGuide…)?
// Sirve para distinguir un tour gratis (senderismo, sin reserva) de uno con
// precio sin publicar todavía.
export function hasTourBooking(tour) {
  const links = tour?.booking_config?.externalLinks;
  return Array.isArray(links) && links.length > 0;
}

// Etiqueta de precio de la tarjeta: "desde $X MXN" / "from $X MXN",
// "Gratis" / "Free" o null (tiene reserva pero el precio no está publicado;
// la tarjeta muestra "Precio no publicado"). Precio 0 explícito = verificado
// gratis (free tour, senderismo); sin precio (null/vacío) y con reserva =
// no publicado.
export function tourPriceLabel(tour, lang = 'es') {
  const priced = formatTourPrice(tour?.price, lang);
  if (priced) return priced;
  const free = lang === 'en' ? 'Free' : 'Gratis';
  if (tour?.price === 0 || tour?.price === '0') return free;
  return hasTourBooking(tour) ? null : free;
}

// Agrupa los tours por ciudad: [{ slug, name, count, tours }], ordenados por
// cantidad (más tours primero) y a igualdad por nombre. `cities` es la lista
// de ciudades del sitio (para el nombre bonito); si la ciudad no está en la
// lista, el slug hace de nombre. La coincidencia de slug no distingue
// mayúsculas (la tabla cities guarda 'Barcelona' y los tours 'barcelona').
export function groupToursByCity(tours, cities = []) {
  const bySlug = new Map(
    (cities || []).map((c) => [String(c.slug || '').toLowerCase(), c.name || c.slug]),
  );
  const groups = new Map();
  for (const tour of tours || []) {
    const slug = tour?.city_slug || 'todas';
    if (!groups.has(slug)) {
      groups.set(slug, { slug, name: bySlug.get(String(slug).toLowerCase()) || slug, count: 0, tours: [] });
    }
    const group = groups.get(slug);
    group.count += 1;
    group.tours.push(tour);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));
}
