import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import middleware from '../../middleware.js';
import sitemap from '../../api/sitemap.xml.js';
import og from '../../api/og.js';
import { normalizeCitySlug, legacyCitySlug, citySlugFromPath } from '../lib/seoRoutes.js';
import { eventUrl } from '../lib/eventUrls.js';

const request = (path, host = 'citymap.mx', agent = 'Mozilla/5.0') => new Request(`https://${host}${path}`, { headers: { 'user-agent': agent } });
const json = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });

describe('normalizeCitySlug', () => {
  it('normaliza los tres slugs viejos con mayúsculas y tildes', () => {
    expect(normalizeCitySlug('Barcelona')).toBe('barcelona');
    expect(normalizeCitySlug('San-Pedro-Garza-García')).toBe('san-pedro-garza-garcia');
    expect(normalizeCitySlug('San-Miguel-de-allende')).toBe('san-miguel-de-allende');
  });
  it('deja intactos los slugs ya normalizados y es idempotente', () => {
    expect(normalizeCitySlug('tepic')).toBe('tepic');
    expect(normalizeCitySlug('san-pedro-garza-garcia')).toBe('san-pedro-garza-garcia');
    expect(normalizeCitySlug(normalizeCitySlug('San-Pedro-Garza-García'))).toBe('san-pedro-garza-garcia');
    expect(normalizeCitySlug('')).toBe('');
  });
  it('normaliza cualquier segmento con mayúsculas o tildes', () => {
    expect(normalizeCitySlug('Mérida')).toBe('merida');
    expect(normalizeCitySlug('GUADALAJARA')).toBe('guadalajara');
  });
  it('legacyCitySlug devuelve la forma vieja y null si no hay', () => {
    expect(legacyCitySlug('barcelona')).toBe('Barcelona');
    expect(legacyCitySlug('san-pedro-garza-garcia')).toBe('San-Pedro-Garza-García');
    expect(legacyCitySlug('san-miguel-de-allende')).toBe('San-Miguel-de-allende');
    expect(legacyCitySlug('tepic')).toBe(null);
  });
  it('citySlugFromPath normaliza la ciudad de la URL', () => {
    expect(citySlugFromPath('/San-Pedro-Garza-García')).toBe('san-pedro-garza-garcia');
    expect(citySlugFromPath('/tepic')).toBe('tepic');
    expect(citySlugFromPath('/tours')).toBe('');
  });
});

describe('eventUrl con slug de ciudad viejo', () => {
  it('emite la ciudad normalizada aunque el slug lleve el prefijo viejo', () => {
    expect(eventUrl({ slug: 'San-Miguel-de-allende-tour-x', city_slug: 'San-Miguel-de-allende' }))
      .toBe('/evento/san-miguel-de-allende/tour-x');
  });
  it('no cambia los eventos con ciudad ya normalizada', () => {
    expect(eventUrl({ slug: 'tepic-concierto', city_slug: 'tepic' })).toBe('/evento/tepic/concierto');
    expect(eventUrl({ slug: 'festival', city_slug: 'tepic' })).toBe('/evento/festival');
  });
});

describe('redirección 308 de slugs de ciudad viejos', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()); });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it.each([
    ['/San-Pedro-Garza-García', 'https://citymap.mx/san-pedro-garza-garcia'],
    // Barcelona es internacional: en .mx sale a .world con prefijo de
    // país (el split por dominio tiene prioridad sobre la normalización
    // en el mismo dominio).
    ['/Barcelona', 'https://www.citymap.world/es/barcelona'],
    ['/San-Miguel-de-allende', 'https://citymap.mx/san-miguel-de-allende'],
    ['/San-Pedro-Garza-García/la-madalena', 'https://citymap.mx/san-pedro-garza-garcia/la-madalena'],
    ['/eventos/San-Miguel-de-allende', 'https://citymap.mx/eventos/san-miguel-de-allende'],
    ['/revista/San-Miguel-de-allende/visita-guiada', 'https://citymap.mx/revista/san-miguel-de-allende/visita-guiada'],
    ['/evento/San-Pedro-Garza-García/x', 'https://citymap.mx/evento/san-pedro-garza-garcia/x'],
    ['/mapa/Barcelona', 'https://www.citymap.world/mapa/barcelona'],
    ['/explorar/San-Miguel-de-allende', 'https://citymap.mx/explorar/san-miguel-de-allende'],
    ['/San-Pedro-Garza-García?q=pizza', 'https://citymap.mx/san-pedro-garza-garcia?q=pizza'],
  ])('redirige %s a %s', async (path, expected) => {
    const response = await middleware(request(path));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe(expected);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('una ciudad mexicana en .world sale a .mx ya normalizada', async () => {
    const response = await middleware(request('/mx/San-Pedro-Garza-García', 'www.citymap.world'));
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://citymap.mx/san-pedro-garza-garcia');
  });
  it('no redirige slugs ya normalizados ni rutas del sistema', async () => {
    expect(await middleware(request('/tepic'))).toBeUndefined();
    expect(await middleware(request('/tours'))).toBeUndefined();
    expect(await middleware(request('/eventos/tepic'))).toBeUndefined();
  });
});

