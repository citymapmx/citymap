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
