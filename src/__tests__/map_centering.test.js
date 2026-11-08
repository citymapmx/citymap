import { describe, it, expect } from 'vitest';
import { getCityCenter, DEFAULT_MAP_CENTER, hasCloseNeighbor, screenPixelDistance } from '../lib/mapCentering.js';

describe('map centering', () => {
  it('uses the city coordinates when present', () => {
    expect(getCityCenter({ slug: 'guadalajara', lat: 20.6597, lng: -103.3496 }, [])).toEqual({ lat: 20.6597, lng: -103.3496 });
  });

  it('accepts coordinates as strings', () => {
    expect(getCityCenter({ slug: 'tepic', lat: '21.5042', lng: '-104.8944' }, [])).toEqual({ lat: 21.5042, lng: -104.8944 });
  });

  it('never returns 0,0 for a city without coordinates', () => {
    expect(getCityCenter({ slug: 'san-diego', lat: null, lng: null }, [])).toEqual(DEFAULT_MAP_CENTER);
  });

  it('falls back to the centroid of the city pins', () => {
    const pins = [
      { lat: 20, lng: -103 },
      { lat: 22, lng: -105 },
    ];
    expect(getCityCenter({ slug: 'vancouver', lat: null, lng: null }, pins)).toEqual({ lat: 21, lng: -104 });
  });

  it('ignores pins without coordinates when computing the centroid', () => {
    const pins = [
      { lat: null, lng: null },
      { lat: 20, lng: -103 },
    ];
    expect(getCityCenter({}, pins)).toEqual({ lat: 20, lng: -103 });
  });

  it('falls back to the Tepic default without city or pins', () => {
    expect(getCityCenter(undefined, [])).toEqual(DEFAULT_MAP_CENTER);
  });
});

describe('close neighbors on screen', () => {
  // En Tepic (lat 21.5): 0.001° de longitud son ~104 m; 0.01° son ~1,036 m.
  const target = { lat: 21.5, lng: -104.9 };
  const near = { lat: 21.5, lng: -104.899 };
  const far = { lat: 21.5, lng: -104.89 };

  it('measures screen distance in pixels for the current zoom', () => {
    const d = screenPixelDistance(target, near, 13);
    expect(d).toBeGreaterThan(5);
    expect(d).toBeLessThan(7);
  });

  it('finds a neighbor about 100 m away at zoom 13', () => {
    expect(hasCloseNeighbor(target, [near], 13)).toBe(true);
  });

  it('does not find a neighbor about 1 km away at zoom 13', () => {
    expect(hasCloseNeighbor(target, [far], 13)).toBe(false);
  });

  it('the same 100 m pair stops being close when zooming to 17', () => {
    expect(hasCloseNeighbor(target, [near], 17)).toBe(false);
  });

  it('respects a custom threshold', () => {
    expect(hasCloseNeighbor(target, [near], 13, 5)).toBe(false);
  });

  it('returns false without other pins', () => {
    expect(hasCloseNeighbor(target, [], 13)).toBe(false);
  });
});
