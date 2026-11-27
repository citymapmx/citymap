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
// mayor: con perspectiva de 650 px y el radio del cilindro, la cara del
// frente se magnifica (650 / (650 - radio)). Con 10 caras, el radio es
// 249 px en escritorio y la cara se ve a ~263x344; en teléfono el radio
// es 215 px y se ve a ~209x275. Esos son los tamaños de la opción B
// elegida por Jonathan (26 Nov 2026, PR #478): más efecto 3D, el centro
// más grande. El nominal no cambia: la escena crece en línea (360 px en
// escritorio, 291 px en teléfono) para que la cara del frente quepa sin
// tapar el encabezado.
export const WHEEL_FACE_W = 162;
export const WHEEL_FACE_H = 212;
export const WHEEL_FACE_W_MOBILE = 140;
export const WHEEL_FACE_H_MOBILE = 184;

// Distancia de perspectiva del tambor (la misma del viewport en
// EventWheel3D.jsx, que usa esta constante): 650 px, opción B (antes
// 1000 px). Acercarla magnifica más la cara del frente y achica y
// ladea más las laterales, como un abanico.
export const WHEEL_PERSPECTIVE = 650;

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

// Caras de referencia para el tamaño del tambor: la cara del frente se ve
// siempre igual de grande que en el inicio global (que siempre tiene 10
// eventos): ~263x344 en escritorio y ~209x275 en teléfono. Antes el radio
// era la apotema del polígono de n caras, así que con menos eventos el
// tambor se achicaba (con 7 eventos, radio 145 px en teléfono frente a
// 215 px con 10: el tambor medía ~290 px en una pantalla de 390 y se veía
// chico y centrado, con hueco vacío a los lados). La PR #290 lo fijó al
// radio de 10 caras, pero entonces las tarjetas quedaban con aire entre
// ellas (~60 px con 7 eventos en teléfono) porque el paso entre caras es
// mayor (360°/n) y la cara seguía midiendo lo mismo. Ahora wheelDrumGeometry
// cierra ese hueco: con menos de 10 caras la tarjeta se ensancha y el
// radio se achica juntos, de forma que las vecinas quedan pegadas al
// frente Y la cara del frente se sigue viendo igual de grande que en el
// global (ver wheelDrumGeometry).
export const WHEEL_DRUM_FACES = 10;

// Ancho PROYECTADO (visto) de la cara del frente en teléfono cuando la
// ciudad tiene menos de 10 eventos: 230 px en vez de 209 px. Con la
// referencia de 209 px las tarjetas ya quedaban juntas tras la #292, pero
// el tambor solo abarcaba ~185 px a cada lado del centro en una pantalla
// de 390 (mitad 195 px): quedaban ~10 px de hueco blanco a cada lado y no
// llegaba a los extremos. Con 230 px la cara del frente se ve más grande
// (~229x302) y el borde exterior del tambor pasa de los 195 px con 7
// eventos (199 px), así las laterales se cortan por los bordes de la
// pantalla, como en el inicio global. Solo aplica en teléfono y con
// menos de 10 eventos: el global (10) y el escritorio no cambian.
// (215 px antes de la opción B: con la perspectiva de 650 px el tambor
// se achicó y el medio ancho cayó a 189 px, así que la referencia subió
// a 230 px para recuperar el «a sangre».)
export const WHEEL_PROJECTED_W_MOBILE_FEW = 230;

// Radio del tambor para que la rueda de ciudad se vea como la del inicio
// global, independiente del número de eventos de la ciudad.
export function wheelDrumRadius(faceW) {
  return wheelFaceRadius(faceW, WHEEL_DRUM_FACES);
}

