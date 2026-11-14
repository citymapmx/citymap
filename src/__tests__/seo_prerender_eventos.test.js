import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import og from '../../api/og.js';

// Punto 3 de la fontanería SEO (14 nov 2026): prerender de home y
// ciudad para bots en api/og.js — la home y /:ciudad ya no son HTML
// genérico vacío: listan eventos próximos con enlaces (eventUrl) y la
// home además enlaza las páginas de ciudad. /eventos/:ciudad lleva el
// mismo listado. La ficha de evento no se toca (regresión al final).

const cities = [
  { slug: 'guadalajara', name: 'Guadalajara', country_code: 'mx', bg_image: null },
  { slug: 'zapopan', name: 'Zapopan', country_code: 'mx', bg_image: null },
  { slug: 'tepic', name: 'Tepic', country_code: 'mx', bg_image: null },
  { slug: 'madrid', name: 'Madrid', country_code: 'es', bg_image: null },
];

const campomar = {
  id: 'biz-campomar', slug: 'guadalajara-campomar-punto-sur', city_slug: 'guadalajara',
  name: 'Campomar Punto Sur', description: 'Mariscos en Punto Sur.',
  logo_url: null, photos: [],
};

// Fechas en 2027 para que el test no dependa del día en que se corre;
// los pasados usan 2026-01/02 (pasados siempre).
const evGdl = {
  id: 'a298e115-aaa6-48cf-8ff8-303885b3ec17', slug: 'guadalajara-concierto-de-prueba',
  title: 'Concierto de Prueba en Guadalajara', description: 'Concierto de prueba.',
  date: '2027-05-14', time: '21:00', end_date: null, end_time: null,
  price: '850', price_type: 'paid',
  website: 'https://www.ticketmaster.com.mx/evento-prueba',
  status: 'approved', venue_name: 'Teatro Diana',
  venue_address: 'Av. 16 de Septiembre 710', lat: 20.6652609, lng: -103.349093,
  img_url: 'https://images.test/evento.webp', img: null,
  event_category: 'Concierto', city_slug: 'guadalajara', visibility: 'public',
};

const evGdlMultiCiudad = {
  id: 'd298e115-aaa6-48cf-8ff8-303885b3ec20', slug: 'guadalajara-festival-multi-ciudad',
  title: 'Festival Multi Ciudad', description: 'En GDL y Zapopan.',
  date: '2027-05-20', time: '20:00', end_date: null, end_time: null,
  price: '', price_type: 'gratis', website: null,
  status: 'approved', venue_name: 'Arena Guadalajara',
  venue_address: null, lat: null, lng: null, img_url: null, img: null,
  event_category: 'Festival', city_slug: 'guadalajara,zapopan', visibility: 'public',
};

const evTepic = {
  id: 'e298e115-aaa6-48cf-8ff8-303885b3ec21', slug: 'tepic-concierto-en-tepic',
  title: 'Concierto en Tepic', description: 'Concierto en Tepic.',
  date: '2027-05-15', time: '20:00', end_date: null, end_time: null,
  price: '', price_type: 'gratis', website: null,
  status: 'approved', venue_name: 'Teatro del Pueblo',
  venue_address: null, lat: null, lng: null, img_url: null, img: null,
  event_category: 'Concierto', city_slug: 'tepic', visibility: 'public',
};

const evMadrid = {
  id: 'f298e115-aaa6-48cf-8ff8-303885b3ec22', slug: 'madrid-concierto-en-madrid',
  title: 'Concierto en Madrid', description: 'Concierto en Madrid.',
  date: '2027-05-16', time: '20:00', end_date: null, end_time: null,
  price: '', price_type: 'paid', website: null,
  status: 'approved', venue_name: 'WiZink Center',
  venue_address: null, lat: null, lng: null, img_url: null, img: null,
  event_category: 'Concierto', city_slug: 'madrid', visibility: 'public',
};

const evPasado = {
  id: 'c298e115-aaa6-48cf-8ff8-303885b3ec19', slug: 'guadalajara-evento-pasado',
  title: 'Evento Pasado', description: 'Ya pasó.',
  date: '2026-01-10', time: '20:00', end_date: null, end_time: null,
  price: '', price_type: 'paid', website: null, status: 'approved',
  venue_name: 'Foro Viejo', venue_address: null, lat: null, lng: null,
  img_url: null, img: null, event_category: 'Concierto', city_slug: 'guadalajara',
  visibility: 'public',
};

