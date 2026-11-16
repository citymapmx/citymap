import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { useDataStore as store } from '../store/useDataStore.js';
import { sb as db } from '../lib/supabase.js';
import { fetchFullBusiness } from '../services/dbService.js';
import { fetchStoreCategories } from '../lib/storeCategories.js';
import {
  saveBizCache, readBizCache, saveMenuCache, readMenuCache,
  OFFLINE_CACHE_INDEX_KEY,
} from '../lib/offlineCache.js';

// Sin internet: se ve lo último cargado (muro, ficha y menú), nov 2026.
// El muro ya tenía caché por ciudad; lo que faltaba era: que el splash
// saliera sin internet con caché, que los fetches fallidos no borraran
// esa caché con vacíos, y que la ficha y el menú tuvieran caché propia.

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// localStorage fiel: Map + getItem/setItem/removeItem/length/key.
function makeStorage(seed = {}) {
  const map = new Map(Object.entries(seed));
  const storage = {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)); },
    removeItem: (key) => { map.delete(key); },
    key: (i) => [...map.keys()][i] ?? null,
  };
  Object.defineProperty(storage, 'length', { get: () => map.size });
  storage._map = map;
  return storage;
}

const pinRows = (count) => Array.from({ length: count }, (_, i) => ({
  id: `biz-${i}`, name: `Lugar ${i}`, lat: 21.5, lng: -104.9, category: 'restaurantes',
  emoji: '🍽️', logo_url: null, plan: 'free', slug: `lugar-${i}`, city_slug: 'tepic',
  status: 'approved', schedule: '{}', rating: 4.5, review_count: 3, photos: '[]',
}));

