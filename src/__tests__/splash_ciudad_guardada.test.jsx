import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { shouldHoldSplashForSavedCity } from '../lib/savedCityBoot.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(here, rel), 'utf8');

// 12 nov 2026 (Jonathan): al recargar el inicio con ciudad guardada se
// veía el muro global un instante, luego aparecía el splash y muy rápido
// cambiaba a la ciudad. El arreglo: con ciudad guardada, el splash se
// sostiene desde el primer pintado hasta que la ciudad está lista y la
// ruta inicial ya está decidida, y se pasa directo a la ciudad.
describe('shouldHoldSplashForSavedCity', () => {
  it('en "/" con ciudad guardada y arranque sin terminar sostiene el splash', () => {
    expect(
      shouldHoldSplashForSavedCity({
        pathname: '/',
        citySlugIsDefault: false,
        authChecked: false,
      }),
    ).toBe(true);
  });

  it('sin ciudad guardada (defecto) no sostiene nada: el muro se ve como hoy', () => {
    expect(
      shouldHoldSplashForSavedCity({
        pathname: '/',
        citySlugIsDefault: true,
        authChecked: false,
      }),
    ).toBe(false);
  });

  it('cuando el arranque termina sin redirigir se apaga: no hay splash atorado', () => {
    expect(
      shouldHoldSplashForSavedCity({
        pathname: '/',
        citySlugIsDefault: false,
        authChecked: true,
      }),
    ).toBe(false);
  });

  it('ya en la ruta de la ciudad no aplica: el splash normal toma el relevo', () => {
    expect(
      shouldHoldSplashForSavedCity({
        pathname: '/tepic',
        citySlugIsDefault: false,
        authChecked: false,
      }),
    ).toBe(false);
  });

  it('en secciones y rutas de sistema no aplica', () => {
    expect(
      shouldHoldSplashForSavedCity({
        pathname: '/eventos/tepic',
        citySlugIsDefault: false,
        authChecked: false,
      }),
    ).toBe(false);
    expect(
      shouldHoldSplashForSavedCity({
        pathname: '/negocios',
        citySlugIsDefault: false,
        authChecked: false,
      }),
    ).toBe(false);
  });
});

describe('App.jsx: el splash se sostiene en "/" con ciudad guardada', () => {
  it('usa el predicado con la ciudad inicial y el fin del arranque', () => {
    const app = read('../App.jsx');
    expect(app).toContain(
      "import { shouldHoldSplashForSavedCity } from './lib/savedCityBoot.js';",
    );
    expect(app).toContain('const bootingToSavedCity = shouldHoldSplashForSavedCity({');
    expect(app).toContain('citySlugIsDefault: initialParams.current.citySlugIsDefault,');
    expect(app).toContain('authChecked,');
  });

  it('el splash se habilita en "/" solo mientras dura ese arranque', () => {
    const app = read('../App.jsx');
    const splashLine = app
      .split('\n')
      .find((l) => l.includes('<CityArrivalSplash'));
    // La condición normal sigue igual (inicio o sección con ciudad, nunca
    // "/" pelado) y el arranque con ciudad guardada se suma como alternativa.
    expect(splashLine).toContain('isHomePath(location.pathname)');
    expect(splashLine).toContain('isSectionCityPath(location.pathname)');
    expect(splashLine).toContain("location.pathname !== '/'");
    expect(splashLine).toContain('|| bootingToSavedCity)');
  });

  it('el splash no sale mientras seguimos en "/": ready queda bloqueado', () => {
    const app = read('../App.jsx');
    const splashLine = app
      .split('\n')
      .find((l) => l.includes('<CityArrivalSplash'));
    // Sin este bloqueo, los datos listos antes de la redirección tardía
    // harían salir el splash en "/" y el muro parpadearía de nuevo.
    expect(splashLine).toContain('&& !bootingToSavedCity');
  });
});
