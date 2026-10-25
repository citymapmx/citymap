import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useDataStore as viteStore } from '../store/useDataStore.js';
import { sb as viteDb } from '../lib/supabase.js';
import { useDataStore as nextStore } from '../../web-next/src/store/useDataStore.js';
import { sb as nextDb } from '../../web-next/src/lib/supabase.js';

const rows = (start, count, city = 'tepic') => Array.from({ length: count }, (_, i) => ({
  id: `biz-${start + i}`, name: `Place ${start + i}`, city_slug: city, status: 'approved',
  photos: '[]', schedule: '{}', social_links: '{}', rating: 5, review_count: 2,
}));
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

describe.each([['Vite', viteStore, viteDb], ['Next.js', nextStore, nextDb]])('%s business loading', (_name, store, db) => {
  let get;
  beforeEach(() => {
    const cache = new Map();
    vi.stubGlobal('localStorage', { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value) });
    store.setState({ mapPins: [], mapPinsCity: null, initialBizCount: null, homeHighlights: [], highlightsCity: null, globalFavCounts: {} });
    get = vi.spyOn(db, 'get').mockResolvedValue([]);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('loads and caches exactly the first page without an automatic bulk request', async () => {
    get.mockResolvedValue(rows(0, 20));
    await store.getState().loadMapPins('tepic');
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][1]).toContain('limit=20');
    expect(get.mock.calls[0][1]).not.toContain('limit=1000');
    expect(store.getState().initialBizCount).toBe(20);
    expect(JSON.parse(localStorage.getItem('cg_mapPins_tepic'))).toHaveLength(20);
  });

  it('restores only 20 rows even when an old cache contains 1000', async () => {
    localStorage.setItem('cg_mapPins_tepic', JSON.stringify(rows(0, 1000)));
    const pending = deferred(); get.mockReturnValue(pending.promise);
    const request = store.getState().loadMapPins('tepic');
    expect(store.getState().mapPins).toHaveLength(20);
    pending.resolve(rows(0, 20)); await request;
    expect(JSON.parse(localStorage.getItem('cg_mapPins_tepic'))).toHaveLength(20);
  });

  it('requests subsequent pages without gaps or duplicates', async () => {
    get.mockResolvedValueOnce(rows(0, 20)).mockResolvedValueOnce(rows(20, 20)).mockResolvedValueOnce(rows(40, 3));
    await store.getState().loadMapPins('tepic');
    expect(await store.getState().fetchMoreBiz({ targetCity: 'tepic', offset: 20 })).toBe(20);
    expect(await store.getState().fetchMoreBiz({ targetCity: 'tepic', offset: 40 })).toBe(3);
    expect(store.getState().mapPins.map(b => b.id)).toEqual(rows(0, 43).map(b => b.id));
    expect(get.mock.calls[1][1]).toContain('offset=20');
    expect(get.mock.calls[2][1]).toContain('offset=40');
  });

  it('searches the server for records outside the initial page', async () => {
    get.mockResolvedValueOnce(rows(0, 20)).mockResolvedValueOnce([{ ...rows(99, 1)[0], name: 'Pizza' }]);
    await store.getState().loadMapPins('tepic');
    expect(await store.getState().fetchMoreBiz({ targetCity: 'tepic', query: 'pizza', category: 'restaurantes', offset: 0 })).toBe(1);
    expect(get.mock.calls[1][1]).toContain('pizza');
    expect(get.mock.calls[1][1]).toContain('category=ilike.*restaurantes*');
    expect(get.mock.calls[1][1]).toContain('offset=0');
    expect(store.getState().mapPins.some(b => b.id === 'biz-99')).toBe(true);
  });

  it('searches descriptions and tags, and supports JSON tag columns', async () => {
    store.setState({ mapPinsCity: 'tepic' });
    get.mockRejectedValueOnce(new Error('invalid input syntax for type json')).mockResolvedValueOnce(rows(99, 1));
    expect(await store.getState().fetchMoreBiz({ targetCity: 'tepic', query: 'pizza' })).toBe(1);
    const query = decodeURIComponent(get.mock.calls[1][1]);
    expect(query).toContain('description.ilike.');
    expect(query).toContain('tagline.ilike.');
    expect(query).toContain('tags.cs.["pizza"]');
  });

  it('preserves subcategories when loading more and retries older schemas', async () => {
    store.setState({ mapPinsCity: 'tepic' });
    get.mockRejectedValueOnce(new Error('column subcategory does not exist')).mockResolvedValueOnce(rows(20, 1));
    expect(await store.getState().fetchMoreBiz({ targetCity: 'tepic', offset: 20 })).toBe(1);
    expect(get.mock.calls[0][1]).toContain(',subcategory');
    expect(get.mock.calls[1][1]).not.toContain(',subcategory');
  });

  it('merges overlapping pages without duplicate cards', async () => {
    get.mockResolvedValueOnce(rows(0, 20)).mockResolvedValueOnce(rows(15, 20));
    await store.getState().loadMapPins('tepic');
    await store.getState().fetchMoreBiz({ targetCity: 'tepic', offset: 20 });
    expect(store.getState().mapPins).toHaveLength(35);
  });

  it('ignores a slow initial response from the previous city', async () => {
    const old = deferred(); get.mockReturnValueOnce(old.promise).mockResolvedValueOnce(rows(50, 20, 'mazatlan'));
    const pending = store.getState().loadMapPins('tepic');
    await store.getState().loadMapPins('mazatlan');
    old.resolve(rows(0, 20)); await pending;
    expect(store.getState().mapPinsCity).toBe('mazatlan');
    expect(store.getState().mapPins.every(b => b.city_slug === 'mazatlan')).toBe(true);
  });

  it('ignores an old page after the selected city changes', async () => {
    get.mockResolvedValueOnce(rows(0, 20)); await store.getState().loadMapPins('tepic');
    const old = deferred(); get.mockReturnValueOnce(old.promise);
    const pending = store.getState().fetchMoreBiz({ targetCity: 'tepic', offset: 20 });
    get.mockResolvedValueOnce(rows(50, 20, 'mazatlan')); await store.getState().loadMapPins('mazatlan');
    old.resolve(rows(20, 20)); expect(await pending).toBeNull();
    expect(store.getState().mapPins).toHaveLength(20);
  });

  it('distinguishes a network error from the end of the list so the page can be retried', async () => {
    get.mockResolvedValueOnce(rows(0, 20)); await store.getState().loadMapPins('tepic');
    get.mockRejectedValueOnce(new Error('Offline'));
    expect(await store.getState().fetchMoreBiz({ targetCity: 'tepic', offset: 20 })).toBeNull();
    get.mockResolvedValueOnce(rows(20, 3));
    expect(await store.getState().fetchMoreBiz({ targetCity: 'tepic', offset: 20 })).toBe(3);
    expect(store.getState().mapPins).toHaveLength(23);
  });

  it('keeps support for a database without the optional subcategory column', async () => {
    get.mockRejectedValueOnce(new Error('column subcategory does not exist')).mockResolvedValueOnce(rows(0, 20));
    await store.getState().loadMapPins('tepic');
    expect(get).toHaveBeenCalledTimes(2);
    expect(store.getState().mapPins).toHaveLength(20);
    expect(get.mock.calls[1][1]).not.toContain(',subcategory');
  });

  it('loads map rows by viewport without requesting the entire directory', async () => {
    get.mockResolvedValueOnce(rows(0, 20)).mockResolvedValueOnce(rows(100, 2));
    await store.getState().loadMapPins('tepic');
    await store.getState().loadMapPinsByBounds('tepic', { minLat: 21, maxLat: 22, minLng: -105, maxLng: -104 });
    expect(get.mock.calls[1][1]).toContain('lat=gte.21');
    expect(get.mock.calls[1][1]).toContain('limit=200');
    expect(store.getState().mapPins).toHaveLength(22);
  });

  it('fetches full-city rankings separately without changing the list pagination', async () => {
    get.mockResolvedValueOnce(rows(0, 20)); await store.getState().loadMapPins('tepic');
    store.setState({ globalFavCounts: { 'biz-99': 20, 'biz-98': 5 } });
    get.mockResolvedValueOnce(rows(100, 2)).mockResolvedValueOnce(rows(98, 2));
    await store.getState().loadHomeHighlights('tepic');
    expect(store.getState().homeHighlights).toHaveLength(4);
    expect(store.getState().mapPins).toHaveLength(20);
    expect(get.mock.calls[1][1]).toContain('order=rating.desc');
    expect(get.mock.calls[2][1]).toContain('id=in.(biz-99,biz-98)');
    const count = get.mock.calls.length;
    await store.getState().loadHomeHighlights('tepic');
    expect(get).toHaveBeenCalledTimes(count);
  });
});
