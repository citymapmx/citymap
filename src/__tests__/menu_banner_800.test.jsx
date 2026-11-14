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
import { getThumbUrl } from '../lib/utils.js';

// Hallazgo #3 del análisis de fluidez (nov 2026): el banner del menú
// se pedía a 1600×1200 y pesaba 142,4 KB para mostrarse a 390×220.
// Ahora se pide a 800×600 (mismo recorte 4:3, la mitad de peso:
// 68,8 KB medidos con la foto real de Carrito La Paz) con prioridad
// alta, porque es el LCP de la página.
const FOTO_REAL = 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1789204723263_dj5qsr.jpeg';

const carrito = {
  id: '82c9af20-ef42-4a43-87c4-1831a020aace',
  name: 'Carrito La Paz',
  slug: 'tepic-carrito-la-paz-tostadas-de-atun',
  city_slug: 'tepic',
  type: 'Restaurantes',
  plan: 'premium',
  menu_style: 'atardecer',
  logo_url: 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1785484765900_o8zt3.webp',
  banner_url: FOTO_REAL,
  photos: [{ url: FOTO_REAL, label: 'Foto' }],
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
        promotion: null,
      },
    ],
  },
];
const T = {
  bg: '#FFFFFF', border: '#E4E4E7', text: '#18181B', sub: '#71717A',
  surface: '#F4F4F5', white: '#FFFFFF', green: '#16A34A', dark: false,
};

const renderStore = (props = {}) => renderToStaticMarkup(
  <MemoryRouter>
    <BusinessStore business={carrito} T={T} isElite inline initialCategories={categories} {...props} />
  </MemoryRouter>,
);

// La etiqueta <img> del banner: la que apunta a la foto real.
const bannerImgTag = (html) => {
  const tags = html.match(/<img[^>]*>/g) || [];
  return tags.find((t) => t.includes('1789204723263_dj5qsr')) || '';
};

// localStorage en memoria (vitest corre en node, sin localStorage).
const saved = new Map();
const localStorageStub = {
  getItem: (k) => (saved.has(k) ? saved.get(k) : null),
  setItem: (k, v) => saved.set(k, String(v)),
  removeItem: (k) => saved.delete(k),
  clear: () => saved.clear(),
};

describe('banner del menú a 800×600 con prioridad (hallazgo #3)', () => {
  beforeEach(() => {
    saved.clear();
    vi.stubGlobal('localStorage', localStorageStub);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('el banner se pide a 800×600, no a 1600×1200', () => {
    const html = renderStore();
    const tag = bannerImgTag(html);
    expect(tag).not.toBe('');
    expect(tag).toContain('width=800');
    expect(tag).toContain('height=600');
    expect(tag).not.toContain('width=1600');
    expect(tag).not.toContain('height=1200');
  });

  it('el banner lleva prioridad alta: eager + fetchpriority high (es el LCP)', () => {
    const html = renderStore();
    const tag = bannerImgTag(html);
    expect(tag).not.toBe('');
    expect(tag).toContain('loading="eager"');
    // React 19 lo serializa en camelCase; en el navegador el
    // atributo es insensible a mayúsculas y vale igual.
    expect(tag).toContain('fetchPriority="high"');
  });

  it('el banner reserva su espacio con aspect-ratio 4:3 (sin salto de layout)', () => {
    const html = renderStore();
    const tag = bannerImgTag(html);
    expect(tag).not.toBe('');
    expect(tag).toContain('aspect-ratio');
  });

  it('getThumbUrl: 800×600 cae en el bucket de 800 y 1200×900 subía a 1600', () => {
    expect(getThumbUrl(FOTO_REAL, 800, 600)).toContain('width=800');
    expect(getThumbUrl(FOTO_REAL, 800, 600)).toContain('height=600');
    expect(getThumbUrl(FOTO_REAL, 1200, 900)).toContain('width=1600');
  });

  it('en el código, el banner del menú usa OptimizedImage con prioridad a 800×600', () => {
    const src = read('../components/store/BusinessStore.jsx');
    const bannerAt = src.indexOf('Banner Area');
    expect(bannerAt).toBeGreaterThan(-1);
    const bannerBlock = src.slice(bannerAt, src.indexOf('Gradient Overlay', bannerAt));
    expect(bannerBlock).toContain('<OptimizedImage');
    expect(bannerBlock).toContain('widthRequest={800}');
    expect(bannerBlock).toContain('heightRequest={600}');
    expect(bannerBlock).toContain('priority');
    // El <img> plano a 1200×900 ya no está en el banner del menú.
    expect(bannerBlock).not.toContain('1200, 900');
    expect(bannerBlock).not.toContain('1200,900');
  });
});