// Multi-día que empezó en el pasado pero su end_date sigue vigente:
// cuenta como próximo (mismo criterio que el sitemap).
const evMultiDiaVigente = {
  id: '1298e115-aaa6-48cf-8ff8-303885b3ec23', slug: 'guadalajara-festival-largo-vigente',
  title: 'Festival Largo Vigente', description: 'Dura todo el año.',
  date: '2026-01-01', time: '10:00', end_date: '2027-12-31', end_time: '22:00',
  price: '', price_type: 'gratis', website: null,
  status: 'approved', venue_name: 'Parque Metropolitano',
  venue_address: null, lat: null, lng: null, img_url: null, img: null,
  event_category: 'Festival', city_slug: 'guadalajara', visibility: 'public',
};

// Multi-día ya terminado (end_date pasado): fuera.
const evMultiDiaTerminado = {
  id: '2298e115-aaa6-48cf-8ff8-303885b3ec24', slug: 'guadalajara-festival-largo-terminado',
  title: 'Festival Largo Terminado', description: 'Ya terminó.',
  date: '2026-01-01', time: '10:00', end_date: '2026-02-01', end_time: '22:00',
  price: '', price_type: 'gratis', website: null,
  status: 'approved', venue_name: 'Parque Metropolitano',
  venue_address: null, lat: null, lng: null, img_url: null, img: null,
  event_category: 'Festival', city_slug: 'guadalajara', visibility: 'public',
};

const evPrivado = {
  id: '3298e115-aaa6-48cf-8ff8-303885b3ec25', slug: 'guadalajara-evento-privado',
  title: 'Evento Privado', description: 'Solo invitados.',
  date: '2027-06-01', time: '20:00', end_date: null, end_time: null,
  price: '', price_type: 'gratis', website: null,
  status: 'approved', venue_name: 'Casa Privada',
  venue_address: null, lat: null, lng: null, img_url: null, img: null,
  event_category: 'Fiesta', city_slug: 'guadalajara', visibility: 'private',
};

function baseRecords() {
  return {
    cities,
    businesses: [campomar],
    events: [evGdl, evGdlMultiCiudad, evTepic, evMadrid, evPasado, evMultiDiaVigente, evMultiDiaTerminado, evPrivado],
    experiences: [],
    reviews: [],
  };
}

const request = (path, host = 'citymap.mx', agent = 'Googlebot') => new Request(`https://${host}${path}`, { headers: { 'user-agent': agent } });
const json = data => new Response(JSON.stringify(data), { headers: { 'content-type': 'application/json' } });
const ldScripts = html => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(m => JSON.parse(m[1]));

