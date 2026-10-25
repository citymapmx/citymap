export function getEventCalendarUrl(event) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(event?.date || '')) return null;
  const parsed = new Date(`${event.date}T12:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== event.date) return null;
  const start = event.date.replaceAll('-', '');
  const nextDay = date => {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + 1);
    return value.toISOString().slice(0, 10).replaceAll('-', '');
  };
  // Use all-day dates when the city's time zone isn't explicitly known.
  // This avoids silently putting a Tepic event in the viewer's time zone.
  const validEnd = Number.isFinite(new Date(`${event.end_date}T12:00:00Z`).getTime());
  const endDate = validEnd && /^\d{4}-\d{2}-\d{2}$/.test(event.end_date || '') && event.end_date >= event.date ? event.end_date : event.date;
  const details = [event.description, event.time ? `Hora del evento: ${event.time}${event.end_time ? ` a ${event.end_time}` : ''} (hora local del lugar).` : '', 'Configura una alerta en tu calendario antes de guardar.'].filter(Boolean).join('\n\n');
  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title || 'Evento de CityMap', dates: `${start}/${nextDay(endDate)}`, details, location: event.venue_address || event.venue_name || '' });
  return `https://calendar.google.com/calendar/render?${params}`;
}
