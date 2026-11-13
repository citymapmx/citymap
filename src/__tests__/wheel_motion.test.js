import { describe, expect, it } from 'vitest';
import {
  WHEEL_AUTO_DEG_PER_SEC,
  WHEEL_AUTO_SECONDS_PER_TURN,
  WHEEL_DRUM_FACES,
  WHEEL_FACE_W,
  WHEEL_FACE_W_MOBILE,
  WHEEL_PROJECTED_W_MOBILE_FEW,
  wheelAutoStep,
  wheelDrumGeometry,
  wheelDrumHalfSpan,
  wheelDrumRadius,
  wheelFaceRadius,
  wheelProjectedFace,
  wheelShouldAutoRotate,
} from '../lib/wheelMotion.js';

// Rueda 3D, opción #5 (PR #192): giro automático continuo y fluido, sin
// saltos de cara en cara, con las tarjetas casi pegadas.

describe('wheelMotion: giro automático continuo', () => {
  it('una vuelta completa tarda 33 s (10,9°/s)', () => {
    expect(WHEEL_AUTO_SECONDS_PER_TURN).toBe(33);
    expect(WHEEL_AUTO_DEG_PER_SEC).toBeCloseTo(360 / 33, 5);
    expect(wheelAutoStep(0, 1)).toBeCloseTo(-360 / 33, 5);
    expect(wheelAutoStep(0, 33)).toBeCloseTo(-360, 5);
    expect(wheelAutoStep(0, 0)).toBe(0);
    // El giro es continuo: a mitad de paso no se asienta en ninguna cara.
    expect(wheelAutoStep(0, 1.65)).toBeCloseTo(-18, 5);
  });

  it('el giro se pausa al tocar, arrastrar, esconder la pestaña o con movimiento reducido', () => {
    const base = { paused: false, dragging: false, tabHidden: false, reducedMotion: false, hasTarget: false, heldUntil: 0, now: 1000 };
    expect(wheelShouldAutoRotate(base)).toBe(true);
    expect(wheelShouldAutoRotate({ ...base, paused: true })).toBe(false);
    expect(wheelShouldAutoRotate({ ...base, dragging: true })).toBe(false);
    expect(wheelShouldAutoRotate({ ...base, tabHidden: true })).toBe(false);
    expect(wheelShouldAutoRotate({ ...base, reducedMotion: true })).toBe(false);
    // Un salto manual en marcha (resorte) también pausa el giro solo.
    expect(wheelShouldAutoRotate({ ...base, hasTarget: true })).toBe(false);
    // Tras un salto manual, el giro espera hasta heldUntil y luego reanuda.
    expect(wheelShouldAutoRotate({ ...base, heldUntil: 5000, now: 4999 })).toBe(false);
    expect(wheelShouldAutoRotate({ ...base, heldUntil: 5000, now: 5000 })).toBe(true);
  });
});

describe('wheelMotion: cilindro cerrado (tarjetas casi pegadas)', () => {
  it('la tarjeta mide 162 px nominales en escritorio y 140 px en teléfono', () => {
    expect(WHEEL_FACE_W).toBe(162);
    expect(WHEEL_FACE_W_MOBILE).toBe(140);
  });

  it('el radio es la apotema: las caras se tocan en los bordes', () => {
    // 10 caras de 162 px: 81 / tan(18°) = 249 px (antes 246 con 160 px).
    expect(wheelFaceRadius(162, 10)).toBe(249);
    // 10 caras de 140 px (teléfono): 70 / tan(18°) = 215 px.
    expect(wheelFaceRadius(140, 10)).toBe(215);
    // 6 caras de 162 px: 81 / tan(30°) = 140 px.
    expect(wheelFaceRadius(162, 6)).toBe(140);
    // Con menos de 3 caras no hay tambor.
    expect(wheelFaceRadius(162, 2)).toBe(0);
    expect(wheelFaceRadius(162, 0)).toBe(0);
  });

  it('el radio de referencia es fijo (10 caras) y no depende de los eventos de la ciudad', () => {
    // Radio de 10 caras: 249 px en escritorio y 215 px en teléfono. Es
    // la referencia que usa wheelDrumGeometry para que la cara del frente
    // se vea igual de grande con cualquier número de eventos (la geometría
    // por ciudad ajusta cara y radio juntas, ver el test de abajo).
    expect(WHEEL_DRUM_FACES).toBe(10);
    expect(wheelDrumRadius(162)).toBe(249);
    expect(wheelDrumRadius(140)).toBe(215);
  });

  it('la cara del frente se ve a ~216x282 en escritorio y ~178x234 en teléfono', () => {
    // La perspectiva magnifica la cara (translateZ hacia el espectador):
    // el nominal es menor para que el visto quepa en la escena de 306 px
    // sin tapar el encabezado (antes, con 216 px nominales, la cara se
    // veía a 323x422 y tapaba el título).
    expect(wheelProjectedFace(162, 212, 10)).toEqual({ w: 216, h: 282 });
    expect(wheelProjectedFace(140, 184, 10)).toEqual({ w: 178, h: 234 });
  });
});

