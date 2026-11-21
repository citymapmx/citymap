import { describe, expect, it } from 'vitest';
import {
  cityHomeSlugFromPath,
  crossDomainCityUrl,
} from '../lib/seoRoutes.js';
import { parseSegments } from '../lib/domain.js';

// Navegación de ciudades del inicio global (21 nov 2026): tocar una
// ciudad del muro abría otra (Madrid abría París) o dejaba la ciudad
// guardada, porque navigate() resolvía la ciudad con la lista del store
// y buildCityPath('madrid') en .world es '/es/madrid', que nunca
// igualaba a '/madrid'. El arreglo resuelve la ciudad desde la ruta
// con listas estáticas (cityHomeSlugFromPath).

describe('cityHomeSlugFromPath', () => {
  it('/madrid en .world → madrid', () => {
    expect(cityHomeSlugFromPath('/madrid', true)).toBe('madrid');
  });
  it('/es/madrid → madrid', () => {
    expect(cityHomeSlugFromPath('/es/madrid', true)).toBe('madrid');
  });
  it('/tokio → tokio', () => {
    expect(cityHomeSlugFromPath('/tokio', true)).toBe('tokio');
  });
  it('/jp/tokio → tokio', () => {
    expect(cityHomeSlugFromPath('/jp/tokio', true)).toBe('tokio');
  });
  it('/jp/kioto → kioto', () => {
    expect(cityHomeSlugFromPath('/jp/kioto', true)).toBe('kioto');
  });
  it('/fr/paris → paris', () => {
    expect(cityHomeSlugFromPath('/fr/paris', true)).toBe('paris');
  });
  it('/tepic en .mx → tepic', () => {
    expect(cityHomeSlugFromPath('/tepic', false)).toBe('tepic');
  });
  it('/mx/guadalajara en .world → guadalajara', () => {
    expect(cityHomeSlugFromPath('/mx/guadalajara', true)).toBe('guadalajara');
  });
  it('/tepic/restaurantes no es la página principal de una ciudad', () => {
    expect(cityHomeSlugFromPath('/tepic/restaurantes', false)).toBeNull();
  });
  it('/eventos/madrid no es una ciudad', () => {
    expect(cityHomeSlugFromPath('/eventos/madrid', false)).toBeNull();
  });
  it('/mapa no es una ciudad', () => {
    expect(cityHomeSlugFromPath('/mapa', false)).toBeNull();
  });
  it('/ no es una ciudad', () => {
    expect(cityHomeSlugFromPath('/', false)).toBeNull();
  });
});

describe('parseSegments con Japón', () => {
  it("['jp','tokio'] → { segments: ['tokio'], countryCode: 'jp' }", () => {
    expect(parseSegments(['jp', 'tokio'])).toEqual({ segments: ['tokio'], countryCode: 'jp' });
  });
});

describe('crossDomainCityUrl con Japón', () => {
  it('/tokio en .mx → https://www.citymap.world/jp/tokio', () => {
    expect(crossDomainCityUrl('/tokio', false)).toBe('https://www.citymap.world/jp/tokio');
  });
  it('/jp/tokio en .world ya es canónica → null', () => {
    expect(crossDomainCityUrl('/jp/tokio', true)).toBeNull();
  });
  it('/madrid en .world ya es canónica → null', () => {
    expect(crossDomainCityUrl('/madrid', true)).toBeNull();
  });
  it('/es/madrid en .mx → https://www.citymap.world/es/madrid', () => {
    expect(crossDomainCityUrl('/es/madrid', false)).toBe('https://www.citymap.world/es/madrid');
  });
});
