import { CITY_TZ } from './constants.js';

export function eventCalendarDay(now = Date.now(), timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date(now));
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

const dateOnly = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : null;

// Last calendar day of an event (its end_date, or its date when it has none).
export function eventLastDay(event) {
  const start = dateOnly(event.date);
  const end = dateOnly(event.end_date);
  return end && (!start || end >= start) ? end : start;
}

// Fecha local (del dispositivo) en YYYY-MM-DD: la misma que el filtro de
// cliente del store (todayStr). La fecha del servidor no sirve: la app se
// usa en varias zonas horarias y el «hoy» que ve el usuario es el de su
// teléfono.
export function localTodayStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Fragmento PostgREST para la consulta de eventos del store (E5, 24 nov
// 2026): solo eventos vigentes — los que terminan hoy o después, o los
// que empiezan hoy o después cuando no tienen end_date. Es el mismo
// predicado que el filtro de cliente (useDataStore validEvents y
// isPastEvent): un evento pasado — también un recurrente cuyo end_date ya
// pasó — no se muestra, así que no se pide. Medido 24 nov: 395 → 363
// aprobados en total; Guadalajara 60 → 50. Verificado en vivo contra
// PostgREST antes de la PR.
export function eventsDateFilterOr(todayStr) {
  return `or=(end_date.gte.${todayStr},and(end_date.is.null,date.gte.${todayStr}))`;
}

// True when the event already ended (its last day is before today).
export function isPastEvent(event, today) {
  const lastDay = eventLastDay(event);
  return Boolean(lastDay) && lastDay < today;
}

const cityList = value => String(value || '').split(',').map(slug => slug.trim().toLowerCase()).filter(Boolean);
const eventCityMatches = (candidate, citySlug) =>
  !citySlug || citySlug === 'all' || cityList(candidate.city_slug).includes('all') || cityList(candidate.city_slug).includes(citySlug);

// Upcoming events in the same city as `event`, for the "this event already ended" section.
export function upcomingEvents(allEvents, event, today, limit = 4) {
  const citySlug = cityList(event.city_slug)[0];
  return (allEvents || [])
    .filter(candidate => candidate.id !== event.id && eventCityMatches(candidate, citySlug) && isListedEvent(candidate, today))
    .sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')))
    .slice(0, limit);
}

// Calendar dates stay in the event city's day, independent of a visitor's timezone.
export function isListedEvent(event, today) {
  if (!event.active || ['pending', 'rejected'].includes(event.status)) return false;
  // Los eventos privados nunca salen en listas, buscador, muro ni sitemap:
  // solo se abren con su enlace secreto.
  if (event.visibility === 'private') return false;
  const lastDay = eventLastDay(event);
  return !lastDay || lastDay >= today;
}

export function formatEventCardDate(event, { today, tomorrow, lang = 'es' } = {}) {
  const start = dateOnly(event.date);
  if (!start) return lang === 'en' ? 'Date to be confirmed' : 'Fecha por confirmar';
  const end = dateOnly(event.end_date);
  const locale = lang === 'en' ? 'en-US' : 'es-MX';
  const format = value => {
    const [year, month, day] = value.split('-').map(Number);
    return new Intl.DateTimeFormat(locale, { day:'numeric', month:'short' }).format(new Date(year, month - 1, day));
  };
  if (end && end > start) {
    // Recurrente semanal (R19, UX 26 nov 2026): la tarjeta dice cuándo
    // es la próxima ocurrencia («1 dic») en vez del rango del serial
    // («17 nov – 12 ene»), que no dice si hoy hay función. Sin `today`
    // (o ya sin ocurrencias) cae al rango de siempre.
    if (event.is_recurring) {
      const next = nextOccurrenceDate(event, today);
      if (next) {
        if (next === today) return lang === 'en' ? 'Today' : 'Hoy';
        if (next === tomorrow) return lang === 'en' ? 'Tomorrow' : 'Mañana';
        return format(next);
      }
    }
    return `${format(start)} – ${format(end)}`;
  }
  if (start === today) return lang === 'en' ? 'Today' : 'Hoy';
  if (start === tomorrow) return lang === 'en' ? 'Tomorrow' : 'Mañana';
  return format(start);
}

// Próxima fecha en que ocurre un recurrente semanal (mismo día de semana
// que su fecha de inicio), a partir de `today` (inclusive). Null si no
// es recurrente, si no hay fecha válida o si el serial ya terminó.
export function nextOccurrenceDate(event, today) {
  const start = dateOnly(event?.date);
  if (!start || !today || !event?.is_recurring) return null;
  const last = eventLastDay(event) || start;
  const target = weekdayOfDay(start);
  if (target === null) return null;
  let day = start > today ? start : today;
  if (day > last) return null;
  const first = weekdayOfDay(day);
  if (first === null) return null;
  const next = addDays(day, (target - first + 7) % 7);
  return next <= last ? next : null;
}

// ── Filtros de la página de Eventos ──

// Día de la semana (0 dom … 6 sáb) de un 'YYYY-MM-DD', en UTC para no
// depender de la zona horaria del dispositivo. null si no es fecha válida.
const weekdayOfDay = value => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!m) return null;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (d.toISOString().slice(0, 10) !== value) return null;
  return d.getUTCDay();
};