describe('sitemap con slugs normalizados y lastmod', () => {
  const records = {
    cities: [
      { id: 'c1', slug: 'tepic', name: 'Tepic', country_code: 'mx', bg_image: 'https://images.test/tepic.webp', created_at: '2026-06-03T05:13:19Z' },
      { id: 'c2', slug: 'zapopan', name: 'Zapopan', country_code: 'mx', created_at: '2026-06-03T05:13:19Z' },
      { id: 'c3', slug: 'San-Pedro-Garza-García', name: 'San Pedro Garza García', country_code: 'mx', created_at: '2026-06-03T05:13:19Z' },
      { id: 'c4', slug: 'San-Miguel-de-allende', name: 'San Miguel de Allende', country_code: 'mx', created_at: '2026-06-03T05:13:19Z' },
      { id: 'c5', slug: 'Barcelona', name: 'Barcelona', country_code: 'es' },
      { id: 'c6', slug: 'paris', name: 'París', country_code: 'fr' },
    ],
    businesses: [
      { id: 'biz', slug: 'tepic-cafe', city_slug: 'tepic', category: 'restaurantes', name: 'Café', photos: [], updated_at: '2026-10-01T12:00:00Z' },
      { id: 'madalena', slug: 'Zapopan-la-madalena', city_slug: 'Zapopan', category: 'restaurantes', name: 'La Madalena', photos: [], updated_at: '2026-09-15T10:00:00Z' },
    ],
    events: [
      { id: 'ev', slug: 'tepic-concierto', city_slug: 'tepic', title: 'Concierto', updated_at: '2026-11-01T08:00:00Z' },
    ],
    experiences: [
      { id: 'exp', slug: 'San-Miguel-de-allende-visita-guiada', city_slug: 'San-Miguel-de-allende', title: 'Visita guiada', gallery: [], updated_at: '2026-10-20T09:00:00Z' },
    ],
  };
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async url => {
      const parsed = new URL(url);
      return json(records[parsed.pathname.split('/').pop()] || []);
    }));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  const entry = (xml, loc) => {
    const match = xml.match(new RegExp(`<url><loc>${loc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>(.*?)</url>`));
    return match ? match[1] : null;
  };

  it('emite /eventos/:ciudad solo con slugs normalizados', async () => {
    const xml = await (await sitemap(request('/sitemap.xml', 'citymap.mx', 'Googlebot'))).text();
    expect(xml).toContain('https://citymap.mx/eventos/tepic');
    expect(xml).toContain('https://citymap.mx/eventos/san-pedro-garza-garcia');
    expect(xml).toContain('https://citymap.mx/eventos/san-miguel-de-allende');
    expect(xml).toContain('https://citymap.mx/eventos/zapopan');
    expect(xml).not.toContain('/San-Pedro-Garza-García');
    expect(xml).not.toContain('/San-Miguel-de-allende/');
    expect(xml).not.toContain('/Barcelona');
    expect(xml).not.toContain('/Zapopan/');
    expect(xml).not.toContain('/paris');
    expect(xml).not.toContain('/eventos/paris');
  });
  it('incluye el negocio con city_slug en mayúscula en su URL canónica', async () => {
    const xml = await (await sitemap(request('/sitemap.xml', 'citymap.mx', 'Googlebot'))).text();
    expect(xml).toContain('https://citymap.mx/zapopan/la-madalena');
    expect(xml).toContain('https://citymap.mx/revista/san-miguel-de-allende/San-Miguel-de-allende-visita-guiada');
  });
  it('pone lastmod en ciudades, categorías y /eventos/:ciudad', async () => {
    const xml = await (await sitemap(request('/sitemap.xml', 'citymap.mx', 'Googlebot'))).text();
    // Tepic: última actualización de su contenido (el evento del 1 nov).
    expect(entry(xml, 'https://citymap.mx/tepic')).toContain('<lastmod>2026-11-01T08:00:00.000Z</lastmod>');
    // Restaurantes en Tepic: última actualización de sus negocios (1 oct).
    expect(entry(xml, 'https://citymap.mx/tepic/restaurantes')).toContain('<lastmod>2026-10-01T12:00:00.000Z</lastmod>');
    // /eventos/tepic: última actualización de sus eventos (1 nov).
    expect(entry(xml, 'https://citymap.mx/eventos/tepic')).toContain('<lastmod>2026-11-01T08:00:00.000Z</lastmod>');
    // San Pedro Garza García no tiene contenido: respaldo created_at.
    expect(entry(xml, 'https://citymap.mx/san-pedro-garza-garcia')).toContain('<lastmod>2026-06-03T05:13:19.000Z</lastmod>');
    // Categoría sin negocios en esa ciudad: sin lastmod.
    expect(entry(xml, 'https://citymap.mx/san-pedro-garza-garcia/restaurantes')).not.toContain('<lastmod>');
  });
  it('en citymap.world incluye solo las ciudades internacionales (París y Barcelona normalizadas)', async () => {
    const xml = await (await sitemap(request('/sitemap.xml', 'www.citymap.world', 'Googlebot'))).text();
    expect(xml).toContain('https://www.citymap.world/eventos/paris');
    expect(xml).toContain('https://www.citymap.world/eventos/barcelona');
    expect(xml).toContain('https://www.citymap.world/fr/paris');
    expect(xml).not.toContain('/Barcelona');
    expect(xml).not.toContain('https://citymap.mx/');
    // Las ciudades mexicanas viven solo en el sitemap de .mx.
    expect(xml).not.toContain('/eventos/tepic');
    expect(xml).not.toContain('/mx/tepic');
    expect(xml).not.toContain('/mx/zapopan');
    expect(xml).not.toContain('/eventos/san-pedro-garza-garcia');
  });
});

