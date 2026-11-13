import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import middleware from '../../middleware.js';
import og from '../../api/og.js';

// Punto 1 del plan SEO (12 nov 2026): /tours y /negocios devolvían 404 a
// Googlebot porque RESERVED_FIRST_SEGS no los incluía y el middleware los
// trataba como ciudades. /login es página de acceso: 200 con noindex.
const cities = [
  { slug: 'tepic', country_code: 'mx', bg_image: null },
  { slug: 'guadalajara', country_code: 'mx', bg_image: null },
];
const records = {
  cities,
  businesses: [
    { id: 'biz-1', slug: 'tepic-cafe-bros', city_slug: 'tepic', name: 'Café Bros Company' },
    { id: 'biz-2', slug: 'tepic-formentera', city_slug: 'tepic', name: 'Formentera' },
  ],
  events: [],
  experiences: [
    { id: 'tour-1', slug: 'tour-laguna', city_slug: 'tepic', title: 'Tour a la Laguna de Santa María del Oro', price: 1500, duration: '6 horas', gallery: JSON.stringify(['https://images.test/tour.webp']) },
    { id: 'tour-2', slug: 'tour-cerro', city_slug: 'tepic', title: 'Sendero gratis al cerro', price: 0, duration: '', gallery: [] },
  ],
};
const request = (path, host = 'citymap.mx', agent = 'Googlebot') => new Request(`https://${host}${path}`, { headers: { 'user-agent': agent } });
const json = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async url => {
    const parsed = new URL(url);
    const table = parsed.pathname.split('/').pop();
    return json(records[table] || []);
  }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('middleware: /tours, /negocios y /login ya no son ciudades', () => {
  it('RESERVED_FIRST_SEGS incluye tours, negocios y login', () => {
    const src = readFileSync(new URL('../../middleware.js', import.meta.url), 'utf8');
    const m = src.match(/const RESERVED_FIRST_SEGS = new Set\(\[([\s\S]*?)\]\);/);
    expect(m).not.toBeNull();
    expect(m[1]).toContain("'tours'");
    expect(m[1]).toContain("'negocios'");
    expect(m[1]).toContain("'login'");
  });

  it.each(['/tours', '/negocios'])('%s pide og?vista y responde 200 indexable al bot', async path => {
    fetch.mockResolvedValue(new Response('<h1>Contenido específico</h1>'));
    const response = await middleware(request(path));
    expect(response.status).toBe(200);
    const target = new URL(fetch.mock.calls[0][0]);
    expect(target.searchParams.get('vista')).toBe(path.slice(1));
    expect(response.headers.get('x-robots-tag')).toContain('index, follow');
    expect(await response.text()).toContain('Contenido específico');
  });

  it('/login responde 200 con noindex al bot', async () => {
    fetch.mockResolvedValue(new Response('<h1>Login</h1>'));
    const response = await middleware(request('/login'));
    expect(response.status).toBe(200);
    const target = new URL(fetch.mock.calls[0][0]);
    expect(target.searchParams.get('vista')).toBe('login');
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
  });

  it('un usuario real en /tours pasa de largo a la SPA', async () => {
    const response = await middleware(request('/tours', 'citymap.mx', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'));
    expect(response).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('og vista=tours: contenido real de tours', () => {
  it('devuelve 200 con canonical propio y la lista de tours con enlaces', async () => {
    const response = await og(request('/api/og?vista=tours&_bot=1'));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<link rel="canonical" href="https://citymap.mx/tours"/>');
    expect(html).toContain('<title>Tours en Guadalajara, Tepic, Puerto Vallarta y más | CityMap México</title>');
    expect(html).toContain('Tour a la Laguna de Santa María del Oro');
    expect(html).toContain('href="https://citymap.mx/revista/tepic/tour-a-la-laguna-de-santa-maria-del-oro"');
    expect(html).toContain('desde $1,500 MXN');
    expect(html).toContain('6 horas');
    expect(html).toContain('src="https://images.test/tour.webp"');
    expect(html).toContain('Sendero gratis al cerro');
    expect(html).toContain('Gratis');
  });
});

describe('og vista=negocios: contenido real de la landing', () => {
  it('devuelve 200 con canonical propio, beneficios, planes y ejemplos', async () => {
    const response = await og(request('/api/og?vista=negocios&_bot=1'));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<link rel="canonical" href="https://citymap.mx/negocios"/>');
    expect(html).toContain('Haz que más personas encuentren tu negocio.');
    expect(html).toContain('Por qué CityMap');
    expect(html).toContain('Te encuentran en Google');
    expect(html).toContain('Pedidos por WhatsApp, sin comisiones');
    expect(html).toContain('Cómo funciona');
    expect(html).toContain('Gratuito');
    expect(html).toContain('Destacado');
    expect(html).toContain('$99 MXN / mes');
    expect(html).toContain('$990 MXN / año');
    expect(html).toContain('Premium');
    expect(html).toContain('$199 MXN / mes');
    expect(html).toContain('$1,990 MXN / año');
    expect(html).toContain('Pruébalo 7 días gratis');
    expect(html).toContain('¿Cuánto cuesta empezar?');
    expect(html).toContain('¿En qué ciudades está CityMap?');
    expect(html).toContain('En 2 ciudades');
    expect(html).toContain('Tu negocio ya lo buscan. Que lo encuentren.');
    expect(html).toContain('Ya están en CityMap');
    expect(html).toContain('href="https://citymap.mx/tepic/cafe-bros"');
    expect(html).toContain('Café Bros Company');
  });
});

describe('og vista=login: 200 con noindex', () => {
  it('devuelve 200 con canonical propio, meta noindex y cabecera noindex', async () => {
    const response = await og(request('/api/og?vista=login&_bot=1'));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
    const html = await response.text();
    expect(html).toContain('<link rel="canonical" href="https://citymap.mx/login"/>');
    expect(html).toContain('<meta name="robots" content="noindex"/>');
    expect(html).toContain('Iniciar sesión');
  });
});
