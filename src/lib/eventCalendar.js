// Hora "HH:MM" (24 h, la de la base) → { hours, minutes } o null.
const parseTime = value => {
  const m = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(String(value || '').trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
};

// Fecha + hora en el formato de Google Calendar (hora local flotante,
// sin zona: la hora que se guarda es la del evento, y el texto de
// detalles ya dice que es la hora local del lugar).
const dateTime = (date, { hours, minutes }) =>
  `${date.replaceAll('-', '')}T${String(hours).padStart(2, '0')}${String(minutes).padStart(2, '0')}00`;

const addMinutes = (date, { hours, minutes }, add) => {
  const base = new Date(Date.UTC(...date.split('-').map(Number).map((v, i) => (i === 1 ? v - 1 : v)), hours, minutes));
  base.setUTCMinutes(base.getUTCMinutes() + add);
  const p = n => String(n).padStart(2, '0');
  return `${base.getUTCFullYear()}${p(base.getUTCMonth() + 1)}${p(base.getUTCDate())}T${p(base.getUTCHours())}${p(base.getUTCMinutes())}00`;
};

export function getEventCalendarUrl(event) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event?.date || '')) return null;
  const parsed = new Date(`${event.date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== event.date) return null;
  const validEnd = Number.isFinite(new Date(`${event.end_date}T12:00:00Z`).getTime());
  const endDate = validEnd && /^\d{4}-\d{2}-\d{2}$/.test(event.end_date || '') && event.end_date >= event.date ? event.end_date : event.date;
  const details = [event.description, event.time ? `Hora del evento: ${event.time}${event.end_time ? ` a ${event.end_time}` : ''} (hora local del lugar).` : '', 'Configura una alerta en tu calendario antes de guardar.'].filter(Boolean).join('\n\n');
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title || 'Evento de CityMap', details, location: event.venue_address || event.venue_name || '' });
  // Con hora publicada (R7, UX 26 nov 2026): evento con hora real, no de
  // día completo — un concierto a las 21:00 ya no queda guardado como
  // todo el día. Fin: end_time si existe; si no, +1 h (o la misma hora
  // del último día en eventos de varios días). Sin hora: día completo
  // como antes (no se inventa una hora).
  const startTime = parseTime(event.time);
  if (startTime) {
    const endTime = parseTime(event.end_time);
    let end;
    if (endTime) end = dateTime(endDate, endTime);
    else if (endDate > event.date) end = dateTime(endDate, startTime);
    else end = addMinutes(event.date, startTime, 60);
    let start = dateTime(event.date, startTime);
    if (end <= start) end = addMinutes(event.date, startTime, 60);
    params.set('dates', `${start}/${end}`);
  } else {
    const nextDay = date => {
      const value = new Date(`${date}T12:00:00Z`);
      value.setUTCDate(value.getUTCDate() + 1);
      return value.toISOString().slice(0, 10).replaceAll('-', '');
    };
    params.set('dates', `${event.date.replaceAll('-', '')}/${nextDay(endDate)}`);
  }
  return `https://calendar.google.com/calendar/render?${params}`;
}
