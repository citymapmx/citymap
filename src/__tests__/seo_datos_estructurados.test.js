import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import og from '../../api/og.js';
import {
  parseTimeTo24,
  scheduleToOpeningHours,
  tzOffsetString,
  eventStartDate,
  eventEndDate,
  eventStatusUrl,
  parseEventOfferPrice,
  parseEventTicketUrl,
  eventOffer,
  breadcrumbList,
  faqPage,
} from '../lib/structuredData.js';

// Fase 2 del plan SEO (12 nov 2026): completar los datos estructurados
// de api/og.js (el HTML que reciben los bots): offers en Event, startDate
// con hora, endDate, eventStatus, openingHours en formato schema.org,
// fallback de description, BreadcrumbList y FAQPage en /negocios.

const cities = [
  { slug: 'tepic', country_code: 'mx', bg_image: null },
  { slug: 'guadalajara', country_code: 'mx', bg_image: null },
];

const campomar = {
  id: 'biz-campomar', slug: 'guadalajara-campomar-punto-sur', city_slug: 'guadalajara',
  name: 'Campomar Punto Sur', tagline: null, description: null,
  address: 'Av. Punto Sur 123', rating: 4.8, review_count: 120,
  category: 'restaurantes', photos: [], lat: 20.6, lng: -103.4,
  // Dato real de la base: la apertura dice "12:30 a.m." (parece un error
  // de captura; debería ser p.m.). Se convierte fielmente a 00:30.
  schedule: {
    dom: '12:30 a.m. - 08:30 p.m.',
    jue: '12:30 a.m. - 10:30 p.m.',
    lun: '12:30 a.m. - 10:30 p.m.',
    mar: '12:30 a.m. - 10:30 p.m.',
    mie: '12:30 a.m. - 10:30 p.m.',
    sab: '12:00 a.m. - 10:30 p.m.',
    vie: '12:00 a.m. - 10:30 p.m.',
  },
};

const conDescripcion = {
  id: 'biz-2', slug: 'tepic-cafe-bros', city_slug: 'tepic',
  name: 'Café Bros Company', tagline: null, description: 'Café de especialidad en Tepic.',
  address: 'Calle Falsa 1', rating: null, review_count: 0,
  category: 'cafe', photos: [], lat: null, lng: null, schedule: {},
};

// Fechas en 2027 para que el test no dependa del día en que se corre.
const eventoPago = {
  id: 'a298e115-aaa6-48cf-8ff8-303885b3ec17', slug: 'guadalajara-concierto-de-prueba',
  title: 'Concierto de Prueba en Guadalajara', description: 'Concierto de prueba.',
  date: '2027-05-14', time: '21:00', end_date: null, end_time: null,
  price: '850', price_type: 'paid',
  website: 'https://www.ticketmaster.com.mx/evento-prueba',
  status: 'approved', venue_name: 'Teatro Diana',
  venue_address: 'Av. 16 de Septiembre 710', lat: 20.6652609, lng: -103.349093,
  img_url: 'https://images.test/evento.webp', img: null,
  event_category: 'Concierto', city_slug: 'guadalajara',
};

const eventoGratisMultiDia = {
  id: 'b298e115-aaa6-48cf-8ff8-303885b3ec18', slug: 'guadalajara-festival-gratis',
  title: 'Festival Gratis', description: 'Festival gratuito.',
  date: '2027-06-01', time: '18:00', end_date: '2027-06-03', end_time: '23:00',
  price: '', price_type: 'gratis',
  website: '{"enabled":true,"type":"external","externalLinks":[{"platform":"comprar_entradas","url":"https://boletos.test/festival"}]}',
  status: 'approved', venue_name: 'Parque Central', venue_address: null,
  lat: null, lng: null, img_url: null, img: null,
  event_category: 'Festival', city_slug: 'guadalajara',
};

const eventoPasadoSinPrecio = {
  id: 'c298e115-aaa6-48cf-8ff8-303885b3ec19', slug: 'guadalajara-evento-pasado',
  title: 'Evento Pasado', description: 'Ya pasó.',
  date: '2026-01-10', time: '20:00', end_date: null, end_time: null,
  price: '', price_type: 'paid', website: null, status: 'approved',
  venue_name: 'Foro Viejo', venue_address: null, lat: null, lng: null,
  img_url: null, img: null, event_category: 'Concierto', city_slug: 'guadalajara',
};

