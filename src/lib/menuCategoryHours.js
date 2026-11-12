// Visibilidad de categorías de menú por horario (PR menú-visibilidad-por-horario).
// Una categoría con available_from/available_to solo se muestra dentro de su
// ventana, en la zona horaria de la ciudad del negocio. Sin horario (NULL en
// ambas, o solo en una) siempre visible. Ventana nocturna (from > to, p. ej.
// 18:00–02:00) también funciona. Bordes: inicio inclusivo, fin exclusivo
// (08:30 sí, 13:00 no), igual que las promociones en menuPromotions.js.

export function timeToMinutes(value) {
  if (typeof value !== 'string') return null;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function minutesToTimeLabel(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, '0');
  const m = String(minutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

export function categoryHasSchedule(category) {
  return timeToMinutes(category?.available_from) != null && timeToMinutes(category?.available_to) != null;
}

export function categoryScheduleLabel(category) {
  const from = timeToMinutes(category?.available_from);
  const to = timeToMinutes(category?.available_to);
  if (from == null || to == null) return 'Siempre visible';
  return `${minutesToTimeLabel(from)}–${minutesToTimeLabel(to)}`;
}

export function isCategoryVisibleNow(category, { now = new Date(), timeZone = 'America/Mazatlan' } = {}) {
  const from = timeToMinutes(category?.available_from);
  const to = timeToMinutes(category?.available_to);
  // Sin horario (o incompleto) = siempre visible.
  if (from == null || to == null) return true;
  // Ventana degenerada (08:00–08:00) = siempre visible, no esconder por error.
  if (from === to) return true;
  let parts;
  try {
    parts = new Intl.DateTimeFormat('en-CA', { timeZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  } catch {
    return true;
  }
  const part = (type) => parts.find((item) => item.type === type)?.value;
  const minutes = Number(part('hour')) * 60 + Number(part('minute'));
  if (from < to) return minutes >= from && minutes < to;
  // Ventana nocturna: visible desde `from` hasta medianoche y de 00:00 a `to`.
  return minutes >= from || minutes < to;
}