describe('wheelMotion: tarjetas juntas con pocos eventos (Tepic)', () => {
  it('con 10 eventos devuelve los valores nominales de siempre', () => {
    expect(wheelDrumGeometry(162, 212, 10)).toEqual({ faceW: 162, faceH: 212, radius: 249 });
    expect(wheelDrumGeometry(140, 184, 10)).toEqual({ faceW: 140, faceH: 184, radius: 215 });
    // Con más de 10 tampoco cambia (el tambor se capa en 10 caras).
    expect(wheelDrumGeometry(162, 212, 12)).toEqual({ faceW: 162, faceH: 212, radius: 249 });
  });

  it('con 7 eventos (Tepic) la cara se ensancha y el radio se achica, sin hueco entre vecinas', () => {
    // Antes (#290, radio fijo de 10 caras) quedaban ~60 px de aire entre
    // tarjetas en teléfono: el paso entre caras es 360°/7 y la cara
    // seguía midiendo 140 px. Ahora la cara mide 150x197 y el radio 156
    // px en teléfono (176x230 y 183 px en escritorio).
    expect(wheelDrumGeometry(162, 212, 7)).toEqual({ faceW: 176, faceH: 230, radius: 183 });
    expect(wheelDrumGeometry(140, 184, 7)).toEqual({ faceW: 150, faceH: 197, radius: 156 });
    // Las vecinas quedan PEGADAS al frente: el radio es la apotema del
    // polígono de 7 caras con ese ancho (las caras se tocan en los
    // bordes, como con 10 caras en el global).
    expect(wheelFaceRadius(176, 7)).toBe(183);
    expect(wheelFaceRadius(150, 7)).toBe(156);
  });

  it('con 7 eventos la cara del frente se ve igual de grande que en el global', () => {
    // La cara más ancha compensa el radio más chico: la perspectiva la
    // magnifica menos, y el visto queda igual que con 10 caras.
    const desktop = wheelDrumGeometry(162, 212, 7);
    expect(wheelProjectedFace(desktop.faceW, desktop.faceH, 7)).toEqual({ w: 215, h: 282 });
    const mobile = wheelDrumGeometry(140, 184, 7);
    expect(wheelProjectedFace(mobile.faceW, mobile.faceH, 7)).toEqual({ w: 178, h: 233 });
  });

  it('con 4 a 9 eventos también se juntan y el frente mide lo mismo que el global', () => {
    for (const n of [4, 5, 6, 8, 9]) {
      const g = wheelDrumGeometry(140, 184, n);
      // Radio = apotema de n caras: las vecinas se tocan.
      expect(wheelFaceRadius(g.faceW, n)).toBe(g.radius);
      // Frente del mismo tamaño que el global (~178x234 en teléfono).
      const seen = wheelProjectedFace(g.faceW, g.faceH, n);
      expect(seen.w).toBeGreaterThanOrEqual(177);
      expect(seen.w).toBeLessThanOrEqual(179);
      expect(seen.h).toBeGreaterThanOrEqual(232);
      expect(seen.h).toBeLessThanOrEqual(235);
    }
    // Con 4 eventos la cara es la más ancha (163 px) y el radio el más
    // chico (82 px en teléfono).
    expect(wheelDrumGeometry(140, 184, 4)).toEqual({ faceW: 163, faceH: 214, radius: 82 });
  });

  it('con 3 o menos no hay tambor (va la fila) y la geometría devuelve los nominales', () => {
    expect(wheelDrumGeometry(162, 212, 3)).toEqual({ faceW: 162, faceH: 212, radius: 249 });
    expect(wheelDrumGeometry(162, 212, 0)).toEqual({ faceW: 162, faceH: 212, radius: 249 });
  });
});