// Geometría del tambor para que las tarjetas queden JUNTAS con cualquier
// número de eventos (4 a 10; con 3 o menos no hay tambor, va la fila):
// devuelve el ancho/alto nominal de la cara y el radio del tambor.
//
// Con n = 10 (el inicio global) devuelve los valores nominales tal cual:
// cara 162x212 (140x184 en teléfono) y radio 249 px (215 px en teléfono).
//
// Con menos de 10 caras, la cara se ensancha y el radio se achica para
// que las vecinas queden pegadas al frente sin que la cara del frente se
// vea más chica: el radio es la apotema del polígono de n caras
// (R = (w/2) / tan(π/n), las caras se tocan en los bordes) y el ancho w
// se despeja para que el ancho PROYECTADO (con la perspectiva) sea el
// mismo que con 10 caras: w = P·persp / (persp + P/(2·tan(π/n))), donde P
// es el ancho proyectado de referencia. El alto guarda la proporción
// 3/4 de la tarjeta para que el alto proyectado también coincida.
// Ejemplos en teléfono (P = 209): con 7 eventos, cara 157x206 y radio
// 163 px (la cara se ve a 210x275, como el global); con 4, cara 180x237
// y radio 90 px. En escritorio (P = 263): con 7 eventos, cara 185x242 y
// radio 192 px (la cara se ve a 263x343).
//
// projectedRefW (opcional) cambia la P de referencia: en teléfono y con
// menos de 10 eventos el componente pasa WHEEL_PROJECTED_W_MOBILE_FEW
// (230 px) para que la rueda llegue a sangre a los extremos de la
// pantalla: con 7 eventos, cara 168x221 y radio 174 px (la cara se ve a
// 229x302 y el tambor abarca 199 px a cada lado del centro, más que la
// mitad de la pantalla de 390 px). Sin projectedRefW la geometría es la
// de siempre (P = 209 px en teléfono).
export function wheelDrumGeometry(faceW, faceH, n, perspective = WHEEL_PERSPECTIVE, projectedRefW = null) {
  const refW = projectedRefW ?? wheelProjectedFace(faceW, faceH, WHEEL_DRUM_FACES, perspective).w;
  if (!n || n < 4 || n >= WHEEL_DRUM_FACES) {
    return { faceW, faceH, radius: wheelDrumRadius(faceW) };
  }
  const t = Math.tan(Math.PI / n);
  const w = Math.round((perspective * refW) / (perspective + refW / (2 * t)));
  const radius = Math.round((w / 2) / t);
  const h = Math.round((w * faceH) / faceW);
  return { faceW: w, faceH: h, radius };
}

// Medio ancho que abarca el tambor en pantalla: la distancia del centro
// al borde exterior de la cara visible más alejada (la vecina más lejana
// que no está de espaldas). Sirve para afirmar que la rueda llega a los
// extremos: en un teléfono de 390 px la mitad de la pantalla son 195 px,
// así que el tambor llega a sangre cuando el medio ancho supera 195 px.
// Con 10 caras en teléfono son ~229 px (las caras a ±72° asoman por los
// bordes); con 7 eventos y la referencia ancha, 199 px; con la
// referencia de siempre, solo 185 px (por eso quedaba hueco blanco a los
// lados). Con 4 eventos las vecinas van de canto (invisibles) y el medio
// ancho es el de la cara del frente.
export function wheelDrumHalfSpan(faceW, faceH, n, perspective = WHEEL_PERSPECTIVE, projectedRefW = null) {
  if (!n || n < 4) return 0;
  const g = wheelDrumGeometry(faceW, faceH, n, perspective, projectedRefW);
  const a = g.faceW / 2;
  const step = (2 * Math.PI) / n;
  // La cara del frente: medio ancho proyectado.
  let span = (g.faceW * perspective) / (perspective - g.radius) / 2;
  for (let k = 1; k * step < Math.PI / 2; k++) {
    const th = k * step;
    const s = Math.sin(th);
    const c = Math.cos(th);
    const mag = perspective / (perspective - g.radius * c);
    const edge = g.radius * s + a * c * mag;
    if (edge > span) span = edge;
  }
  return Math.round(span);
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
// perspectiva 650, 162x212 nominales se ven a ~263x344.
export function wheelProjectedFace(faceW, faceH, n, perspective = WHEEL_PERSPECTIVE) {
  const radius = wheelFaceRadius(faceW, n);
  const mag = perspective / (perspective - radius);
  return { w: Math.round(faceW * mag), h: Math.round(faceH * mag) };
}
