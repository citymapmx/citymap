export function eventCalendarDay(now = Date.now(), timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, year:'numeric', month:'2-digit', day:'2-digit' }).formatToParts(new Date(now));
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

const dateOnly = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : null;

// Calendar dates stay in the event city's day, independent of a visitor's timezone.
export function isListedEvent(event, today) {
  if (!event.active || ['pending', 'rejected'].includes(event.status)) return false;
  const start = dateOnly(event.date);
  const end = dateOnly(event.end_date);
  const lastDay = end && (!start || end >= start) ? end : start;
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