let records;
beforeEach(() => {
  records = baseRecords();
  vi.stubGlobal('fetch', vi.fn(async url => {
    const parsed = new URL(url);
    const table = parsed.pathname.split('/').pop();
    return json(records[table] || []);
  }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('og home: eventos próximos + enlaces a ciudades', () => {
  it('lista los eventos próximos con enlace canónico, fecha y recinto', async () => {
    const response = await og(request('/api/og'));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<h2>Próximos eventos</h2>');
    expect(html).toContain('Concierto de Prueba en Guadalajara');
    expect(html).toContain('href="https://citymap.mx/evento/guadalajara/concierto-de-prueba"');
    expect(html).toContain('14 de mayo de 2027');
    expect(html).toContain('Teatro Diana');
    expect(html).toContain('Festival Multi Ciudad');
    expect(html).toContain('Concierto en Tepic');
    // Multi-día vigente sí; pasado, terminado y privado no.
    expect(html).toContain('Festival Largo Vigente');
    expect(html).not.toContain('Evento Pasado');
    expect(html).not.toContain('Festival Largo Terminado');
    expect(html).not.toContain('Evento Privado');
    // Título/descripción genéricos y JSON-LD WebSite+Organization intactos.
    expect(html).toContain('CityMap México — Descubre tu ciudad');
    const nodes = ldScripts(html)[0];
    expect(nodes['@graph'].map(n => n['@type'])).toEqual(['WebSite', 'Organization']);
  });

  it('enlaza las ciudades mexicanas y no las internacionales', async () => {
    const html = await (await og(request('/api/og'))).text();
    expect(html).toContain('<h2>Ciudades</h2>');
    expect(html).toContain('href="https://citymap.mx/guadalajara">Guadalajara</a>');
    expect(html).toContain('href="https://citymap.mx/zapopan">Zapopan</a>');
    expect(html).toContain('href="https://citymap.mx/tepic">Tepic</a>');
    expect(html).not.toContain('Madrid');
    expect(html).not.toContain('Concierto en Madrid');
  });

  it('en .world la home lista eventos internacionales y enlaza sus ciudades', async () => {
    const html = await (await og(request('/api/og', 'citymap.world'))).text();
    expect(html).toContain('Concierto en Madrid');
    expect(html).toContain('href="https://www.citymap.world/evento/madrid/concierto-en-madrid"');
    expect(html).toContain('href="https://www.citymap.world/es/madrid">Madrid</a>');
    expect(html).not.toContain('Concierto de Prueba en Guadalajara');
    expect(html).not.toContain('Guadalajara');
  });
});

describe('og ciudad: eventos de ESA ciudad', () => {
  it('Guadalajara lista sus eventos (incluido el multi-ciudad) y mantiene los negocios', async () => {
    const response = await og(request('/api/og?city=guadalajara&_bot=1'));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<h2>Próximos eventos</h2>');
    expect(html).toContain('Concierto de Prueba en Guadalajara');
    expect(html).toContain('href="https://citymap.mx/evento/guadalajara/concierto-de-prueba"');
    expect(html).toContain('Festival Multi Ciudad');
    expect(html).toContain('Festival Largo Vigente');
    expect(html).not.toContain('Concierto en Tepic');
    expect(html).not.toContain('Concierto en Madrid');
    expect(html).not.toContain('Evento Pasado');
    expect(html).not.toContain('Festival Largo Terminado');
    expect(html).not.toContain('Evento Privado');
    // El listado de negocios que ya existía sigue ahí.
    expect(html).toContain('Campomar Punto Sur');
    expect(html).toContain('Lugares en esta ciudad');
  });

  it('Zapopan lista el evento multi-ciudad pero no los solo de Guadalajara', async () => {
    const html = await (await og(request('/api/og?city=zapopan&_bot=1'))).text();
    expect(html).toContain('Festival Multi Ciudad');
    expect(html).not.toContain('Concierto de Prueba en Guadalajara');
    expect(html).not.toContain('Concierto en Tepic');
  });

  it('Tepic lista solo su evento', async () => {
    const html = await (await og(request('/api/og?city=tepic&_bot=1'))).text();
    expect(html).toContain('Concierto en Tepic');
    expect(html).not.toContain('Concierto de Prueba en Guadalajara');
    expect(html).not.toContain('Festival Multi Ciudad');
  });
});

describe('og /eventos/:ciudad: mismo listado de próximos', () => {
  it('lleva los eventos próximos de esa ciudad y no los de otra', async () => {
    const response = await og(request('/api/og?vista=eventos&city=guadalajara&_bot=1'));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('Cartelera de Eventos en Guadalajara');
    expect(html).toContain('<h2>Próximos eventos</h2>');
    expect(html).toContain('Concierto de Prueba en Guadalajara');
    expect(html).toContain('href="https://citymap.mx/evento/guadalajara/concierto-de-prueba"');
    expect(html).toContain('Festival Multi Ciudad');
    expect(html).not.toContain('Concierto en Tepic');
    expect(html).not.toContain('Evento Pasado');
  });
});

describe('og ficha de evento: sin cambios (regresión)', () => {
  it('sigue sirviendo el Event completo con su canónica y sin listado', async () => {
    records.events = [evGdl];
    const response = await og(request('/api/og?ev=a298e115-aaa6-48cf-8ff8-303885b3ec17&city=guadalajara&_bot=1'));
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<link rel="canonical" href="https://citymap.mx/evento/guadalajara/concierto-de-prueba"/>');
    const nodes = ldScripts(html)[0];
    const event = nodes.find(n => n['@type'] === 'Event');
    expect(event).toBeDefined();
    expect(event.name).toBe('Concierto de Prueba en Guadalajara');
    expect(event.startDate).toBe('2027-05-14T21:00:00-06:00');
    expect(event.location).toMatchObject({ '@type': 'Place', name: 'Teatro Diana' });
    expect(html).not.toContain('<h2>Próximos eventos</h2>');
  });
});
