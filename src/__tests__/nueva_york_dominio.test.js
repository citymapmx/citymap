// Nueva York es ciudad fantasma entre dominios (C2, auditoría 21 nov 2026):
// el selector la mandaba a .world por country_code ('us') pero el salto
// en cliente (crossDomainCityUrl, lista estática WORLD_CITIES) la
// devolvía a .mx, doble salto y muro vacío. Nueva York pertenece a
// .world como las demás ciudades extranjeras: WORLD_CITIES debe
// coincidir con la base (country_code) en las 14 ciudades.
import { describe, expect, it } from 'vitest';
import {
  WORLD_CITIES,
  isWorldCitySlug,
  worldCityCountry,
  crossDomainCityUrl,
  cityHomeSlugFromPath,
} from '../lib/seoRoutes.js';
import {
  isWorldCity,
  hostIncludesCity,
  buildCityUrl,
  citySelectionTarget,
} from '../lib/domain.js';

// Las 14 ciudades extranjeras según la base (cities.country_code,
// verificado por PostgREST 21 nov 2026). Si se da de alta otra ciudad
// fuera de México hay que añadirla aquí Y en WORLD_CITIES.
const FOREIGN_CITIES = [
  ['barcelona', 'es'],
  ['bogota', 'co'],
  ['buenos-aires', 'ar'],
  ['kioto', 'jp'],
  ['londres', 'gb'],
  ['los-angeles', 'us'],
  ['madrid', 'es'],
  ['medellin', 'co'],
  ['new-york', 'us'],
  ['paris', 'fr'],
  ['san-antonio', 'us'],
  ['san-diego', 'us'],
  ['tokio', 'jp'],
  ['vancouver', 'ca'],
];

const CITIES = [
  { slug: 'new-york', country_code: 'us' },
  { slug: 'guadalajara', country_code: 'mx' },
  { slug: 'madrid', country_code: 'es' },
  { slug: 'tepic', country_code: 'mx' },
];

describe('Nueva York es ciudad world (C2)', () => {
  it('WORLD_CITIES cubre las 14 ciudades extranjeras de la base, con su código', () => {
    expect(Object.keys(WORLD_CITIES).sort()).toEqual(
      FOREIGN_CITIES.map(([slug]) => slug).sort(),
    );
    for (const [slug, cc] of FOREIGN_CITIES) {
      expect(isWorldCitySlug(slug)).toBe(true);
      expect(worldCityCountry(slug)).toBe(cc);
    }
  });

  it('ninguna ciudad mexicana es internacional', () => {
    for (const slug of ['guadalajara', 'tepic', 'ciudad-de-mexico', 'zapopan', 'puerto-vallarta', 'cancun']) {
      expect(isWorldCitySlug(slug)).toBe(false);
      expect(worldCityCountry(slug)).toBe(null);
    }
  });

  it('Nueva York: un solo salto a .world, sin rebote de vuelta', () => {
    // En .mx salta a su canónica en .world, con o sin prefijo de país.
    expect(crossDomainCityUrl('/new-york', false)).toBe('https://www.citymap.world/us/new-york');
    expect(crossDomainCityUrl('/us/new-york', false)).toBe('https://www.citymap.world/us/new-york');
    expect(crossDomainCityUrl('/new-york/restaurantes', false)).toBe(
      'https://www.citymap.world/us/new-york/restaurantes',
    );
    // En .world ya está en su dominio: no hay salto, en ninguna forma.
    expect(crossDomainCityUrl('/new-york', true)).toBeNull();
    expect(crossDomainCityUrl('/us/new-york', true)).toBeNull();
  });

  it('la página principal de Nueva York en .world es /us/new-york', () => {
    expect(cityHomeSlugFromPath('/us/new-york', true)).toBe('new-york');
  });

  it('domain.js ya la trataba como world: selector y URL coinciden ahora', () => {
    // Estas pruebas corren como .mx (IS_WORLD false en el entorno de
    // pruebas): en .mx Nueva York NO es de este dominio.
    expect(isWorldCity('new-york', CITIES)).toBe(true);
    expect(hostIncludesCity('new-york', CITIES)).toBe(false);
    expect(buildCityUrl('new-york', CITIES)).toBe('https://www.citymap.world/us/new-york');
    expect(citySelectionTarget('new-york', CITIES)).toEqual({
      crossDomain: true,
      url: 'https://www.citymap.world/us/new-york',
    });
    // Y una mexicana sigue sin saltar.
    expect(hostIncludesCity('guadalajara', CITIES)).toBe(true);
    expect(citySelectionTarget('guadalajara', CITIES)).toEqual({ crossDomain: false, url: null });
  });
});
