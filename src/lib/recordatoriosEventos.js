// Recordatorios de eventos guardados (PR #213): lógica pura, sin React.
// Se prueba como unitaria. La usa la función api/recordatorios-eventos.js
// (cron diario) y sus tests; la app solo sincroniza los guardados.

import { eventUrl } from './eventUrls.js';

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

// Sustantivo del mensaje según la categoría del evento. Para conciertos
// lleva "de" ("el concierto de X"); el resto va sin "de" ("el festival X").
export function reminderNoun(eventCategory) {
  const c = String(eventCategory || '').trim().toLowerCase();
  if (c.includes('concierto')) return 'el concierto de';
  if (c.includes('festival')) return 'el festival';
  if (c.includes('obra de teatro') || c === 'teatro') return 'la obra de teatro';
  if (c.startsWith('show')) return 'el show';
  if (c.includes('danza') || c.includes('ballet')) return 'el espectáculo de danza';
  if (c.includes('corrida') || c.includes('novillada')) return 'la corrida';
  if (c.includes('comedia')) return 'el show de comedia';
  if (c.includes('lucha')) return 'la lucha libre';
  if (c.includes('carrera') || c.includes('tenis') || c === 'deporte') return 'el evento deportivo';
  if (c.includes('gastronom')) return 'el evento gastronómico';
  if (c.includes('feria')) return 'la feria';
  if (c.includes('conferencia') || c.includes('congreso')) return 'la conferencia';
  if (c.includes('expo')) return 'la expo';
  if (c.includes('convenci')) return 'la convención';
  if (c.includes('fiesta') || c.includes('posada')) return 'la fiesta';
  if (c.includes('jazz')) return 'el concierto de jazz';
  return 'el evento';
}

// Mensaje del recordatorio: { title, body, deepLink } o null si al evento le
// falta lo mínimo (título o fecha). La hora es opcional: sin hora, el mensaje
// no lleva "a las …".
export function buildReminderMessage(event) {
  const title = toTitleCaseIfUpper(event?.title);
  if (!title || !event?.date) return null;
  const noun = reminderNoun(event?.event_category);
  const time12 = formatReminderTime(event?.time);
  const body = time12
    ? `Hoy es ${noun} ${title} a las ${time12}, no te lo pierdas`
    : `Hoy es ${noun} ${title}, no te lo pierdas`;
  return { title, body, deepLink: eventUrl(event) };
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
