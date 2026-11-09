import { describe, it, expect } from 'vitest';
import { parseDurationToISO, bookingUrlOf, tourSchemaNodes } from '../lib/tourSchema.js';

describe('parseDurationToISO', () => {
  it('convierte duraciones reales de los tours', () => {
    expect(parseDurationToISO('8 horas 30 minutos')).toBe('PT8H30M');
    expect(parseDurationToISO('10 horas 30 minutos')).toBe('PT10H30M');
    expect(parseDurationToISO('5–6 horas')).toBe('PT5H');
    expect(parseDurationToISO('1 hora 30 minutos - 2 horas')).toBe('PT1H30M');
    expect(parseDurationToISO('2 horas - 3 horas')).toBe('PT2H');
    expect(parseDurationToISO('3 horas')).toBe('PT3H');
    expect(parseDurationToISO('1 hora 15 minutos - 1 hora 30 minutos')).toBe('PT1H15M');
  });
  it('devuelve null sin horas', () => {
    expect(parseDurationToISO('')).toBeNull();
    expect(parseDurationToISO(null)).toBeNull();
    expect(parseDurationToISO('Día completo')).toBeNull();
  });
});

describe('tourSchemaNodes', () => {
  const tour = {
    title: 'Excursión a Guachimontones',
    description: 'A una hora de Guadalajara hay un lugar único en México.',
    activity_type: 'Tour',
    price: 1475.1,
    duration: '5–6 horas',
    gallery: ['https://ejemplo.com/foto.webp'],
    booking_config: {
      type: 'external',
      externalLinks: [{ url: 'https://www.civitatis.com/es/guadalajara/excursion-guachimontones?aid=114552', platform: 'civitatis' }],
    },
  };
  const url = 'https://citymap.mx/revista/guadalajara/guadalajara-excursion-a-guachimontones';

  it('devuelve TouristTrip + Product con precio MXN y enlace de afiliado', () => {
    const nodes = tourSchemaNodes(tour, url, tour.gallery[0]);
    expect(nodes).toHaveLength(2);
    const [trip, product] = nodes;
    expect(trip['@type']).toBe('TouristTrip');
    expect(trip.name).toBe(tour.title);
    expect(trip.url).toBe(url);
    expect(trip.duration).toBe('PT5H');
    expect(product['@type']).toBe('Product');
    expect(product.offers.price).toBe(1475.1);
    expect(product.offers.priceCurrency).toBe('MXN');
    expect(product.offers.url).toContain('?aid=114552');
  });

  it('sin precio no emite Product', () => {
    const nodes = tourSchemaNodes({ ...tour, price: 0 }, url, tour.gallery[0]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0]['@type']).toBe('TouristTrip');
  });

  it('sin enlace de reserva usa la URL canónica', () => {
    const nodes = tourSchemaNodes({ ...tour, booking_config: {} }, url, tour.gallery[0]);
    expect(nodes[1].offers.url).toBe(url);
  });

  it('para no-tours devuelve []', () => {
    expect(tourSchemaNodes({ ...tour, activity_type: 'Blog' }, url, tour.gallery[0])).toEqual([]);
    expect(tourSchemaNodes(null, url, null)).toEqual([]);
  });
});

describe('bookingUrlOf', () => {
  it('usa el primer enlace externo o la canónica', () => {
    expect(bookingUrlOf({ booking_config: { externalLinks: [{ url: 'https://x.com/a' }] } }, 'https://citymap.mx/c'))
      .toBe('https://x.com/a');
    expect(bookingUrlOf({}, 'https://citymap.mx/c')).toBe('https://citymap.mx/c');
  });
});
