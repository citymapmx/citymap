// Arranque con menos peticiones (A9/A10/A11, 21 nov 2026): la primera
// visita a "/" cargaba la ciudad entera (~16-18 peticiones) además del
// muro, eventos/experiencias se pedían 2 veces en frío, y «Explora por
// ciudad» disparaba 80 HEAD en cada montaje.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  shouldSkipCityLoadOnRoot,
  readCachedPopCounts,
  savePopCounts,
  isPlainRootWithSavedCity,
  POP_COUNTS_KEY,
  POP_COUNTS_TTL_MS,
} from '../lib/arranque.js';
import { useDataStore } from '../store/useDataStore.js';
import { sb } from '../lib/supabase.js';
import { METRO_ZONES, updateMetroZones } from '../lib/utils.js';

const makeStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    _map: m,
  };
};

describe('A9: en "/" sin ciudad guardada no se carga la ciudad', () => {
  it('salta loadData en la primera visita plana a "/"', () => {
    expect(shouldSkipCityLoadOnRoot({ citySlugIsDefault: true, pathname: '/', hasDeepLink: false })).toBe(true);
  });

  it('no salta con ciudad guardada', () => {
    expect(shouldSkipCityLoadOnRoot({ citySlugIsDefault: false, pathname: '/', hasDeepLink: false })).toBe(false);
  });

  it('no salta fuera de "/"', () => {
    expect(shouldSkipCityLoadOnRoot({ citySlugIsDefault: true, pathname: '/guadalajara', hasDeepLink: false })).toBe(false);
  });

  it('no salta con enlace profundo (?b=, ?ev=, ?vista=...)', () => {
    expect(shouldSkipCityLoadOnRoot({ citySlugIsDefault: true, pathname: '/', hasDeepLink: true })).toBe(false);
  });
});

describe('A11: conteos de popularidad con caché de 6 h', () => {
  let storage;
  beforeEach(() => {
    storage = makeStorage();
    vi.stubGlobal('localStorage', storage);
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('guarda y lee los conteos', () => {
    const counts = { guadalajara: { biz: 10, ev: 5, total: 15 } };
    savePopCounts(counts);
    expect(readCachedPopCounts()).toEqual(counts);
  });

  it('caducan pasadas 6 h', () => {
    const counts = { guadalajara: { biz: 10, ev: 5, total: 15 } };
    storage.setItem(POP_COUNTS_KEY, JSON.stringify({ savedAt: Date.now() - POP_COUNTS_TTL_MS - 1000, counts }));
    expect(readCachedPopCounts()).toBeNull();
  });

  it('un valor roto no rompe el arranque', () => {
    storage.setItem(POP_COUNTS_KEY, 'esto no es json');
    expect(readCachedPopCounts()).toBeNull();
  });

  it('la visita que va a redirigir a la ciudad guardada no pide conteos', () => {
    expect(isPlainRootWithSavedCity('/', '', '', 'guadalajara')).toBe(true);
  });

  it('con query, hash, otra ruta o sin ciudad guardada sí se piden', () => {
    expect(isPlainRootWithSavedCity('/', '?vista=eventos', '', 'guadalajara')).toBe(false);
    expect(isPlainRootWithSavedCity('/', '', '#algo', 'guadalajara')).toBe(false);
    expect(isPlainRootWithSavedCity('/guadalajara', '', '', 'guadalajara')).toBe(false);
    expect(isPlainRootWithSavedCity('/', '', '', null)).toBe(false);
  });
});

describe('A10: eventos/experiencias se piden UNA vez en arranque en frío', () => {
  const CITIES = [
    { slug: 'guadalajara', name: 'Guadalajara', state: 'Jalisco', lat: 20.6597, lng: -103.3496 },
    { slug: 'zapopan', name: 'Zapopan', state: 'Jalisco;guadalajara', lat: 20.7214, lng: -103.3918 },
    { slug: 'tlaquepaque', name: 'Tlaquepaque', state: 'Jalisco;guadalajara', lat: 20.64, lng: -103.31 },
  ];
  let get;
  let storage;

  beforeEach(() => {
    storage = makeStorage();
    vi.stubGlobal('localStorage', storage);
    Object.keys(METRO_ZONES).forEach((k) => delete METRO_ZONES[k]);
    useDataStore.setState({
      dbReady: false, homeCoreCity: null, homeCoreError: false,
      mapPinsCity: null, cityPins: [], cityPinsCity: null,
      timeBasedBiz: [], timeBasedBizCity: null,
      cities: [], events: [], experiences: [],
    });
    get = vi.spyOn(sb, 'get').mockImplementation(async (table) => {
      if (table === 'cities') return CITIES;
      return [];
    });
    vi.spyOn(sb, 'rpc').mockResolvedValue([]);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  const eventCalls = () => get.mock.calls.filter(([t]) => t === 'events');
  const expCalls = () => get.mock.calls.filter(([t]) => t === 'experiences');

  it('en frío: una sola consulta de eventos, ya con la zona metropolitana', async () => {
    await useDataStore.getState().loadData('guadalajara');
    const ev = eventCalls();
    expect(ev).toHaveLength(1);
    // El filtro ancho incluye Zapopan y Tlaquepaque (antes el early
    // fetch salía estrecho y se repetía con la zona).
    expect(ev[0][1]).toContain('zapopan');
    expect(expCalls()).toHaveLength(1);
  });

  it('en caliente (ciudades en caché): el paralelo se mantiene y tampoco se repite', async () => {
    useDataStore.setState({ cities: CITIES });
    updateMetroZones(CITIES);
    await useDataStore.getState().loadData('guadalajara');
    const ev = eventCalls();
    expect(ev).toHaveLength(1);
    expect(ev[0][1]).toContain('zapopan');
    expect(expCalls()).toHaveLength(1);
  });
});
