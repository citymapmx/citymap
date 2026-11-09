import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { useDataStore as store } from '../store/useDataStore.js';
import { sb as db } from '../lib/supabase.js';
import { orderBusinessIds } from '../lib/businessListing.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Categoría Restaurantes en Guadalajara (nov 2026): la vista mostraba
// solo los 4 negocios que cabían en pantalla de los 21 de la base.
// Causa: la lista es un Virtuoso que solo renderiza lo visible, sin
// contador ni "Ver más". El flujo de datos sí trae todos (la primera
// página trae 20 negocios y el fetch de categoría trae hasta 100 y los
// fusiona en mapPins); lo que faltaba era la paginación visible.
const rows = (start, count, overrides = {}) => Array.from({ length: count }, (_, i) => ({
  id: `biz-${start + i}`, name: `Lugar ${start + i}`, city_slug: 'guadalajara', status: 'approved',
  category: 'restaurantes', plan: 'free', photos: '[]', schedule: '{}', social_links: '{}',
  rating: 5, review_count: 2, ...overrides,
}));

describe('categoría Restaurantes en Guadalajara: los 21 alcanzables', () => {
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

  it('el fetch de categoría fusiona en mapPins los restaurantes fuera de la primera página', async () => {
    const firstPage = [
      ...rows(0, 9),
      ...rows(100, 11, { category: 'cafeterias' }),
    ];
    const categoryRows = rows(0, 21);
    get.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(categoryRows);
    await store.getState().loadMapPins('guadalajara');
    expect(store.getState().mapPins).toHaveLength(20);
    const count = await store.getState().fetchMoreBiz({ targetCity: 'guadalajara', query: '', category: 'restaurantes', offset: 0, limit: 100 });
    expect(count).toBe(21);
    expect(get.mock.calls[1][1]).toContain('category=ilike.*restaurantes*');
    expect(get.mock.calls[1][1]).toContain('limit=100');
    // Los 21 quedan en mapPins: el mapeo por id ya no pierde ninguno.
    const pins = store.getState().mapPins;
    const ids = orderBusinessIds(categoryRows);
    const byId = new Map(pins.map(b => [b.id, b]));
    expect(ids.map(id => byId.get(id)).filter(Boolean)).toHaveLength(21);
  });

  it('la lista de categoría empieza paginada en 20 (no muestra todo de golpe)', () => {
    const app = read('../App.jsx');
    // La página inicial de la categoría es 1: los primeros 20, y el resto
    // se revela con "Ver más" o al bajar.
    expect(app).not.toContain('Math.ceil(count / 20)');
    expect(app).toContain('setPage(1);');
  });

  it('la vista de categoría muestra el total y un botón Ver más', () => {
    const home = read('../views/HomeView.jsx');
    expect(home).toContain('{selectedSubcat === "todas" ? biz.length : finalDisplayList.length}');
    expect(home).toContain('t("lugares", "lugares")');
    expect(home).toContain('onClick={() => loadPaginatedBiz(false)}');
    expect(home).toContain('t("ver_mas", "Ver más")');
  });
});