describe('wheelMotion: rueda a sangre en teléfono (pocos eventos)', () => {
  it('la referencia ancha es 215 px y la cara del frente se ve más grande', () => {
    expect(WHEEL_PROJECTED_W_MOBILE_FEW).toBe(215);
    // Con 7 eventos (Tepic) en teléfono: cara 176x231 y radio 183 px.
    expect(wheelDrumGeometry(140, 184, 7, 1000, WHEEL_PROJECTED_W_MOBILE_FEW))
      .toEqual({ faceW: 176, faceH: 231, radius: 183 });
    // La cara del frente se ve a 215x283 (antes 178x233 con la
    // referencia de siempre).
    const g = wheelDrumGeometry(140, 184, 7, 1000, WHEEL_PROJECTED_W_MOBILE_FEW);
    expect(wheelProjectedFace(g.faceW, g.faceH, 7)).toEqual({ w: 215, h: 283 });
  });

  it('con 10 eventos la referencia ancha no cambia nada (el global sigue igual)', () => {
    expect(wheelDrumGeometry(140, 184, 10, 1000, WHEEL_PROJECTED_W_MOBILE_FEW))
      .toEqual({ faceW: 140, faceH: 184, radius: 215 });
    expect(wheelDrumGeometry(162, 212, 10, 1000, WHEEL_PROJECTED_W_MOBILE_FEW))
      .toEqual({ faceW: 162, faceH: 212, radius: 249 });
  });

  it('sin la referencia ancha la geometría es la de siempre (es opt-in)', () => {
    expect(wheelDrumGeometry(140, 184, 7)).toEqual({ faceW: 150, faceH: 197, radius: 156 });
  });

  it('el tambor llega a los extremos de la pantalla del teléfono (mitad 195 px)', () => {
    // El global ya llegaba: ~228 px a cada lado con 10 caras (las de
    // ±72° asoman por los bordes).
    expect(wheelDrumHalfSpan(140, 184, 10)).toBe(228);
    // Con 7 eventos y la referencia ancha: 205 px, las laterales se
    // cortan por los bordes de la pantalla.
    expect(wheelDrumHalfSpan(140, 184, 7, 1000, WHEEL_PROJECTED_W_MOBILE_FEW)).toBe(205);
    // Con la referencia de siempre no llegaba: 174 px (21 px de hueco
    // blanco a cada lado).
    expect(wheelDrumHalfSpan(140, 184, 7)).toBe(174);
    // Con 8 y 9 también llega a sangre; con 6 queda cerca (185 px).
    expect(wheelDrumHalfSpan(140, 184, 8, 1000, WHEEL_PROJECTED_W_MOBILE_FEW)).toBeGreaterThanOrEqual(195);
    expect(wheelDrumHalfSpan(140, 184, 9, 1000, WHEEL_PROJECTED_W_MOBILE_FEW)).toBeGreaterThanOrEqual(195);
  });

  it('con 4 a 9 eventos la referencia ancha mantiene las vecinas pegadas y el frente a 215 px', () => {
    for (const n of [4, 5, 6, 8, 9]) {
      const g = wheelDrumGeometry(140, 184, n, 1000, WHEEL_PROJECTED_W_MOBILE_FEW);
      // Radio = apotema de n caras: las vecinas se tocan.
      expect(wheelFaceRadius(g.faceW, n)).toBe(g.radius);
      // Frente del mismo tamaño con cualquier número de eventos.
      const seen = wheelProjectedFace(g.faceW, g.faceH, n);
      expect(seen.w).toBeGreaterThanOrEqual(214);
      expect(seen.w).toBeLessThanOrEqual(216);
    }
  });
});
