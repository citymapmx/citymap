import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

vi.mock('../hooks/useCart.js', () => ({
  useCart: () => ({
    items: [],
    isOpen: false,
    setIsOpen: vi.fn(),
    addItem: vi.fn(),
    removeItem: vi.fn(),
    updateQuantity: vi.fn(),
    clearCart: vi.fn(),
    getCartTotal: () => 0,
  }),
  calculateItemTotal: () => 0,
}));
vi.mock('../store/useUIStore.js', () => ({
  useUIStore: (sel) => {
    const s = { dark: false };
    return typeof sel === 'function' ? sel(s) : s;
  },
}));
vi.mock('../store/useDataStore.js', () => ({
  useDataStore: (sel) => {
    const s = { globalFavCounts: {} };
    return typeof sel === 'function' ? sel(s) : s;
  },
}));
vi.mock('../store/useAuthStore.js', () => ({
  useAuthStore: () => ({ user: null, setShowAuth: vi.fn() }),
}));
vi.mock('../lib/supabase.js', () => ({ sb: { get: vi.fn() } }));

import BusinessStore from '../components/store/BusinessStore.jsx';
import MenuLoadingScreen from '../components/store/MenuLoadingScreen.jsx';
import { resolveMenuIntent, readSavedMenuIntent, saveMenuIntent } from '../lib/menuIntent.js';
import { fetchStoreCategories } from '../lib/storeCategories.js';
import { sb } from '../lib/supabase.js';

// Carga única del menú (hallazgo #2, nov 2026): antes se veían 4
// etapas seguidas — splash negro → esqueleto con brillo (negocio) →
// «Cargando menú…» con barras (categorías) → modal «¿Cómo nos
// visitas hoy?» que tapaba el menú. Ahora negocio + categorías
// cargan juntos bajo UNA sola pantalla, y el menú se muestra sin
// puerta obligatoria: con el modo por defecto (delivery) y una
// píldora visible para cambiar a «En el local».

// Datos reales de Carrito La Paz (Tepic): estilo Atardecer guardado,
// Tostada Adobada $70. El horario es amplio para que el + no salga
// como «Fuera de servicio» en el render.
const carrito = {
  id: '82c9af20-ef42-4a43-87c4-1831a020aace',
  name: 'Carrito La Paz',
  slug: 'tepic-carrito-la-paz-tostadas-de-atun',
  city_slug: 'tepic',
  type: 'Restaurantes',
  plan: 'premium',
  menu_style: 'atardecer',
  logo_url: 'https://example.supabase.co/logo.jpg',
  banner_url: null,
  schedule: {
    dom: '11:00am - 10:00pm', lun: '11:00am - 10:00pm', mar: '11:00am - 10:00pm',
    mie: '11:00am - 10:00pm', jue: '11:00am - 10:00pm', vie: '11:00am - 10:00pm',
    sab: '11:00am - 10:00pm',
  },
  timezone: 'America/Mazatlan',
};
const categories = [
  {
    id: 'c1', name: 'TOSTADAS', sort_order: 1, available_from: null, available_to: null,
    store_products: [
      {
        id: 'p1', name: 'Tostada Adobada', description: 'Atún adobado', price: 70,
        image_url: null, is_available: true, sort_order: 1, category_id: 'c1',
        promotion: { enabled: true, sale_price: 50 },
      },
    ],
  },
];
const T = {
  bg: '#FFFFFF', border: '#E4E4E7', text: '#18181B', sub: '#71717A',
  surface: '#F4F4F5', white: '#FFFFFF', green: '#16A34A', dark: false,
};
// El + del producto es el icono «plus» (dos líneas SVG en cruz).
const PLUS_SVG = 'x1="12" y1="5" x2="12" y2="19"';

const renderStore = (props = {}) => renderToStaticMarkup(
  <MemoryRouter>
    <BusinessStore business={carrito} T={T} isElite inline initialCategories={categories} {...props} />
  </MemoryRouter>,
);

// localStorage en memoria (vitest corre en node, sin localStorage).
const saved = new Map();
const localStorageStub = {
  getItem: (k) => (saved.has(k) ? saved.get(k) : null),
  setItem: (k, v) => saved.set(k, String(v)),
  removeItem: (k) => saved.delete(k),
  clear: () => saved.clear(),
};

