import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sitemap from '../../api/sitemap.xml.js';

// Punto 4 del SEO fontanería: los eventos totalmente terminados quedan
// fuera del sitemap (la base no se toca) y el sitemap se pagina en
// bloques de 1000 URLs, con índice en /sitemap.xml sin ?page.
const request = (path, host = 'citymap.mx') => new Request(`https://${host}${path}`);
const json = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });

// Fechas relativas al hoy UTC del handler (new Date().toISOString()).
const utcDay = offset => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
};

const cities = [
  { id: 'c1', slug: 'tepic', name: 'Tepic', country_code: 'mx', created_at: '2026-06-03T05:13:19Z' },
  { id: 'c2', slug: 'zapopan', name: 'Zapopan', country_code: 'mx', created_at: '2026-06-03T05:13:19Z' },
];

const mockFetch = records => vi.fn(async url => {
  const parsed = new URL(url);
  const table = parsed.pathname.split('/').pop();
  const all = records[table] || [];
  // Respetar la paginación interna del handler (limit/offset), si no el
  // bucle de lectura no termina con más de 1000 filas.
  const offset = Number(parsed.searchParams.get('offset') || 0);
  const limit = Number(parsed.searchParams.get('limit') || 1000);
  return json(all.slice(offset, offset + limit));
});

const locs = xml => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);

describe('sitemap: eventos pasados fuera, multi-día vigentes dentro', () => {
  const events = [
    { id: 'e-pasado', slug: 'tepic-pasado', city_slug: 'tepic', title: 'Pasado', updated_at: '2026-11-01T08:00:00Z', date: utcDay(-1) },
    { id: 'e-multidia', slug: 'tepic-multidia', city_slug: 'tepic', title: 'Multi-día vigente', updated_at: '2026-11-01T08:00:00Z', date: utcDay(-10), end_date: utcDay(30) },
    { id: 'e-multidia-fin', slug: 'tepic-multidia-fin', city_slug: 'tepic', title: 'Multi-día terminado', updated_at: '2026-11-01T08:00:00Z', date: utcDay(-10), end_date: utcDay(-1) },
    { id: 'e-hoy', slug: 'tepic-hoy', city_slug: 'tepic', title: 'Hoy', updated_at: '2026-11-01T08:00:00Z', date: utcDay(0) },
    { id: 'e-futuro', slug: 'tepic-futuro', city_slug: 'tepic', title: 'Futuro', updated_at: '2026-11-01T08:00:00Z', date: utcDay(7) },
    // Maroon 5: end_date es cadena vacía, se trata como nula.
    { id: 'e-end-vacio-pasado', slug: 'tepic-end-vacio-pasado', city_slug: 'tepic', title: 'End vacío pasado', updated_at: '2026-11-01T08:00:00Z', date: utcDay(-1), end_date: '' },
    { id: 'e-end-vacio-hoy', slug: 'tepic-end-vacio-hoy', city_slug: 'tepic', title: 'End vacío hoy', updated_at: '2026-11-01T08:00:00Z', date: utcDay(0), end_date: '' },
    // Sin fecha: no se puede probar que terminó, queda dentro.
    { id: 'e-sin-fecha', slug: 'tepic-sin-fecha', city_slug: 'tepic', title: 'Sin fecha', updated_at: '2026-11-01T08:00:00Z' },
  ];
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch({ cities, businesses: [], events, experiences: [] }));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  const page1 = async () => (await sitemap(request('/sitemap.xml?page=1'))).text();

  it('un evento pasado simple queda fuera', async () => {
    const xml = await page1();
    expect(xml).not.toContain('https://citymap.mx/evento/tepic/pasado');
  });
  it('un evento multi-día vigente (end_date futuro) queda dentro', async () => {
    const xml = await page1();
    expect(xml).toContain('https://citymap.mx/evento/tepic/multidia');
  });
  it('un evento multi-día terminado (end_date pasado) queda fuera', async () => {
    const xml = await page1();
    expect(xml).not.toContain('https://citymap.mx/evento/tepic/multidia-fin');
  });
  it('un evento de hoy queda dentro', async () => {
    const xml = await page1();
    expect(xml).toContain('https://citymap.mx/evento/tepic/hoy');
  });
  it('un evento futuro queda dentro', async () => {
    const xml = await page1();
    expect(xml).toContain('https://citymap.mx/evento/tepic/futuro');
  });
  it('end_date vacío se trata como nulo (pasado fuera, hoy dentro)', async () => {
    const xml = await page1();
    expect(xml).not.toContain('https://citymap.mx/evento/tepic/end-vacio-pasado');
    expect(xml).toContain('https://citymap.mx/evento/tepic/end-vacio-hoy');
  });
  it('un evento sin fecha queda dentro', async () => {
    const xml = await page1();
    expect(xml).toContain('https://citymap.mx/evento/tepic/sin-fecha');
  });
});

describe('sitemap: paginación en bloques de 1000 con índice', () => {
  const manyEvents = Array.from({ length: 1005 }, (_, i) => ({
    id: `ev-${i}`, slug: `tepic-evento-${i}`, city_slug: 'tepic', title: `Evento ${i}`,
    updated_at: '2026-11-01T08:00:00Z', date: utcDay(30),
  }));
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch({ cities, businesses: [], events: manyEvents, experiences: [] }));
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  const get = async path => {
    const response = await sitemap(request(path));
    expect(response.headers.get('content-type')).toContain('application/xml');
    expect(response.headers.get('cache-control')).toContain('s-maxage=3600');
    return response.text();
  };

  it('sin ?page devuelve un índice que lista las páginas', async () => {
    const xml = await get('/sitemap.xml');
    expect(xml).toContain('<sitemapindex');
    expect(xml).not.toContain('<urlset');
    expect(xml).toContain('https://citymap.mx/sitemap.xml?page=1');
    expect(xml).toContain('https://citymap.mx/sitemap.xml?page=2');
    expect(xml).not.toContain('sitemap.xml?page=3');
  });
  it('page 1 tiene 1000 URLs y page 2 el resto, disjuntas', async () => {
    const xml1 = await get('/sitemap.xml?page=1');
    const xml2 = await get('/sitemap.xml?page=2');
    expect(xml1).toContain('<urlset');
    expect(xml2).toContain('<urlset');
    const urls1 = locs(xml1);
    const urls2 = locs(xml2);
    expect(urls1).toHaveLength(1000);
    expect(urls2.length).toBeGreaterThan(0);
    expect(new Set([...urls1, ...urls2]).size).toBe(urls1.length + urls2.length);
    // El primer evento va en la página 1 y el último en la 2.
    expect(urls1).toContain('https://citymap.mx/evento/tepic/evento-0');
    expect(urls2).toContain('https://citymap.mx/evento/tepic/evento-1004');
    expect(urls1).not.toContain('https://citymap.mx/evento/tepic/evento-1004');
    expect(urls2).not.toContain('https://citymap.mx/evento/tepic/evento-0');
  });
  it('una página fuera de rango devuelve un urlset vacío, no un error', async () => {
    for (const path of ['/sitemap.xml?page=3', '/sitemap.xml?page=0', '/sitemap.xml?page=abc', '/sitemap.xml?page=-2']) {
      const response = await sitemap(request(path));
      expect(response.status).toBe(200);
      const xml = await response.text();
      expect(xml).toContain('<urlset');
      expect(locs(xml)).toHaveLength(0);
    }
  });
});
