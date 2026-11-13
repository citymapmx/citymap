import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { safeSetItem, evictDerivedCaches, persistMapPinsCache, isQuotaError } from '../lib/safeStorage.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Bug 13 nov 2026 (Jonathan, con captura): al publicar una reseña de
// El Tentempié salía «Error: The quota has been exceeded.» aunque la
// reseña SÍ se guardaba en la base (verificado por PostgREST: 2 reseñas
// de 5 estrellas a las 00:50:36 y 00:50:42, la segunda un duplicado del
// reintento). Causa: postReview escribía TODA la lista de pines del mapa
// (que crece con cada desplazamiento, hasta 200 negocios por viewport)
// en localStorage DENTRO del updater de setMapPins y sin try/catch;
// con el almacenamiento lleno, el QuotaExceededError tumbaba la
// publicación después de guardar la reseña. La foto quedó descartada:
// la reseña que falló era solo texto.

// Fake de localStorage con cuota en bytes: setItem lanza un
// QuotaExceededError como el navegador real cuando no cabe.
const makeQuotaStorage = (limitBytes) => {
  const data = new Map();
  let used = 0;
  const quotaError = () => {
    const e = new Error('The quota has been exceeded.');
    e.name = 'QuotaExceededError';
    return e;
  };
  return {
    get length() { return data.size; },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => {
      const s = String(v);
      const next = used - (data.has(k) ? data.get(k).length : 0) + s.length;
      if (next > limitBytes) throw quotaError();
      used = next;
      data.set(k, s);
    },
    removeItem: (k) => {
      if (data.has(k)) {
        used -= data.get(k).length;
        data.delete(k);
      }
    },
    clear: () => { data.clear(); used = 0; },
  };
};

const pins = (n, city = 'tepic') => Array.from({ length: n }, (_, i) => ({
  id: `biz-${i}`, name: `Negocio ${i}`, city_slug: city, rating: 5, review_count: 1,
}));

describe('safeStorage: el almacenamiento lleno no tumba la reseña', () => {
  let storage;
  beforeEach(() => {
    storage = makeQuotaStorage(1000);
    vi.stubGlobal('localStorage', storage);
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it('safeSetItem guarda y devuelve true con espacio libre', () => {
    expect(safeSetItem('cg_city_slug', 'tepic')).toBe(true);
    expect(localStorage.getItem('cg_city_slug')).toBe('tepic');
  });

  it('con el almacenamiento lleno, desaloja cachés de otras ciudades y la escritura entra', () => {
    // Llenar con cachés derivados de otras ciudades.
    localStorage.setItem('cg_mapPins_guadalajara', 'x'.repeat(400));
    localStorage.setItem('cg_data_zapopan_v5', 'y'.repeat(400));
    expect(safeSetItem('cg_mapPins_tepic', 'z'.repeat(300))).toBe(true);
    expect(localStorage.getItem('cg_mapPins_tepic')).toBe('z'.repeat(300));
    expect(localStorage.getItem('cg_mapPins_guadalajara')).toBeNull();
    expect(localStorage.getItem('cg_data_zapopan_v5')).toBeNull();
  });

  it('si ni desalojando cabe, devuelve false y NO lanza', () => {
    expect(() => safeSetItem('cg_mapPins_tepic', 'z'.repeat(5000))).not.toThrow();
    expect(safeSetItem('cg_mapPins_tepic', 'z'.repeat(5000))).toBe(false);
  });

  it('persistMapPinsCache guarda solo la primera página (20) aunque le pasen 200', () => {
    vi.stubGlobal('localStorage', makeQuotaStorage(100000));
    expect(persistMapPinsCache('tepic', pins(200))).toBe(true);
    expect(JSON.parse(localStorage.getItem('cg_mapPins_tepic'))).toHaveLength(20);
  });

  it('persistMapPinsCache con localStorage lleno no lanza (la reseña ya publicada no se ve afectada)', () => {
    localStorage.setItem('cg_data_guadalajara_v5', 'x'.repeat(900));
    expect(() => persistMapPinsCache('tepic', pins(200))).not.toThrow();
    // Ni tras desalojar caben 20 pines en 1000 bytes: la caché se
    // descarta en silencio en vez de tumbar la publicación.
    expect(persistMapPinsCache('tepic', pins(200))).toBe(false);
  });

  it('evictDerivedCaches no toca datos del usuario', () => {
    localStorage.setItem('cg_mapPins_guadalajara', 'x'.repeat(100));
    localStorage.setItem('cg_data_zapopan_v5', 'y'.repeat(100));
    localStorage.setItem('cg_saved_ev', JSON.stringify(['a']));
    localStorage.setItem('citymapmx_visitados_v1', JSON.stringify({}));
    localStorage.setItem('cg_city_slug', 'tepic');
    localStorage.setItem('cg_t', 'token');
    expect(evictDerivedCaches('cg_mapPins_tepic')).toBe(2);
    expect(localStorage.getItem('cg_mapPins_guadalajara')).toBeNull();
    expect(localStorage.getItem('cg_data_zapopan_v5')).toBeNull();
    expect(localStorage.getItem('cg_saved_ev')).not.toBeNull();
    expect(localStorage.getItem('citymapmx_visitados_v1')).not.toBeNull();
    expect(localStorage.getItem('cg_city_slug')).toBe('tepic');
    expect(localStorage.getItem('cg_t')).toBe('token');
  });

  it('isQuotaError reconoce QuotaExceededError y rechaza otros errores', () => {
    const q = new Error('The quota has been exceeded.');
    q.name = 'QuotaExceededError';
    expect(isQuotaError(q)).toBe(true);
    expect(isQuotaError(new Error('Failed to fetch'))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
  });
});

describe('postReview: la escritura de caché ya no vive dentro del updater', () => {
  it('App.jsx ya no escribe en localStorage dentro de setMapPins al publicar reseña', () => {
    const app = read('../App.jsx');
    expect(app).not.toContain('localStorage.setItem(`cg_mapPins_${activeCity}`');
    expect(app).toContain('persistMapPinsCache(activeCity, nextPins)');
  });

  it('App.jsx ya no escribe la caché muerta cg_experiences_* al publicar reseña de experiencia', () => {
    const app = read('../App.jsx');
    expect(app).not.toContain('cg_experiences_${activeCity}');
  });

  it('el error al publicar reseña es en español y útil, no el mensaje crudo del navegador', () => {
    const app = read('../App.jsx');
    expect(app).toContain('No se pudo publicar la reseña, inténtalo de nuevo');
    // Ningún catch de publicar reseña muestra "Error: " + err.message.
    const reviewSection = app.slice(app.indexOf('const postReview'), app.indexOf('const toggleLikeReview'));
    expect(reviewSection).not.toContain('toast$("Error: " + err.message)');
  });
});