function baseRecords() {
  return {
    cities,
    businesses: [campomar, conDescripcion],
    events: [eventoPago, eventoGratisMultiDia, eventoPasadoSinPrecio],
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

describe('parseTimeTo24: de 12 h a 24 h', () => {
  it.each([
    ['12:30 a.m.', '00:30'],
    ['12:30 p.m.', '12:30'],
    ['01:00 p.m.', '13:00'],
    ['08:45 a.m.', '08:45'],
    ['11:00 p.m.', '23:00'],
    ['22:00', '22:00'],
    ['9:00', '09:00'],
  ])('%s -> %s', (input, expected) => {
    expect(parseTimeTo24(input)).toBe(expected);
  });
  it.each([['cerrado', null], ['', null], [null, null], ['25:00', null], ['mañana', null]])(
    '%s -> null', (input) => { expect(parseTimeTo24(input)).toBeNull(); },
  );
});

describe('scheduleToOpeningHours: formato válido de schema.org', () => {
  it('convierte el horario de Campomar fielmente (12:30 a.m. -> 00:30)', () => {
    expect(scheduleToOpeningHours(campomar.schedule)).toEqual([
      'Mo 00:30-22:30',
      'Tu 00:30-22:30',
      'We 00:30-22:30',
      'Th 00:30-22:30',
      'Fr 00:00-22:30',
      'Sa 00:00-22:30',
      'Su 00:30-20:30',
    ]);
  });
  it('turno nocturno en 24 h se deja como está', () => {
    expect(scheduleToOpeningHours({ jue: '22:00 – 03:00' })).toEqual(['Th 22:00-03:00']);
  });
  it('salta Cerrado, claves desconocidas y valores sin interpretar', () => {
    expect(scheduleToOpeningHours({
      lun: 'Cerrado', mar: '08:45 a.m. - 11:00 p.m.', type: 'normal', foo: '09:00 - 18:00',
    })).toEqual(['Tu 08:45-23:00']);
    expect(scheduleToOpeningHours({})).toEqual([]);
    expect(scheduleToOpeningHours(null)).toEqual([]);
  });
  it('varios turnos en un día separados por coma', () => {
    expect(scheduleToOpeningHours({ lun: '09:00 a.m. - 02:00 p.m., 05:00 p.m. - 10:00 p.m.' }))
      .toEqual(['Mo 09:00-14:00', 'Mo 17:00-22:00']);
  });
});

describe('tzOffsetString', () => {
  it('México no tiene horario de verano: -06:00 en Guadalajara, -07:00 en Tepic', () => {
    expect(tzOffsetString('America/Mexico_City', '2027-05-14')).toBe('-06:00');
    expect(tzOffsetString('America/Mazatlan', '2027-05-14')).toBe('-07:00');
    expect(tzOffsetString('Europe/Madrid', '2027-05-14')).toBe('+02:00');
  });
  it('zona inválida -> null', () => {
    expect(tzOffsetString('No/Existe', '2027-05-14')).toBeNull();
  });
});

describe('eventStartDate / eventEndDate', () => {
  it('fecha + hora con desplazamiento de la ciudad', () => {
    expect(eventStartDate(eventoPago, 'America/Mexico_City')).toBe('2027-05-14T21:00:00-06:00');
    expect(eventStartDate(eventoPago, 'America/Mazatlan')).toBe('2027-05-14T21:00:00-07:00');
  });
  it('sin hora, solo la fecha; sin fecha, undefined', () => {
    expect(eventStartDate({ date: '2027-05-14', time: '' })).toBe('2027-05-14');
    expect(eventStartDate({ date: '2027-05-14', time: null })).toBe('2027-05-14');
    expect(eventStartDate({})).toBeUndefined();
  });
  it('endDate con end_date + end_time; sin end_date, el inicio', () => {
    expect(eventEndDate(eventoGratisMultiDia, 'America/Mexico_City')).toBe('2027-06-03T23:00:00-06:00');
    expect(eventEndDate(eventoPago, 'America/Mexico_City')).toBe('2027-05-14T21:00:00-06:00');
    expect(eventEndDate({ date: '2027-05-14' }, 'America/Mexico_City')).toBe('2027-05-14');
  });
});

describe('eventStatusUrl', () => {
  it('approved -> EventScheduled; cancelado/pospuesto se mapean', () => {
    expect(eventStatusUrl('approved')).toBe('https://schema.org/EventScheduled');
    expect(eventStatusUrl('cancelled')).toBe('https://schema.org/EventCancelled');
    expect(eventStatusUrl('postponed')).toBe('https://schema.org/EventPostponed');
    expect(eventStatusUrl(undefined)).toBe('https://schema.org/EventScheduled');
  });
});

describe('parseEventOfferPrice: precio mínimo real, nunca inventado', () => {
  it.each([
    ['850', 'paid', { price: 850, priceCurrency: 'MXN' }],
    ['$2,320 MXN', 'paid', { price: 2320, priceCurrency: 'MXN' }],
    ['500 - 1200', 'paid', { price: 500, priceCurrency: 'MXN' }],
    ['92', 'paid', { price: 92, priceCurrency: 'MXN' }],
    ['$100 USD', 'paid', { price: 100, priceCurrency: 'USD' }],
    ['', 'gratis', { price: 0, priceCurrency: 'MXN' }],
    ['0', 'paid', { price: 0, priceCurrency: 'MXN' }],
  ])('%s (%s) -> %j', (price, type, expected) => {
    expect(parseEventOfferPrice({ price, price_type: type })).toEqual(expected);
  });
  it('sin precio publicado -> null', () => {
    expect(parseEventOfferPrice({ price: '', price_type: 'paid' })).toBeNull();
    expect(parseEventOfferPrice({ price: null, price_type: 'paid' })).toBeNull();
    expect(parseEventOfferPrice({ price: 'Gratis', price_type: 'paid' })).toBeNull();
  });
});

describe('parseEventTicketUrl: enlace real de boletos', () => {
  it('URL plana tal cual', () => {
    expect(parseEventTicketUrl({ website: 'https://www.ticketmaster.com.mx/evento' }))
      .toBe('https://www.ticketmaster.com.mx/evento');
  });
  it('website con JSON de booking_config: primer externalLink válido', () => {
    expect(parseEventTicketUrl(eventoGratisMultiDia)).toBe('https://boletos.test/festival');
    expect(parseEventTicketUrl({
      website: '{"enabled":true,"type":"external","externalLinks":[{"platform":"x","url":"nota-url"},{"platform":"y","url":"https://segundo.test/"}]}',
    })).toBe('https://segundo.test/');
  });
  it('sin website o inválido -> null', () => {
    expect(parseEventTicketUrl({ website: null })).toBeNull();
    expect(parseEventTicketUrl({ website: 'nota-url' })).toBeNull();
    expect(parseEventTicketUrl({})).toBeNull();
  });
});

describe('eventOffer', () => {
  it('evento futuro de pago: precio, disponibilidad y URL', () => {
    expect(eventOffer(eventoPago, '2027-01-01')).toEqual({
      '@type': 'Offer',
      price: 850,
      priceCurrency: 'MXN',
      availability: 'https://schema.org/InStock',
      url: 'https://www.ticketmaster.com.mx/evento-prueba',
    });
  });
  it('evento gratuito multi-día: precio 0 y URL del JSON', () => {
    expect(eventOffer(eventoGratisMultiDia, '2027-01-01')).toEqual({
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'MXN',
      availability: 'https://schema.org/InStock',
      url: 'https://boletos.test/festival',
    });
  });
  it('evento pasado: sin disponibilidad (no se inventa agotado)', () => {
    const offer = eventOffer(eventoPago, '2027-06-01');
    expect(offer.availability).toBeUndefined();
    expect(offer.price).toBe(850);
  });
  it('sin precio publicado -> null', () => {
    expect(eventOffer(eventoPasadoSinPrecio, '2026-01-01')).toBeNull();
  });
});

describe('breadcrumbList / faqPage', () => {
  it('construyen los nodos con posiciones 1..N', () => {
    expect(breadcrumbList([
      { name: 'Inicio', item: 'https://citymap.mx' },
      { name: 'Guadalajara', item: 'https://citymap.mx/guadalajara' },
    ])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://citymap.mx' },
        { '@type': 'ListItem', position: 2, name: 'Guadalajara', item: 'https://citymap.mx/guadalajara' },
      ],
    });
    expect(faqPage([{ q: '¿Cuánto?', a: 'Nada.' }])).toEqual({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [{ '@type': 'Question', name: '¿Cuánto?', acceptedAnswer: { '@type': 'Answer', text: 'Nada.' } }],
    });
  });
});

