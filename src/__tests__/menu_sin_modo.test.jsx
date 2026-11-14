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
import { saveMenuIntent } from '../lib/menuIntent.js';

// Menú sin botones de modo (nov 2026, pedido de Jonathan con captura
// del menú de Carrito La Paz): las píldoras «En el local» / «Para
// llevar / Domicilio» ya no se muestran en el menú público. El menú
// queda en su modo por defecto (delivery) y sigue respetando la
// elección del modal de la ficha («¿Cómo nos visitas hoy?»), guardada
// por negocio en localStorage o como ?intent=.

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

describe('menú sin botones de modo', () => {
  beforeEach(() => {
    saved.clear();
    vi.stubGlobal('localStorage', localStorageStub);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('el menú no muestra el grupo de modo ni los botones «En el local» / «Para llevar / Domicilio»', () => {
    const html = renderStore();
    expect(html).toContain('Tostada Adobada');
    expect(html).not.toContain('aria-label="Modo del menú"');
    expect(html).not.toContain('En el local');
    expect(html).not.toContain('Para llevar / Domicilio');
    expect(html).not.toContain('🍽️');
    expect(html).not.toContain('🛍️');
  });

  it('sin elección guardada el menú carga en delivery: con + para pedir y la promo se agrega', () => {
    const html = renderStore();
    expect(html).toContain('Tostada Adobada');
    expect(html).toContain('$70');
    expect(html).toContain(PLUS_SVG);
    expect(html).toContain('Agregar promoción');
    expect(html).not.toContain('¡Qué bueno tenerte aquí!');
  });

  it('con «local» guardado (elección del modal de la ficha) el menú respeta el modo local', () => {
    saveMenuIntent(carrito.id, 'local');
    const html = renderStore();
    expect(html).toContain('Tostada Adobada');
    expect(html).toContain('¡Qué bueno tenerte aquí!');
    expect(html).not.toContain(PLUS_SVG);
    expect(html).toContain('Ver promoción');
    expect(html).not.toContain('Agregar promoción');
    // Y tampoco hay botones de modo en modo local.
    expect(html).not.toContain('aria-label="Modo del menú"');
    expect(html).not.toContain('En el local');
  });

  it('la intención explícita (?intent=local) sigue mandando sobre lo guardado', () => {
    saveMenuIntent(carrito.id, 'delivery');
    const html = renderStore({ initialIntent: 'local' });
    expect(html).toContain('¡Qué bueno tenerte aquí!');
    expect(html).not.toContain(PLUS_SVG);
  });

  it('la fuente no tiene la píldora ni handleIntentChange; el modo se sigue resolviendo', () => {
    const store = read('../components/store/BusinessStore.jsx');
    expect(store).not.toContain('aria-label="Modo del menú"');
    expect(store).not.toContain('handleIntentChange');
    expect(store).not.toContain('saveMenuIntent');
    expect(store).not.toContain('En el local');
    expect(store).not.toContain('Para llevar / Domicilio');
    // El modo se sigue resolviendo (ficha ?intent= o guardado, o delivery).
    expect(store).toContain('resolveMenuIntent');
    expect(store).toContain('readSavedMenuIntent');
    // Y el modo sigue decidiendo + / carrito / promos.
    expect(store).toContain("menuIntent !== 'local'");
    expect(store).toContain('intent={menuIntent}');
  });

  it('el buscador, las categorías y el carrito siguen intactos', () => {
    const html = renderStore();
    expect(html).toContain('Buscar en el menú');
    expect(html).toContain('TOSTADAS');
    expect(html).toContain('Tostada Adobada');
  });
});
