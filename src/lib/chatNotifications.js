// Avisos de mensajes nuevos en el chat de un evento privado (PR #227):
// lógica pura, sin React. La usa api/send-notification.js (modo aviso de
// chat) y PrivateEventChat para disparar el aviso tras enviar un mensaje.
//
// Modelo: solo un participante con sesión puede disparar el aviso, con su
// JWT. El servidor verifica el JWT, lee el mensaje exacto de la base (el
// cuerpo del aviso nunca sale del cliente) y avisa a los demás
// participantes: el anfitrión, los invitados que confirmaron asistencia
// (RSVP con cuenta) y quienes ya escribieron en ese chat, menos el
// remitente. Los invitados sin cuenta no tienen identidad verificable:
// sus mensajes no disparan avisos y no se les puede avisar. Un mensaje =
// un aviso por participante: el servidor omite a quien ya recibió ese
// mismo aviso en los últimos 5 min.
//
// PR #230: antes los destinatarios eran solo anfitrión + autores pasados,
// así que un invitado que confirmó pero nunca escribió jamás recibía
// avisos; y si el anfitrión escribía antes de que nadie más lo hiciera,
// no había a quién avisar. Los RSVP con sesión guardan su user_id
// (PrivateEventRsvp) y el servidor los incluye. Además el disparo ya no
// falla en silencio: un fallo del fetch queda en consola (antes nadie
// podía saber si el aviso salió o ni se disparó, como le pasó al anfitrión
// de Posada 2026 con una pestaña abierta desde antes del despliegue del
// #227: el bundle viejo no tenía este código y sus mensajes nunca
// dispararon el aviso).

import { eventUrl } from './eventUrls.js';
import { eventNotificationImage } from './notifications.js';

// Adelanto del mensaje en el aviso (caracteres, con '…' si se recorta).
export const CHAT_MESSAGE_PREVIEW_MAX = 120;
// Ventana anti-duplicados del mismo aviso (minutos).
export const CHAT_MESSAGE_DEDUP_MINUTES = 5;

// Tipo de la fila en la bandeja de notificaciones para estos avisos.
export const CHAT_NOTIFICATION_TYPE = 'chat';

// Un solo renglón, sin saltos ni espacios de más, recortado a `max`.
export function truncateChatPreview(body, max = CHAT_MESSAGE_PREVIEW_MAX) {
  const text = String(body || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

// Aviso de un mensaje nuevo: { title, body, deepLink } (+ imageUrl si el
// evento tiene imagen) o null si falta lo mínimo (autor, título o cuerpo).
// El título lleva quién escribió y en qué evento; el cuerpo es el adelanto
// del mensaje. El enlace abre el evento, que en los privados cae en la
// pestaña del chat por defecto.
export function buildChatMessage({ authorName, eventTitle, messageBody, event }) {
  const author = String(authorName || '').trim();
  const title = String(eventTitle || '').trim();
  const preview = truncateChatPreview(messageBody);
  if (!author || !title || !preview || !event?.id) return null;
  const imageUrl = eventNotificationImage(event);
  return {
    title: `${author} en ${title}`,
    body: preview,
    deepLink: eventUrl(event),
    ...(imageUrl ? { imageUrl } : {}),
  };
}

// Destinatarios del aviso: anfitrión + invitados que confirmaron (RSVP
// con cuenta) + autores pasados del chat, sin repetidos y sin el
// remitente. Las filas sin user_id (invitados sin cuenta) no se pueden
// avisar y se descartan.
export function chatRecipients({ hostId, messageUserIds, rsvpUserIds, senderId }) {
  const ids = new Set();
  if (hostId && hostId !== senderId) ids.add(hostId);
  for (const id of rsvpUserIds || []) {
    if (id && id !== senderId) ids.add(id);
  }
  for (const id of messageUserIds || []) {
    if (id && id !== senderId) ids.add(id);
  }
  return [...ids];
}

// ¿Este participante ya recibió este mismo aviso recientemente? Coincide
// por usuario, tipo, enlace absoluto guardado en la bandeja, cuerpo y
// fecha dentro de la ventana. La comparación de fechas ISO funciona por
// orden lexicográfico con el mismo formato.
export function isDuplicateChatNotification(existingNotifs, userId, deepLinkAbsolute, body, sinceISO) {
  return (existingNotifs || []).some(
    (n) =>
      n?.user_id === userId &&
      n?.type === CHAT_NOTIFICATION_TYPE &&
      n?.deep_link === deepLinkAbsolute &&
      n?.body === body &&
      typeof n?.created_at === 'string' &&
      n.created_at >= sinceISO,
  );
}

// Disparo del aviso desde el cliente, tras enviar el mensaje. No bloquea
// ni lanza nunca: el mensaje ya se envió. Sin token (invitado sin sesión)
// no se dispara nada. Un fallo SÍ queda registrado en consola con el
// estado HTTP (PR #230: antes fallaba en silencio y no había forma de
// saber si el aviso salió o ni se disparó).
export async function notifyChatMessage({ eventId, messageId, token }) {
  if (!eventId || !messageId || !token) return false;
  try {
    const r = await fetch('https://citymap.mx/api/send-notification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ chatMensaje: true, eventId, messageId }),
    });
    if (!r.ok) console.warn('[chat] aviso de mensaje no enviado', r.status, eventId, messageId);
    return r.ok;
  } catch (err) {
    console.warn('[chat] aviso de mensaje falló', eventId, messageId, String(err?.message || err));
    return false;
  }
}
