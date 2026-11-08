import { describe, it, expect } from 'vitest';
import { getCityCenter, DEFAULT_MAP_CENTER } from '../lib/mapCentering.js';

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
