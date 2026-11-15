import fs from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useDataStore as store } from '../store/useDataStore.js';
import { sb as db } from '../lib/supabase.js';

// ── Mapa lento: precarga ligera de la ciudad completa ──
// Antes el mapa solo traía los primeros 20 negocios y el resto llegaba
// por viewport con loadMapPinsByBounds (limit=200, sin order, sin
// debounce): cada 'idle' pedía al servidor y cada respuesta re-disparaba
// el efecto grande de GMap. «Lo más cerca de ti» pasaba de 80 a 64
// lugares al mover el mapa porque allNearby salía del subconjunto
// cargado por viewport. Ahora la ciudad completa se precarga en una
// consulta ligera (loadCityPins) y el mapa filtra en local.

const readSource = (rel) =>
  fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

const rows = (start, count, city = 'tepic') => Array.from({ length: count }, (_, i) => ({
  id: `biz-${start + i}`, name: `Place ${start + i}`, lat: 21.5, lng: -104.9,
  category: 'restaurantes', emoji: '🍽️', logo_url: null, plan: 'free',
  slug: `place-${start + i}`, city_slug: city, status: 'approved',
  schedule: '{}', rating: 4.5, review_count: 3,
  photos: '[{"url":"https://ejemplo/foto.webp"}]',
}));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

describe('mapa lento: precarga ligera de la ciudad', () => {
  let get;
  beforeEach(() => {
    const cache = new Map();
    vi.stubGlobal('localStorage', { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value) });
    store.setState({ mapPins: [], mapPinsCity: null, cityPins: [], cityPinsCity: null, initialBizCount: null });
    get = vi.spyOn(db, 'get').mockResolvedValue([]);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('pide solo columnas de pin en la consulta ligera', async () => {
    get.mockResolvedValue(rows(0, 5));
    await store.getState().loadCityPins('tepic');
    expect(get).toHaveBeenCalledTimes(1);
    const query = get.mock.calls[0][1];
    expect(query).toContain('select=id,name,lat,lng,category,emoji,logo_url,plan,slug,city_slug');
    expect(query).toContain('order=id.asc');
    expect(query).toContain('limit=1000');
    expect(query).not.toContain('limit=200');
    // photos SÍ va (nov 2026, Jonathan: sin ella el popup del mapa y las
    // tarjetas de «Lo más cerca de ti» mostraban solo el emoji; medido
    // +20% gzip en Tepic y +22% en Guadalajara).
    expect(query).toContain('photos');
    expect(query).not.toContain('social_links');
    expect(query).not.toContain('description');
    expect(query).not.toContain('banner_url');
    expect(query).not.toContain('tags');
    // booking_config SÍ va: es un JSONB pequeño y la ficha lo necesita
    // desde el primer render para el botón «Reservar» (nov 2026; el test
    // reservar_boton_siempre lo exige en todas las listas de columnas).
    expect(query).toContain('booking_config');
    expect(store.getState().cityPins).toHaveLength(5);
    expect(store.getState().cityPinsCity).toBe('tepic');
    // photos se parsea: el popup y las tarjetas leen photos[0].url.
    expect(store.getState().cityPins[0].photos[0].url).toBe('https://ejemplo/foto.webp');
  });

  it('pagina con rangos hasta traer todas las filas de la ciudad', async () => {
    get.mockResolvedValueOnce(rows(0, 1000)).mockResolvedValueOnce(rows(1000, 250));
    await store.getState().loadCityPins('guadalajara');
    expect(get).toHaveBeenCalledTimes(2);
    expect(get.mock.calls[0][1]).toContain('offset=0');
    expect(get.mock.calls[1][1]).toContain('offset=1000');
    expect(store.getState().cityPins).toHaveLength(1250);
    expect(new Set(store.getState().cityPins.map(b => b.id)).size).toBe(1250);
  });

  it('cachea por ciudad y re-pide al cambiar de ciudad', async () => {
    get.mockResolvedValue(rows(0, 5));
    await store.getState().loadCityPins('tepic');
    expect(get).toHaveBeenCalledTimes(1);
    await store.getState().loadCityPins('tepic');
    expect(get).toHaveBeenCalledTimes(1);
    await store.getState().loadCityPins('mazatlan');
    expect(get).toHaveBeenCalledTimes(2);
    await store.getState().loadCityPins('tepic');
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('llamadas concurrentes para la misma ciudad comparten una sola petición', async () => {
    const pending = deferred(); get.mockReturnValue(pending.promise);
    const p1 = store.getState().loadCityPins('tepic');
    const p2 = store.getState().loadCityPins('tepic');
    expect(get).toHaveBeenCalledTimes(1);
    pending.resolve(rows(0, 3)); await Promise.all([p1, p2]);
    expect(store.getState().cityPins).toHaveLength(3);
  });

  it('ignora una respuesta lenta de la ciudad anterior', async () => {
    const old = deferred(); get.mockReturnValueOnce(old.promise).mockResolvedValueOnce(rows(50, 5, 'mazatlan'));
    const pending = store.getState().loadCityPins('tepic');
    await store.getState().loadCityPins('mazatlan');
    old.resolve(rows(0, 5)); await pending;
    expect(store.getState().cityPinsCity).toBe('mazatlan');
    expect(store.getState().cityPins.every(b => b.city_slug === 'mazatlan')).toBe(true);
  });

  it('el idle del mapa ya no dispara ningún fetch al servidor', () => {
    const gmap = readSource('../components/GMap.jsx');
    expect(gmap).not.toContain('onBoundsChanged');
    expect(gmap).not.toContain('loadMapPinsByBounds');
    const mapView = readSource('../views/MapView.jsx');
    expect(mapView).not.toContain('loadMapPinsByBounds');
    expect(mapView).not.toContain('onBoundsChanged');
    expect(mapView).toContain('loadCityPins(activeCity)');
  });

  it('«Lo más cerca de ti» sale de los pines completos de la ciudad', () => {
    const app = readSource('../App.jsx');
    expect(app).toContain('cityPins: s.cityPins');
    expect(app).toContain('const cityPool');
    expect(app).toContain('cityPool.filter(b => isNear(b, userCoords, activeCity)');
    expect(app).not.toContain('mapPins.filter(b => isNear(b, userCoords, activeCity)');
    const mapView = readSource('../views/MapView.jsx');
    expect(mapView).toContain('cityPinsFull');
    expect(mapView).toContain('pinPool');
  });

  it('no queda ninguna transición por pin en el marcador', () => {
    const gmap = readSource('../components/GMap.jsx');
    expect(gmap).not.toContain('style.transition');
    expect(gmap).not.toContain('0.4s cubic-bezier');
    expect(gmap).not.toContain('all 0.2s ease');
  });
});
