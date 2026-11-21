// Cambio de ciudad con esqueleto (hallazgo 3 de fluidez, nov 2026): al
// cambiar de ciudad, el store viejo se vacía en el acto y las secciones
// muestran su esqueleto en vez de los datos de la ciudad anterior.
// Antes, la limpieza de loadData leía la ciudad de localStorage, pero
// setActiveCity ya había persistido la nueva, así que la condición nunca
// se cumplía (código muerto) y la rueda mostraba ~15 s los eventos viejos.
// La limpieza es solo del store en memoria: la caché de localStorage no
// se toca y la ciudad nueva se hidrata de ella si la tiene.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import React from 'react';
import { useDataStore } from '../store/useDataStore.js';
import { sb } from '../lib/supabase.js';
import { METRO_ZONES, updateMetroZones } from '../lib/utils.js';
import HomeEvents from '../components/home/HomeEvents.jsx';

const CITIES = [
  { slug: 'tepic', name: 'Tepic', state: 'Nayarit', lat: 21.5, lng: -104.9 },
  { slug: 'guadalajara', name: 'Guadalajara', state: 'Jalisco', lat: 20.6597, lng: -103.3496 },
];

function future(days) {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

const tepEvent = { id: 'tep-1', title: 'Concierto Tepic', date: future(3), city_slug: 'tepic', status: 'approved', visibility: 'public', img_url: 'https://example.supabase.co/tep.jpg' };
const gdlEvent = { id: 'gdl-1', title: 'Concierto GDL', date: future(3), city_slug: 'guadalajara', status: 'approved', visibility: 'public', img_url: 'https://example.supabase.co/gdl.jpg' };
const tepBiz = { id: 'biz-tep', name: 'Negocio Tepic', city_slug: 'tepic', status: 'approved', photos: '[]', schedule: '{}', social_links: '{}' };
const gdlBiz = { id: 'biz-gdl', name: 'Negocio GDL', city_slug: 'guadalajara', status: 'approved', photos: '[]', schedule: '{}', social_links: '{}' };

// Ciudad cargada de verdad (como la deja un loadData completo).
function seedTepicLoaded() {
  useDataStore.setState({
    events: [tepEvent],
    experiences: [{ id: 'tex-1', title: 'Tour Tepic', city_slug: 'tepic' }],
    banners: [{ id: 'bn-1' }],
    promos: [{ id: 'pr-1' }],
    coupons: [{ id: 'cp-1' }],
    mapPins: [tepBiz],
    cityPins: [tepBiz],
    cityPinsCity: 'tepic',
    mapPinsCity: 'tepic',
    timeBasedBiz: [tepBiz],
    timeBasedBizCity: 'tepic',
    homeHighlights: [tepBiz],
    highlightsCity: 'tepic',
    initialBizCount: 5,
    dbReady: true,
    dbError: false,
    homeCoreCity: 'tepic',
    homeSecondaryCity: 'tepic',
    homeCoreError: false,
    homeSecondaryError: false,
    homeCacheAvailable: false,
    cities: CITIES,
  });
}

function resetStore() {
  useDataStore.setState({
    events: [], experiences: [], banners: [], promos: [], coupons: [],
    mapPins: [], cityPins: [], cityPinsCity: null, mapPinsCity: null,
    timeBasedBiz: [], timeBasedBizCity: null, homeHighlights: [], highlightsCity: null,
    initialBizCount: null, dbReady: false, dbError: false,
    homeCoreCity: null, homeSecondaryCity: null, homeCoreError: false,
    homeSecondaryError: false, homeCacheAvailable: false, cities: [],
  });
  Object.keys(METRO_ZONES).forEach(k => delete METRO_ZONES[k]);
  updateMetroZones(CITIES);
}

describe('cambio de ciudad: el store viejo se vacía en el acto', () => {
  let storage;
  beforeEach(() => {
    resetStore();
    storage = new Map();
    vi.stubGlobal('localStorage', {
      getItem: key => (storage.has(key) ? storage.get(key) : null),
      setItem: (key, value) => { storage.set(key, String(value)); },
      removeItem: key => { storage.delete(key); },
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('al cambiar de ciudad, loadData vacía el store viejo antes de que resuelva la red', async () => {
    seedTepicLoaded();
    const getSpy = vi.spyOn(sb, 'get').mockImplementation(async (table) => {
      if (table === 'cities') return CITIES;
      return [];
    });
    const rpc = vi.spyOn(sb, 'rpc').mockResolvedValue([]);
    try {
      const p = useDataStore.getState().loadData('guadalajara');
      // Síncrono: la limpieza ya corrió, aunque la red no resolvió nada.
      const s = useDataStore.getState();
      expect(s.events).toEqual([]);
      expect(s.experiences).toEqual([]);
      expect(s.banners).toEqual([]);
      expect(s.promos).toEqual([]);
      expect(s.coupons).toEqual([]);
      expect(s.mapPins).toEqual([]);
      expect(s.cityPins).toEqual([]);
      expect(s.timeBasedBiz).toEqual([]);
      expect(s.homeHighlights).toEqual([]);
      expect(s.dbReady).toBe(false);
      expect(s.mapPinsCity).toBeNull();
      expect(s.cityPinsCity).toBeNull();
      expect(s.initialBizCount).toBeNull();
      // Y la carga nueva termina bien.
      await p;
      await vi.waitFor(() => expect(useDataStore.getState().homeSecondaryCity).toBe('guadalajara'));
      expect(useDataStore.getState().dbReady).toBe(true);
      expect(useDataStore.getState().homeCoreCity).toBe('guadalajara');
      expect(getSpy).toHaveBeenCalled();
    } finally {
      getSpy.mockRestore();
      rpc.mockRestore();
    }
  });

  it('un fetch secundario viejo que resuelve tarde no republica los eventos viejos', async () => {
    const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
    const tepEvents = deferred();
    const getSpy = vi.spyOn(sb, 'get').mockImplementation((table, query = '') => {
      if (table === 'cities') return Promise.resolve(CITIES);
      if (table === 'events' && String(query).includes('tepic')) return tepEvents.promise;
      return Promise.resolve([]);
    });
    const rpc = vi.spyOn(sb, 'rpc').mockResolvedValue([]);
    try {
      // Carga de Tepic: el núcleo termina, el secundario queda esperando
      // los eventos de Tepic.
      const pTep = useDataStore.getState().loadData('tepic');
      await vi.waitFor(() => expect(useDataStore.getState().homeCoreCity).toBe('tepic'));
      expect(useDataStore.getState().homeSecondaryCity).toBeNull();
      // Cambio a Guadalajara: limpieza en el acto.
      const pGdl = useDataStore.getState().loadData('guadalajara');
      expect(useDataStore.getState().events).toEqual([]);
      expect(useDataStore.getState().mapPinsCity).toBeNull();
      // El fetch viejo resuelve tarde: no debe republicar nada de Tepic.
      tepEvents.resolve([tepEvent]);
      await pGdl;
      await vi.waitFor(() => expect(useDataStore.getState().homeSecondaryCity).toBe('guadalajara'));
      expect(useDataStore.getState().events.map(e => e.id)).not.toContain('tep-1');
      expect(useDataStore.getState().homeSecondaryCity).toBe('guadalajara');
      await pTep;
    } finally {
      getSpy.mockRestore();
      rpc.mockRestore();
    }
  });

  it('una carga anterior de otra ciudad que resuelve tarde no pisa los banners nuevos', async () => {
    const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
    const tepBanners = deferred();
    const getSpy = vi.spyOn(sb, 'get').mockImplementation((table, query = '') => {
      if (table === 'cities') return Promise.resolve(CITIES);
      if (table === 'banners' && String(query).includes('tepic')) return tepBanners.promise;
      return Promise.resolve([]);
    });
    const rpc = vi.spyOn(sb, 'rpc').mockResolvedValue([]);
    try {
      // Carga de Tepic con los banners en vuelo.
      const pTep = useDataStore.getState().loadData('tepic');
      await vi.waitFor(() => expect(useDataStore.getState().mapPinsCity).toBe('tepic'));
      // Cambio a Guadalajara antes de que resuelvan los banners viejos.
      const pGdl = useDataStore.getState().loadData('guadalajara');
      tepBanners.resolve([{ id: 'bn-tep', city_slug: 'tepic' }]);
      await pGdl;
      await vi.waitFor(() => expect(useDataStore.getState().homeSecondaryCity).toBe('guadalajara'));
      expect(useDataStore.getState().banners.map(b => b.id)).not.toContain('bn-tep');
      await pTep;
    } finally {
      getSpy.mockRestore();
      rpc.mockRestore();
    }
  });

  it('recargar la misma ciudad no vacía el store', async () => {
    seedTepicLoaded();
    const getSpy = vi.spyOn(sb, 'get').mockImplementation(async (table) => {
      if (table === 'cities') return CITIES;
      return [];
    });
    const rpc = vi.spyOn(sb, 'rpc').mockResolvedValue([]);
    try {
      const p = useDataStore.getState().loadData('tepic');
      // En el acto sigue todo lo de Tepic: no hubo limpieza.
      const s = useDataStore.getState();
      expect(s.events.map(e => e.id)).toEqual(['tep-1']);
      expect(s.dbReady).toBe(true);
      expect(s.mapPinsCity).toBe('tepic');
      await p;
      expect(useDataStore.getState().homeCoreCity).toBe('tepic');
    } finally {
      getSpy.mockRestore();
      rpc.mockRestore();
    }
  });

  it('la caché de la ciudad nueva se hidrata tras la limpieza (no se borra)', async () => {
    seedTepicLoaded();
    storage.set('cg_data_guadalajara_v5', JSON.stringify({ e: [gdlEvent], ex: [{ id: 'gex-1' }] }));
    storage.set('cg_mapPins_guadalajara', JSON.stringify([gdlBiz]));
    const getSpy = vi.spyOn(sb, 'get').mockImplementation(async (table) => {
      if (table === 'cities') return CITIES;
      return [];
    });
    const rpc = vi.spyOn(sb, 'rpc').mockResolvedValue([]);
    try {
      const p = useDataStore.getState().loadData('guadalajara');
      // La limpieza vació lo de Tepic y la restauración puso lo de
      // Guadalajara desde la caché, en el mismo tick.
      const s = useDataStore.getState();
      expect(s.events.map(e => e.id)).toEqual(['gdl-1']);
      expect(s.events.map(e => e.id)).not.toContain('tep-1');
      expect(s.dbReady).toBe(true);
      await p;
    } finally {
      getSpy.mockRestore();
      rpc.mockRestore();
    }
  });
});

describe('rueda: esqueleto mientras carga la ciudad nueva', () => {
  const T = { text: '#111', sub: '#666', bg: '#fff', border: '#ddd' };

  it('sin eventos y sin carga lista, muestra el esqueleto (no el vacío)', () => {
    const html = renderToStaticMarkup(
      <HomeEvents events={[]} activeCity="guadalajara" userCoords={null} dbReady={false} secondaryReady={false} dark={false} handleEventTap={() => {}} T={T} />,
    );
    expect(html).toContain('coverflow-sk-drum');
    expect(html).not.toContain('Próximos eventos');
  });

  it('sin eventos y con carga lista, no monta la sección', () => {
    const html = renderToStaticMarkup(
      <HomeEvents events={[]} activeCity="guadalajara" userCoords={null} dbReady secondaryReady dark={false} handleEventTap={() => {}} T={T} />,
    );
    expect(html).toBe('');
  });
});
