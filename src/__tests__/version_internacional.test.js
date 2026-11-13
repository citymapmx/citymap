import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import middleware from '../../middleware.js';
import sitemap from '../../api/sitemap.xml.js';
import og from '../../api/og.js';
import { isWorldCitySlug, worldCityCountry, WORLD_CITIES } from '../lib/seoRoutes.js';
import { hostIncludesCity, hostIncludesCityList } from '../lib/domain.js';

const request = (path, host = 'citymap.mx', agent = 'Mozilla/5.0') => new Request(`https://${host}${path}`, { headers: { 'user-agent': agent } });
const json = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });

const cities = [
  { id: 'mx-city', slug: 'tepic', name: 'Tepic', country_code: 'mx', bg_image: 'https://images.test/tepic.webp' },
  { id: 'fr-city', slug: 'paris', name: 'París', country_code: 'fr', bg_image: 'https://images.test/paris.webp' },
  { id: 'es-city', slug: 'madrid', name: 'Madrid', country_code: 'es', bg_image: 'https://images.test/madrid.webp' },
];
const records = {
  cities,
  businesses: [
    { id: 'biz', slug: 'tepic-cafe', city_slug: 'tepic', category: 'restaurantes', name: 'Café', photos: [], updated_at: '2026-10-01T12:00:00Z' },
    { id: 'fr-biz', slug: 'paris-bistro', city_slug: 'paris', category: 'restaurantes', name: 'Bistró', photos: [], updated_at: '2026-10-01T12:00:00Z' },
    { id: 'es-biz', slug: 'madrid-taberna', city_slug: 'madrid', category: 'restaurantes', name: 'Taberna', photos: [], updated_at: '2026-10-01T12:00:00Z' },
  ],
  events: [
    { id: 'event', slug: 'paris-concert', city_slug: 'paris', title: 'Concierto en París', date: '2027-01-15', time: '21:00', status: 'approved', img_url: 'https://images.test/concert.webp' },
    { id: 'madrid-event', slug: 'madrid-concierto', city_slug: 'madrid', title: 'Concierto en Madrid', date: '2027-02-01', time: '20:00', status: 'approved', img_url: 'https://images.test/madrid.webp' },
  ],
  experiences: [
    { id: 'article', slug: 'paris-guide', city_slug: 'paris', title: 'Guía de París', gallery: JSON.stringify(['https://images.test/paris-guide.webp']) },
  ],
};

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(async url => {
    const parsed = new URL(url);
    const table = parsed.pathname.split('/').pop();
    // og.js pide la ciudad por slug: devolver solo la fila pedida. La
    // consulta es slug=in.(a,b) desde la Fase 3 (antes era slug=eq.a).
    if (table === 'cities' && parsed.searchParams.get('slug')) {
      const raw = parsed.searchParams.get('slug');
      const wanted = raw.startsWith('in.(')
        ? raw.slice(4, -1).split(',')
        : [raw.replace('eq.', '')];
      return json(records.cities.filter(c => wanted.includes(c.slug)));
    }
    return json(records[table] || []);
  }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('WORLD_CITIES (seoRoutes)', () => {
  it('las 11 ciudades internacionales con su código de país', () => {
    expect(Object.keys(WORLD_CITIES).sort()).toEqual([
      'barcelona', 'bogota', 'buenos-aires', 'londres', 'los-angeles',
      'madrid', 'medellin', 'paris', 'san-antonio', 'san-diego', 'vancouver',
    ]);
    expect(isWorldCitySlug('paris')).toBe(true);
    expect(isWorldCitySlug('Paris')).toBe(true);
    expect(worldCityCountry('paris')).toBe('fr');
    expect(isWorldCitySlug('madrid')).toBe(true);
    expect(worldCityCountry('madrid')).toBe('es');
    expect(isWorldCitySlug('barcelona')).toBe(true);
    expect(worldCityCountry('barcelona')).toBe('es');
    expect(isWorldCitySlug('bogota')).toBe(true);
    expect(worldCityCountry('bogota')).toBe('co');
    expect(isWorldCitySlug('londres')).toBe(true);
    expect(worldCityCountry('londres')).toBe('gb');
  });
  it('las ciudades mexicanas no son internacionales', () => {
    expect(isWorldCitySlug('tepic')).toBe(false);
    expect(isWorldCitySlug('guadalajara')).toBe(false);
    expect(worldCityCountry('tepic')).toBe(null);
  });
});

describe('hostIncludesCity (domain, .mx por defecto en node)', () => {
  it('en .mx incluye México y excluye las internacionales', () => {
    expect(hostIncludesCity('tepic', cities)).toBe(true);
    expect(hostIncludesCity('paris', cities)).toBe(false);
    expect(hostIncludesCity('madrid', cities)).toBe(false);
    expect(hostIncludesCity('ciudad-desconocida', cities)).toBe(true);
  });
  it('las listas con comas pertenecen si alguna ciudad es de aquí', () => {
    expect(hostIncludesCityList('tepic,paris', cities)).toBe(true);
    expect(hostIncludesCityList('paris', cities)).toBe(false);
    expect(hostIncludesCityList('', cities)).toBe(true);
  });
  it('en .world incluye las internacionales y excluye México', async () => {
    vi.stubGlobal('window', { location: { hostname: 'www.citymap.world' } });
    vi.resetModules();
    const worldDomain = await import('../lib/domain.js');
    expect(worldDomain.hostIncludesCity('paris', cities)).toBe(true);
    expect(worldDomain.hostIncludesCity('madrid', cities)).toBe(true);
    expect(worldDomain.hostIncludesCity('tepic', cities)).toBe(false);
    expect(worldDomain.hostIncludesCityList('tepic,paris', cities)).toBe(true);
    expect(worldDomain.hostIncludesCityList('tepic', cities)).toBe(false);
  });
});

describe('redirecciones 308 entre dominios', () => {
  it.each([
    // .mx → .world: ciudad internacional, con su prefijo de país.
    ['citymap.mx', '/paris', 'https://www.citymap.world/fr/paris'],
    ['citymap.mx', '/madrid', 'https://www.citymap.world/es/madrid'],
    ['citymap.mx', '/paris/bistro', 'https://www.citymap.world/fr/paris/bistro'],
    ['citymap.mx', '/paris/restaurantes', 'https://www.citymap.world/fr/paris/restaurantes'],
    ['citymap.mx', '/paris/bistro/menu', 'https://www.citymap.world/fr/paris/bistro/menu'],
    // .mx → .world: rutas planas con ciudad (misma ruta, otro dominio).
    ['citymap.mx', '/evento/paris/concert', 'https://www.citymap.world/evento/paris/concert'],
    ['citymap.mx', '/eventos/paris', 'https://www.citymap.world/eventos/paris'],
    ['citymap.mx', '/eventos/madrid', 'https://www.citymap.world/eventos/madrid'],
    ['citymap.mx', '/revista/paris/paris-guide', 'https://www.citymap.world/revista/paris/paris-guide'],
    ['citymap.mx', '/mapa/paris', 'https://www.citymap.world/mapa/paris'],
    // .world → .mx: ciudad mexicana, con o sin prefijo de país.
    ['www.citymap.world', '/mx/tepic', 'https://citymap.mx/tepic'],
    ['www.citymap.world', '/mx/tepic/cafe', 'https://citymap.mx/tepic/cafe'],
    ['www.citymap.world', '/tepic', 'https://citymap.mx/tepic'],
    ['www.citymap.world', '/tepic/cafe', 'https://citymap.mx/tepic/cafe'],
    ['www.citymap.world', '/evento/tepic/festival', 'https://citymap.mx/evento/tepic/festival'],
    ['www.citymap.world', '/eventos/tepic', 'https://citymap.mx/eventos/tepic'],
    // .world → .mx: /tours y /negocios son de México.
    ['www.citymap.world', '/tours', 'https://citymap.mx/tours'],
    ['www.citymap.world', '/negocios', 'https://citymap.mx/negocios'],
    // .world: ciudad internacional sin prefijo → su forma canónica.
    ['www.citymap.world', '/paris', 'https://www.citymap.world/fr/paris'],
    ['www.citymap.world', '/madrid', 'https://www.citymap.world/es/madrid'],
    ['www.citymap.world', '/paris/bistro', 'https://www.citymap.world/fr/paris/bistro'],
  ])('redirects %s%s to %s', async (host, path, expected) => {
    const response = await middleware(request(path, host));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(expected);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('conserva la query en la redirección', async () => {
    const response = await middleware(request('/paris?vista=mapa', 'citymap.mx'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://www.citymap.world/fr/paris?vista=mapa');
  });

  it('no redirige lo que se queda en su dominio', async () => {
    // /login vive en los dos dominios; /tours y /paris en .mx se quedan.
    expect(await middleware(request('/login', 'www.citymap.world'))).toBeUndefined();
    expect(await middleware(request('/tours', 'citymap.mx'))).toBeUndefined();
    expect(await middleware(request('/tepic', 'citymap.mx'))).toBeUndefined();
    expect(await middleware(request('/evento/paris/concert', 'www.citymap.world'))).toBeUndefined();
  });
});

describe('sitemap por dominio', () => {
  it('en .mx no hay nada de las ciudades internacionales', async () => {
    const xml = await (await middleware(request('/sitemap.xml', 'citymap.mx'))).text();
    expect(xml).toContain('https://citymap.mx/tepic/cafe');
    expect(xml).toContain('https://citymap.mx/eventos/tepic');
    expect(xml).toContain('https://citymap.mx/tours');
    expect(xml).toContain('https://citymap.mx/negocios');
    expect(xml).not.toContain('paris');
    expect(xml).not.toContain('madrid');
    expect(xml).not.toContain('citymap.world');
  });
  it('en .world solo las ciudades internacionales, sin México ni /tours ni /negocios', async () => {
    const xml = await (await middleware(request('/sitemap.xml', 'www.citymap.world'))).text();
    expect(xml).toContain('https://www.citymap.world/fr/paris');
    expect(xml).toContain('https://www.citymap.world/fr/paris/bistro');
    expect(xml).toContain('https://www.citymap.world/eventos/paris');
    expect(xml).toContain('https://www.citymap.world/evento/paris/concert');
    expect(xml).toContain('https://www.citymap.world/revista/paris/paris-guide');
    expect(xml).toContain('https://www.citymap.world/es/madrid');
    expect(xml).toContain('https://www.citymap.world/es/madrid/taberna');
    expect(xml).toContain('https://www.citymap.world/eventos/madrid');
    expect(xml).toContain('https://www.citymap.world/evento/madrid/concierto');
    expect(xml).not.toContain('/tepic');
    expect(xml).not.toContain('https://www.citymap.world/tours');
    expect(xml).not.toContain('https://www.citymap.world/negocios');
    expect(xml).not.toContain('https://citymap.mx/');
  });
});

describe('canónica de home por dominio', () => {
  it('og sirve la home con la canónica del host que la pide', async () => {
    const worldHtml = await (await og(request('/api/og', 'www.citymap.world'))).text();
    expect(worldHtml).toContain('<link rel="canonical" href="https://www.citymap.world"/>');
    expect(worldHtml).toContain('<meta property="og:url" content="https://www.citymap.world"/>');
    expect(worldHtml).toContain('https://www.citymap.world/citymap.mx.png');
    expect(worldHtml).not.toContain('https://citymap.mx/');
    const mxHtml = await (await og(request('/api/og', 'citymap.mx'))).text();
    expect(mxHtml).toContain('<link rel="canonical" href="https://citymap.mx"/>');
    expect(mxHtml).not.toContain('citymap.world');
  });
  it('el middleware lleva / a og.js para los bots', async () => {
    fetch.mockResolvedValue(new Response('<h1>Home</h1>', { status: 200 }));
    const response = await middleware(request('/', 'www.citymap.world', 'Googlebot'));
    expect(response.status).toBe(200);
    expect(fetch.mock.calls[0][0]).toContain('/api/og');
    expect(await response.text()).toContain('Home');
  });
});

describe('migas de pan del evento según el dominio', () => {
  it('en .world la ciudad del evento lleva prefijo de país', async () => {
    const html = await (await og(request('/api/og?ev=concert&city=paris&_bot=1', 'www.citymap.world'))).text();
    expect(html).toContain('https://www.citymap.world/fr/paris');
    expect(html).toContain('https://www.citymap.world/evento/paris/concert');
  });
  it('en .mx la ciudad del evento es plana', async () => {
    const html = await (await og(request('/api/og?ev=concert&city=paris&_bot=1', 'citymap.mx'))).text();
    expect(html).toContain('https://citymap.mx/paris');
  });
});

describe('cableado del filtro por dominio en el cliente', () => {
  it('el muro filtra por dominio', () => {
    const src = readFileSync(new URL('../views/GlobalHomeView.jsx', import.meta.url), 'utf8');
    expect(src).toContain('hostIncludesCity');
    expect(src).toContain('hostIncludesCityList');
    expect(src).toContain('city_slug=in.');
  });
  it('el selector de ciudad filtra por dominio', () => {
    const src = readFileSync(new URL('../components/CountryPickerDropdown.jsx', import.meta.url), 'utf8');
    expect(src).toContain('hostIncludesCity');
  });
  it('la ciudad por defecto es París en .world', () => {
    const src = readFileSync(new URL('../hooks/useAppInitialization.js', import.meta.url), 'utf8');
    expect(src).toContain('IS_WORLD ? "paris" : "guadalajara"');
  });
});
