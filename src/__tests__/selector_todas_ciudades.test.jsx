import React from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import CountryPickerDropdown from '../components/CountryPickerDropdown.jsx';
import { buildCityUrl, citySelectionTarget } from '../lib/domain.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

// Selector de ciudad con TODAS las ciudades (nov 2026, Jonathan): las
// 33 en los dos dominios, agrupadas por país; elegir una ciudad del
// otro dominio salta a su URL canónica en ese dominio. La separación
// SEO por host (canónicas/sitemap/robots/308) no cambia.
const cities = [
  { slug: 'paris', name: 'París', country_code: 'fr' },
  { slug: 'madrid', name: 'Madrid', country_code: 'es' },
  { slug: 'tepic', name: 'Tepic', country_code: 'mx' },
  { slug: 'guadalajara', name: 'Guadalajara', country_code: 'mx' },
  { slug: 'zapopan', name: 'Zapopan', country_code: 'mx' },
  { slug: 'los-angeles', name: 'Los Ángeles', country_code: 'us' },
  { slug: 'vancouver', name: 'Vancouver', country_code: 'ca' },
];

const baseProps = {
  show: true,
  cities,
  activeCity: 'guadalajara',
  onSelectCity: () => {},
  onDetectCity: () => {},
  locating: false,
  onClose: () => {},
  dark: false,
  isWelcome: false,
  onGoToWall: () => {},
};

const renderPicker = (props = {}) => renderToStaticMarkup(
  <CountryPickerDropdown {...baseProps} {...props} />,
);

describe('buildCityUrl: la URL de una ciudad en SU dominio', () => {
  it('las mexicanas van a citymap.mx planas', () => {
    expect(buildCityUrl('tepic', cities)).toBe('https://citymap.mx/tepic');
    expect(buildCityUrl('guadalajara', cities)).toBe('https://citymap.mx/guadalajara');
  });
  it('las internacionales van a .world con prefijo de país', () => {
    expect(buildCityUrl('paris', cities)).toBe('https://www.citymap.world/fr/paris');
    expect(buildCityUrl('madrid', cities)).toBe('https://www.citymap.world/es/madrid');
    expect(buildCityUrl('los-angeles', cities)).toBe('https://www.citymap.world/us/los-angeles');
    expect(buildCityUrl('vancouver', cities)).toBe('https://www.citymap.world/ca/vancouver');
  });
  it('una ciudad desconocida se trata como mexicana (convención del resto del código)', () => {
    expect(buildCityUrl('ciudad-desconocida', cities)).toBe('https://citymap.mx/ciudad-desconocida');
  });
  it('la URL no depende del dominio actual: en .world es la misma', async () => {
    vi.stubGlobal('window', { location: { hostname: 'www.citymap.world' } });
    vi.resetModules();
    const worldDomain = await import('../lib/domain.js');
    expect(worldDomain.buildCityUrl('tepic', cities)).toBe('https://citymap.mx/tepic');
    expect(worldDomain.buildCityUrl('paris', cities)).toBe('https://www.citymap.world/fr/paris');
  });
});

describe('citySelectionTarget: interna o salto de dominio', () => {
  it('en .mx, Tepic es interna y París/Madrid saltan a .world', () => {
    expect(citySelectionTarget('tepic', cities)).toEqual({ crossDomain: false, url: null });
    expect(citySelectionTarget('guadalajara', cities)).toEqual({ crossDomain: false, url: null });
    expect(citySelectionTarget('paris', cities)).toEqual({ crossDomain: true, url: 'https://www.citymap.world/fr/paris' });
    expect(citySelectionTarget('madrid', cities)).toEqual({ crossDomain: true, url: 'https://www.citymap.world/es/madrid' });
  });
  it('en .world, París es interna y Tepic salta a .mx', async () => {
    vi.stubGlobal('window', { location: { hostname: 'www.citymap.world' } });
    vi.resetModules();
    const worldDomain = await import('../lib/domain.js');
    expect(worldDomain.citySelectionTarget('paris', cities)).toEqual({ crossDomain: false, url: null });
    expect(worldDomain.citySelectionTarget('madrid', cities)).toEqual({ crossDomain: false, url: null });
    expect(worldDomain.citySelectionTarget('tepic', cities)).toEqual({ crossDomain: true, url: 'https://citymap.mx/tepic' });
    expect(worldDomain.citySelectionTarget('guadalajara', cities)).toEqual({ crossDomain: true, url: 'https://citymap.mx/guadalajara' });
  });
  it('sin ciudad no hay salto', () => {
    expect(citySelectionTarget(undefined, cities)).toEqual({ crossDomain: false, url: null });
    expect(citySelectionTarget('', cities)).toEqual({ crossDomain: false, url: null });
  });
});

describe('selector: lista todas las ciudades en los dos dominios', () => {
  it('en .mx salen París y Madrid entre las populares (ya no se filtran)', () => {
    const html = renderPicker();
    expect(html).toContain('París');
    expect(html).toContain('Madrid');
    expect(html).toContain('Tepic');
    expect(html).toContain('Guadalajara');
  });
  it('agrupa por país: salen Francia, España, México y Estados Unidos', () => {
    const html = renderPicker();
    expect(html).toContain('Francia');
    expect(html).toContain('España');
    expect(html).toContain('México');
    expect(html).toContain('Estados Unidos');
  });
  it('el cableado del salto está en el selector y ya no hay filtro por host', () => {
    const src = read('../components/CountryPickerDropdown.jsx');
    expect(src).toContain('citySelectionTarget');
    expect(src).toContain('window.location.href = target.url');
    expect(src).not.toContain('hostIncludesCity');
    expect(src).not.toContain('hostCities');
  });
  it('«Todas las ciudades» sigue siendo navegación interna en este dominio (no salta)', () => {
    const src = read('../components/CountryPickerDropdown.jsx');
    expect(src).toContain('onGoToWall(); onClose();');
    // El salto de dominio vive solo en handleSelectCity: hay una sola
    // asignación a window.location.href en todo el archivo.
    expect(src.split('window.location.href').length - 1).toBe(1);
    const handler = src.slice(src.indexOf('const handleSelectCity'), src.indexOf('const sortedCities'));
    expect(handler).toContain('window.location.href = target.url');
  });
});
