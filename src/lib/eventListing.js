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