describe('sin internet: caché de ficha y menú', () => {
  let storage;
  let get;
  let rpc;

  beforeEach(() => {
    storage = makeStorage({ cg_city_slug: 'tepic' });
    vi.stubGlobal('localStorage', storage);
    store.setState({
      mapPins: [], mapPinsCity: null, cityPins: [], cityPinsCity: null,
      initialBizCount: null, events: [], experiences: [], banners: [],
      promos: [], coupons: [], cats: [], cityCats: [], cities: [],
      globalFavCounts: {}, homeCoreCity: null, homeCoreError: false,
      homeSecondaryCity: null, homeSecondaryError: false,
      homeCacheAvailable: false, dbReady: false, dbError: false,
      timeBasedBiz: [], timeBasedBizCity: null,
    });
    get = vi.spyOn(db, 'get');
    rpc = vi.spyOn(db, 'rpc');
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('guarda y lee la ficha sin las reviews', () => {
    expect(saveBizCache('biz-1', { id: 'biz-1', name: 'Umami', reviews: [{ id: 9 }] })).toBe(true);
    const cached = readBizCache('biz-1');
    expect(cached).toEqual({ id: 'biz-1', name: 'Umami' });
    expect(cached.reviews).toBeUndefined();
    expect(readBizCache('biz-inexistente')).toBeNull();
  });

  it('guarda y lee el menú', () => {
    const menu = [{ id: 'c1', name: 'Ramen', store_products: [{ id: 'p1', name: 'Shoyu', price: 120 }] }];
    expect(saveMenuCache('biz-1', menu)).toBe(true);
    expect(readMenuCache('biz-1')).toEqual(menu);
    expect(readMenuCache('biz-inexistente')).toBeNull();
  });

  it('LRU: máximo 20 fichas, se borra la más vieja', () => {
    for (let i = 0; i < 21; i++) saveBizCache(`biz-${i}`, { id: `biz-${i}`, name: `Lugar ${i}` });
    expect(readBizCache('biz-0')).toBeNull();
    expect(readBizCache('biz-1')?.name).toBe('Lugar 1');
    expect(readBizCache('biz-20')?.name).toBe('Lugar 20');
    const index = JSON.parse(storage.getItem(OFFLINE_CACHE_INDEX_KEY));
    expect(index.biz).toHaveLength(20);
    expect(index.biz[0]).toBe('biz-1');
  });

  it('nunca lanza sin localStorage ni sin cuota', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => saveBizCache('biz-1', { id: 'biz-1' })).not.toThrow();
    expect(() => saveMenuCache('biz-1', [])).not.toThrow();
    expect(saveBizCache('biz-1', { id: 'biz-1' })).toBe(false);
    expect(readBizCache('biz-1')).toBeNull();
    expect(readMenuCache('biz-1')).toBeNull();

    const quotaStorage = makeStorage({ cg_data_tepic_v5: '{"e":[]}' });
    quotaStorage.setItem = () => { const err = new Error('quota'); err.name = 'QuotaExceededError'; throw err; };
    vi.stubGlobal('localStorage', quotaStorage);
    expect(() => saveBizCache('biz-1', { id: 'biz-1', name: 'X' })).not.toThrow();
    expect(saveBizCache('biz-1', { id: 'biz-1', name: 'X' })).toBe(false);
  });

  it('fetchFullBusiness guarda al tener éxito y devuelve la copia sin red', async () => {
    const biz = { id: 'biz-1', name: 'Umami', reviews: [{ id: 9, text: 'Rico' }] };
    get.mockResolvedValue([biz]);
    await expect(fetchFullBusiness('biz-1')).resolves.toEqual([biz]);
    expect(readBizCache('biz-1')).toEqual({ id: 'biz-1', name: 'Umami' });

    get.mockRejectedValue(new Error('offline'));
    await expect(fetchFullBusiness('biz-1')).resolves.toEqual([{ id: 'biz-1', name: 'Umami' }]);
    await expect(fetchFullBusiness('biz-sin-cache')).rejects.toThrow('offline');
  });

  it('fetchStoreCategories devuelve el menú guardado sin red', async () => {
    const cats = [{ id: 'c1', name: 'Ramen', sort_order: 1, store_products: [
      { id: 'p2', name: 'Miso', sort_order: 2 }, { id: 'p1', name: 'Shoyu', sort_order: 1 },
    ] }];
    get.mockResolvedValue(cats);
    const fresh = await fetchStoreCategories('biz-1');
    expect(fresh[0].store_products.map((p) => p.id)).toEqual(['p1', 'p2']);
    expect(readMenuCache('biz-1')[0].store_products.map((p) => p.id)).toEqual(['p1', 'p2']);

    get.mockRejectedValue(new Error('offline'));
    await expect(fetchStoreCategories('biz-1')).resolves.toEqual(readMenuCache('biz-1'));
    await expect(fetchStoreCategories('biz-sin-cache')).resolves.toEqual([]);
  });

  it('loadMapPins restaura initialBizCount de la caché', async () => {
    storage.setItem('cg_mapPins_tepic', JSON.stringify(pinRows(3)));
    get.mockRejectedValue(new Error('offline'));
    await store.getState().loadMapPins('tepic');
    expect(store.getState().mapPins).toHaveLength(3);
    expect(store.getState().initialBizCount).toBe(3);
  });

  it('un fetch fallido no borra la caché guardada del muro', async () => {
    const banner = { id: 'bn-1', title: 'Promo' };
    const category = { slug: 'restaurantes', name: 'Restaurantes', icon: '🍽️', emoji: '🍽️' };
    const city = { slug: 'tepic', name: 'Tepic' };
    storage.setItem('cg_data_tepic_v5', JSON.stringify({
      e: [{ id: 'ev-1', date: '2026-12-01', title: 'Concierto' }],
      bn: [banner], ca: [category], cc: [], ci: [city],
      globalFavs: [{ biz_id: 'biz-1', fav_count: '4' }],
    }));
    storage.setItem('cg_mapPins_tepic', JSON.stringify(pinRows(3)));
    get.mockRejectedValue(new Error('offline'));
    rpc.mockRejectedValue(new Error('offline'));

    await store.getState().loadData('tepic');
    await vi.waitFor(() => expect(store.getState().homeSecondaryCity).toBe('tepic'));

    expect(store.getState().homeCacheAvailable).toBe(true);
    expect(store.getState().homeCoreCity).toBe('tepic');
    expect(store.getState().initialBizCount).toBe(3);
    expect(store.getState().events).toHaveLength(1);
    expect(store.getState().banners).toEqual([banner]);
    expect(store.getState().cats[0].id).toBe('restaurantes');
    expect(store.getState().globalFavCounts).toEqual({ 'biz-1': 4 });

    const kept = JSON.parse(storage.getItem('cg_data_tepic_v5'));
    expect(kept.bn).toEqual([banner]);
    expect(kept.ca).toEqual([category]);
    expect(kept.ci).toEqual([city]);
  });

  it('App.jsx excluye el caso con caché del error del splash', () => {
    const src = read('../App.jsx');
    expect(src).toContain('homeCacheAvailable');
    expect(src).toContain('&& !homeCacheAvailable');
  });
});