// 'YYYY-MM-DD' + n días (en UTC, sin hora de verano de por medio).
const addDays = (value, n) => {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + n)).toISOString().slice(0, 10);
};

// Zona horaria de una ciudad: la de la base (cities.timezone) cuando
// tiene valor; si no, el mapa estático CITY_TZ; si tampoco, Ciudad de
// México (la mayoría de las ciudades y de los visitantes). `cities` puede
// ser la lista del store o un Map por slug (como cityBySlug del inicio
// global). Una zona inválida en base no rompe nada: cae al fallback.
const FALLBACK_TZ = 'America/Mexico_City';
const isValidTimeZone = tz => {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; }
  catch { return false; }
};
export function cityTimeZone(slug, cities) {
  const key = String(slug || '').toLowerCase();
  const list = Array.isArray(cities) ? cities : (cities instanceof Map ? [...cities.values()] : []);
  const found = list.find(c => c && String(c.slug || '').toLowerCase() === key);
  const fromDb = found?.timezone;
  if (fromDb && isValidTimeZone(fromDb)) return fromDb;
  const fromMap = CITY_TZ[key];
  if (fromMap && isValidTimeZone(fromMap)) return fromMap;
  return FALLBACK_TZ;
}

// Zona horaria de la ciudad del evento (la primera, si es multi-ciudad).
export function eventCityTimeZone(event, cities) {
  const firstSlug = String(event?.city_slug || '').split(',')[0].trim();
  return cityTimeZone(firstSlug, cities);
}

// ¿El evento ocurre en este día? (incluye eventos de varios días).
// Recurrente semanal (is_recurring): solo ocurre el día de la semana de
// su fecha de inicio — p. ej. Martes de Glamour (17 nov 2026–12 ene
// 2027) solo los martes. Antes, todo el rango marcaba «Hoy» y la rueda
// mostraba «ES HOY» en sus tarjetas cualquier día (bug A8, 21 nov 2026).
export function eventCoversDay(event, day) {
  if (!day) return false;
  const start = dateOnly(event.date);
  if (!start) return true; // sin fecha: no se excluye por fecha
  const last = eventLastDay(event) || start;
  if (day < start || day > last) return false;
  if (!event.is_recurring) return true;
  const dow = weekdayOfDay(day);
  return dow !== null && dow === weekdayOfDay(start);
}

// ¿El evento ocurre hoy? (incluye eventos de varios días; sin fecha: no).
// La cuadrícula de Eventos usa formatEventCardDate para su píldora (rango
// en varios días); la rueda del inicio usa este predicado para la
// píldora «Hoy» (Morat 20–21 nov muestra «Hoy» el 20 y el 21; un
// recurrente semanal solo en su día — ver eventCoversDay).
export function isEventToday(event, today) {
  if (!today || !dateOnly(event.date)) return false;
  return eventCoversDay(event, today);
}