describe('carga única del menú (hallazgo #2)', () => {
  beforeEach(() => {
    saved.clear();
    vi.stubGlobal('localStorage', localStorageStub);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe('resolveMenuIntent / localStorage', () => {
    it('sin elección guardada el modo por defecto es delivery (el menú completo, con pedido)', () => {
      expect(resolveMenuIntent({ isCatalog: false, initialIntent: null, saved: null })).toBe('delivery');
    });

    it('la elección guardada se respeta en la siguiente visita', () => {
      expect(resolveMenuIntent({ isCatalog: false, initialIntent: null, saved: 'local' })).toBe('local');
      expect(resolveMenuIntent({ isCatalog: false, initialIntent: null, saved: 'delivery' })).toBe('delivery');
    });

    it('la intención explícita (?intent= o location.state) manda sobre la guardada', () => {
      expect(resolveMenuIntent({ isCatalog: false, initialIntent: 'local', saved: 'delivery' })).toBe('local');
      expect(resolveMenuIntent({ isCatalog: false, initialIntent: 'delivery', saved: 'local' })).toBe('delivery');
    });

    it('el catálogo siempre es delivery: no tiene modos', () => {
      expect(resolveMenuIntent({ isCatalog: true, initialIntent: 'local', saved: 'local' })).toBe('delivery');
    });

    it('un valor guardado inválido se ignora (no rompe el menú)', () => {
      expect(resolveMenuIntent({ isCatalog: false, initialIntent: null, saved: 'para-llevar' })).toBe('delivery');
      expect(readSavedMenuIntent(carrito.id)).toBe(null);
    });

    it('saveMenuIntent guarda por negocio y readSavedMenuIntent lo lee', () => {
      expect(saveMenuIntent(carrito.id, 'local')).toBe(true);
      expect(readSavedMenuIntent(carrito.id)).toBe('local');
      expect(saveMenuIntent(carrito.id, 'delivery')).toBe(true);
      expect(readSavedMenuIntent(carrito.id)).toBe('delivery');
      expect(saveMenuIntent(carrito.id, 'invalido')).toBe(false);
      expect(readSavedMenuIntent(carrito.id)).toBe('delivery');
    });
  });

  describe('fetchStoreCategories', () => {
    it('ordena los productos por sort_order (PostgREST no ordena los anidados)', async () => {
      sb.get.mockResolvedValueOnce([
        { id: 'c1', name: 'TOSTADAS', sort_order: 1, store_products: [
          { id: 'p2', name: 'Segunda', sort_order: 2 },
          { id: 'p1', name: 'Primera', sort_order: 1 },
        ] },
      ]);
      const data = await fetchStoreCategories(carrito.id);
      expect(data[0].store_products.map((p) => p.id)).toEqual(['p1', 'p2']);
      expect(sb.get).toHaveBeenCalledTimes(1);
      expect(sb.get.mock.calls[0][0]).toBe('store_categories');
    });

    it('si la consulta con image_url falla, reintenta sin ella (fallback)', async () => {
      sb.get.mockRejectedValueOnce(new Error('sin permiso'));
      sb.get.mockResolvedValueOnce([{ id: 'c1', name: 'TOSTADAS', sort_order: 1, store_products: [] }]);
      const data = await fetchStoreCategories(carrito.id);
      expect(data).toHaveLength(1);
      expect(sb.get).toHaveBeenCalledTimes(2);
      // El fallback quita el image_url de la CATEGORÍA (sort_order,
      // image_url); el de los productos sigue (es otra columna).
      expect(sb.get.mock.calls[0][1]).toContain('sort_order,image_url');
      expect(sb.get.mock.calls[1][1]).not.toContain('sort_order,image_url');
    });

    it('si todo falla devuelve [] (nunca lanza: el menú no se rompe)', async () => {
      sb.get.mockRejectedValue(new Error('red caída'));
      await expect(fetchStoreCategories(carrito.id)).resolves.toEqual([]);
      await expect(fetchStoreCategories(null)).resolves.toEqual([]);
    });
  });

  describe('MenuLoadingScreen: una sola pantalla de carga', () => {
    it('con negocio muestra su tema (degradado Atardecer), su logo y su nombre', () => {
      const html = renderToStaticMarkup(<MenuLoadingScreen business={carrito} storeLabel="menú" dark={false} />);
      expect(html).toContain('Cargando menú…');
      expect(html).toContain('Carrito La Paz');
      // Degradado del tema Atardecer (#F97316 → #DB2777 → #7C3AED).
      expect(html).toContain('#F97316');
      expect(html).toContain('#DB2777');
      expect(html).toContain('#7C3AED');
      // Logo en círculo blanco con cover (el caso KAVA). El HTML
      // renderizado serializa los estilos sin espacios ni comillas.
      // Zoom 1.12 de la #306: el emblema llega al borde del círculo.
      expect(html).toContain('background:#FFFFFF');
      expect(html).toContain('object-fit:cover');
      expect(html).toContain('scale(1.12)');
    });

    it('sin negocio todavía es la MISMA pantalla en neutro (sin segundo esqueleto distinto)', () => {
      const html = renderToStaticMarkup(<MenuLoadingScreen business={null} storeLabel="menú" dark={false} />);
      expect(html).toContain('Cargando menú…');
      expect(html).toContain('menuSkeletonPulse');
      // No hay nombre ni logo: huecos neutros en la misma pantalla.
      expect(html).not.toContain('Carrito La Paz');
      expect(html).not.toContain('skeleton-shimmer');
    });

    it('la pantalla no tiene el esqueleto viejo con brillo (SkeletonMenu eliminado)', () => {
      const src = read('../views/MenuView.jsx');
      expect(src).not.toContain('SkeletonMenu');
      expect(src).not.toContain('skeleton-shimmer');
    });
  });

  describe('MenuView: negocio + categorías en una sola carga', () => {
    it('pide las categorías en paralelo al negocio y las pasa a BusinessStore', () => {
      const src = read('../views/MenuView.jsx');
      expect(src).toContain("queryKey: ['store-categories', biz?.id]");
      expect(src).toContain('fetchStoreCategories(biz.id)');
      expect(src).toContain('initialCategories={categoriesData || []}');
    });

    it('mientras negocio o categorías cargan muestra UNA sola MenuLoadingScreen', () => {
      const src = read('../views/MenuView.jsx');
      expect(src).toContain('if (loading || (biz && categoriesLoading))');
      expect(src).toContain('<MenuLoadingScreen business={biz || null} storeLabel="menú" dark={dark} />');
      // Sin menú (no elite) no se piden categorías: va directo al landing.
      expect(src).toContain('enabled: !!biz?.id && isElite');
    });
  });

  describe('BusinessStore: el menú se muestra sin modal que lo tape', () => {
    it('sin elección guardada: menú visible en delivery, píldora con delivery activo, sin modal', () => {
      const html = renderStore();
      expect(html).not.toContain('¿Cómo nos visitas hoy?');
      expect(html).toContain('Tostada Adobada');
      expect(html).toContain('$70');
      // Píldora de modo visible, con delivery activo.
      expect(html).toContain('aria-label="Modo del menú"');
      expect(html).toContain('En el local');
      expect(html).toContain('Para llevar / Domicilio');
      const pressedAt = html.indexOf('aria-pressed="true"');
      expect(pressedAt).toBeGreaterThan(-1);
      expect(pressedAt).toBeGreaterThan(html.indexOf('En el local'));
      expect(pressedAt).toBeLessThan(html.indexOf('Para llevar / Domicilio'));
      // Modo delivery: el producto tiene + para pedir y la promo se agrega.
      expect(html).toContain(PLUS_SVG);
      expect(html).toContain('Agregar promoción');
      expect(html).not.toContain('¡Qué bueno tenerte aquí!');
    });

    it('con «local» guardado: saludo de local, sin botones + y la promo solo se ve', () => {
      saveMenuIntent(carrito.id, 'local');
      const html = renderStore();
      expect(html).not.toContain('¿Cómo nos visitas hoy?');
      expect(html).toContain('Tostada Adobada');
      // Píldora de modo visible, con «En el local» activo.
      const pressedAt = html.indexOf('aria-pressed="true"');
      expect(pressedAt).toBeGreaterThan(-1);
      expect(pressedAt).toBeLessThan(html.indexOf('En el local'));
      // Modo local: sin + ni carrito, saludo de bienvenida, promo solo se ve.
      expect(html).toContain('¡Qué bueno tenerte aquí!');
      expect(html).not.toContain(PLUS_SVG);
      expect(html).toContain('Ver promoción');
      expect(html).not.toContain('Agregar promoción');
    });

    it('la intención explícita (?intent=local) manda sobre lo guardado', () => {
      saveMenuIntent(carrito.id, 'delivery');
      const html = renderStore({ initialIntent: 'local' });
      expect(html).toContain('¡Qué bueno tenerte aquí!');
      expect(html).not.toContain(PLUS_SVG);
    });

    it('con initialCategories NO vuelve a pedir las categorías (carga única)', () => {
      renderStore();
      expect(sb.get).not.toHaveBeenCalled();
      const store = read('../components/store/BusinessStore.jsx');
      expect(store).toContain('initialCategories = null');
      expect(store).toContain('const categories = initialCategories ?? fetchedCategories;');
      expect(store).not.toContain('menuIntent === null');
    });

    it('la fuente ya no tiene el modal bloqueante ni la puerta de intención', () => {
      const store = read('../components/store/BusinessStore.jsx');
      expect(store).not.toContain('¿Cómo nos visitas hoy?');
      expect(store).not.toContain('menuIntent === null');
      expect(store).toContain('handleIntentChange');
      expect(store).toContain('aria-label="Modo del menú"');
    });
  });
});
