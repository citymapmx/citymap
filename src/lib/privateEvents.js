// Eventos privados (fase 1, sin álbum): enlace secreto + confirmaciones (RSVP).
// El enlace secreto ES la URL: el slug lleva un sufijo aleatorio y el evento
// nunca sale en listas, buscador ni sitemap (ver isListedEvent).

export function isPrivateEvent(event) {
  return event?.visibility === 'private';
}

export function privateEventUrl(event, origin = '') {
  const base = origin || (typeof window !== 'undefined' ? window.location.origin : 'https://citymap.mx');
  return `${base}/evento/${event.slug || event.id}`;
}

// Resume las confirmaciones: si un invitado confirma varias veces, solo
// cuenta la más reciente por nombre. Devuelve el conteo por estado, el total
// de personas (confirmados + acompañantes) y la lista ordenada por fecha.
export function summarizeRsvps(rows) {
  const latest = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || !row.guest_name) continue;
    const key = String(row.guest_name).trim().toLowerCase();
    const prev = latest.get(key);
    if (!prev || String(row.created_at || '') >= String(prev.created_at || '')) latest.set(key, row);
  }
  const list = [...latest.values()].sort((a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')));
  const counts = { voy: 0, quizas: 0, no: 0 };
  let guests = 0;
  for (const row of list) {
    if (row.status === 'voy' || row.status === 'quizas' || row.status === 'no') counts[row.status] += 1;
    if (row.status === 'voy') guests += 1 + (Number(row.companions) || 0);
  }
  return { list, counts, guests, total: list.length };
}

// Hora corta de un mensaje del chat ("10:38 p. m."), en 12 horas.
export function formatMessageTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });
}

// Etiqueta del día de un mensaje del chat: "Hoy", "Ayer" o "7 nov 2026".
export function formatChatDay(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((today - day) / 86400000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
}

const AVATAR_COLORS = ['#1A7A5E', '#7C3AED', '#B45309', '#0E7490', '#BE185D'];

// Partes de la fecha de un evento para el distintivo del héroe estilo Luma:
// "JUE 10 DIC 2026". Se parsea la fecha como calendario local (año-mes-día)
// para que no se mueva de día por la zona horaria.
const MESES_CORTOS = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
const DIAS_CORTOS = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];
export function heroDateParts(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const parts = dateStr.split('-');
  if (parts.length < 3) return null;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return null;
  return { dia: DIAS_CORTOS[d.getDay()], num: String(d.getDate()), mes: MESES_CORTOS[d.getMonth()], year: String(d.getFullYear()) };
}

// Color estable del círculo con la inicial de un invitado (por su nombre).
export function avatarColor(name) {
  const text = String(name || '').trim();
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}
