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
