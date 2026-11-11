import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import RouteLoader from '../components/ui/RouteLoader.jsx';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(here, rel), 'utf8');

// 11 nov 2026 (Jonathan): la pantalla negra «Cargando CityMap» salía
// varios segundos en CADA navegación. Solo debe aparecer al arrancar la
// app o al cambiar de ciudad; al navegar se ven tres puntos sobre el
// fondo de la página, sin pantalla negra.
describe('pantalla negra solo al inicio o al cambiar de ciudad', () => {
  it('el cargador de rutas es ligero: sin fondo negro ni logo de marca', () => {
    const html = renderToStaticMarkup(<RouteLoader />);
    expect(html).toContain('Cargando');
    expect(html).not.toContain('Cargando CityMap');
    expect(html).not.toContain('logo-brand.png');
    expect(html).not.toContain('#000');
    expect(html).not.toContain('background:#000');
  });

  it('el router usa el cargador ligero y ya no la pantalla negra', () => {
    const router = read('../router/AppRouter.jsx');
    expect(router).toContain('RouteLoader');
    expect(router).toContain('const LoaderFallback = () => <RouteLoader />;');
    expect(router).not.toMatch(/import\s+BrandSplash/);
    expect(router).not.toContain('<BrandSplash');
  });

  it('los modales de App.jsx ya no abren con pantalla negra (fallback null)', () => {
    const app = read('../App.jsx');
    // Ya no queda ningún Suspense de modal con la pantalla negra.
    expect(app).not.toContain('fallback={<LoaderFallback/>}');
    // El arranque (deep link) y el onboarding SÍ conservan la pantalla
    // negra: son el inicio de la app, no una navegación.
    expect(app).toContain('if (resolvingDeepLink) {');
    expect(app).toContain('return <LoaderFallback />;');
    expect(app).toContain('fallback={<LoaderFallback />}');
  });

  it('el mapa ya no abre con pantalla negra al cargar su pedazo', () => {
    const map = read('../views/MapView.jsx');
    expect(map).not.toContain('LoaderFallback');
    expect(map).toContain('<Suspense fallback={null}><GMap');
  });

  it('el cambio de ciudad SIGUE con la pantalla negra de marca', () => {
    const splash = read('../components/CityArrivalSplash.jsx');
    expect(splash).toContain('BrandSplash');
    const app = read('../App.jsx');
    expect(app).toContain('<CityArrivalSplash');
  });

  it('el arranque SIGUE con el splash estático de index.html', () => {
    const html = read('../../index.html');
    expect(html).toContain('boot-splash');
  });
});
