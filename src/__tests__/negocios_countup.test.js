import { describe, expect, it } from 'vitest';
import { easeOutCubic, countUpValue } from '../lib/countUp.js';

// La animación de las cifras de /negocios: el número sube de 0 a su valor
// en ~1 s con salida suave. (El hook useCountUp no se prueba aquí: usa
// requestAnimationFrame y efectos, que renderToStaticMarkup no ejecuta.)

describe('easeOutCubic', () => {
  it('empieza en 0 y termina en 1', () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
  });

  it('a la mitad ya lleva el 87,5% (arranca rápido, se asienta al final)', () => {
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 6);
  });

  it('es creciente', () => {
    expect(easeOutCubic(0.25)).toBeLessThan(easeOutCubic(0.5));
    expect(easeOutCubic(0.5)).toBeLessThan(easeOutCubic(0.75));
  });
});

describe('countUpValue', () => {
  it('en 0 ms muestra 0 y al terminar muestra el valor completo', () => {
    expect(countUpValue(328, 0)).toBe(0);
    expect(countUpValue(328, 1000)).toBe(328);
    expect(countUpValue(328, 1500)).toBe(328);
  });

  it('a la mitad muestra el 87,5% redondeado', () => {
    expect(countUpValue(328, 500)).toBe(287); // 328 * 0.875
    expect(countUpValue(100, 100)).toBe(27); // 100 * easeOutCubic(0.1)
  });

  it('limita los valores fuera de rango y la duración 0 devuelve el final', () => {
    expect(countUpValue(328, -100)).toBe(0);
    expect(countUpValue(328, 100, 0)).toBe(328);
  });
});
