// Historial y auditoría de sellos de lealtad (14 Nov 2026, rama lealtad-historial).
//
// Cada movimiento de sellos queda registrado en `loyalty_stamp_events`
// (tabla nueva, append-only) con fecha y hora exactas:
// - stamp_added: un sello otorgado (con su número de sello).
// - stamp_removed: un sello quitado; apunta al evento que anula
//   (voids_event_id) — el sello original NO se borra, queda marcado
//   como eliminado para conservar la auditoría.
// - reward_delivered: premio entregado (la tarjeta se reinicia a 0).
// - correction: corrección manual con nota.
// - legacy: punto de partida. Los sellos que ya existían antes del
//   historial NO tienen fecha real: la migración siembra UNA fila
//   'legacy' por miembro con el contador que tenía, sin inventar
//   fechas. En la pantalla se muestra como «Sellos anteriores».
//
// HALLAZGO (14 Nov 2026): la tabla vieja `loyalty_stamps_log` está
// VACÍA y su INSERT está bloqueado por RLS (verificado: 42501
// «new row violates row-level security policy»). Por eso los sellos
// dados hasta hoy no dejaron ningún registro — y el `sb.post` que
// fallaba mostraba un «Error» fantasma después de dar el sello. Los
// flujos de sellos ya NO escriben ahí; escriben aquí, con políticas
// RLS propias en la migración.
//
// Si la migración aún no está aplicada (la tabla no existe), ninguna
// de estas funciones lanza: el sello igual se guarda en el contador
// de `loyalty_members` (fuente de verdad del progreso) y el historial
// simplemente queda vacío hasta que se aplique.
import { sb } from './supabase.js';

export const STAMP_EVENT_TYPES = [
  'stamp_added',
  'stamp_removed',
  'reward_delivered',
  'correction',
  'legacy',
];

// Fecha y hora exactas en español: «14 nov 2026, 10:04 a. m.».
export function formatStampDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const fecha = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  const hora = d.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
  return `${fecha}, ${hora}`;
}

// Solo fecha: «14 nov 2026».
export function formatStampDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Etiqueta legible de un evento para la lista de historial.
export function stampEventLabel(event, rewardText = '') {
  if (!event) return '';
  switch (event.event_type) {
    case 'stamp_added':
      return `Sello #${event.stamp_number ?? '—'}`;
    case 'stamp_removed':
      return event.voids_event_id
        ? `Sello #${event.stamp_number ?? '—'} eliminado`
        : 'Sello anterior eliminado';
    case 'reward_delivered':
      return rewardText ? `Premio entregado: ${rewardText}` : 'Premio entregado';
    case 'correction':
      return 'Corrección';
    case 'legacy':
      return 'Sellos anteriores';
    default:
      return event.event_type || '';
  }
}

// ¿Este sello otorgado ya fue anulado por un evento stamp_removed?
export function isStampVoided(event, events) {
  if (!event?.id || !Array.isArray(events)) return false;
  return events.some(
    (e) => e.event_type === 'stamp_removed' && e.voids_event_id === event.id
  );
}

// El sello vigente más reciente (para el botón «−» sin elegir uno concreto).
export function latestActiveStampEvent(events) {
  if (!Array.isArray(events)) return null;
  const added = events
    .filter((e) => e.event_type === 'stamp_added' && !isStampVoided(e, events))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  return added[0] || null;
}

// Progreso de un cliente derivado del historial real + el contador guardado.
// - current: el contador de loyalty_members (fuente de verdad del progreso;
//   se actualiza junto con cada evento, nunca solo).
// - legacyCount: sellos de antes del historial (sin fecha real).
// - datedStamps: sellos con fecha real que siguen vigentes.
// - rewardsDelivered: premios entregados a este cliente.
// - lastVisit / enrolledAt: tal cual en la base (sin inventar).
export function deriveMemberProgress(member, events) {
  const list = Array.isArray(events) ? events : [];
  const legacy = list.find((e) => e.event_type === 'legacy');
  const legacyCount = legacy ? Number(legacy.stamps_after) || 0 : 0;
  // Sellos anteriores quitados a mano (sin evento concreto que anular).
  const legacyRemoved = list.filter(
    (e) => e.event_type === 'stamp_removed' && !e.voids_event_id
  ).length;
  const activeAdded = list.filter(
    (e) => e.event_type === 'stamp_added' && !isStampVoided(e, list)
  );
  return {
    current: Number(member?.stamps) || 0,
    legacyCount,
    legacyActive: Math.max(0, legacyCount - legacyRemoved),
    datedStamps: activeAdded.length,
    rewardsDelivered: list.filter((e) => e.event_type === 'reward_delivered').length,
    lastVisit: member?.last_stamp_at || null,
    enrolledAt: member?.enrolled_at || null,
  };
}

// Carga el historial de un cliente (más reciente primero).
// Devuelve { events, supported }: supported=false cuando la tabla aún
// no existe (migración sin aplicar) — nunca lanza.
export async function loadMemberStampEvents(memberId, bizId) {
  if (!memberId) return { events: [], supported: false };
  try {
    const rows = await sb.get(
      'loyalty_stamp_events',
      `?member_id=eq.${memberId}&biz_id=eq.${bizId}&order=created_at.desc&limit=200`
    );
    return { events: Array.isArray(rows) ? rows : [], supported: true };
  } catch {
    return { events: [], supported: false };
  }
}

// Premios entregados de todo el negocio (registro global de recompensas).
export async function loadBizRewardEvents(bizId) {
  if (!bizId) return [];
  try {
    const rows = await sb.get(
      'loyalty_stamp_events',
      `?biz_id=eq.${bizId}&event_type=eq.reward_delivered&order=created_at.desc&limit=200`
    );
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

// Registra un movimiento en el historial/auditoría. Nunca lanza: si la
// migración no está aplicada, devuelve null y el sello igual quedó
// guardado en el contador (el llamador no debe bloquear el sello por esto).
export async function logStampEvent({
  memberId,
  bizId,
  cardId = null,
  eventType,
  stampNumber = null,
  stampsBefore,
  stampsAfter,
  note = null,
  voidsEventId = null,
  createdBy = null,
}) {
  if (!memberId || !bizId || !eventType) return null;
  try {
    const rows = await sb.post('loyalty_stamp_events', {
      member_id: memberId,
      biz_id: bizId,
      card_id: cardId,
      event_type: eventType,
      stamp_number: stampNumber,
      stamps_before: stampsBefore,
      stamps_after: stampsAfter,
      note,
      voids_event_id: voidsEventId,
      created_by: createdBy,
    });
    return rows?.[0] || null;
  } catch {
    return null;
  }
}