// ¿El rango del evento se cruza con [from, to]? Para un recurrente
// semanal, solo si alguna ocurrencia (mismo día de semana que el inicio)
// cae dentro de la ventana: un Martes de Glamour no es «de fin de
// semana» aunque su rango cubra el fin de semana.
export function eventOverlapsRange(event, from, to) {
  const start = dateOnly(event.date);
  if (!start) return true;
  const last = eventLastDay(event) || start;
  if (!event.is_recurring) return start <= to && last >= from;
  const windowStart = start > from ? start : from;
  const windowEnd = last < to ? last : to;
  if (windowStart > windowEnd) return false;
  const target = weekdayOfDay(start);
  const first = weekdayOfDay(windowStart);
  if (target === null || first === null) return false;
  return addDays(windowStart, (target - first + 7) % 7) <= windowEnd;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const isoDay = ms => new Date(ms).toISOString().slice(0, 10);

// Filtro rápido por fecha de la página de Eventos:
// 'todos' | 'hoy' | 'manana' | 'finde' | 'mes' (today en formato YYYY-MM-DD).
export function matchesDateFilter(event, filter, today) {
  if (!filter || filter === 'todos' || !today) return true;
  if (filter === 'hoy') return eventCoversDay(event, today);
  const [year, month, day] = today.split('-').map(Number);
  const base = Date.UTC(year, month - 1, day);
  if (filter === 'manana') return eventCoversDay(event, isoDay(base + DAY_MS));
  if (filter === 'finde') {
    // El fin de semana de hoy: viernes a domingo (si ya es sábado o
    // domingo, el que está en curso; si no, el que viene).
    const dow = new Date(base).getUTCDay(); // 0 dom … 6 sáb
    const friOffset = dow === 0 ? -2 : dow === 6 ? -1 : 5 - dow;
    return eventOverlapsRange(event, isoDay(base + friOffset * DAY_MS), isoDay(base + (friOffset + 2) * DAY_MS));
  }
  if (filter === 'mes') {
    const monthStart = `${today.slice(0, 7)}-01`;
    const monthEnd = isoDay(Date.UTC(year, month, 0)); // último día del mes
    return eventOverlapsRange(event, monthStart, monthEnd);
  }
  return true;
}

// Búsqueda por nombre, lugar o categoría (todas las palabras deben aparecer,
// sin importar mayúsculas ni acentos: "avila" encuentra "Ávila").
export function matchesEventSearch(event, query) {
  const fold = value => (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const needle = fold(query).trim();
  if (!needle) return true;
  // Búsqueda en español e inglés: el título y la descripción en inglés
  // también cuentan, para que buscar en inglés encuentre el evento. La
  // descripción en español también está en el índice (R18, UX 26 nov
  // 2026): buscar una palabra que solo aparece ahí no encontraba nada.
  const hay = fold([event.title, event.title_en, event.description, event.description_en, event.venue_name, event.event_category, event.category].filter(Boolean).join(' '));
  return needle.split(/\s+/).every(word => hay.includes(word));
}

const MONTH_NAMES_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// '2026-11' -> 'Noviembre 2026'.
export function monthLabel(key) {
  const [year, month] = (key || '').split('-').map(Number);
  if (!year || !month || !MONTH_NAMES_ES[month - 1]) return 'Sin fecha';
  const name = MONTH_NAMES_ES[month - 1];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
}

// Agrupa eventos (ya ordenados por fecha) por mes de inicio:
// [{ key: '2026-11', label: 'Noviembre 2026', events: [...] }].
// Los eventos sin fecha van al final, en 'Sin fecha'.
export function groupEventsByMonth(events) {
  const groups = [];
  const byKey = new Map();
  (events || []).forEach(ev => {
    const key = (dateOnly(ev.date) || '').slice(0, 7) || 'sin-fecha';
    if (!byKey.has(key)) {
      const group = { key, label: monthLabel(key), events: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    byKey.get(key).events.push(ev);
  });
  return groups;
}
