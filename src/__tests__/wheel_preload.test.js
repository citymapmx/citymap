import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { firstWheelEvent, preloadWheelFirstImage, wheelFirstImageUrl, wheelFrontIndex, wheelNearFaces, WHEEL_NEAR_RADIUS } from '../lib/wheelPreload.js';
import { useDataStore } from '../store/useDataStore.js';
import { sb } from '../lib/supabase.js';

// La rueda de eventos (EventWheel3D) es el LCP de la página de ciudad:
// su primera imagen no se descubría hasta que llegaban los datos, porque
// la consulta de eventos esperaba a refreshCities y la imagen solo se
// pedía al pintar la rueda. Estas pruebas cubren las dos partes del
// arreglo: precargar la primera imagen en cuanto se conocen los datos, y
// disparar la consulta de eventos en paralelo con refreshCities.

const IMG = 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/poster.jpg';
const IMG2 = 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/poster-2.jpg';
const TODAY = '2026-11-10';

function ev(id, date, city = 'tepic', img = IMG) {
  return { id, title: `Evento ${id}`, date, status: 'approved', city_slug: city, img_url: img, time: '20:00' };
}

// Documento falso (la suite no tiene jsdom): solo lo que usa el helper.
function makeDoc() {
  const links = [];
  const head = {
    querySelector: () => links[0] || null,
    appendChild: (el) => { links.push(el); return el; },
  };
  return {
    head,
    links,
    createElement: () => {
      const attrs = {};
      const el = {
        attrs,
        setAttribute: (k, v) => { attrs[k] = String(v); },
        getAttribute: (k) => (k in attrs ? attrs[k] : null),
        remove: () => { const i = links.indexOf(el); if (i >= 0) links.splice(i, 1); },
      };
      return el;
    },
  };
}

describe('wheelPreload: primera cara de la rueda', () => {
  it('elige el evento próximo más cercano de la ciudad, como HomeEvents', () => {
    const events = [
      ev('pasado', '2026-11-01'),
      ev('tarde', '2026-11-20'),
      ev('pronto', '2026-11-12'),
      ev('otra-ciudad', '2026-11-11', 'guadalajara'),
    ];
    expect(firstWheelEvent(events, 'tepic', TODAY).id).toBe('pronto');
    expect(wheelFirstImageUrl(events, 'tepic', TODAY)).toBe(IMG);
  });

  it('no elige nada sin eventos próximos de la ciudad', () => {
    expect(firstWheelEvent([ev('pasado', '2026-11-01')], 'tepic', TODAY)).toBeNull();
    expect(wheelFirstImageUrl([ev('otra-ciudad', '2026-11-11', 'guadalajara')], 'tepic', TODAY)).toBeNull();
  });
});

describe('wheelPreload: enlace de precarga', () => {
  it('inyecta un preload con el mismo srcset que usará el <img> de la rueda', () => {
    const doc = makeDoc();
    const events = [ev('pronto', '2026-11-12')];
    expect(preloadWheelFirstImage(events, 'tepic', doc, TODAY)).toBe(true);
    expect(doc.links).toHaveLength(1);
    const link = doc.links[0];
    expect(link.attrs.rel).toBe('preload');
    expect(link.attrs.as).toBe('image');
    expect(link.attrs.fetchpriority).toBe('high');
    expect(link.attrs['data-wheel-preload']).toBe(IMG);
    // href = candidato mayor (800w, igual que el src del <img>).
    expect(link.attrs.href).toContain('/render/image/public/media/cityguide/poster.jpg');
    expect(link.attrs.href).toContain('width=800');
    // imagesrcset = los mismos candidatos del srcset de la rueda.
    expect(link.attrs.imagesrcset).toContain('width=400');
    expect(link.attrs.imagesrcset).toContain('width=800');
    expect(link.attrs.imagesrcset).toContain('400w');
    expect(link.attrs.imagesrcset).toContain('800w');
    expect(link.attrs.imagesizes).toBe('(max-width: 640px) 50vw, 300px');
  });

  it('no duplica el enlace si la primera imagen es la misma', () => {
    const doc = makeDoc();
    const events = [ev('pronto', '2026-11-12')];
    preloadWheelFirstImage(events, 'tepic', doc, TODAY);
    expect(preloadWheelFirstImage(events, 'tepic', doc, TODAY)).toBe(true);
    expect(doc.links).toHaveLength(1);
  });

  it('reemplaza el enlace si cambia la primera imagen (cambio de ciudad)', () => {
    const doc = makeDoc();
    preloadWheelFirstImage([ev('a', '2026-11-12', 'tepic', IMG)], 'tepic', doc, TODAY);
    preloadWheelFirstImage([ev('b', '2026-11-12', 'tepic', IMG2)], 'tepic', doc, TODAY);
    expect(doc.links).toHaveLength(1);
    expect(doc.links[0].attrs['data-wheel-preload']).toBe(IMG2);
  });

  it('no inyecta nada sin imagen en la primera cara o sin documento', () => {
    const doc = makeDoc();
    expect(preloadWheelFirstImage([ev('sin-foto', '2026-11-12', 'tepic', null)], 'tepic', doc, TODAY)).toBe(false);
    expect(preloadWheelFirstImage([], 'tepic', doc, TODAY)).toBe(false);
    expect(preloadWheelFirstImage([ev('a', '2026-11-12')], 'tepic', null, TODAY)).toBe(false);
    expect(doc.links).toHaveLength(0);
  });

  it('quita el enlace si ya no hay primera imagen', () => {
    const doc = makeDoc();
    preloadWheelFirstImage([ev('a', '2026-11-12')], 'tepic', doc, TODAY);
    expect(doc.links).toHaveLength(1);
    expect(preloadWheelFirstImage([], 'tepic', doc, TODAY)).toBe(false);
    expect(doc.links).toHaveLength(0);
  });
});

