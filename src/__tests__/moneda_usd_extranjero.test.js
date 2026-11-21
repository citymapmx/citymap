import { describe, it, expect } from 'vitest';
import { currencyForCity, currencyForCountryCode } from '../lib/domain.js';
import { formatTourPrice, tourPriceLabel } from '../lib/tours.js';

// Moneda de los precios de tours y experiencias (regla 19 Nov 2026:
// todo lo extranjero a México va en dólares). Fuente de verdad: el
// country_code de la ciudad en la base; una ciudad desconocida (o sin
// country_code) se trata como mexicana, igual que en el resto del código.
const CITIES = [
  { slug: 'guadalajara', country_code: 'mx' },
  { slug: 'tepic', country_code: 'mx' },
  { slug: 'paris', country_code: 'fr' },
  { slug: 'madrid', country_code: 'es' },
  { slug: 'barcelona', country_code: 'es' },
  { slug: 'londres', country_code: 'gb' },
  { slug: 'new-york', country_code: 'us' },
  { slug: 'los-angeles', country_code: 'us' },
  { slug: 'san-antonio', country_code: 'us' },
  { slug: 'vancouver', country_code: 'ca' },
  { slug: 'medellin', country_code: 'co' },
  { slug: 'bogota', country_code: 'co' },
  { slug: 'buenos-aires', country_code: 'ar' },
];

const FOREIGN = [
  'paris', 'madrid', 'barcelona', 'londres', 'new-york', 'los-angeles',
  'san-antonio', 'vancouver', 'medellin', 'bogota', 'buenos-aires',
];

describe('currencyForCity', () => {
  it('México en MXN, extranjero en USD', () => {
    expect(currencyForCity('guadalajara', CITIES)).toBe('MXN');
    expect(currencyForCity('tepic', CITIES)).toBe('MXN');
    for (const slug of FOREIGN) {
      expect(currencyForCity(slug, CITIES)).toBe('USD');
    }
  });

  it('ciudad desconocida o sin lista se trata como mexicana', () => {
    expect(currencyForCity('ciudad-que-no-existe', CITIES)).toBe('MXN');
    expect(currencyForCity('guadalajara', [])).toBe('MXN');
    expect(currencyForCity(null, CITIES)).toBe('MXN');
  });
});

describe('currencyForCountryCode', () => {
  it('mx → MXN, resto → USD (sin importar mayúsculas)', () => {
    expect(currencyForCountryCode('mx')).toBe('MXN');
    expect(currencyForCountryCode('MX')).toBe('MXN');
    for (const cc of ['fr', 'es', 'us', 'co', 'ar', 'gb', 'ca', 'jp']) {
      expect(currencyForCountryCode(cc)).toBe('USD');
    }
    expect(currencyForCountryCode(null)).toBe('MXN');
    expect(currencyForCountryCode('')).toBe('MXN');
  });
});

describe('precio de tour según la ciudad (integración)', () => {
  it('la etiqueta del tour usa la moneda de su ciudad', () => {
    const prado = { price: 25.67, city_slug: 'madrid' };
    expect(tourPriceLabel(prado, 'es', currencyForCity(prado.city_slug, CITIES)))
      .toBe('desde $25.67 USD');
    const tequila = { price: 1881, city_slug: 'guadalajara' };
    expect(tourPriceLabel(tequila, 'es', currencyForCity(tequila.city_slug, CITIES)))
      .toBe('desde $1,881 MXN');
    const ny = { price: 40.88, city_slug: 'new-york' };
    expect(tourPriceLabel(ny, 'es', currencyForCity(ny.city_slug, CITIES)))
      .toBe('desde $40.88 USD');
    expect(formatTourPrice(40.88, 'en', currencyForCity('new-york', CITIES)))
      .toBe('from $40.88 USD');
  });
});
