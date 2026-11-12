// Lógica pura del asistente de creación de negocio (3 pasos): días y
// horarios, precios por periodo y funciones efectivas por plan. Sin
// React: se prueba como unitaria. La usa AddBizModal (creación) y sus
// tests; el modo edición del modal conserva su propio editor de horario.

// Días de la semana del horario: clave del schedule en base + etiqueta
// corta de la píldora (como las pidió Jonathan: LUN MAR MIÉR JUE VIER
// SÁB DOM).
export const WIZARD_DAYS = [
  ['lun', 'LUN'],
  ['mar', 'MAR'],
  ['mie', 'MIÉR'],
  ['jue', 'JUE'],
  ['vie', 'VIER'],
  ['sab', 'SÁB'],
  ['dom', 'DOM'],
];

// Horario por defecto al abrir un día (el mismo que usa el editor de
// horario del modo edición).
export const WIZARD_DEFAULT_OPEN = '09:00';
export const WIZARD_DEFAULT_CLOSE = '22:00';

// "09:00" (24 h) → "09:00 a.m."; "22:00" → "10:00 p.m." (formato que
// guarda la base en schedule).
export function to12h(value24) {
  if (!value24) return '';
  const [hRaw, mRaw] = String(value24).split(':');
  const h24 = parseInt(hRaw, 10);
  if (Number.isNaN(h24)) return '';
  const p = h24 >= 12 ? 'p.m.' : 'a.m.';
  const h = h24 % 12 || 12;
  return `${String(h).padStart(2, '0')}:${mRaw || '00'} ${p}`;
}

// "09:00 a.m." → "09:00"; "10:00 p.m." → "22:00" (para <input type=time>).
export function toT24(value12h) {
  const m = String(value12h || '')
    .trim()
    .match(/(\d{1,2})(?:\s*:\s*(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const mn = parseInt(m[2] || 0, 10);
  const p = (m[3] || '').replace(/\./g, '').toLowerCase();
  if (p === 'pm' && h !== 12) h += 12;
  if (p === 'am' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
}

// "09:00 a.m. - 10:00 p.m." → { open: '09:00', close: '22:00' }.
// null si no se puede leer (día cerrado o texto vacío).
export function parseDayRange(raw) {
  if (!raw || /cerrado/i.test(raw)) return null;
  const parts = String(raw).split(/\s*[–-]\s*|\s+a\s+/i);
  const open = toT24(parts[0]);
  const close = toT24(parts[1]);
  if (!open || !close) return null;
  return { open, close };
}

export function isDayOpen(schedule, key) {
  const raw = (schedule || {})[key];
  return Boolean(raw) && !/cerrado/i.test(raw);
}

export function openDaysOf(schedule) {
  return WIZARD_DAYS.filter(([key]) => isDayOpen(schedule, key)).map(
    ([key]) => key,
  );
}

// Construye el schedule completo a partir de los días abiertos y el
// horario compartido (24 h). Los días no seleccionados quedan "Cerrado",
// en el mismo formato que ya usa la base.
export function buildSchedule(openKeys, openTime24, closeTime24) {
  const range = `${to12h(openTime24)} - ${to12h(closeTime24)}`;
  const out = {};
  for (const [key] of WIZARD_DAYS) {
    out[key] = openKeys.includes(key) ? range : 'Cerrado';
  }
  return out;
}

// Funciones efectivas de un plan: las suyas + las heredadas de los
// planes inferiores. La primera línea de Destacado y Premium es el
// resumen "Todo lo del plan X, más:" (no es una función) y no se hereda
// como tal: se toma desde el índice 1.
export function effectivePlanFeatures(plans, planKey) {
  const byKey = {};
  for (const p of plans) byKey[p.key] = p.features || [];
  if (planKey === 'free') return [...(byKey.free || [])];
  if (planKey === 'pro') {
    return [...(byKey.free || []), ...(byKey.pro || []).slice(1)];
  }
  return [
    ...(byKey.free || []),
    ...(byKey.pro || []).slice(1),
    ...(byKey.elite || []).slice(1),
  ];
}

// Filas de la tabla "Comparar todos los planes": unión de las funciones
// efectivas, en orden (gratuito, destacado, premium), sin repetir. La
// fila de "Reseñas de Google" queda con ✓ en los tres porque es función
// del gratuito y se hereda (decisión 11 nov 2026).
export function comparePlanFeatures(plans) {
  const seen = new Set();
  const rows = [];
  for (const key of ['free', 'pro', 'elite']) {
    for (const f of effectivePlanFeatures(plans, key)) {
      if (!seen.has(f)) {
        seen.add(f);
        rows.push(f);
      }
    }
  }
  return rows;
}

export function planHasFeature(plans, planKey, feature) {
  return effectivePlanFeatures(plans, planKey).includes(feature);
}

export function isPaidPlanKey(key) {
  return key === 'pro' || key === 'elite';
}

// Prueba de 7 días: solo en planes de pago y solo en mensual. En anual no
// hay mención de prueba, como en el checkout real de Stripe.
export function hasTrial(planKey, billing) {
  return isPaidPlanKey(planKey) && billing === 'monthly';
}

// Precio a mostrar de un plan según el periodo elegido.
export function planPrice(plan, billing) {
  return billing === 'annual' ? plan.priceAnnual : plan.priceMonthly;
}

// Extrae el número de un precio formateado ("$1,990" → 1990;
// "€9.99" → 9.99; "$99" → 99). Para el equivalente mensual del anual.
export function parsePriceNumber(formatted) {
  if (formatted == null) return NaN;
  const n = parseFloat(String(formatted).replace(/[^0-9.,]/g, '').replace(/,/g, ''));
  return Number.isNaN(n) ? NaN : n;
}
