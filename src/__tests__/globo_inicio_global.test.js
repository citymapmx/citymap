import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Globo del inicio global (PR #150): al elegir una ciudad desde el inicio
// global ("/") el selector solo mostraba el aviso «📍 ...» y se quedaba
// en "/", sin navegar a la ciudad. Causa: el envoltorio de setActiveCity
// en App.jsx solo navegaba si location.pathname !== "/" y se estaba en
// una ruta de ciudad; en "/" isOnHomePath quedaba en falso.
// El arreglo: "/" cuenta como ruta de inicio que SÍ navega a la ciudad
// elegida. Las demás rutas (detalle de evento, /eventos, Revista, etc.)
// siguen sin navegar, como antes.
describe('selector de ciudad desde el inicio global', () => {
  const app = read('../App.jsx');
  const wrapperLine = app.split('\n').find((l) => l.includes('isOnHomePath'));
  const condition = wrapperLine.slice(wrapperLine.indexOf('isOnHomePath ='));

  it('trata "/" como ruta de inicio que navega a la ciudad elegida', () => {
    expect(wrapperLine).toBeDefined();
    expect(condition).toContain('location.pathname === "/"');
    // Ya no excluye "/" de la navegación.
    expect(condition).not.toContain('location.pathname !== "/"');
  });

  it('sigue navegando desde las rutas de ciudad y de categoría', () => {
    expect(condition).toContain('location.pathname === `/${activeCity}`');
    expect(condition).toContain('location.pathname === `/${s}`');
    expect(condition).toContain('location.pathname === oldPath');
    expect(condition).toContain('location.pathname === newPath');
    expect(condition).toContain('location.pathname.includes("/c/")');
  });

  it('no navega desde otras rutas (detalle, /eventos, Revista, mapa)', () => {
    expect(condition).not.toMatch(/\/evento|\/revista|\/mapa|\/favoritos/);
  });

  it('la navegación sigue siendo a buildCityPath con replace y viewTransition', () => {
    expect(wrapperLine).toContain('if (isOnHomePath || requireCitySelection)');
    expect(wrapperLine).toContain('routerNavigate(newPath, { replace: true, viewTransition: true })');
  });

  it('handleCitySelect delega la navegación en setActiveCity (no navega solo)', () => {
    const geo = read('../hooks/useGeolocation.js');
    expect(geo).toContain('setActiveCity(c.slug)');
    expect(geo).not.toMatch(/routerNavigate|navigate\(/);
  });
});
