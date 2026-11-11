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

// Cada plan es un <article class="plans-card" data-plan="...">: recorta el
// HTML de esa tarjeta (desde su <article> hasta el <article> siguiente, o
// hasta Preguntas frecuentes para el último). El <article> es necesario:
// el <style> de la página también menciona data-plan="...".
function planCard(html, key, nextKey) {
  const start = html.indexOf(`<article class="plans-card" data-plan="${key}"`);
  expect(start).toBeGreaterThan(-1);
  const end = nextKey ? html.indexOf(`<article class="plans-card" data-plan="${nextKey}"`, start) : html.indexOf('Preguntas frecuentes', start);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
}

const MOCHOMOS_ID = "c0ae3d8f-7417-4ca7-9e66-91fa5d55b7e8";

describe('Ejemplos por plan en /negocios', () => {
  it('ya no existe la sección independiente «Así se ve un perfil en CityMap»', () => {
    const html = renderLanding(false);
    expect(html).not.toContain('Así se ve un perfil en CityMap');
    expect(html).not.toContain('Negocios reales que ya están en CityMap');
    expect(html).not.toContain('example-card');
  });

  it('cada plan lleva su bloque «Así se verá tu negocio» debajo del botón', () => {
    const html = renderLanding(false);
    // Un bloque por plan: 3 veces el título.
    expect(html.split('Así se verá tu negocio')).toHaveLength(4);
    for (const [key, next] of [['free', 'pro'], ['pro', 'elite'], ['elite', null]]) {
      const card = planCard(html, key, next);
      // El bloque va después del botón de cada plan (y de sus features).
      expect(card.indexOf('Así se verá tu negocio')).toBeGreaterThan(card.indexOf('plans-action'));
    }
  });

  it('Gratuito → Dalila Casa Repostera, con su foto real', () => {
    const card = planCard(renderLanding(false), 'free', 'pro');
    expect(card).toContain('Dalila Casa Repostera');
    expect(card).toContain('1791991285949_z4ojc.webp');
    expect(card).not.toContain('Mochomos');
    expect(card).not.toContain('Four Seasons');
  });

  it('Destacado → Mochomos, con su foto real', () => {
    const card = planCard(renderLanding(false), 'pro', 'elite');
    expect(card).toContain('Mochomos');
    expect(card).toContain('1787478894399_qk3fa.jpeg');
    expect(card).not.toContain('Dalila');
    expect(card).not.toContain('Four Seasons');
  });

  it('Premium → Four Seasons Resort Punta Mita, con su foto real y los 3 mockups', () => {
    const card = planCard(renderLanding(false), 'elite', null);
    expect(card).toContain('Four Seasons Resort Punta Mita');
    expect(card).toContain('1785787099442_qkable.avif');
    expect(card).toContain('/plans/menu-interactivo.png');
    expect(card).toContain('/plans/estadisticas.png');
    expect(card).toContain('/plans/reservas.png');
    expect(card).toContain('Menú Interactivo y Carrito');
    expect(card).toContain('Panel de Estadísticas');
    expect(card).toContain('Gestión de Reservas');
    expect(card).not.toContain('Mochomos');
    expect(card).not.toContain('Dalila');
  });

  it('los mockups solo van con Premium: Gratuito y Destacado no los tienen', () => {
    const html = renderLanding(false);
    expect(planCard(html, 'free', 'pro')).not.toContain('/plans/menu-interactivo.png');
    expect(planCard(html, 'pro', 'elite')).not.toContain('/plans/menu-interactivo.png');
    expect(planCard(html, 'free', 'pro')).not.toContain('/plans/estadisticas.png');
    expect(planCard(html, 'pro', 'elite')).not.toContain('/plans/reservas.png');
  });

  it('sin dato de Google en el store, ningún ejemplo muestra calificación (nada inventado)', () => {
    const html = renderLanding(false);
    for (const [key, next] of [['free', 'pro'], ['pro', 'elite'], ['elite', null]]) {
      expect(planCard(html, key, next)).not.toContain('googlelogo');
    }
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
