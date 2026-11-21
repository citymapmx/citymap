import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync } from 'node:fs';
import sitemap from '../../api/sitemap.xml.js';
import robots from '../../api/robots.txt.js';
import middleware from '../../middleware.js';
import og from '../../api/og.js';
import { citySlugFromPath, crossDomainCityUrl } from '../lib/seoRoutes.js';
import { parseSegments } from '../lib/domain.js';

const cities = [
  { id: 'mx-city', slug: 'tepic', name: 'Tepic', country_code: 'mx', bg_image: 'https://images.test/tepic.webp' },
  { id: 'us-city', slug: 'san-diego', country_code: 'us' },
];
const records = {
  cities,
  businesses: [{ id: 'biz', slug: 'tepic-cafe', city_slug: 'tepic', category: 'restaurantes', name: 'Café & pan', description: 'Comida local', photos: JSON.stringify([{ url: 'https://images.test/food.webp?a=1&b=2' }]), logo_url: 'https://images.test/logo.png', updated_at: '2026-10-01T12:00:00Z' }, { id: 'us-biz', slug: 'san-diego-place', city_slug: 'san-diego', photos: [] }],
  events: [{ id: 'event', slug: 'festival', city_slug: 'tepic,san-diego', title: 'Festival de Tepic', img_url: 'https://images.test/event.webp' }],
  experiences: [{ id: 'article', slug: 'laguna', city_slug: 'tepic', title: 'Guía de la laguna', gallery: JSON.stringify(['https://images.test/laguna.webp']) }],
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
    const response = await middleware(request('/sitemap.xml?page=1', host));
    expect(response.status).toBe(200);
    const xml = await response.text();
    const origin = `https://${host}`;
    expect(xml).toContain(`<loc>${origin}/</loc>`);
    // El evento multi-ciudad (tepic,san-diego) pertenece a los dos dominios.
    expect(xml).toContain('<image:title>Festival de Tepic</image:title>');
    expect(xml).not.toContain('/experiencias/');
    expect(xml).not.toContain('/c/');
    expect(xml).not.toContain('/tepic,san-diego/');
    if (host.includes('world')) {
      expect(xml).toContain(`${origin}/us/san-diego/place`);
      expect(xml).toContain(`${origin}/eventos/san-diego`);
      expect(xml).not.toContain(`${origin}/mx/tepic/cafe`);
      expect(xml).not.toContain('/mx/tepic/');
      expect(xml).not.toContain('/eventos/tepic');
      expect(xml).not.toContain(`${origin}/revista/tepic/laguna`);
      expect(xml).not.toContain('<image:title>Guía de la laguna</image:title>');
      expect(xml).not.toContain('<image:loc>https://images.test/tepic.webp</image:loc>');
      expect(xml).not.toContain('<image:title>Café &amp; pan</image:title>');
      expect(xml).not.toContain(`${origin}/tours`);
      expect(xml).not.toContain(`${origin}/negocios`);
      expect(xml).not.toContain('https://citymap.mx/');
    } else {
      expect(xml).not.toContain('/san-diego/');
      expect(xml).toContain('https://images.test/food.webp?a=1&amp;b=2');
      expect(xml).toContain('<image:loc>https://images.test/laguna.webp</image:loc>');
      expect(xml).toContain('<image:title>Café &amp; pan</image:title>');
      expect(xml).toContain('<image:title>Guía de la laguna</image:title>');
      expect(xml).toContain('<image:loc>https://images.test/tepic.webp</image:loc><image:title>Tepic</image:title>');
      expect(xml).toContain(`${origin}/revista/tepic/laguna`);
      expect(xml).toContain(`${origin}/eventos/tepic`);
      expect(xml).toContain(`${origin}/tours`);
      expect(xml).toContain(`${origin}/negocios`);
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
    const response = await sitemap(request('/sitemap.xml?page=1'));
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
    // Con la paginación (1000 URLs/página) el negocio 1001 cae en la
    // página 2: la 1 se llena con las estáticas, ciudades y los
    // primeros ~990 negocios.
    const response = await sitemap(request('/sitemap.xml?page=2'));
    expect(await response.text()).toContain('https://citymap.mx/tepic/last');
    expect(fetch.mock.calls.some(([url]) => String(url).includes('offset=1000'))).toBe(true);
  });
});

