import { describe, expect, it } from 'vitest';
import { COUNTRY_NAMES, COUNTRY_FLAGS, parseSegments } from '../lib/domain.js';

// Japón (21 nov 2026): Tokio y Kioto ya estaban en la base con
// country_code 'jp', pero estas dos listas solo tenían 8 países. El
// selector agrupaba 'jp' en México (COUNTRY_NAMES[cc] || "México") y
// el desplegable PAÍS del admin, que se construye de COUNTRY_NAMES,
// ni siquiera ofrecía Japón.
describe('Japón en las listas de países (domain)', () => {
  it("'jp' está en COUNTRY_NAMES con valor 'Japón'", () => {
    expect(COUNTRY_NAMES.jp).toBe('Japón');
    expect(Object.keys(COUNTRY_NAMES)).toHaveLength(9);
  });
  it("'jp' está en COUNTRY_FLAGS con la bandera de Japón", () => {
    expect(COUNTRY_FLAGS.jp).toBe('🇯🇵');
    expect(Object.keys(COUNTRY_FLAGS)).toHaveLength(9);
  });
  it("parseSegments reconoce 'jp' como prefijo de país", () => {
    expect(parseSegments(['jp', 'tokio'])).toEqual({ countryCode: 'jp', segments: ['tokio'] });
    expect(parseSegments(['jp', 'kioto', 'restaurantes'])).toEqual({ countryCode: 'jp', segments: ['kioto', 'restaurantes'] });
  });
});
