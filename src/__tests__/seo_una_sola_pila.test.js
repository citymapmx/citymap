import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  cityDisplayName,
  cityPageTitle,
  cityPageDescription,
  homePageTitle,
  homePageDescription,
} from '../lib/seoRoutes.js';
import { tourCardUrl } from '../lib/tours.js';

// Una sola pila SEO (C3, 21 nov 2026): Vite + og.js es la única que sirve
// las rutas; web-next está desconectado de vercel.json y los títulos y
// canónicas de los tours salen de un solo módulo.

describe('seo una sola pila: vercel.json sin web-next', () => {
  it('ningún rewrite apunta a /web-next/', () => {
    const cfg = JSON.parse(
      readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'),
    );
    const aWebNext = cfg.rewrites.filter((r) =>
      String(r.destination || '').startsWith('/web-next/'),
    );
    expect(aWebNext).toEqual([]);
  });

  it('las rutas de ciudad y de evento siguen llegando al shell Vite', () => {
    const cfg = JSON.parse(
      readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'),
    );
    const catchAll = cfg.rewrites.find(
      (r) => r.source === '/((?!assets/).*)',
    );
    expect(catchAll).toBeDefined();
    expect(catchAll.destination).toBe('/index.html');
  });
});

describe('seo una sola pila: un solo título y descripción por ciudad', () => {
  it('el nombre de exhibición es el mismo que ve el usuario en la app', () => {
    expect(cityDisplayName('Guadalajara', 'Jalisco')).toBe('Guadalajara, Jalisco');
    expect(cityDisplayName('Tepic', 'Nayarit;Xalisco')).toBe('Tepic, Nayarit');
    expect(cityDisplayName('Madrid', '')).toBe('Madrid');
    expect(cityDisplayName('Madrid', null)).toBe('Madrid');
  });

  it('la página de ciudad usa el formato «Qué hacer en X…»', () => {
    expect(cityPageTitle('Madrid')).toBe(
      'Qué hacer en Madrid: Dónde comer, eventos y lugares | CityMap',
    );
    expect(cityPageDescription('Madrid')).toContain(
      'Descubre dónde comer, qué hacer y qué está pasando en Madrid.',
    );
  });

  it('la portada global usa el mismo título en los dos dominios', () => {
    expect(homePageTitle()).toBe(
      'CityMap — Descubre negocios, lugares y eventos de todas las ciudades',
    );
    expect(homePageDescription(false)).toContain('Guadalajara');
    expect(homePageDescription(true)).toContain('París');
  });
});

describe('seo una sola pila: un solo URL por tour (C4)', () => {
  it('tourCardUrl usa el slug de base cuando el tour lo trae', () => {
    expect(
      tourCardUrl({
        city_slug: 'madrid',
        slug: 'madrid-visita-guiada-por-el-museo-del-prado',
        title: 'Visita guiada por el Museo del Prado',
      }),
    ).toBe('/revista/madrid/madrid-visita-guiada-por-el-museo-del-prado');
  });

  it('tourCardUrl cae al slug del título si el tour no trae slug', () => {
    expect(
      tourCardUrl({ city_slug: 'guadalajara', title: 'Excursión a Guachimontones' }),
    ).toBe('/revista/guadalajara/excursion-a-guachimontones');
  });
});
