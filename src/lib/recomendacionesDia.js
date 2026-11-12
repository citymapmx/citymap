// Recomendaciones del día — «Los 4 de hoy» (propuesta B, PR #238).
//
// Regla exacta de selección (turno justo, determinística, sin backend):
// 1) Elegibles: cualquier negocio con status "approved", cualquier plan
//    excepto "menu", de la ciudad activa (o su zona metropolitana). La foto
//    NO es requisito: los negocios sin foto también salen (la tarjeta usa
//    el placeholder con degradado, como el spotlight viejo).
// 2) Orden fijo por ciudad: los elegibles se ordenan con
//    seededRand(biz.id, hashString(citySlug)) — el mismo orden siempre para
//    la misma ciudad, distinto entre ciudades.
// 3) La lista ordenada se parte en grupos de 4. El número de día local
//    (días desde la época, hora local) elige el grupo: grupo =
//    día % nºDeGrupos, con nºDeGrupos = ceil(N/4). Cada día salen los 4
//    siguientes y el conjunto cambia a diario. Si hay 4 o menos elegibles,
//    salen todos todos los días.
//    Turno justo: dentro de un ciclo de ceil(N/4) días salen todos los
//    elegibles al menos una vez y, cuando N es múltiplo de 4, cada uno sale
//    exactamente una vez (nadie repite hasta agotar la lista). Si N no es
//    múltiplo de 4, el último grupo del ciclo se completa dando la vuelta
//    al principio de la lista para que ese día también salgan 4 — solo
//    esos primeros negocios repiten una vez por ciclo; el resto, una sola.
// 4) Determinístico: los mismos 4 para todos los usuarios el mismo día,
//    sin Math.random ni semillas por carga. Si un negocio se agrega o se
//    quita de la base, el orden se recalcula y el ciclo se reordena.
import { seededRand } from "./timeBasedLists.js";

export const RECOMENDACIONES_POR_DIA = 4;

// Hash numérico estable de un texto (FNV-1a). Antes vivía en HomeView.jsx
// (solo lo usaba el spotlight); se mueve aquí para que la selección de
// recomendaciones sea testeable sin React.
export function hashString(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Días desde la época en hora local: cambia a medianoche (no cada 6 h,
// como el SPOTLIGHT_PERIOD del spotlight viejo).
export function localDayNumber(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
}

// Elegibles para las recomendaciones del día. `allowedCities` es la ciudad
// activa o su zona metropolitana (METRO_ZONES[activeCity] || [activeCity]).
export function filterRecomendacionesElegibles(businesses, allowedCities) {
  const allowed = Array.isArray(allowedCities) ? allowedCities : [];
  return (businesses || []).filter((b) =>
    b && b.id &&
    b.status === "approved" &&
    b.plan !== "menu" &&
    typeof b.city_slug === "string" &&
    b.city_slug.split(",").some((c) => allowed.includes(c.trim()))
  );
}

// Los 4 del día: grupo de 4 según el día, del orden fijo por ciudad.
// Si el último grupo del ciclo queda corto, se completa dando la vuelta al
// principio de la lista para que siempre salgan 4 (cuando N >= 4).
export function pickRecomendacionesDelDia(eligible, citySlug, dayNumber) {
  const pool = Array.isArray(eligible) ? eligible : [];
  if (pool.length === 0) return [];
  const citySeed = hashString(citySlug);
  const order = [...pool].sort((a, b) =>
    (seededRand(a.id, citySeed) - seededRand(b.id, citySeed)) || String(a.id).localeCompare(String(b.id))
  );
  if (order.length <= RECOMENDACIONES_POR_DIA) return order;
  const numGroups = Math.ceil(order.length / RECOMENDACIONES_POR_DIA);
  const group = ((dayNumber % numGroups) + numGroups) % numGroups;
  const start = group * RECOMENDACIONES_POR_DIA;
  return Array.from({ length: RECOMENDACIONES_POR_DIA }, (_, i) => order[(start + i) % order.length]);
}