describe('domain and category redirects', () => {
  it.each([
    ['www.citymap.mx', '/tepic?q=pizza', 'https://citymap.mx/tepic?q=pizza'],
    ['citymap.world', '/mx/tepic', 'https://www.citymap.world/mx/tepic'],
    ['citymap.mx', '/tepic/c/restaurantes?q=local', 'https://citymap.mx/tepic/restaurantes?q=local'],
    // Una ciudad mexicana en .world sale de .world (la normalización /c/
    // la hace después el middleware de .mx, en un segundo 308).
    ['www.citymap.world', '/mx/tepic/c/restaurantes', 'https://citymap.mx/tepic/c/restaurantes'],
  ])('redirects %s%s without losing the path or search', async (host, path, expected) => {
    const response = await middleware(request(path, host, 'Mozilla/5.0'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(expected);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('international crawler routes', () => {
  it.each([
    // En .world las ciudades mexicanas ya no se sirven: redirigen a .mx.
    ['/us/san-diego', { city: 'san-diego' }],
    ['/us/san-diego/place', { city: 'san-diego', b: 'place' }],
    ['/us/san-diego/place/menu', { city: 'san-diego', b: 'place', menu: 'true' }],
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

describe('citySlugFromPath', () => {
  it('saca la ciudad de la URL sin depender de la tienda de datos', () => {
    expect(citySlugFromPath('/tepic')).toBe('tepic');
    expect(citySlugFromPath('/tepic/restaurantes')).toBe('tepic');
    expect(citySlugFromPath('/guadalajara/dalila-casa-repostera')).toBe('guadalajara');
  });

  it('devuelve vacío en la raíz y en rutas del sistema', () => {
    expect(citySlugFromPath('/')).toBe('');
    expect(citySlugFromPath('/tours')).toBe('');
    expect(citySlugFromPath('/negocios')).toBe('');
    expect(citySlugFromPath('/evento/guadalajara/zz-top')).toBe('');
    expect(citySlugFromPath('/revista/tepic')).toBe('');
    expect(citySlugFromPath('/eventos/tepic')).toBe('');
    expect(citySlugFromPath('/mapa')).toBe('');
  });

  it('en citymap.world quita el prefijo de país', () => {
    expect(citySlugFromPath('/mx/tepic', true)).toBe('tepic');
    expect(citySlugFromPath('/mx/tours', true)).toBe('');
  });

  it('en .mx también quita el prefijo de país: nunca sale una ciudad fantasma', () => {
    // 20 nov 2026: /us/los-angeles en .mx resolvía la ciudad «us».
    expect(citySlugFromPath('/us/los-angeles')).toBe('los-angeles');
    expect(citySlugFromPath('/es/barcelona')).toBe('barcelona');
    expect(citySlugFromPath('/mx/guadalajara')).toBe('guadalajara');
    expect(citySlugFromPath('/us')).toBe('');
    expect(citySlugFromPath('/es')).toBe('');
  });
});

describe('parseSegments', () => {
  it('quita el prefijo de país en los dos dominios', () => {
    expect(parseSegments(['us', 'los-angeles']).segments).toEqual(['los-angeles']);
    expect(parseSegments(['es', 'barcelona']).segments).toEqual(['barcelona']);
    expect(parseSegments(['mx', 'guadalajara']).segments).toEqual(['guadalajara']);
    expect(parseSegments(['us']).segments).toEqual([]);
    expect(parseSegments(['tepic']).segments).toEqual(['tepic']);
    expect(parseSegments([]).segments).toEqual([]);
  });
});

describe('crossDomainCityUrl', () => {
  // 21 nov 2026 (PR #418): el Service Worker sirve las navegaciones desde
  // caché y el 308 del middleware no dispara; la app misma debe saltar a la
  // canónica. Espejo en el cliente de la redirección del middleware.
  it('en .mx salta a .world con la ciudad internacional', () => {
    expect(crossDomainCityUrl('/us/los-angeles', false)).toBe('https://www.citymap.world/us/los-angeles');
    expect(crossDomainCityUrl('/es/barcelona', false)).toBe('https://www.citymap.world/es/barcelona');
    expect(crossDomainCityUrl('/los-angeles', false)).toBe('https://www.citymap.world/us/los-angeles');
    expect(crossDomainCityUrl('/fr/paris/restaurantes', false)).toBe('https://www.citymap.world/fr/paris/restaurantes');
  });

  it('en .world salta a .mx con la ciudad mexicana', () => {
    expect(crossDomainCityUrl('/guadalajara', true)).toBe('https://citymap.mx/guadalajara');
    expect(crossDomainCityUrl('/mx/guadalajara', true)).toBe('https://citymap.mx/guadalajara');
  });

  it('no salta cuando la ciudad ya está en su dominio ni en rutas del sistema', () => {
    expect(crossDomainCityUrl('/guadalajara', false)).toBeNull();
    expect(crossDomainCityUrl('/us/los-angeles', true)).toBeNull();
    expect(crossDomainCityUrl('/es/barcelona', true)).toBeNull();
    expect(crossDomainCityUrl('/', false)).toBeNull();
    expect(crossDomainCityUrl('/us', false)).toBeNull();
    expect(crossDomainCityUrl('/tours', false)).toBeNull();
    expect(crossDomainCityUrl('/evento/guadalajara/zz-top', false)).toBeNull();
    expect(crossDomainCityUrl('/mapa/los-angeles', false)).toBeNull();
    expect(crossDomainCityUrl('/revista/tepic', false)).toBeNull();
  });

  it('conserva el query string', () => {
    expect(crossDomainCityUrl('/us/los-angeles', false, '?categoria=restaurantes')).toBe('https://www.citymap.world/us/los-angeles?categoria=restaurantes');
  });
});
