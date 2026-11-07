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

export function springSettled(x, v, target) {
  return Math.abs(x - target) < 0.4 && Math.abs(v) < 8;
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
export function faceBrightness(angleDeg) {
  const a = Math.min(Math.abs(normalizeAngleDeg(angleDeg)), 90);
  return 1 - 0.3 * (a / 90);
}