describe('og evento: Event completo + BreadcrumbList', () => {
  it('offers con precio real, startDate con hora, endDate, eventStatus y migas', async () => {
    const response = await og(request('/api/og?ev=a298e115-aaa6-48cf-8ff8-303885b3ec17&city=guadalajara&_bot=1'));
    expect(response.status).toBe(200);
    const nodes = ldScripts(await response.text())[0];
    const event = nodes.find(n => n['@type'] === 'Event');
    expect(event).toBeDefined();
    expect(event.startDate).toBe('2027-05-14T21:00:00-06:00');
    expect(event.endDate).toBe('2027-05-14T21:00:00-06:00');
    expect(event.eventStatus).toBe('https://schema.org/EventScheduled');
    expect(event.eventAttendanceMode).toBe('https://schema.org/OfflineEventAttendanceMode');
    expect(event.offers).toEqual({
      '@type': 'Offer',
      price: 850,
      priceCurrency: 'MXN',
      availability: 'https://schema.org/InStock',
      url: 'https://www.ticketmaster.com.mx/evento-prueba',
    });
    expect(event.location).toMatchObject({
      '@type': 'Place',
      name: 'Teatro Diana',
      address: { '@type': 'PostalAddress', streetAddress: 'Av. 16 de Septiembre 710' },
      geo: { '@type': 'GeoCoordinates', latitude: 20.6652609, longitude: -103.349093 },
    });
    const crumbs = nodes.find(n => n['@type'] === 'BreadcrumbList');
    expect(crumbs.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://citymap.mx' },
      { '@type': 'ListItem', position: 2, name: 'Guadalajara', item: 'https://citymap.mx/guadalajara' },
      { '@type': 'ListItem', position: 3, name: 'Concierto de Prueba en Guadalajara', item: 'https://citymap.mx/evento/guadalajara/concierto-de-prueba' },
    ]);
  });

  it('evento gratis multi-día: precio 0, endDate con end_time y URL del JSON', async () => {
    records.events = [eventoGratisMultiDia];
    const response = await og(request('/api/og?ev=b298e115-aaa6-48cf-8ff8-303885b3ec18&city=guadalajara&_bot=1'));
    expect(response.status).toBe(200);
    const nodes = ldScripts(await response.text())[0];
    const event = nodes.find(n => n['@type'] === 'Event');
    expect(event.startDate).toBe('2027-06-01T18:00:00-06:00');
    expect(event.endDate).toBe('2027-06-03T23:00:00-06:00');
    expect(event.offers).toEqual({
      '@type': 'Offer',
      price: 0,
      priceCurrency: 'MXN',
      availability: 'https://schema.org/InStock',
      url: 'https://boletos.test/festival',
    });
  });

  it('evento pasado sin precio: sin offers', async () => {
    records.events = [eventoPasadoSinPrecio];
    const response = await og(request('/api/og?ev=c298e115-aaa6-48cf-8ff8-303885b3ec19&city=guadalajara&_bot=1'));
    expect(response.status).toBe(200);
    const nodes = ldScripts(await response.text())[0];
    const event = nodes.find(n => n['@type'] === 'Event');
    expect(event.startDate).toBe('2026-01-10T20:00:00-06:00');
    expect(event.offers).toBeUndefined();
  });
});

