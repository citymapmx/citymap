import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import BusinessLanding from '../components/BusinessLanding.jsx';

// useUIStore lee localStorage y window.location al importar; en Node no
// existen (mismo patrón que negocios_tarjetas_modernas.test.jsx).
if (typeof globalThis.window === "undefined") {
  globalThis.window = { location: { hostname: "citymap.mx", pathname: "/negocios" } };
}
if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

function renderLanding() {
  return renderToStaticMarkup(
    <BusinessLanding
      T={{}}
      dark={false}
      navigate={() => {}}
      user={null}
      myBizList={[]}
      onBusinessTap={() => {}}
      onAddBiz={() => {}}
      onStartPaidPlan={() => {}}
      setShowAuth={() => {}}
    />
  );
}

const YA_ESTAN_LINKS = [
  ['Restaurante Alcalde', '/guadalajara/restaurante-alcalde'],
  ['La Chata de Guadalajara', '/guadalajara/la-chata-de-guadalajara'],
  ['La Moresca Andares', '/zapopan/la-moresca-andares'],
  ['The Landmark', '/zapopan/the-landmark'],
  ['Emiliano Comida y Vino', '/tepic/emiliano-comida-y-vino'],
  ['Velas Vallarta Suites Resort All Inclusive', '/puerto-vallarta/velas-vallarta-suites-resort-all-inclusive'],
  ['Hilton Mexico City Reforma', '/ciudad-de-mexico/hilton-mexico-city-reforma'],
  ['Parque Xcaret', '/playa-del-carmen/parque-xcaret'],
];

describe('Ya están en CityMap: carrusel B y enlaces a la ficha (16 nov 2026)', () => {
  it('muestra los 8 negocios con su enlace a la ficha (/ciudad/slug-corto)', () => {
    const html = renderLanding();
    for (const [name, href] of YA_ESTAN_LINKS) {
      expect(html).toContain(name);
      expect(html).toContain(`href="${href}"`);
    }
    expect((html.match(/class="ya-estan-card"/g) || []).length).toBe(8);
  });

  it('es un carrusel con pista deslizante y puntos (2 por página en el celular)', () => {
    const html = renderLanding();
    expect(html).toContain('ya-estan-track');
    expect(html).toContain('translateX(-0%)');
    // 8 negocios / 2 por página = 4 páginas → 4 puntos y 4 rejillas
    expect((html.match(/Página \d de 4/g) || []).length).toBe(4);
    expect((html.match(/class="ya-estan-grid"/g) || []).length).toBe(4);
  });

  it('la tarjeta abre la ficha con onBusinessTap y el orden es aleatorio con avance automático', () => {
    const src = read('../components/BusinessLanding.jsx');
    expect(src).toContain('onBusinessTap(b)');
    expect(src).toContain('setInterval');
    expect(src).toContain('shuffleList(YA_ESTAN_EN_CITYMAP)');
    expect(src).toContain('ya-estan-track');
  });

  it('AppRouter pasa handleCardTap a /negocios como onBusinessTap', () => {
    const src = read('../router/AppRouter.jsx');
    expect(src).toContain('onBusinessTap={handleCardTap}');
  });
});
