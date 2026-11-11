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
// hasta la sección «Ya están en CityMap» para el último, que va después
// de los planes y antes de las preguntas frecuentes). El <article> es necesario:
// el <style> de la página también menciona data-plan="...".
function planCard(html, key, nextKey) {
  const start = html.indexOf(`<article class="plans-card" data-plan="${key}"`);
  expect(start).toBeGreaterThan(-1);
  const end = nextKey ? html.indexOf(`<article class="plans-card" data-plan="${nextKey}"`, start) : html.indexOf('Ya están en CityMap', start);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
}

const AKAMI_ID = "b5bed88e-8d6d-4c4a-88fe-5a89e5190a61";

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
    expect(card).not.toContain('Akami Sushi');
    expect(card).not.toContain('Four Seasons');
  });

  it('Destacado → Akami Sushi, con su foto real', () => {
    const card = planCard(renderLanding(false), 'pro', 'elite');
    expect(card).toContain('Akami Sushi');
    expect(card).toContain('1792683841443_qbw057.webp');
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
    expect(card).not.toContain('Akami Sushi');
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
    // Dato real del caché (verificado por PostgREST el 11 nov 2026).
    const conDato = displayRating({ id: AKAMI_ID }, { [AKAMI_ID]: { rating: 4.6, count: 47 } });
    expect(conDato).toEqual({ rating: 4.6, count: 47, source: 'google' });
    // Four Seasons (ejemplo Premium): el caché SÍ tiene su dato (4.8,
    // 3,766 reseñas), así que con showStars la tarjeta lo muestra.
    const FOUR_SEASONS_ID = "6a49d84a-6feb-4b74-89a8-8f68bab27849";
    expect(displayRating({ id: FOUR_SEASONS_ID }, { [FOUR_SEASONS_ID]: { rating: 4.8, count: 3766 } }))
      .toEqual({ rating: 4.8, count: 3766, source: 'google' });
    // Sin dato en el caché, la tarjeta no muestra calificación: el
    // componente solo la pinta cuando source === 'google'.
    const sinDato = displayRating({ id: AKAMI_ID }, {});
    expect(sinDato.source).toBe('citymap');
    expect(sinDato.rating).toBeNull();
  });

  it('defecto 1: la fila de estado de Dalila envuelve en vez de recortar «Cerrado»', () => {
    const card = planCard(renderLanding(false), 'free', 'pro');
    // La fila (calificación · horario) ya no es nowrap: con wrap, el
    // horario baja entero a la siguiente línea en columnas angostas, en
    // vez de partirse a media letra («• Cerrad») en el borde.
    expect(card).toContain('flex-wrap:wrap;overflow:hidden');
    expect(card).not.toContain('flex-wrap:nowrap');
    // El estado sigue presente entero (el horario no se inventó ni se quitó).
    // Dalila abre a las 09:30, así que antes es «Cerrado» y después «Abierto»:
    // fijar uno solo haría el test dependiente de la hora del día.
    expect(card).toMatch(/Cerrado|Abierto/);
  });

  it('defecto 2: el ejemplo Premium muestra la fila de calificación (ya no esconde las estrellas)', () => {
    const card = planCard(renderLanding(false), 'elite', null);
    // Sin dato en el store, la fila cae en sus 5 estrellas vacías: eso
    // prueba que la fila de calificación SÍ se renderiza (showStars ya
    // no es false). Con dato real de Google, esa misma fila muestra
    // ★ 4.8 (3,766) con el logo de Google (ver test de displayRating).
    const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';
    expect(card.split(STAR_POINTS).length - 1).toBe(5);
    // Y ya no muestra la rama de solo-guardados (corazón + 45) en su lugar.
    expect(card).not.toContain('Sé el primero en apoyar');
  });

  it('defecto 2: el nombre de Four Seasons ya no se trunca con elipsis', () => {
    const card = planCard(renderLanding(false), 'elite', null);
    expect(card).toContain('Four Seasons Resort Punta Mita');
    // El nombre puede tomar 2 líneas (mismo patrón que la variante
    // compacta) en vez de una sola con elipsis («Four Seasons Resor…»).
    expect(card).toContain('-webkit-line-clamp:2');
    expect(card).not.toContain('text-overflow:ellipsis');
  });
});
