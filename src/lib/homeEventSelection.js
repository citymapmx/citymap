const DAY = 86400000;

export function eventDayKey(now = new Date(), timeZone) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {timeZone, year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(now);
    const value = type => parts.find(part => part.type === type).value;
    return `${value('year')}-${value('month')}-${value('day')}`;
  } catch { return eventDayKey(now); }
}

function dayNumber(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.toISOString().slice(0, 10) !== value) return null;
  return date.getTime() / DAY;
}

function chronological(rows) {
  return [...rows].sort((a, b) => {
    const dateOrder = a.date.localeCompare(b.date);
    if (dateOrder) return dateOrder;
    // A missing time sorts after scheduled events on the same day.
    const time = event => /^\d{1,2}:\d{2}/.test(event.time || '')
      ? event.time.split(':').slice(0, 2).map(part => part.padStart(2, '0')).join(':') : '24:00';
    const timeOrder = time(a).localeCompare(time(b));
    return timeOrder || String(a.id || a.title).localeCompare(String(b.id || b.title));
  });
}

export function selectHomeEvents(events = [], today = eventDayKey()) {
  const current = dayNumber(today);
  const [year, month] = today.split('-').map(Number);
  const monthEnd = Date.UTC(year, month, 0) / DAY;
  const todayEvents = [], thisWeek = [], later = new Map(), seasonal = [];
  for (const event of events) {
    if (!event || event.status !== 'approved') continue;
    // Recurrente semanal (is_recurring, píldora «Cada semana»): fuera de
    // la rueda (26 nov 2026, Jonathan) — se repite cada semana y el
    // carrusel parecía no actualizarse. Sigue en la lista de Eventos y
    // en su ficha, con su píldora.
    if (event.is_recurring) continue;
    const start = dayNumber(event.date);
    if (start === null) continue;
    const end = Math.max(start, dayNumber(event.end_date) ?? start);
    if (end < current) continue;
    // Week-long and monthly events get their own compact section this month.
    if (end - start + 1 >= 7 && start <= monthEnd) { seasonal.push(event); continue; }
    const daysUntil = Math.max(0, start - current);
    if (daysUntil === 0) todayEvents.push(event);
    else if (daysUntil <= 7) thisWeek.push(event);
    else { if (!later.has(start)) later.set(start, []); later.get(start).push(event); }
  }
  return {
    featured: [...chronological(todayEvents), ...chronological(thisWeek), ...[...later.keys()].sort((a,b)=>a-b).flatMap(day=>chronological(later.get(day)))],
    seasonal: chronological(seasonal),
  };
}

// ¿El evento sigue vigente "hoy" en la ciudad del evento? (rueda del
// inicio global: cada evento se juzga en su propia zona horaria, no en
// la del teléfono — un evento de Tijuana que terminó ayer en hora de
// Cancún puede seguir siendo hoy en Tijuana.) La primera ciudad de la
// lista cuando el evento es multi-ciudad; sin zona conocida para esa
// ciudad, hoy es el del dispositivo (comportamiento de antes). Misma
// regla que selectHomeEvents: vigente mientras su fin no haya pasado.
export function isEventUpcoming(event, now = new Date(), timeZoneByCity = {}) {
  if (!event || !event.date) return false;
  const start = dayNumber(event.date);
  if (start === null) return false;
  const firstSlug = String(event.city_slug || '').split(',')[0].trim();
  const timeZone = timeZoneByCity?.[firstSlug];
  const today = eventDayKey(now, timeZone);
  const end = Math.max(start, dayNumber(event.end_date) ?? start);
  return end >= dayNumber(today);
}
