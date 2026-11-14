// Avisos de reservaciones nuevas (PR #301): lógica pura, sin React. La
// usan api/send-notification.js (modo aviso de reserva) y BookingModal
// para disparar el aviso tras confirmar la reserva.
//
// Modelo: el aviso nace en el servidor, nunca desde el cliente. Antes
// BookingModal llamaba sb.notify(owner_id) con el JWT del cliente que
// reserva y /api/send-notification lo rechazaba con 401 (solo acepta
// admins), en silencio: la reserva sí se guardaba pero nadie se enteraba.
// Ahora el cliente solo identifica la reserva (por id si el RPC lo
// devolvió, o por negocio+fecha+hora+teléfono) y el servidor lee la
// reserva exacta de la base (el cuerpo del aviso nunca sale del cliente),
// verifica que sea reciente y que quien dispara sea quien reservó (o el
// teléfono, si fue invitado sin cuenta), y avisa al dueño del negocio y a
// los admins, con copia en la bandeja y push por FCM. Una reserva = un
// aviso por destinatario: el servidor omite a quien ya recibió ese mismo
// aviso en los últimos 30 min.

import { businessNotificationImage } from './notifications.js';

// Tipo de la fila en la bandeja de notificaciones para estos avisos.
export const BOOKING_NOTIFICATION_TYPE = 'booking';
// La reserva debe ser así de reciente (minutos) para poder avisar de
// ella: evita que se reutilice una reserva vieja para avisar de más.
export const BOOKING_NOTIFICATION_FRESH_MINUTES = 30;
// Ventana anti-duplicados del mismo aviso (minutos).
export const BOOKING_NOTIFICATION_DEDUP_MINUTES = 30;

const WEEKDAYS_ES = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// "2026-11-13" -> "vie 13 nov 2026" (o la cadena tal cual si no se lee).
export function formatBookingDate(dateStr) {
  const m = String(dateStr || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(dateStr || '');
  const d = new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)));
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return `${WEEKDAYS_ES[d.getUTCDay()]} ${parseInt(m[3], 10)} ${MONTHS_ES[parseInt(m[2], 10) - 1]} ${m[1]}`;
}

// "18:00" -> "6:00 p. m."; "09:30" -> "9:30 a. m.".
export function formatBookingTime12h(timeStr) {
  const m = String(timeStr || '').match(/^(\d{1,2}):(\d{2})/);
  if (!m) return String(timeStr || '');
  const h24 = parseInt(m[1], 10);
  const h12 = h24 % 12 || 12;
  return `${h12}:${m[2]} ${h24 >= 12 ? 'p. m.' : 'a. m.'}`;
}

// Solo dígitos (para comparar teléfonos aunque vengan con espacios o
// guiones: el que reserva lo escribe como quiere).
export function normalizePhoneDigits(phone) {
  return String(phone || '').replace(/\D/g, '');
}

// Aviso de una reserva nueva: { title, body, deepLink } (+ imageUrl si el
// negocio tiene imagen) o null si falta lo mínimo. Todo sale de la base:
// nombre del cliente, del negocio, fecha, hora y servicio de la reserva.
export function buildBookingMessage({ reservation, business }) {
  const clientName = String(reservation?.client_name || '').trim();
  const bizName = String(business?.name || '').trim();
  const date = String(reservation?.date || '').trim();
  const time = String(reservation?.time || '').trim();
  const service = String(reservation?.service || '').trim();
  if (!clientName || !bizName || !date || !time || !business?.id) return null;
  const imageUrl = businessNotificationImage(business);
  return {
    title: 'Nueva reservación pendiente',
    body: `${clientName} ha solicitado una reserva en ${bizName} para el ${formatBookingDate(date)} a las ${formatBookingTime12h(time)}${service ? ` (${service})` : ''}.`,
    deepLink: `/manage/${business.slug || business.id}`,
    ...(imageUrl ? { imageUrl } : {}),
  };
}

// Destinatarios del aviso: dueño del negocio + admins, sin repetidos y
// sin quien reservó (si el dueño reserva en su propio negocio no necesita
// avisarse). Las filas sin user_id no se pueden avisar y se descartan.
export function bookingRecipients({ ownerId, adminIds, callerId }) {
  const ids = new Set();
  if (ownerId && ownerId !== callerId) ids.add(ownerId);
  for (const id of adminIds || []) {
    if (id && id !== callerId) ids.add(id);
  }
  return [...ids];
}

// ¿Este destinatario ya recibió este mismo aviso recientemente? Coincide
// por usuario, tipo, enlace absoluto guardado en la bandeja, cuerpo y
// fecha dentro de la ventana. La comparación de fechas ISO funciona por
// orden lexicográfico con el mismo formato.
export function isDuplicateBookingNotification(existingNotifs, userId, deepLinkAbsolute, body, sinceISO) {
  return (existingNotifs || []).some(
    (n) =>
      n?.user_id === userId &&
      n?.type === BOOKING_NOTIFICATION_TYPE &&
      n?.deep_link === deepLinkAbsolute &&
      n?.body === body &&
      typeof n?.created_at === 'string' &&
      n.created_at >= sinceISO,
  );
}

// Disparo del aviso desde el cliente, tras confirmar la reserva con
// secure_reserve. No bloquea ni lanza nunca: la reserva ya se guardó.
// Funciona también sin sesión (invitado): el servidor verifica la
// reserva por su id (si el RPC lo devolvió) o por negocio+fecha+hora+
// teléfono, y que sea reciente. Un fallo SÍ queda registrado en consola
// con el estado HTTP (antes el 401 de sb.notify era silencioso y nadie
// podía saber si el aviso salió o ni se disparó).
export async function notifyBooking({ reservationId, bizId, date, time, clientPhone, token }) {
  if (!bizId || !date || !time || !clientPhone) return false;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const r = await fetch('https://citymap.mx/api/send-notification', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        reserva: true,
        ...(reservationId ? { reservationId } : {}),
        bizId,
        date,
        time,
        clientPhone: normalizePhoneDigits(clientPhone),
      }),
    });
    if (!r.ok) console.warn('[reserva] aviso de reservación no enviado', r.status, bizId, date, time);
    return r.ok;
  } catch (err) {
    console.warn('[reserva] aviso de reservación falló', bizId, date, time, String(err?.message || err));
    return false;
  }
}
