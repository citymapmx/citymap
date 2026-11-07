// Listas por horario de la home: "Para iniciar el día" (mañana),
// "Hora de comer" (mediodía) y "Para cerrar el día" (noche).
//
// Reglas:
// - Entran restaurantes, cafeterías y bares/antros sin importar el plan
//   (free, destacado o premium): el plan nunca filtra ni ordena.
// - Solo entran los que están abiertos ahora (según su horario).
// - El orden es aleatorio con semilla: misma semilla = mismo orden (sin
//   parpadeo al resolver el GPS o al llegar más datos), semilla distinta
//   = orden distinto. La home usa una semilla nueva en cada carga.

// Categorías de la BD (vienen en singular o plural según el negocio).
export const NIGHT_CATEGORIES = new Set([
  "restaurantes", "restaurante",
  "cafeterias", "cafeteria", "cafe",
  "antros y bares", "antros", "bar", "club", "cerveceria",
]);

export const LUNCH_CATEGORIES = new Set([
  "restaurantes", "restaurante", "comida rapida", "mariscos", "tacos", "pizzeria",
]);

export const BREAKFAST_CATEGORIES = new Set([
  "restaurantes", "restaurante", "comida rapida", "mariscos", "tacos", "pizzeria", "comida",
]);

export function businessCategory(b) {
  return String(b?.category || "").toLowerCase().trim();
}

export function hasTag(b, tag) {
  return Array.isArray(b?.tags) && b.tags.some(t => typeof t === "string" && t.toLowerCase() === tag);
}

// Noche (17:00-04:00): restaurantes, cafeterías y bares/antros, o con tag "cenas".
export function isNightSpot(b) {
  return NIGHT_CATEGORIES.has(businessCategory(b)) || hasTag(b, "cenas");
}

// Mediodía (12:00-17:00): lugares para comer, o con tag "comidas".
export function isLunchSpot(b) {
  return LUNCH_CATEGORIES.has(businessCategory(b)) || hasTag(b, "comidas");
}

// Mañana (04:00-12:00): cafeterías, lugares con desayunos o para comer.
export function isBreakfastSpot(b) {
  const cat = businessCategory(b);
  return cat === "cafe" || hasTag(b, "desayunos") || BREAKFAST_CATEGORIES.has(cat);
}

// Restaurantes y cafeterías (respaldo cuando no hay nada abierto en la franja).
export function isFoodSpot(b) {
  return ["restaurantes", "restaurante", "cafeterias", "cafeteria", "cafe"].includes(businessCategory(b));
}

// Franja según la hora local (0-23).
export function getTimeSlot(hour) {
  if (hour >= 17 || hour < 4) return { key: "night", title: "Para cerrar el día" };
  if (hour >= 12) return { key: "lunch", title: "Hora de comer" };
  return { key: "morning", title: "Para iniciar el día" };
}

export function spotForSlot(b, slotKey) {
  if (slotKey === "night") return isNightSpot(b);
  if (slotKey === "lunch") return isLunchSpot(b);
  return isBreakfastSpot(b);
}

// Pseudo-aleatorio con semilla: determinista por par (id, semilla).
export function seededRand(id, seed) {
  let h = seed ^ 0xdeadbeef;
  const s = String(id || "");
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x9e3779b9);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 0xffffffff;
}

// Orden aleatorio (con semilla) sin modificar la lista original.
export function shuffleBySeed(list, seed) {
  return [...list].sort((a, b) => seededRand(a.id, seed) - seededRand(b.id, seed));
}
