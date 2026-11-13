import { describe, expect, it } from 'vitest';
import {
  WHEEL_AUTO_DEG_PER_SEC,
  WHEEL_AUTO_SECONDS_PER_TURN,
  WHEEL_DRUM_FACES,
  WHEEL_FACE_W,
  WHEEL_FACE_W_MOBILE,
  wheelAutoStep,
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

  it('el radio del tambor es fijo (10 caras) y no depende de los eventos de la ciudad', () => {
    // Tepic (~7 eventos) se veía chica y centrada porque el radio era la
    // apotema de 7 caras (145 px en teléfono); el inicio global, siempre
    // con 10, usa 215 px. El tambor ahora usa siempre el radio de 10
    // caras, así la rueda de ciudad mide lo mismo que la del global.
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
