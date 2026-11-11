// Movimiento de la rueda 3D de eventos (opción #5 elegida por Jonathan,
// PR #192): giro automático continuo y fluido, sin saltos de cara en cara.
// Una vuelta completa tarda WHEEL_AUTO_SECONDS_PER_TURN segundos; el giro
// se pausa al tocar, arrastrar, pasar el mouse o esconder la pestaña, y se
// reanuda solo WHEEL_AUTO_RESUME_MS después de un salto manual (flecha,
// punto o lanzamiento con el dedo). Con prefers-reduced-motion no gira.

// Segundos por vuelta completa del tambor (360°).
export const WHEEL_AUTO_SECONDS_PER_TURN = 33;

// Grados por segundo del giro continuo.
export const WHEEL_AUTO_DEG_PER_SEC = 360 / WHEEL_AUTO_SECONDS_PER_TURN;

// Pausa tras un salto manual antes de reanudar el giro solo.
export const WHEEL_AUTO_RESUME_MS = 4000;

// Ancho y alto NOMINALES de la tarjeta de solo imagen (formato corto, no
// alargado): escritorio y teléfono (<= 640 px). Lo que se VE al frente es
// mayor: con perspectiva de 1000 px y el radio del cilindro, la cara del
// frente se magnifica (1000 / (1000 - radio)). Con 10 caras, el radio es
// 249 px en escritorio y la cara se ve a ~216x282; en teléfono el radio
// es 215 px y se ve a ~178x234. Esos son los tamaños de la demo elegida
// (opción #5): el nominal es menor para que el visto quepa en la escena
// de 306 px (262 px en teléfono) sin tapar el encabezado.
export const WHEEL_FACE_W = 162;
export const WHEEL_FACE_H = 212;
export const WHEEL_FACE_W_MOBILE = 140;
export const WHEEL_FACE_H_MOBILE = 184;

// Distancia de perspectiva del tambor (la misma del CSS).
export const WHEEL_PERSPECTIVE = 1000;

// Avance del giro continuo: la rotación baja (el frente avanza) a velocidad
// constante. dt en segundos.
export function wheelAutoStep(rotation, dtSeconds) {
  return rotation - WHEEL_AUTO_DEG_PER_SEC * dtSeconds;
}

// ¿Puede girar solo el tambor en este momento? hasTarget: hay un resorte
// en marcha hacia una cara; heldUntil: instante (performance.now) hasta el
// que el giro queda en pausa tras un salto manual.
export function wheelShouldAutoRotate({ paused, dragging, tabHidden, reducedMotion, hasTarget, heldUntil, now }) {
  if (paused || dragging || tabHidden || reducedMotion || hasTarget) return false;
  return now >= heldUntil;
}

// Radio del cilindro para que las tarjetas queden casi pegadas: la apotema
// del polígono regular de n caras de ancho faceW (las caras se tocan en
// los bordes). Con menos de 3 caras no hay tambor.
export function wheelFaceRadius(faceW, n) {
  if (!n || n < 3) return 0;
  return Math.round((faceW / 2) / Math.tan(Math.PI / n));
}

// Tamaño con el que se VE la cara del frente: la perspectiva magnifica la
// cara (está translateZ(radius) hacia el espectador). Con 10 caras y
// perspectiva 1000, 162x212 nominales se ven a ~216x282.
export function wheelProjectedFace(faceW, faceH, n, perspective = WHEEL_PERSPECTIVE) {
  const radius = wheelFaceRadius(faceW, n);
  const mag = perspective / (perspective - radius);
  return { w: Math.round(faceW * mag), h: Math.round(faceH * mag) };
}