describe('og negocio: openingHours válido, description con fallback y migas', () => {
  it('Campomar: horario en formato schema.org y descripción nunca vacía', async () => {
    const response = await og(request('/api/og?b=campomar-punto-sur&city=guadalajara&_bot=1'));
    expect(response.status).toBe(200);
    const nodes = ldScripts(await response.text())[0];
    const biz = nodes.find(n => n['@type'] === 'LocalBusiness');
    expect(biz).toBeDefined();
    expect(biz.description).toBe('Campomar Punto Sur en Guadalajara: horarios y reseñas en CityMap México.');
    expect(biz.openingHours).toEqual([
      'Mo 00:30-22:30',
      'Tu 00:30-22:30',
      'We 00:30-22:30',
      'Th 00:30-22:30',
      'Fr 00:00-22:30',
      'Sa 00:00-22:30',
      'Su 00:30-20:30',
    ]);
    expect(JSON.stringify(biz.openingHours)).not.toContain('Monday');
    expect(JSON.stringify(biz.openingHours)).not.toContain('a.m.');
    const crumbs = nodes.find(n => n['@type'] === 'BreadcrumbList');
    expect(crumbs.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://citymap.mx' },
      { '@type': 'ListItem', position: 2, name: 'Guadalajara', item: 'https://citymap.mx/guadalajara' },
      { '@type': 'ListItem', position: 3, name: 'Campomar Punto Sur', item: 'https://citymap.mx/guadalajara/campomar-punto-sur' },
    ]);
  });

  it('con descripción y sin horario: se usa la descripción y no hay openingHours', async () => {
    records.businesses = [conDescripcion];
    const response = await og(request('/api/og?b=cafe-bros&city=tepic&_bot=1'));
    expect(response.status).toBe(200);
    const nodes = ldScripts(await response.text())[0];
    const biz = nodes.find(n => n['@type'] === 'LocalBusiness');
    expect(biz.description).toBe('Café de especialidad en Tepic.');
    expect(biz.openingHours).toBeUndefined();
  });
});

