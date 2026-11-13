// Cuenta atrás de eventos guardados (Mis Favoritos, propuesta C):
// etiqueta según la fecha del evento y el día de hoy (ambos "YYYY-MM-DD").
// Pura y testeable: no lee la fecha del sistema, la recibe.
// Hoy / Mañana / En N días / Fue ayer / Hace N días / sin fecha.

export function parseDay(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (d.getFullYear() !== Number(m[1]) || d.getMonth() !== Number(m[2]) - 1 || d.getDate() !== Number(m[3])) return null;
  return d;
}

export function countdownEvento(dateStr, todayStr) {
  const d = parseDay(dateStr);
  const today = parseDay(todayStr);
  if (!d || !today) return { kind: 'sin_fecha', days: 0 };
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return { kind: 'hoy', days: 0 };
  if (diff === 1) return { kind: 'manana', days: 1 };
  if (diff > 1) return { kind: 'en_dias', days: diff };
  if (diff === -1) return { kind: 'ayer', days: 1 };
  return { kind: 'hace_dias', days: Math.abs(diff) };
}

// Agenda: primero los próximos (hoy en adelante, por fecha ascendente y
// luego por hora) y después los pasados (más reciente primero). Sin fecha
// válida van al final, en su orden original. Sin "hoy" válido, todo va por
// fecha ascendente.
export function ordenarAgendaEventos(events, todayStr) {
  const list = Array.isArray(events) ? [...events] : [];
  const byDateAsc = (a, b) =>
    String(a.date || '').localeCompare(String(b.date || '')) ||
    String(a.time || '').localeCompare(String(b.time || ''));
  const today = parseDay(todayStr);
  if (!today) {
    const dated = list.filter((e) => parseDay(e.date)).sort(byDateAsc);
    const noDate = list.filter((e) => !parseDay(e.date));
    return [...dated, ...noDate];
  }
  const upcoming = list.filter((e) => {
    const d = parseDay(e.date);
    return d && d >= today;
  }).sort(byDateAsc);
  const past = list.filter((e) => {
    const d = parseDay(e.date);
    return d && d < today;
  }).sort((a, b) => byDateAsc(b, a));
  const noDate = list.filter((e) => !parseDay(e.date));
  return [...upcoming, ...past, ...noDate];
}
