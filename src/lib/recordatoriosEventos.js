// Recordatorios de eventos guardados (PR #213): lógica pura, sin React.
// Se prueba como unitaria. La usa api/send-notification.js (modo recordatorios)
// y sus tests; la app solo sincroniza los guardados.

import { eventUrl } from './eventUrls.js';
import { eventNotificationImage } from './notifications.js';

// Hoy en Ciudad de México (America/Mexico_City), "YYYY-MM-DD".
export function todayInMexicoCity(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

// Día (YYYY-MM-DD, Ciudad de México) de un timestamp ISO (created_at).
export function dayInMexicoCity(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return todayInMexicoCity(d);
}

// "21:00" → "9:00 p. m."; "09:00" → "9:00 a. m."; null → null.
export function formatReminderTime(time24) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(time24 || '').trim());
  if (!m) return null;
  const h24 = Number(m[1]);
  const min = m[2];
  if (h24 < 0 || h24 > 23) return null;
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${min} ${h24 >= 12 ? 'p. m.' : 'a. m.'}`;
}

// Solo si el título viene todo en mayúsculas ("ANDRÉS CALAMARO") lo pasa a
// formato título ("Andrés Calamaro"); los títulos mixtos se dejan como están.
export function toTitleCaseIfUpper(title) {
  const t = String(title || '').trim();
  if (!t || t !== t.toUpperCase()) return t;
  return t.toLowerCase().replace(/(^|[\s\-'¿¡(«"])([a-záéíóúñü])/g, (_, pre, ch) => pre + ch.toUpperCase());
}

// Cierres del cuerpo del recordatorio, en orden. La rotación es
// determinista por evento (hash djb2 del id): el mismo evento siempre
// recibe el mismo cierre y distintos eventos varían, sin azar entre
// corridas. Sin id se usa el título; sin nada, el primer cierre.
export const REMINDER_CLOSINGS = ['¡Nos vemos ahí!', '¡Hoy es el día!', '¡Ya casi!', 'No te lo pierdas'];

// Artículo del recinto: la mayoría de los recintos llevan "el"
// ("en el Teatro Diana", "en el PALCCO"); si el nombre ya trae
// artículo ("El Parián", "La Concha Acústica") no se duplica.
export function venueWithArticle(venue) {
  const v = String(venue || '').trim();
  if (!v) return '';
  return /^(el|la|los|las)\s/i.test(v) ? v : `el ${v}`;
}

export function reminderClosingFor(event) {
  const key = String(event?.id || event?.title || '');
  let hash = 5381;
  for (let i = 0; i < key.length; i += 1) hash = ((hash << 5) + hash + key.charCodeAt(i)) >>> 0;
  return REMINDER_CLOSINGS[hash % REMINDER_CLOSINGS.length];
}

// Mensaje del recordatorio: { title, body, deepLink } o null si al evento le
// falta lo mínimo (título o fecha). El título del evento NO se repite en el
// cuerpo (muchos títulos ya incluyen la ciudad): el cuerpo dice la hora y
// el recinto (venue_name), que es lo que el título no dice. Sin recinto no
// se inventa ninguno: se omite "en …". Sin hora no lleva "a las …". El
// punto final no se duplica tras "p. m." / "a. m." (ya terminan en punto).
// Si el evento tiene imagen (img_url o img, solo HTTPS) lleva imageUrl
// para que el aviso muestre el póster; sin imagen no lleva la clave y el
// aviso se manda igual que hoy.
export function buildReminderMessage(event) {
  const title = toTitleCaseIfUpper(event?.title);
  if (!title || !event?.date) return null;
  const time12 = formatReminderTime(event?.time);
  const venue = venueWithArticle(event?.venue_name);
  const closing = reminderClosingFor(event);
  const core = `Hoy${time12 ? ` a las ${time12}` : ''}${venue ? ` en ${venue}` : ''}`;
  const body = `${core}${core.endsWith('.') ? '' : '.'} ${closing}`;
  const imageUrl = eventNotificationImage(event);
  return { title, body, deepLink: eventUrl(event), ...(imageUrl ? { imageUrl } : {}) };
}

// Eventos de hoy (solo `date`, la primera fecha: los multi-fecha no se
// repiten cada día) y aprobados.
export function selectTodayReminders(events, todayISO) {
  return (events || []).filter((ev) => ev?.date === todayISO && ev?.status === 'approved');
}

// Usuarios únicos que guardaron un evento.
export function usersToRemind(favorites, eventId) {
  const ids = new Set();
  for (const f of favorites || []) {
    if (f?.event_id === eventId && f?.user_id) ids.add(f.user_id);
  }
  return [...ids];
}

// Ya hay un aviso igual sin leer de hoy para este usuario y este enlace.
export function isDuplicateReminder(existingNotifs, userId, deepLink, todayISO) {
  return (existingNotifs || []).some((n) => (
    n?.user_id === userId
    && n?.type === 'reminder'
    && n?.deep_link === deepLink
    && !n?.read
    && dayInMexicoCity(n?.created_at) === todayISO
  ));
}

// El plan completo del cron: por cada evento de hoy aprobado, por cada
// usuario que lo guardó, un recordatorio (salvo duplicado de hoy).
// events: filas de events; favorites: filas de event_favorites;
// existingNotifs: filas de notifications (para el anti-duplicado).
export function buildReminderPlan({ events, favorites, existingNotifs, todayISO }) {
  const plan = [];
  for (const ev of selectTodayReminders(events, todayISO)) {
    const msg = buildReminderMessage(ev);
    if (!msg) continue;
    for (const userId of usersToRemind(favorites, ev.id)) {
      if (isDuplicateReminder(existingNotifs, userId, msg.deepLink, todayISO)) continue;
      plan.push({ eventId: ev.id, userId, ...msg });
    }
  }
  return plan;
}

// Pares (evento, usuario) que recibirían aviso antes del anti-duplicado:
// sirve para reportar cuántos se saltaron por duplicados.
export function countReminderPairs(events, favorites, todayISO) {
  let total = 0;
  for (const ev of selectTodayReminders(events, todayISO)) {
    total += usersToRemind(favorites, ev.id).length;
  }
  return total;
}