describe('og.js resuelve la ciudad por el slug nuevo y por el viejo', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async url => {
      const parsed = new URL(String(url));
      const table = parsed.pathname.split('/').pop();
      if (table === 'cities') {
        // La base aún tiene el slug viejo: la consulta in.(nuevo,viejo)
        // lo encuentra por la forma vieja. El search llega codificado
        // (la í es %C3%AD), así que se decodifica antes de comparar.
        return decodeURIComponent(parsed.search).includes('San-Miguel-de-allende')
          ? json([{ slug: 'San-Miguel-de-allende', country_code: 'mx', bg_image: null }])
          : json([]);
      }
      return json([]);
    }));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('sirve la ciudad con el slug nuevo aunque la base tenga el viejo', async () => {
    const response = await og(request('/api/og?city=san-miguel-de-allende&_bot=1', 'citymap.mx', 'Googlebot'));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('href="https://citymap.mx/san-miguel-de-allende"');
  });
  it('sirve la ciudad con el slug viejo y canonical normalizado', async () => {
    const response = await og(request('/api/og?city=San-Miguel-de-allende&_bot=1', 'citymap.mx', 'Googlebot'));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('href="https://citymap.mx/san-miguel-de-allende"');
    expect(html).not.toContain('San-Miguel-de-allende');
  });
  it('sigue dando 404 para una ciudad que no existe', async () => {
    const response = await og(request('/api/og?city=missing&_bot=1', 'citymap.mx', 'Googlebot'));
    expect(response.status).toBe(404);
  });
});
