// Actividad de un negocio (detalle del panel de admin): periodos y
// agrupación de la gráfica.
//
// Todo en fecha LOCAL (como la gráfica actual): una vista de las 22:47
// en Tepic cuenta en ese día, aunque en UTC sea el día siguiente. Las
// filas sin created_at se ignoran, igual que hoy.
//
// Periodos: últimos 7 días, últimos 30 días, este mes, mes anterior y
// todo el tiempo. En 7 días la gráfica agrupa por día (4 barras por
// día, como hasta ahora); en periodos más largos agrupa por día con
// una sola barra apilada por tipo, y en "todo el tiempo" agrupa por
// mes. Así caben 30 días en el teléfono sin desplazamiento lateral.

export const ANALYTICS_PERIODS = [
  { id: "7", label: "Últimos 7 días", short: "7 días" },
  { id: "30", label: "Últimos 30 días", short: "30 días" },
  { id: "month", label: "Este mes", short: "Este mes" },
  { id: "prevMonth", label: "Mes anterior", short: "Mes anterior" },
  { id: "all", label: "Todo el tiempo", short: "Todo" },
];

// Tipos que la gráfica y las tarjetas cuentan. "view_event" (vistas de
// evento) no es actividad del negocio y queda fuera, como hasta ahora.
export const ANALYTICS_COUNTED_TYPES = ["view", "phone", "whatsapp", "menu_order", "maps", "website"];

export function ymdLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function monthLabel(d) {
  return d.toLocaleDateString("es-MX", { month: "long", year: "numeric" });
}

function addDays(d, n) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

// Rango del periodo: { startYMD, endYMD, label, chartLabel }.
// startYMD null = sin inicio (todo el tiempo). label es la frase para
// las tarjetas ("noviembre de 2026"); chartLabel, para el título de la
// gráfica ("en noviembre de 2026").
export function analyticsPeriodRange(period, now = new Date()) {
  const today = ymdLocal(now);
  if (period === "30") {
    return { startYMD: ymdLocal(addDays(now, -29)), endYMD: today, label: "Últimos 30 días", chartLabel: "últimos 30 días" };
  }
  if (period === "month") {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startYMD: ymdLocal(first), endYMD: today, label: monthLabel(now), chartLabel: `en ${monthLabel(now)}` };
  }
  if (period === "prevMonth") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { startYMD: ymdLocal(first), endYMD: ymdLocal(last), label: monthLabel(first), chartLabel: `en ${monthLabel(first)}` };
  }
  if (period === "all") {
    return { startYMD: null, endYMD: today, label: "Todo el tiempo", chartLabel: "por mes" };
  }
  return { startYMD: ymdLocal(addDays(now, -6)), endYMD: today, label: "Últimos 7 días", chartLabel: "últimos 7 días" };
}

function inRangeYMD(ymd, range) {
  if (!ymd) return false;
  if (range.startYMD && ymd < range.startYMD) return false;
  if (ymd > range.endYMD) return false;
  return true;
}

// Filas de analytics dentro del periodo (fecha local).
export function analyticsInPeriod(rows, period, now = new Date()) {
  const range = analyticsPeriodRange(period, now);
  return (rows || []).filter((a) => {
    if (!a?.created_at) return false;
    return inRangeYMD(ymdLocal(new Date(a.created_at)), range);
  });
}

// Conteo por tipo dentro de unas filas (los no contados van a 0).
export function countAnalyticsByType(rows) {
  const out = {};
  for (const t of ANALYTICS_COUNTED_TYPES) out[t] = 0;
  for (const a of rows || []) {
    if (a?.event_type in out) out[a.event_type] += 1;
  }
  return out;
}

function emptyBucket(key, label) {
  return { key, label, vistas: 0, llamadas: 0, whatsapp: 0, pedidos: 0, total: 0 };
}

function fillBucket(bucket, row) {
  if (row.event_type === "view") bucket.vistas += 1;
  else if (row.event_type === "phone") bucket.llamadas += 1;
  else if (row.event_type === "whatsapp") bucket.whatsapp += 1;
  else if (row.event_type === "menu_order") bucket.pedidos += 1;
  bucket.total = bucket.vistas + bucket.llamadas + bucket.whatsapp + bucket.pedidos;
  return bucket;
}

// Cubetas de la gráfica para el periodo: por día (7, 30, este mes,
// mes anterior) o por mes (todo el tiempo). La etiqueta es "mié 18"
// en 7 días, solo el número de día en periodos largos, y "oct 2026"
// por mes.
export function analyticsBuckets(rows, period, now = new Date()) {
  const range = analyticsPeriodRange(period, now);
  const inPeriod = analyticsInPeriod(rows, period, now);
  if (period === "all") {
    const months = new Map();
    // De corrido desde el primer mes con datos hasta el mes actual,
    // para que los meses sin nada se vean como hueco.
    let first = null;
    for (const a of inPeriod) {
      const d = new Date(a.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (!first || key < first) first = key;
    }
    if (!first) return [];
    const [fy, fm] = first.split("-").map(Number);
    const cursor = new Date(fy, fm - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 1);
    while (cursor <= last) {
      const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`;
      months.set(key, emptyBucket(key, cursor.toLocaleDateString("es-MX", { month: "short", year: "numeric" })));
      cursor.setMonth(cursor.getMonth() + 1);
      if (months.size > 24) break;
    }
    for (const a of inPeriod) {
      const d = new Date(a.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months.has(key)) fillBucket(months.get(key), a);
    }
    return [...months.values()];
  }
  const days = new Map();
  const start = new Date(`${range.startYMD}T12:00:00`);
  const end = new Date(`${range.endYMD}T12:00:00`);
  const longLabels = period !== "7";
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = ymdLocal(d);
    const label = longLabels
      ? String(d.getDate())
      : d.toLocaleDateString("es-MX", { weekday: "short", day: "numeric" });
    days.set(key, emptyBucket(key, label));
  }
  for (const a of inPeriod) {
    const key = ymdLocal(new Date(a.created_at));
    if (days.has(key)) fillBucket(days.get(key), a);
  }
  return [...days.values()];
}
