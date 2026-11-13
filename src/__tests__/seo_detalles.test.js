import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { Buffer } from 'node:buffer';
import og from '../../api/og.js';
import robots from '../../api/robots.txt.js';

// Fase 4 del plan SEO (13 nov 2026): los detalles chicos.
// 1. og-image.png comprimida (504 KB -> ~125 KB, misma imagen, ahora
//    720x402 con paleta: a tamaño de vista previa de enlace se ve
//    igual; el límite de subida por CLI no admitía el archivo de
//    175 KB en 860x480).
// 2. public/sitemap.xml y public/robots.txt obsoletos borrados (el
//    generador scripts/generate-sitemap.js también se va: nada los
//    referencia y el test de seo_routes ya exigía su ausencia).
// 3. SearchAction fuera: su destino /?buscar= está bloqueado por
//    robots.txt y no hay URL de búsqueda válida que no lo esté.
// 4. Sin noindex latente en og.js: el detalle de negocio/evento/
//    experiencia devolvía X-Robots-Tag "noindex, follow" y solo el
//    middleware lo corregía; ahora og.js dice lo mismo que el middleware.
// 5. og:locale alineado a es_MX (index.html decía "es", og.js "es_MX").

const records = {
  cities: [{ slug: 'tepic', country_code: 'mx', bg_image: null }],
  businesses: [{
    id: 'biz-1', slug: 'tepic-cafe', city_slug: 'tepic', name: 'Café de Prueba',
    tagline: null, description: 'Café de especialidad en Tepic.',
    address: 'Calle Falsa 1', rating: 4.5, review_count: 10,
    category: 'cafe', photos: [], lat: null, lng: null, schedule: {},
  }],
  events: [{
    id: 'e1111111-1111-4111-8111-111111111111', slug: 'tepic-concierto',
    title: 'Concierto de Prueba', description: 'Concierto.',
    date: '2027-05-14', time: '21:00', end_date: null, end_time: null,
    price: '500', price_type: 'paid', website: null, status: 'approved',
    venue_name: 'Teatro', venue_address: null, lat: null, lng: null,
    img_url: null, img: null, event_category: 'Concierto', city_slug: 'tepic',
  }],
  experiences: [],
  reviews: [],
};

