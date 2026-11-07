import { describe, expect, it } from 'vitest';
import { faceBrightness, normalizeAngleDeg, shortestDelta, springSettled, springStep } from '../lib/spring.js';
import { computeFlipMoves } from '../lib/flip.js';

describe('spring', () => {
  it('converges to the target and settles', () => {
    let { x, v } = { x: 0, v: 0 };
    for (let i = 0; i < 120; i++) {
      ({ x, v } = springStep(x, v, -72, 1 / 60));
    }
    expect(x).toBeCloseTo(-72, 1);
    expect(springSettled(x, v, -72)).toBe(true);
  });

  it('keeps an initial fling velocity and still settles on the target', () => {
    let { x, v } = { x: 0, v: 900 };
    for (let i = 0; i < 240; i++) {
      ({ x, v } = springStep(x, v, -72, 1 / 60));
    }
    expect(x).toBeCloseTo(-72, 1);
    expect(springSettled(x, v, -72)).toBe(true);
  });

  it('normalizes angles to [-180, 180]', () => {
    expect(normalizeAngleDeg(0)).toBe(0);
    expect(normalizeAngleDeg(288)).toBe(-72);
    expect(normalizeAngleDeg(-288)).toBe(72);
    expect(normalizeAngleDeg(360)).toBe(0);
  });

  it('brightens the front face and dims the side ones', () => {
    expect(faceBrightness(0)).toBe(1);
    expect(faceBrightness(72)).toBeCloseTo(0.76, 2);
    expect(faceBrightness(180)).toBe(0.7);
    expect(faceBrightness(-72)).toBeCloseTo(0.76, 2);
  });
});

describe('flip', () => {
  it('reports how far each surviving card moved', () => {
    const prev = new Map([
      ['a', { left: 0, top: 0 }],
      ['b', { left: 200, top: 0 }],
      ['c', { left: 0, top: 300 }],
    ]);
    const next = new Map([
      ['a', { left: 0, top: 0 }],
      ['b', { left: 0, top: 0 }],
      ['c', { left: 0, top: 150 }],
    ]);
    const moves = computeFlipMoves(prev, next);
    expect(moves.has('a')).toBe(false);
    expect(moves.get('b')).toEqual({ dx: 200, dy: 0 });
    expect(moves.get('c')).toEqual({ dx: 0, dy: 150 });
  });

  it('marks new cards as entering and ignores removed ones', () => {
    const prev = new Map([['a', { left: 0, top: 0 }]]);
    const next = new Map([
      ['a', { left: 0, top: 0 }],
      ['b', { left: 0, top: 300 }],
    ]);
    const moves = computeFlipMoves(prev, next);
    expect(moves.get('b')).toEqual({ enter: true });
    expect(moves.size).toBe(1);
  });
});

describe('shortestDelta', () => {
  it('measures from the decimal position, not the rounded card', () => {
    // A mitad de paso de la 4 a la 5 (≡ 0): el delta a la 0 es +0.4 y el
    // resorte termina el paso, no se queda parado a 4.6.
    expect(shortestDelta(0, 4.6, 5)).toBeCloseTo(0.4, 5);
    expect(shortestDelta(3, 2.6, 5)).toBeCloseTo(0.4, 5);
    expect(shortestDelta(0, 4.0, 5)).toBeCloseTo(1, 5);
    expect(shortestDelta(0, 2.4, 5)).toBeCloseTo(-2.4, 5);
    expect(shortestDelta(4, 0.1, 5)).toBeCloseTo(-1.1, 5);
    expect(shortestDelta(1, 4.9, 5)).toBeCloseTo(1.1, 5);
  });
});
