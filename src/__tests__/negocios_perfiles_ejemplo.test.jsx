import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import BusinessLanding from '../components/BusinessLanding.jsx';
import { displayRating } from '../lib/googleRatings.js';

// useUIStore lee localStorage y window.location al importar; en Node no
// existen (mismo patrón que negocios_tarjetas_modernas.test.jsx).
if (typeof globalThis.window === "undefined") {
  globalThis.window = { location: { hostname: "citymap.mx", pathname: "/negocios" } };
}
if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

function renderLanding(dark = false) {
  return renderToStaticMarkup(
    <BusinessLanding
      T={{}}
      dark={dark}
      navigate={() => {}}
      user={null}
      myBizList={[]}
      onAddBiz={() => {}}
      onStartPaidPlan={() => {}}
      setShowAuth={() => {}}
    />
  );
}

// La sección de ejemplos: el <section> que contiene las tarjetas.
function examplesSection(html) {
  const sections = html.match(/<section[\s\S]*?<\/section>/g);
  expect(sections).not.toBeNull();
  const found = sections.find((s) => s.includes('example-card'));
  expect(found).not.toBeUndefined();
  return found;
}

const MOCHOMOS_ID = "c0ae3d8f-7417-4ca7-9e66-91fa5d55b7e8";

describe('Perfiles de ejemplo en /negocios', () => {
  it('la sección existe después de Planes, con título y subtítulo', () => {
    const html = renderLanding(false);
    expect(html).toContain('Así se ve un perfil en CityMap');
    expect(html).toContain('Negocios reales que ya están en CityMap');
    // Va después de la sección de Planes y antes de Preguntas frecuentes.
    expect(html.indexOf('Así se ve un perfil en CityMap')).toBeGreaterThan(html.indexOf('id="planes"'));
    expect(html.indexOf('Así se ve un perfil en CityMap')).toBeLessThan(html.indexOf('Preguntas frecuentes'));
  });

  it('trae exactamente 3 perfiles reales, con foto, ciudad y categoría', () => {
    const section = examplesSection(renderLanding(false));
    const cards = section.match(/<a class="example-card"[^>]*>[\s\S]*?<\/a>/g);
    expect(cards).not.toBeNull();
    expect(cards).toHaveLength(3);
    expect(section).toContain('Mochomos');
    expect(section).toContain('Dalila Casa Repostera');
    expect(section).toContain('Four Seasons Resort Punta Mita');
    expect(section).toContain('Zapopan · Restaurantes');
    expect(section).toContain('Guadalajara · Café');
    expect(section).toContain('Puerto Vallarta · Hospedaje');
    // Las fotos reales de la base (primera de la galería de cada negocio).
    expect(section).toContain('1787478894399_qk3fa.jpeg');
    expect(section).toContain('1791991285949_z4ojc.webp');
    expect(section).toContain('1785787099442_qkable.avif');
  });

  it('cada tarjeta enlaza a la página real del negocio', () => {
    const section = examplesSection(renderLanding(false));
    expect(section).toContain('href="https://citymap.mx/zapopan/mochomos"');
    expect(section).toContain('href="https://citymap.mx/guadalajara/dalila-casa-repostera"');
    expect(section).toContain('href="https://citymap.mx/puerto-vallarta/four-seasons-resort-punta-mita"');
  });

  it('sin dato de Google en el store, no se muestra ninguna calificación (nada inventado)', () => {
    const section = examplesSection(renderLanding(false));
    expect(section).not.toContain('googlelogo');
    // Solo las 3 fotos: si se pintara una calificación, habría una 4ª
    // imagen (el logo de Google) en la sección.
    expect(section.match(/<img /g)).toHaveLength(3);
  });

  it('la calificación se lee en vivo con displayRating: solo con dato real de Google (source google)', () => {
    // Dato real del caché (verificado por PostgREST el 10 nov 2026).
    const conDato = displayRating({ id: MOCHOMOS_ID }, { [MOCHOMOS_ID]: { rating: 4.9, count: 13275 } });
    expect(conDato).toEqual({ rating: 4.9, count: 13275, source: 'google' });
    // Sin dato en el caché, la tarjeta no muestra calificación: el
    // componente solo la pinta cuando source === 'google'.
    const sinDato = displayRating({ id: MOCHOMOS_ID }, {});
    expect(sinDato.source).toBe('citymap');
    expect(sinDato.rating).toBeNull();
  });
});