describe('loadData: eventos en paralelo con refreshCities', () => {
  const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };
  const eventRow = { ...ev('ev-1', '2026-11-20'), img_url: IMG, website: null };

  let get;
  let doc;
  beforeEach(() => {
    const cache = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key) => cache.get(key) ?? null,
      setItem: (key, value) => cache.set(key, value),
      removeItem: (key) => cache.delete(key),
    });
    doc = makeDoc();
    vi.stubGlobal('document', doc);
    localStorage.setItem('cg_city_slug', 'tepic');
    useDataStore.setState({ events: [], experiences: [], mapPins: [], mapPinsCity: null, initialBizCount: null, dbReady: false, cities: [] });
    get = vi.spyOn(sb, 'get');
    vi.spyOn(sb, 'rpc').mockResolvedValue([]);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('dispara la consulta de eventos antes de que resuelva refreshCities, y solo una vez', async () => {
    const citiesGate = deferred();
    get.mockImplementation((table) => {
      if (table === 'cities') return citiesGate.promise;
      if (table === 'events') return Promise.resolve([eventRow]);
      return Promise.resolve([]);
    });
    const loading = useDataStore.getState().loadData('tepic');
    await Promise.resolve();
    // refreshCities sigue pendiente, pero la consulta de eventos ya salió.
    const eventCalls = get.mock.calls.filter(([t]) => t === 'events');
    expect(eventCalls).toHaveLength(1);
    expect(eventCalls[0][1]).toContain('status=eq.approved');
    expect(eventCalls[0][1]).toContain('tepic');

    citiesGate.resolve([{ id: 'c1', slug: 'tepic', name: 'Tepic' }]);
    await loading;
    await new Promise((r) => setTimeout(r, 0));
    // fetchSecondary esperó la misma promesa: no se pidió de nuevo.
    expect(get.mock.calls.filter(([t]) => t === 'events')).toHaveLength(1);
    expect(useDataStore.getState().events.map((e) => e.id)).toContain('ev-1');
    expect(useDataStore.getState().dbReady).toBe(true);
    // Y la primera imagen quedó precargada antes del re-render.
    expect(doc.links).toHaveLength(1);
    expect(doc.links[0].attrs['data-wheel-preload']).toBe(IMG);
    expect(doc.links[0].attrs.imagesrcset).toContain('width=800');
  });

  it('precarga la primera imagen desde el caché, antes de que resuelva ninguna red', async () => {
    localStorage.setItem('cg_data_tepic_v5', JSON.stringify({ e: [eventRow] }));
    const citiesGate = deferred();
    get.mockImplementation((table) => {
      if (table === 'cities') return citiesGate.promise;
      return Promise.resolve([]);
    });
    const loading = useDataStore.getState().loadData('tepic');
    // Sin esperar a la red: el caché ya restauró los eventos y el
    // preload está puesto (la rueda lo descubriría al pintar).
    expect(doc.links).toHaveLength(1);
    expect(doc.links[0].attrs['data-wheel-preload']).toBe(IMG);
    expect(doc.links[0].attrs.fetchpriority).toBe('high');
    citiesGate.resolve([{ id: 'c1', slug: 'tepic', name: 'Tepic' }]);
    await loading;
    await new Promise((r) => setTimeout(r, 0));
  });

  it('sin ciudad conocida pide los eventos por el camino de siempre', async () => {
    localStorage.removeItem('cg_city_slug');
    get.mockImplementation((table) => {
      if (table === 'cities') return Promise.resolve([{ id: 'c1', slug: 'guadalajara', name: 'Guadalajara' }]);
      if (table === 'events') return Promise.resolve([eventRow]);
      return Promise.resolve([]);
    });
    await useDataStore.getState().loadData();
    expect(get.mock.calls.filter(([t]) => t === 'events')).toHaveLength(1);
    expect(useDataStore.getState().events.map((e) => e.id)).toContain('ev-1');
  });
});

describe('wheelPreload: caras diferidas (rendimiento teléfono)', () => {
  it('la cara del frente es la 0 con rotation 0 y avanza al bajar la rotación', () => {
    expect(wheelFrontIndex(0, 36, 10)).toBe(0);
    expect(wheelFrontIndex(-36, 36, 10)).toBe(1);
    expect(wheelFrontIndex(-72, 36, 10)).toBe(2);
    expect(wheelFrontIndex(-360, 36, 10)).toBe(0);
    expect(wheelFrontIndex(-396, 36, 10)).toBe(1);
    expect(wheelFrontIndex(36, 36, 10)).toBe(9);
  });

  it('redondea a la cara más cercana a mitad de giro', () => {
    expect(wheelFrontIndex(-20, 36, 10)).toBe(1);
    expect(wheelFrontIndex(-17, 36, 10)).toBe(0);
  });

  it('las cercanas al frente son el frente y 2 a cada lado, en círculo', () => {
    expect(WHEEL_NEAR_RADIUS).toBe(2);
    expect(wheelNearFaces(0, 10)).toEqual([8, 9, 0, 1, 2]);
    expect(wheelNearFaces(9, 10)).toEqual([7, 8, 9, 0, 1]);
    expect(wheelNearFaces(0, 6)).toEqual([4, 5, 0, 1, 2]);
    expect(wheelNearFaces(0, 3)).toEqual([1, 2, 0, 1, 2]);
    expect(wheelNearFaces(0, 1)).toEqual([0, 0, 0, 0, 0]);
    expect(wheelNearFaces(0, 0)).toEqual([]);
  });
});
