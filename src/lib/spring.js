// Resorte físico para animar la rueda 3D (idea 6 de motion.dev: Coverflow).
// El tambor no salta de cara en cara con una transición CSS: un integrador
// de resorte lo lleva con velocidad e inercia, y se asienta con un leve
// sobrepaso, como el Coverflow de Motion. Solo anima transform y opacidad,
// para que no se trabe en el teléfono.

// Un paso del integrador semi-implícito de Euler. x y target en grados,
// v en grados por segundo, dt en segundos.
export function springStep(x, v, target, dt, stiffness = 140, damping = 17) {
  const a = -stiffness * (x - target) - damping * v;
  const nv = v + a * dt;
  return { x: x + nv * dt, v: nv };
}

// Asentado: cerca del objetivo y casi sin velocidad. Las tolerancias se
// dan en las unidades del objetivo: en la rueda el paso es 72° (0.4° es
// 0.5% del paso); en el coverflow el paso es 1 tarjeta, así que ahí se
// pasan tolerancias mucho más chicas (0.01 y 0.2). Con las de la rueda,
// el coverflow se daba por asentado a 0.37 tarjetas y el resto era un salto.
export function springSettled(x, v, target, posTol = 0.4, velTol = 8) {
  return Math.abs(x - target) < posTol && Math.abs(v) < velTol;
}

// Delta más corto de la posición actual (decimal, puede ir a mitad de
// paso) a la tarjeta target, en una lista circular de count tarjetas.
// Sin redondear: si el carrusel va a mitad de paso (por ejemplo 4.6 de
// camino a 5 ≡ 0) y llega otro objetivo, el delta se mide desde 4.6 y el
// resorte termina el paso; con Math.round el delta salía 0 y la tarjeta
// se quedaba parada a medio paso del centro.
export function shortestDelta(target, current, count) {
  let delta = target - current;
  delta = ((delta % count) + count) % count;
  if (delta > count / 2) delta -= count;
  return delta;
}

// Ángulo normalizado a [-180, 180].
export function normalizeAngleDeg(deg) {
  return (((deg % 360) + 540) % 360) - 180;
}

// Brillo de cada cara según su ángulo respecto al frente: de frente 1,
// de canto 0.7. Las vecinas se ven un poco más apagadas y el frente resalta.
// Brillo de una cara según su ángulo respecto al frente: 1 al centro y
// menos hacia los lados. En oscuro el piso es más alto (0.85 en vez de
// 0.7): sobre fondo casi negro las caras laterales se veían casi ilegibles.
export function faceBrightness(angleDeg, dark = false) {
  const a = Math.min(Math.abs(normalizeAngleDeg(angleDeg)), 90);
  return 1 - (dark ? 0.15 : 0.3) * (a / 90);
}

// Preset de resorte para la interfaz (framer-motion): la misma física del
// carrusel de eventos (resorte 140/17), pero más rígida y amortiguada para
// que un modal o una transición de ruta no se bambolee como el tambor.
export const SPRING_UI = { type: 'spring', stiffness: 320, damping: 32 };
