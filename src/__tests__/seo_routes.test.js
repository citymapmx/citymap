import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import sitemap from '../../api/sitemap.xml.js';
import robots from '../../api/robots.txt.js';
import middleware from '../../middleware.js';
import og from '../../api/og.js';

const cities = [
  { id: 'mx-city', slug: 'tepic', country_code: 'mx' },
  { id: 'us-city', slug: 'san-diego', country_code: 'us' },
];
const records = {
  cities,
  businesses: [{ id: 'biz', slug: 'tepic-cafe', city_slug: 'tepic', category: 'restaurantes', name: 'Café & pan', description: 'Comida local', photos: JSON.stringify([{ url: 'https://images.test/food.webp?a=1&b=2' }]), logo_url: 'https://images.test/logo.png', updated_at: '2026-10-01T12:00:00Z' }, { id: 'us-biz', slug: 'san-diego-place', city_slug: 'san-diego', photos: [] }],
  events: [{ id: 'event', slug: 'festival', city_slug: 'tepic,san-diego', img_url: 'https://images.test/event.webp' }],
  experiences: [{ id: 'article', slug: 'laguna', city_slug: 'tepic', gallery: JSON.stringify(['https://images.test/laguna.webp']) }],
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

describe('public dynamic SEO endpoints', () => {
  it.each(['citymap.mx', 'www.citymap.world'])('serves the correct sitemap host and image entries for %s', async host => {
    const response = await middleware(request('/sitemap.xml', host));
    expect(response.status).toBe(200);
    const xml = await response.text();
    const origin = `https://${host}`;
    expect(xml).toContain(`<loc>${origin}/</loc>`);
    expect(xml).toContain('https://images.test/food.webp?a=1&amp;b=2');
    expect(xml).toContain('<image:loc>https://images.test/laguna.webp</image:loc>');
    expect(xml).toContain(`${origin}/revista/tepic/laguna`);
    expect(xml).not.toContain('/experiencias/');
    expect(xml).not.toContain('/c/');
    expect(xml).not.toContain('/tepic,san-diego/');
    if (host.includes('world')) {
      expect(xml).toContain(`${origin}/us/san-diego/place`);
      expect(xml).toContain(`${origin}/mx/tepic/cafe`);
      expect(xml).not.toContain('https://citymap.mx/');
    } else {
      expect(xml).not.toContain('/san-diego/');
    }
    expect(fetch.mock.calls.filter(([url]) => String(url).includes('/experiences?'))[0][0]).toContain('status=eq.approved');
  });
  it('serves robots with only its own sitemap and protects private routes', async () => {
    const response = await middleware(request('/robots.txt', 'www.citymap.world'));
    const body = await response.text();
    expect(body).toContain('Sitemap: https://www.citymap.world/sitemap.xml');
    expect(body).not.toContain('citymap.mx');
    expect(body).toContain('Disallow: /admin');
    expect(body).toContain('Disallow: /api/');
    expect(fetch).not.toHaveBeenCalled();
  });
  it('does not leave static files that can override dynamic endpoints', () => {
    expect(existsSync(new URL('../../public/sitemap.xml', import.meta.url))).toBe(false);
    expect(existsSync(new URL('../../public/robots.txt', import.meta.url))).toBe(false);
  });
  it('reports an upstream failure instead of publishing an incomplete sitemap', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    fetch.mockResolvedValue(new Response('Unavailable', { status: 503 }));
    const response = await sitemap(request('/sitemap.xml'));
    expect(response.status).toBe(503);
    expect(response.headers.get('retry-after')).toBe('300');
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('paginates beyond the first 1000 businesses', async () => {
    const first = Array.from({ length: 1000 }, (_, i) => ({ id: `b${i}`, slug: `shop-${i}`, city_slug: 'tepic' }));
    fetch.mockImplementation(async url => {
      const parsed = new URL(url);
      if (parsed.pathname.endsWith('/businesses')) return json(parsed.searchParams.get('offset') === '0' ? first : [{ id: 'last', city_slug: 'tepic' }]);
      return json(records[parsed.pathname.split('/').pop()] || []);
    });
    const response = await sitemap(request('/sitemap.xml'));
    expect(await response.text()).toContain('https://citymap.mx/tepic/last');
    expect(fetch.mock.calls.some(([url]) => String(url).includes('offset=1000'))).toBe(true);
  });
});

describe('domain and category redirects', () => {
  it.each([
    ['www.citymap.mx', '/tepic?q=pizza', 'https://citymap.mx/tepic?q=pizza'],
    ['citymap.world', '/mx/tepic', 'https://www.citymap.world/mx/tepic'],
    ['citymap.mx', '/tepic/c/restaurantes?q=local', 'https://citymap.mx/tepic/restaurantes?q=local'],
    ['www.citymap.world', '/mx/tepic/c/restaurantes', 'https://www.citymap.world/mx/tepic/restaurantes'],
  ])('redirects %s%s without losing the path or search', async (host, path, expected) => {
    const response = await middleware(request(path, host, 'Mozilla/5.0'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(expected);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('international crawler routes', () => {
  it.each([
    ['/mx/tepic', { city: 'tepic' }],
    ['/mx/tepic/jaguares', { city: 'tepic', b: 'jaguares' }],
    ['/mx/tepic/jaguares/menu', { city: 'tepic', b: 'jaguares', menu: 'true' }],
    ['/us/san-diego', { city: 'san-diego' }],
  ])('recognizes %s', async (path, params) => {
    fetch.mockResolvedValue(new Response('<h1>Contenido específico</h1>'));
    const response = await middleware(request(path, 'www.citymap.world'));
    expect(response.status).toBe(200);
    const target = new URL(fetch.mock.calls[0][0]);
    for (const [key, value] of Object.entries(params)) expect(target.searchParams.get(key)).toBe(value);
    expect(response.headers.get('x-robots-tag')).toContain('max-image-preview:large');
    expect(await response.text()).toContain('Contenido específico');
  });
  it('preserves a real 404 from the rendered page', async () => {
    fetch.mockResolvedValue(new Response('Not found', { status: 404 }));
    const response = await middleware(request('/unknown-city'));
    expect(response.status).toBe(404);
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
  });
});

describe('crawler page content', () => {
  it.each(['/api/og?city=tepic&_bot=1', '/api/og?city=tepic&b=restaurantes&_bot=1'])('includes real business links and photos in %s', async path => {
    const response = await og(request(path));
    const html = await response.text();
    expect(html).toContain('href="https://citymap.mx/tepic/cafe"');
    expect(html).toContain('Café &amp; pan');
    expect(html).toContain('src="https://images.test/food.webp?a=1&amp;b=2"');
  });
  it('uses the www.world canonical and international links', async () => {
    const html = await (await og(request('/api/og?city=tepic&_bot=1', 'www.citymap.world'))).text();
    expect(html).toContain('href="https://www.citymap.world/mx/tepic"');
    expect(html).toContain('href="https://www.citymap.world/mx/tepic/cafe"');
  });
  it('returns 404 for a missing city', async () => {
    fetch.mockResolvedValue(json([]));
    const response = await og(request('/api/og?city=missing&_bot=1'));
    expect(response.status).toBe(404);
  });
});