const request = (path, host = 'citymap.mx', agent = 'Googlebot') => new Request(`https://${host}${path}`, { headers: { 'user-agent': agent } });
const json = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  // El mock respeta los filtros PostgREST que usa og.js (slug=in.(...),
  // id=eq., slug=eq., city_slug=eq., name=ilike.*...*): sin esto, getBiz
  // devolvería el primer negocio para cualquier slug y el 404 no se
  // podría probar.
  vi.stubGlobal('fetch', vi.fn(async url => {
    const parsed = new URL(url);
    const table = parsed.pathname.split('/').pop();
    let rows = records[table] || [];
    const params = parsed.searchParams;
    const slugIn = params.get('slug');
    if (slugIn?.startsWith('in.(')) {
      const wanted = slugIn.slice(4, -1).split(',');
      rows = rows.filter(r => wanted.includes(r.slug));
    } else if (slugIn?.startsWith('eq.')) {
      rows = rows.filter(r => r.slug === slugIn.slice(3));
    }
    const idEq = params.get('id');
    if (idEq?.startsWith('eq.')) rows = rows.filter(r => r.id === idEq.slice(3));
    const cityEq = params.get('city_slug');
    if (cityEq?.startsWith('eq.')) rows = rows.filter(r => r.city_slug === cityEq.slice(3));
    const nameIlike = params.get('name');
    if (nameIlike?.startsWith('ilike.')) {
      const words = nameIlike.slice(6).replaceAll('%25', ' ').replaceAll(/[*%]/g, ' ').split(/\s+/).filter(Boolean);
      rows = rows.filter(r => words.every(w => (r.name || '').toLowerCase().includes(w.toLowerCase())));
    }
    return json(rows);
  }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function pngSize(buf) {
  expect(buf.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

describe('og-image.png comprimida', () => {
  it('sigue siendo la misma imagen en PNG, con mucho menos peso', () => {
    const path = new URL('../../public/og-image.png', import.meta.url);
    expect(existsSync(path)).toBe(true);
    const buf = readFileSync(path);
    // 720x402 (antes 860x480): a tamaño de vista previa de enlace la
    // imagen se ve igual; el ancho sigue sobrado para WhatsApp/Facebook.
    expect(pngSize(buf)).toEqual({ width: 720, height: 402 });
    // Era 504099 bytes; la versión comprimida ronda 125 KB.
    expect(buf.length).toBeLessThan(150000);
    expect(statSync(path).size).toBe(buf.length);
  });
  it('index.html declara las dimensiones reales (720x402), no 1200x630', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(html).toContain('<meta property="og:image:width" content="720" />');
    expect(html).toContain('<meta property="og:image:height" content="402" />');
    expect(html).not.toContain('content="1200"');
    expect(html).not.toContain('content="630"');
  });
});

describe('archivos estáticos obsoletos borrados', () => {
  it.each([
    '../../public/sitemap.xml',
    '../../public/robots.txt',
    '../../scripts/generate-sitemap.js',
  ])('%s ya no existe', rel => {
    expect(existsSync(new URL(rel, import.meta.url))).toBe(false);
  });
});

describe('SearchAction fuera (su destino está bloqueado por robots)', () => {
  it('useAppSEO.js ya no emite SearchAction ni apunta a /?buscar=', () => {
    const src = readFileSync(new URL('../hooks/useAppSEO.js', import.meta.url), 'utf8');
    expect(src).not.toContain('SearchAction');
    expect(src).not.toContain('?buscar=');
    // El resto del WebSite sigue: nombre, URL y descripción.
    expect(src).toContain('"@type": "WebSite"');
  });
  it('robots.txt sigue bloqueando /?buscar= (el bloqueo no se tocó)', async () => {
    const body = await (await robots(request('/robots.txt'))).text();
    expect(body).toContain('Disallow: /*?buscar=*');
    expect(body).toContain('Sitemap: https://citymap.mx/sitemap.xml');
  });
});

describe('sin noindex latente en og.js', () => {
  it('el detalle de negocio se sirve indexable, igual que el middleware', async () => {
    const response = await og(request('/api/og?b=tepic-cafe&city=tepic&_bot=1'));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-robots-tag')).toBe('index, follow, max-image-preview:large');
  });
  it('el detalle de evento se sirve indexable', async () => {
    const response = await og(request('/api/og?ev=e1111111-1111-4111-8111-111111111111&city=tepic&_bot=1'));
    expect(response.status).toBe(200);
    expect(response.headers.get('x-robots-tag')).toBe('index, follow, max-image-preview:large');
  });
  it('lo que sí es noindex sigue siéndolo: /login y 404', async () => {
    const login = await og(request('/api/og?vista=login&_bot=1'));
    expect(login.status).toBe(200);
    expect(login.headers.get('x-robots-tag')).toBe('noindex');
    const missing = await og(request('/api/og?b=no-existe&city=tepic&_bot=1'));
    expect(missing.status).toBe(404);
    expect(missing.headers.get('x-robots-tag')).toBe('noindex');
  });
  it('el código ya no contiene el "noindex, follow" del detalle', () => {
    const src = readFileSync(new URL('../../api/og.js', import.meta.url), 'utf8');
    expect(src).not.toContain('"noindex, follow"');
  });
});

describe('og:locale alineado a es_MX', () => {
  it('index.html ya no dice "es" a secas', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(html).toContain('<meta property="og:locale" content="es_MX" />');
    expect(html).not.toContain('<meta property="og:locale" content="es" />');
  });
  it('og.js sirve es_MX en la página de ciudad de .mx', async () => {
    const response = await og(request('/api/og?city=tepic&_bot=1'));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<meta property="og:locale" content="es_MX"/>');
  });
});
