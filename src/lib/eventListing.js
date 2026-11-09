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
  if (end && end > start) return `${format(start)} – ${format(end)}`;
  if (start === today) return lang === 'en' ? 'Today' : 'Hoy';
  if (start === tomorrow) return lang === 'en' ? 'Tomorrow' : 'Mañana';
  return format(start);
}

// ── Filtros de la página de Eventos ──

// ¿El evento ocurre en este día? (incluye eventos de varios días).
export function eventCoversDay(event, day) {
  if (!day) return false;
  const start = dateOnly(event.date);
  if (!start) return true; // sin fecha: no se excluye por fecha
  return start <= day && day <= (eventLastDay(event) || start);
}

// ¿El rango del evento se cruza con [from, to]?
export function eventOverlapsRange(event, from, to) {
  const start = dateOnly(event.date);
  if (!start) return true;
  const last = eventLastDay(event) || start;
  return start <= to && last >= from;
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
  // también cuentan, para que buscar en inglés encuentre el evento.
  const hay = fold([event.title, event.title_en, event.description_en, event.venue_name, event.event_category, event.category].filter(Boolean).join(' '));
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
