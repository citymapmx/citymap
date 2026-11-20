// Helpers de tours (Revista). Los usan la página /tours (ToursView) y la
// sección "Tours por ciudad" del inicio global (GlobalHomeView).
import { createSlug } from './utils.js';

// Número de un precio según su moneda: MXN en enteros (los decimales
// crudos de la conversión EUR→MXN, como $919.1, se veían descuidados);
// USD con centavos cuando los hay ($25.67), porque los precios en
// dólares ya vienen con centavos en la base. lang 'es' por defecto.
export function formatPriceAmount(price, currency = 'MXN', lang = 'es') {
  const value = Number(price);
  const locale = lang === 'en' ? 'en-US' : 'es-MX';
  if (currency === 'USD') {
    return value.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  }
  return Math.round(value).toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

// "desde $1,475 MXN" / "from $1,475 MXN" (con separador de miles).
// Sin precio válido devuelve null (el tour se muestra sin precio). lang
// 'es' por defecto para no romper los llamados existentes; las tarjetas
// pasan el idioma activo. La moneda la decide quien llama según la
// ciudad del tour (ver currencyForCity en domain.js); por defecto MXN.
// Solo cambia la presentación: el valor guardado en la base no se toca.
export function formatTourPrice(price, lang = 'es', currency = 'MXN') {
  const value = Number(price);
  if (!Number.isFinite(value) || value <= 0) return null;
  const prefix = lang === 'en' ? 'from' : 'desde';
  return `${prefix} $${formatPriceAmount(value, currency, lang)} ${currency}`;
}

// Duración real del tour para las tarjetas: primero la columna
// `duration` («6 horas - 8 horas», «2 horas»); si está vacía, el dato
// rápido «⏱️ Tiempo: 6-8 hrs» de booking_config.quick_facts. Si no hay
// ninguna, null: la tarjeta no muestra duración, nunca se inventa.
export function tourDurationLabel(tour) {
  const direct = String(tour?.duration || '').trim();
  if (direct) return direct;
  const facts = tour?.booking_config?.quick_facts;
  if (Array.isArray(facts)) {
    for (const fact of facts) {
      const m = String(fact || '').match(/⏱️?\s*Tiempo:\s*(.+)$/i);
      if (m && m[1].trim()) return m[1].trim();
    }
  }
  return null;
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

// Etiqueta de precio de la tarjeta: "desde $X MXN" / "from $X MXN" en
// México y "desde $X USD" / "from $X USD" fuera (regla 19 Nov 2026),
// "Gratis" / "Free" o null (tiene reserva pero el precio no está publicado;
// la tarjeta muestra "Precio no publicado"). Precio 0 explícito = verificado
// gratis (free tour, senderismo); sin precio (null/vacío) y con reserva =
// no publicado.
export function tourPriceLabel(tour, lang = 'es', currency = 'MXN') {
  const priced = formatTourPrice(tour?.price, lang, currency);
  if (priced) return priced;
  const free = lang === 'en' ? 'Free' : 'Gratis';
  if (tour?.price === 0 || tour?.price === '0') return free;
  return hasTourBooking(tour) ? null : free;
}

// Clave de ciudad para comparar slugs: minúsculas y sin acentos. La tabla
// cities guarda slugs como 'San-Pedro-Garza-García' y los tours traen
// 'san-pedro-garza-garcia': sin quitar los acentos no coinciden y la
// etiqueta cae al slug crudo. Misma normalización que createSlug.
function normalizeCityKey(slug) {
  return String(slug || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Agrupa los tours por ciudad: [{ slug, name, count, tours }], ordenados por
// cantidad (más tours primero) y a igualdad por nombre. `cities` es la lista
// de ciudades del sitio (para el nombre bonito); si la ciudad no está en la
// lista, el slug hace de nombre. La coincidencia de slug no distingue
// mayúsculas ni acentos (la tabla cities guarda 'Barcelona' y los tours
// 'barcelona'; 'San-Pedro-Garza-García' y 'san-pedro-garza-garcia' son la
// misma ciudad).
export function groupToursByCity(tours, cities = []) {
  const bySlug = new Map(
    (cities || []).map((c) => [normalizeCityKey(c.slug), c.name || c.slug]),
  );
  const groups = new Map();
  for (const tour of tours || []) {
    const slug = tour?.city_slug || 'todas';
    if (!groups.has(slug)) {
      groups.set(slug, { slug, name: bySlug.get(normalizeCityKey(slug)) || slug, count: 0, tours: [] });
    }
    const group = groups.get(slug);
    group.count += 1;
    group.tours.push(tour);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'));
}
