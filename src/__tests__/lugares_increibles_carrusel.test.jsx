import React from 'react';
import { describe, expect, it, beforeAll, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import TopLugaresIncreibles from '../components/home/TopLugaresIncreibles.jsx';
import { LUGARES_AUTOPLAY_MS, LUGARES_MIN_CANDIDATOS, LUGARES_TOP_N, nextLugaresIndex, topLugaresIncreibles } from '../lib/lugaresIncreibles.js';
import { useDataStore } from '../store/useDataStore.js';
import { sb } from '../lib/supabase.js';
import { TRANSLATIONS, ensureEnglishTranslations } from '../lib/i18n.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const T = { text: '#111', sub: '#666', bg: '#fff', card: '#fff', shadow: 'none', border: '#eee' };

// Lugares reales de Guadalajara (los del mockup de la propuesta):
// 5 en el top + 1 válido que queda fuera por el corte + 3 distractores
// que la regla del top debe excluir (sin foto, sin rating, otra categoría).
const LUGARES = [
  { id: 'l-1', name: 'Museo Cabañas', slug: 'museo-cabanas', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/cabanas.jpg' }], rating: 4.9, review_count: 1200 },
  { id: 'l-2', name: 'Catedral de Guadalajara', slug: 'guadalajara-catedral-de-guadalajara', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/catedral.jpg' }], rating: 4.8, review_count: 3000 },
  { id: 'l-3', name: 'El Expiatorio', slug: 'el-expiatorio', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/expiatorio.jpg' }], rating: 4.8, review_count: 500 },
  { id: 'l-4', name: 'Plaza de Armas', slug: 'plaza-de-armas', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/plaza.jpg' }], rating: 4.7, review_count: 800 },
  { id: 'l-5', name: 'Rotonda de los Jaliscienses Ilustres', slug: 'rotonda-de-los-jaliscienses-ilustres', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/rotonda.jpg' }], rating: 4.6, review_count: 900 },
  { id: 'l-6', name: 'Barranca de Huentitán', slug: 'barranca-de-huentitan', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/barranca.jpg' }], rating: 4.5, review_count: 2000 },
  { id: 'l-7', name: 'Lugar sin foto', slug: 'lugar-sin-foto', city_slug: 'guadalajara', category: 'lugares', photos: [], rating: 5.0, review_count: 9999 },
  { id: 'l-8', name: 'Lugar sin rating', slug: 'lugar-sin-rating', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/sin-rating.jpg' }], rating: null, review_count: 9999 },
  { id: 'l-9', name: 'Restaurante top', slug: 'restaurante-top', city_slug: 'guadalajara', category: 'restaurantes', photos: [{ url: 'https://example.org/restaurante.jpg' }], rating: 5.0, review_count: 9999 },
];

function renderLugares(businesses = LUGARES) {
  return renderToStaticMarkup(
    <TopLugaresIncreibles businesses={businesses} T={T} city={{ slug: 'guadalajara', name: 'Guadalajara' }} cities={[]} handleCardTap={() => {}} />,
  );
}

// Los 14 lugares reales de Guadalajara (medido por PostgREST 27 nov
// 2026, en el orden que devuelve la consulta rating DESC,
// review_count DESC): todos con foto y rating. Seis empatan a 5.0 con
// 1 reseña, así que el top 5 son los 5 primeros en ese orden.
const GUADALAJARA_REAL = [
  { id: 'g-1', name: 'Arena Guadalajara', slug: 'arena-guadalajara', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/arena-gdl.jpg' }], rating: 5.0, review_count: 1 },
  { id: 'g-2', name: 'Catedral Metropolitana de Guadalajara', slug: 'catedral-metropolitana-de-guadalajara', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/catedral-gdl.jpg' }], rating: 5.0, review_count: 1 },
  { id: 'g-3', name: 'Museo Cabañas', slug: 'museo-cabanas', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/cabanas.jpg' }], rating: 5.0, review_count: 1 },
  { id: 'g-4', name: 'Parroquia El Expiatorio Eucarístico de Guadalajara', slug: 'parroquia-el-expiatorio-eucaristico-de-guadalajara', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/expiatorio.jpg' }], rating: 5.0, review_count: 1 },
  { id: 'g-5', name: 'Bosque Los Colomos', slug: 'bosque-los-colomos', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/colomos.jpg' }], rating: 5.0, review_count: 1 },
  { id: 'g-6', name: 'Expo Guadalajara', slug: 'expo-guadalajara', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/expo.jpg' }], rating: 5.0, review_count: 1 },
  { id: 'g-7', name: 'MUSA Museo de las Artes UDG', slug: 'musa-museo-de-las-artes-udg', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/musa.jpg' }], rating: 4.8, review_count: 10094 },
  { id: 'g-8', name: 'Zoológico Guadalajara', slug: 'zoologico-guadalajara', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/zoologico.jpg' }], rating: 4.7, review_count: 66483 },
  { id: 'g-9', name: 'Rotonda de los Jaliscienses Ilustres', slug: 'rotonda-de-los-jaliscienses-ilustres', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/rotonda.jpg' }], rating: 4.7, review_count: 9077 },
  { id: 'g-10', name: 'Arena Coliseo de Guadalajara', slug: 'arena-coliseo-de-guadalajara', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/coliseo.jpg' }], rating: 4.7, review_count: 5005 },
  { id: 'g-11', name: 'Plaza de Armas', slug: 'plaza-de-armas', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/plaza.jpg' }], rating: 4.7, review_count: 3459 },
  { id: 'g-12', name: 'Ex Convento del Carmen', slug: 'ex-convento-del-carmen', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/carmen.jpg' }], rating: 4.7, review_count: 2895 },
  { id: 'g-13', name: 'Plaza Tapatía', slug: 'plaza-tapatia', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/tapatia.jpg' }], rating: 4.6, review_count: 10134 },
  { id: 'g-14', name: 'Museo Panteón de Belén', slug: 'museo-panteon-de-belen', city_slug: 'guadalajara', category: 'lugares', photos: [{ url: 'https://example.org/belen.jpg' }], rating: 4.4, review_count: 1071 },
];

beforeAll(async () => {
  await ensureEnglishTranslations();
});

describe('Lugares increíbles: regla del top (rating + review_count)', () => {
  it('top 5: rating DESC, desempate review_count DESC', () => {
    const top = topLugaresIncreibles(LUGARES);
    expect(top.map((b) => b.id)).toEqual(['l-1', 'l-2', 'l-3', 'l-4', 'l-5']);
    // El 4.8 con más reseñas (Catedral, 3000) va antes que el 4.8 con
    // menos (Expiatorio, 500).
    expect(top[1].name).toBe('Catedral de Guadalajara');
    expect(top[2].name).toBe('El Expiatorio');
    expect(LUGARES_TOP_N).toBe(5);
  });

  it('excluye sin foto, sin rating y de otra categoría aunque tengan 5.0', () => {
    const top = topLugaresIncreibles(LUGARES);
    expect(top.map((b) => b.id)).not.toContain('l-7');
    expect(top.map((b) => b.id)).not.toContain('l-8');
    expect(top.map((b) => b.id)).not.toContain('l-9');
  });

  it('el rating como string con coma decimal también vale', () => {
    const top = topLugaresIncreibles([
      { id: 'a', name: 'A', category: 'lugares', photos: [{ url: 'https://example.org/a.jpg' }], rating: '4,9', review_count: 10 },
      { id: 'b', name: 'B', category: 'lugares', photos: [{ url: 'https://example.org/b.jpg' }], rating: 4.8, review_count: 10 },
      { id: 'c', name: 'C', category: 'lugares', photos: [{ url: 'https://example.org/c.jpg' }], rating: 'sin dato', review_count: 10 },
    ]);
    expect(top.map((b) => b.id)).toEqual(['a', 'b']);
  });

  it('la regla no deriva nada de subcategory', () => {
    const src = read('../lib/lugaresIncreibles.js');
    expect(src).not.toContain('subcategory');
    expect(src).not.toContain('subcategory'.toUpperCase());
  });

  it('las tarjetas se pintan en el orden del top y la 6ª válida queda fuera', () => {
    const html = renderLugares();
    const order = ['Museo Cabañas', 'Catedral de Guadalajara', 'El Expiatorio', 'Plaza de Armas', 'Rotonda de los Jaliscienses Ilustres'];
    let prev = -1;
    for (const name of order) {
      const idx = html.indexOf(name);
      expect(idx).toBeGreaterThan(prev);
      prev = idx;
    }
    expect(html).not.toContain('Barranca de Huentitán');
    expect(html).not.toContain('Lugar sin foto');
    expect(html).not.toContain('Lugar sin rating');
    expect(html).not.toContain('Restaurante top');
  });
});

describe('Lugares increíbles: mínimo de 3 para montar', () => {
  it('con menos de 3 candidatos no se monta nada', () => {
    expect(LUGARES_MIN_CANDIDATOS).toBe(3);
    expect(renderLugares(LUGARES.slice(0, 2))).toBe('');
    expect(renderLugares([LUGARES[6]])).toBe('');
    expect(renderLugares([])).toBe('');
    expect(renderLugares(null)).toBe('');
  });

  it('con exactamente 3 candidatos sí se monta, con 3 puntos', () => {
    const html = renderLugares(LUGARES.slice(0, 3));
    expect(html).toContain('Lugares increíbles');
    for (let i = 1; i <= 3; i++) {
      expect(html).toContain(`aria-label="Ver lugar ${i} de 3"`);
    }
  });
});

describe('Lugares increíbles: título (clave i18n)', () => {
  it('el título es «Lugares increíbles», sin ciudad', () => {
    const html = renderLugares();
    expect(html).toContain('Lugares increíbles');
    expect(html).toContain('>Lugares increíbles</h2>');
    expect(html).not.toContain('Lugares increíbles de');
  });

  it('la clave existe en español e inglés', () => {
    expect(TRANSLATIONS.es['home_lugares_increibles']).toBe('Lugares increíbles');
    expect(TRANSLATIONS.en['home_lugares_increibles']).toBe('Incredible places');
    expect(TRANSLATIONS.es['home_ver_lugar']).toBe('Ver lugar');
    expect(TRANSLATIONS.en['home_ver_lugar']).toBe('Show place');
  });
});

describe('Lugares increíbles: carrusel horizontal automático', () => {
  it('la lista es un carrusel con scroll-snap, no una columna vertical', () => {
    const html = renderLugares();
    expect(html).toContain('scroll-snap-type:x mandatory');
    expect(html).toContain('overflow-x:auto');
    expect(html).toContain('scroll-snap-align:center');
    expect(html).not.toContain('flex-direction:column');
    // La región del carrusel se anuncia como tal.
    expect(html).toContain('aria-roledescription="carrusel"');
  });

  it('tiene 5 puntos de posición, el primero activo', () => {
    const html = renderLugares();
    for (let i = 1; i <= 5; i++) {
      expect(html).toContain(`aria-label="Ver lugar ${i} de 5"`);
    }
    expect(html).toContain('aria-current="true"');
  });

  it('con 3 candidatos hay 3 puntos', () => {
    const html = renderLugares(LUGARES.slice(0, 3));
    expect(html).toContain('aria-label="Ver lugar 1 de 3"');
  });

  it('el avance automático es cada 4.5 s y da la vuelta en bucle', () => {
    expect(LUGARES_AUTOPLAY_MS).toBe(4500);
    expect(nextLugaresIndex(0, 5)).toBe(1);
    expect(nextLugaresIndex(4, 5)).toBe(0);
    expect(nextLugaresIndex(2, 5)).toBe(3);
    expect(nextLugaresIndex(0, 0)).toBe(0);
  });

  it('el cableado del autoplay está en el componente', () => {
    const src = read('../components/home/TopLugaresIncreibles.jsx');
    expect(src).toContain('setInterval');
    expect(src).toContain('LUGARES_AUTOPLAY_MS');
    // Se pausa al interactuar, al esconder la pestaña y con
    // prefers-reduced-motion (mismo patrón que TopImperdibles).
    expect(src).toContain('onPointerDown');
    expect(src).toContain('onPointerUp');
    expect(src).toContain('visibilitychange');
    expect(src).toContain("prefers-reduced-motion: reduce");
    // Los puntos saltan a la tarjeta tocada.
    expect(src).toContain('goTo(i)');
  });
});

describe('Lugares increíbles: tarjetas con foto llena y tap a la ficha', () => {
  it('la tarjeta conserva foto llena y título', () => {
    const html = renderLugares();
    expect(html).toContain('https://example.org/cabanas.jpg');
    expect(html).toContain('Museo Cabañas');
  });

  it('el tap abre la ficha con el flujo de negocio (handleCardTap) y la ruta de la ficha', () => {
    const html = renderLugares();
    expect(html).toContain('href="/guadalajara/museo-cabanas"');
    // El slug con prefijo de ciudad se limpia, como en handleCardTap.
    expect(html).toContain('href="/guadalajara/catedral-de-guadalajara"');
    const src = read('../components/home/TopLugaresIncreibles.jsx');
    expect(src).toContain('handleCardTap(b)');
    const home = read('../views/HomeView.jsx');
    expect(home).toContain('TopLugaresIncreibles');
    // La sección ya no recibe la lista paginada (`biz`): HomeView le
    // pasa la lista propia del store.
    expect(home).toContain('businesses={topLugares}');
    expect(home).not.toContain('businesses={biz}');
    expect(home).toContain('handleCardTap={handleCardTap}');
  });
});

describe('Lugares increíbles: fuente propia en el store (no la lista paginada)', () => {
  it('HomeView lee topLugares del store y pide la carga por ciudad', () => {
    const home = read('../views/HomeView.jsx');
    expect(home).toContain('topLugares');
    expect(home).toContain('loadTopLugares');
    expect(home).toContain('loadTopLugares(activeCity)');
    expect(home).toContain('businesses={topLugares}');
    // El componente sigue siendo por props (patrón del repo): no lee
    // el store directamente, así que se puede renderizar en tests.
    const src = read('../components/home/TopLugaresIncreibles.jsx');
    expect(src).not.toContain('useDataStore');
  });

  it('el loader consulta solo lugares aprobados de la ciudad, top por rating, límite 10', () => {
    const store = read('../store/useDataStore.js');
    expect(store).toContain('loadTopLugares');
    expect(store).toContain('category=eq.lugares');
    expect(store).toContain('status=eq.approved');
    expect(store).toContain('order=rating.desc.nullslast,review_count.desc');
    expect(store).toContain('limit=10');
    // Solo las columnas que usa la tarjeta.
    expect(store).toContain('id,name,photos,rating,review_count,category,city_slug,slug,status');
    // Caché por ciudad: no se re-pide para la misma ciudad en la sesión.
    expect(store).toContain('topLugaresCity');
    expect(store).toContain('topLugaresRequests');
  });

  it('al cambiar de ciudad se vacían los lugares de la anterior', () => {
    const store = read('../store/useDataStore.js');
    expect(store).toContain('topLugares: [], topLugaresCity: null');
  });

  it('loadTopLugares pide el top por rating y publica filas + ciudad', async () => {
    useDataStore.setState({ mapPinsCity: 'guadalajara', topLugares: [], topLugaresCity: null });
    const rows = [
      { id: 'g-1', name: 'Arena Guadalajara', photos: '[{"url":"https://example.org/arena.jpg"}]', rating: 5.0, review_count: 1, category: 'lugares', city_slug: 'guadalajara', slug: 'arena-guadalajara', status: 'approved' },
      { id: 'g-2', name: 'Catedral Metropolitana de Guadalajara', photos: '[{"url":"https://example.org/catedral.jpg"}]', rating: 5.0, review_count: 1, category: 'lugares', city_slug: 'guadalajara', slug: 'catedral-metropolitana-de-guadalajara', status: 'approved' },
    ];
    const getSpy = vi.spyOn(sb, 'get').mockResolvedValue(rows);
    try {
      await useDataStore.getState().loadTopLugares('guadalajara');
      expect(getSpy).toHaveBeenCalledTimes(1);
      const [table, params] = getSpy.mock.calls[0];
      expect(table).toBe('businesses');
      expect(params).toContain('category=eq.lugares');
      expect(params).toContain('status=eq.approved');
      expect(params).toContain('order=rating.desc.nullslast,review_count.desc');
      expect(params).toContain('limit=10');
      const s = useDataStore.getState();
      expect(s.topLugaresCity).toBe('guadalajara');
      expect(s.topLugares).toHaveLength(2);
      // `photos` llega como JSON de PostgREST y se parsea.
      expect(s.topLugares[0].photos).toEqual([{ url: 'https://example.org/arena.jpg' }]);
    } finally {
      getSpy.mockRestore();
    }
  });

  it('caché por ciudad: la misma ciudad no se re-pide; otra ciudad sí', async () => {
    useDataStore.setState({ mapPinsCity: 'tepic', topLugares: LUGARES.slice(0, 3), topLugaresCity: 'guadalajara' });
    const getSpy = vi.spyOn(sb, 'get').mockResolvedValue([]);
    try {
      await useDataStore.getState().loadTopLugares('guadalajara');
      expect(getSpy).not.toHaveBeenCalled();
      await useDataStore.getState().loadTopLugares('tepic');
      expect(getSpy).toHaveBeenCalledTimes(1);
      expect(getSpy.mock.calls[0][1]).toContain('city_slug=eq.tepic');
    } finally {
      getSpy.mockRestore();
    }
  });

  it('con los 14 lugares reales de Guadalajara se monta el top 5', () => {
    // La forma real de las filas (nombres, ratings y conteos medidos
    // por PostgREST 27 nov 2026) pasa por la regla del top y la
    // sección se monta con 5 tarjetas.
    const html = renderLugares(topLugaresIncreibles(GUADALAJARA_REAL));
    const order = ['Arena Guadalajara', 'Catedral Metropolitana de Guadalajara', 'Museo Cabañas', 'Parroquia El Expiatorio Eucarístico de Guadalajara', 'Bosque Los Colomos'];
    let prev = -1;
    for (const name of order) {
      const idx = html.indexOf(name);
      expect(idx).toBeGreaterThan(prev);
      prev = idx;
    }
    // El 6º con 5.0 (Expo Guadalajara) y el 4.8 (MUSA) quedan fuera del top 5.
    expect(html).not.toContain('Expo Guadalajara');
    expect(html).not.toContain('MUSA Museo de las Artes UDG');
    expect(html).toContain('aria-label="Ver lugar 5 de 5"');
  });
});

describe('Lugares increíbles: cambio de ciudad vacía la lista vieja', () => {
  let storage;
  beforeEach(() => {
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

  it('loadData a otra ciudad vacía topLugares en el acto, antes de que resuelva la red', async () => {
    useDataStore.setState({ mapPinsCity: 'guadalajara', topLugares: LUGARES.slice(0, 3), topLugaresCity: 'guadalajara' });
    const getSpy = vi.spyOn(sb, 'get').mockImplementation(async (table) => {
      if (table === 'cities') return [{ slug: 'tepic', name: 'Tepic', state: 'Nayarit' }, { slug: 'guadalajara', name: 'Guadalajara', state: 'Jalisco' }];
      return [];
    });
    const rpc = vi.spyOn(sb, 'rpc').mockResolvedValue([]);
    try {
      const p = useDataStore.getState().loadData('tepic');
      // Síncrono: la limpieza ya corrió, aunque la red no resolvió nada.
      const s = useDataStore.getState();
      expect(s.topLugares).toEqual([]);
      expect(s.topLugaresCity).toBeNull();
      await p;
    } finally {
      getSpy.mockRestore();
      rpc.mockRestore();
    }
  });
});
