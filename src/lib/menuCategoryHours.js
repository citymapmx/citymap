// Visibilidad de categorías de menú por horario (PR menú-visibilidad-por-horario,
// cambio nov 2026, Jonathan): una categoría con available_from/available_to
// ya NO se oculta fuera de su ventana — se muestra atenuada y al tocarla
// avisa que está fuera de servicio. `isCategoryVisibleNow` sigue diciendo si
// la categoría está en horario ahora (para calcular el estado atenuado).
// Sin horario (NULL en ambas, o solo en una) siempre visible. Ventana nocturna
// (from > to, p. ej. 18:00–02:00) también funciona. Bordes: inicio inclusivo,
// fin exclusivo (08:30 sí, 13:00 no), igual que las promociones en
// menuPromotions.js.

import { isOpenNow, getSmartScheduleInfo } from './utils.js';

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

// Firma de todo lo que depende de la hora en el menú (hallazgo #8,
// nov 2026): franja horaria de cada categoría + abierto/cerrado del
// negocio + texto de la píldora de horario. El texto incluye el
// «Cierra pronto (23m)» / «Abre pronto (12m)», que cambia cada minuto
// solo en la última hora; fuera de esa ventana el texto es estable
// («Abierto ahora», «abre hoy a las 8:00 am»). El tick de 60 s de
// BusinessStore solo re-renderiza si cambia esta firma.
export function menuTimeKey({ business, categories, now, timeZone }) {
  const cats = (categories || []).map((c) => (
    categoryHasSchedule(c) && !isCategoryVisibleNow(c, { now, timeZone }) ? '1' : '0'
  )).join('');
  const open = isOpenNow(business || {}, business?.timezone, now) ? '1' : '0';
  const info = getSmartScheduleInfo(business || {}, business?.timezone, now);
  const text = Array.isArray(info?.text)
    ? info.text.filter((t) => typeof t === 'string').join('')
    : String(info?.text ?? '');
  return `${cats}|${open}|${text}`;
}

export function formatMinutes12h(minutes) {
  if (minutes == null || !Number.isFinite(minutes)) return '';
  const h24 = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const period = h24 >= 12 ? 'p.m.' : 'a.m.';
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${period}`;
}

// "8:00 a.m. – 12:30 p.m." o null si la categoría no tiene horario.
export function categoryScheduleLabel12h(category) {
  const from = timeToMinutes(category?.available_from);
  const to = timeToMinutes(category?.available_to);
  if (from == null || to == null) return null;
  return `${formatMinutes12h(from)} – ${formatMinutes12h(to)}`;
}

// Aviso para una categoría fuera de horario. La ventana se repite cada día,
// así que la próxima apertura es siempre available_from:
// "Fuera de servicio, vuelve a las 8:00 a.m." o null si no tiene horario.
export function offHoursMessage(category) {
  const from = timeToMinutes(category?.available_from);
  if (from == null || timeToMinutes(category?.available_to) == null) return null;
  return `Fuera de servicio, vuelve a las ${formatMinutes12h(from)}`;
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