describe('og ciudad y categoría: BreadcrumbList', () => {
  it('la ciudad lleva Inicio -> ciudad', async () => {
    const response = await og(request('/api/og?city=guadalajara&_bot=1'));
    expect(response.status).toBe(200);
    const [crumbs] = ldScripts(await response.text());
    expect(crumbs['@type']).toBe('BreadcrumbList');
    expect(crumbs.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://citymap.mx' },
      { '@type': 'ListItem', position: 2, name: 'Guadalajara', item: 'https://citymap.mx/guadalajara' },
    ]);
  });

  it('la categoría lleva Inicio -> ciudad -> categoría', async () => {
    const response = await og(request('/api/og?b=restaurantes&city=guadalajara&_bot=1'));
    expect(response.status).toBe(200);
    const [crumbs] = ldScripts(await response.text());
    expect(crumbs['@type']).toBe('BreadcrumbList');
    expect(crumbs.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://citymap.mx' },
      { '@type': 'ListItem', position: 2, name: 'Guadalajara', item: 'https://citymap.mx/guadalajara' },
      { '@type': 'ListItem', position: 3, name: 'Restaurantes', item: 'https://citymap.mx/guadalajara/restaurantes' },
    ]);
  });
});

describe('og vista=negocios: FAQPage con las 6 preguntas de la landing', () => {
  it('devuelve FAQPage con las mismas preguntas y respuestas del HTML', async () => {
    const response = await og(request('/api/og?vista=negocios&_bot=1'));
    expect(response.status).toBe(200);
    const html = await response.text();
    const [faq] = ldScripts(html);
    expect(faq['@type']).toBe('FAQPage');
    expect(faq.mainEntity).toHaveLength(6);
    expect(faq.mainEntity[0].name).toBe('¿Cuánto cuesta empezar?');
    expect(faq.mainEntity[0].acceptedAnswer.text).toContain('gratis');
    const citiesQ = faq.mainEntity.find(q => q.name === '¿En qué ciudades está CityMap?');
    expect(citiesQ.acceptedAnswer.text).toContain('En 2 ciudades');
    // El HTML sigue llevando las mismas preguntas.
    expect(html).toContain('¿Cuánto cuesta empezar?');
    expect(html).toContain('En 2 ciudades');
  });
});
