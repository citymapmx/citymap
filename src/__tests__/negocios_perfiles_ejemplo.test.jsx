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
    // Un bloque por plan: 4 veces el título.
    expect(html.split('Así se verá tu negocio')).toHaveLength(5);
    for (const [key, next] of [['free', 'pro'], ['pro', 'elite'], ['elite', 'fideliza'], ['fideliza', null]]) {
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

  it('Ventas → Four Seasons Resort Punta Mita, con su foto real y solo el mockup del menú', () => {
    const card = planCard(renderLanding(false), 'elite', 'fideliza');
    expect(card).toContain('Four Seasons Resort Punta Mita');
    expect(card).toContain('1785787099442_qkable.avif');
    expect(card).toContain('/plans/menu-interactivo.png');
    expect(card).toContain('Menú Interactivo y Carrito');
    // Las capturas de estadísticas y reservas son de Fideliza, no de Ventas.
    expect(card).not.toContain('/plans/estadisticas.png');
    expect(card).not.toContain('/plans/reservas.png');
    expect(card).not.toContain('Panel de Estadísticas');
    expect(card).not.toContain('Gestión de Reservas');
    expect(card).not.toContain('Akami Sushi');
    expect(card).not.toContain('Dalila');
  });

  it('Fideliza → SSAM Comida Coreana, con las capturas de estadísticas y reservas', () => {
    const card = planCard(renderLanding(false), 'fideliza', null);
    expect(card).toContain('SSAM Comida Coreana');
    expect(card).toContain('1791991014199_weowej.jpg');
    // Los iconos de redes: SSAM sí tiene WhatsApp y redes en la base.
    expect(card).toContain('/whatsapp.svg');
    expect(card).toContain('/instagram.svg');
    expect(card).toContain('Ver Facebook');
    expect(card).toContain('/plans/estadisticas.png');
    expect(card).toContain('/plans/reservas.png');
    expect(card).toContain('Panel de Estadísticas');
    expect(card).toContain('Gestión de Reservas');
    expect(card).not.toContain('/plans/menu-interactivo.png');
    expect(card).not.toContain('Akami Sushi');
    expect(card).not.toContain('Dalila');
    expect(card).not.toContain('Four Seasons');
  });

  it('los mockups solo van en Ventas y Fideliza: Gratuito y Presencia no los tienen', () => {
    const html = renderLanding(false);
    for (const mockup of ['/plans/menu-interactivo.png', '/plans/estadisticas.png', '/plans/reservas.png']) {
      expect(planCard(html, 'free', 'pro')).not.toContain(mockup);
      expect(planCard(html, 'pro', 'elite')).not.toContain(mockup);
    }
  });

  it('la calificación guardada (caché de Google del 10 nov) se muestra sin dato en vivo, pero sin el logo de Google', () => {
    const html = renderLanding(false);
    // Sin dato en el store, displayRating usa el valor guardado (reserva
    // verificada): la tarjeta muestra ★ + número, pero sin la «G», que
    // solo aparece con el caché vigente en vivo (source google).
    expect(planCard(html, 'pro', 'elite')).toContain('4.6');
    expect(planCard(html, 'pro', 'elite')).toContain('(47)');
    expect(planCard(html, 'elite', 'fideliza')).toContain('4.8');
    expect(planCard(html, 'elite', 'fideliza')).toContain('(3,766)');
    expect(planCard(html, 'fideliza', null)).toContain('4.8');
    expect(planCard(html, 'fideliza', null)).toContain('(8,825)');
    for (const [key, next] of [['free', 'pro'], ['pro', 'elite'], ['elite', null]]) {
      expect(planCard(html, key, next)).not.toContain('googlelogo');
    }
  });

  it('la calificación se lee en vivo con displayRating: solo con dato real de Google (source google)', () => {
    // Dato real del caché (verificado por PostgREST el 11 nov 2026).
    // Akami Sushi y Four Seasons son premium, así que sí muestran Google.
    const conDato = displayRating({ id: AKAMI_ID, plan: 'premium' }, { [AKAMI_ID]: { rating: 4.6, count: 47 } });
    expect(conDato).toEqual({ rating: 4.6, count: 47, source: 'google' });
    // Four Seasons (ejemplo Premium): el caché SÍ tiene su dato (4.8,
    // 3,766 reseñas), así que con showStars la tarjeta lo muestra.
    const FOUR_SEASONS_ID = "6a49d84a-6feb-4b74-89a8-8f68bab27849";
    expect(displayRating({ id: FOUR_SEASONS_ID, plan: 'premium' }, { [FOUR_SEASONS_ID]: { rating: 4.8, count: 3766 } }))
      .toEqual({ rating: 4.8, count: 3766, source: 'google' });
    // Sin dato en el caché, la tarjeta no muestra calificación: el
    // componente solo la pinta cuando source === 'google'.
    const sinDato = displayRating({ id: AKAMI_ID, plan: 'premium' }, {});
    expect(sinDato.source).toBe('citymap');
    expect(sinDato.rating).toBeNull();
  });

  it('Dalila (ejemplo gratuito) ignora el dato de Google del caché', () => {
    // Regla 12 nov 2026: las reseñas de Google solo se muestran en
    // Destacado y Premium. Dalila es gratuita: aunque el caché traiga su
    // 4.9 (762), displayRating devuelve el conteo propio (aquí sin dato:
    // rating null, sin «G»).
    const DALILA_ID = "6b146d7a-2bd9-41c6-9947-799cc68e1267";
    const disp = displayRating({ id: DALILA_ID, plan: 'free' }, { [DALILA_ID]: { rating: 4.9, count: 762 } });
    expect(disp.source).toBe('citymap');
    expect(disp.rating).toBeNull();
  });

  it('defecto 1: la fila de estado de Dalila envuelve en vez de recortar «Cerrado»', () => {
    const card = planCard(renderLanding(false), 'free', 'pro');
    // La fila (calificación · horario) ya no es nowrap: con wrap, el
    // horario baja entero a la siguiente línea en columnas angostas, en
    // vez de partirse a media letra («• Cerrad») en el borde.
    expect(card).toContain('flex-wrap:wrap;overflow:hidden');
    expect(card).not.toContain('flex-wrap:nowrap');
    // El estado sigue presente entero (el horario no se inventó ni se quitó).
    // forceOpen (15 nov 2026): la vista previa siempre muestra «Abierto»,
    // nunca «Cerrado», a cualquier hora del día.
    expect(card).toContain('Abierto');
    expect(card).not.toContain('Cerrado');
  });

  it('defecto 2: el ejemplo Premium muestra la calificación guardada, no 5 estrellas vacías', () => {
    const card = planCard(renderLanding(false), 'elite', 'fideliza');
    // Con la calificación guardada (caché de Google del 10 nov, 4.8 /
    // 3,766), la fila muestra ★ 4.8 (3,766) en vez de las 5 estrellas
    // vacías que salían sin dato en el store.
    expect(card).toContain('4.8');
    expect(card).toContain('(3,766)');
    // La estrella rellena (star_f) comparte el polígono con la vacía:
    // ahora hay 1 (la del ★ 4.8), no las 5 vacías de antes.
    const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';
    expect(card.split(STAR_POINTS).length - 1).toBe(1);
    // Y ya no muestra la rama de solo-guardados (corazón + 45) en su lugar.
    expect(card).not.toContain('Sé el primero en apoyar');
  });

  it('los 4 ejemplos siempre muestran «Abierto», nunca «Cerrado» (forceOpen)', () => {
    const html = renderLanding(false);
    for (const [key, next] of [['free', 'pro'], ['pro', 'elite'], ['elite', 'fideliza'], ['fideliza', null]]) {
      const card = planCard(html, key, next);
      expect(card).toContain('Abierto');
      expect(card).not.toContain('Cerrado');
    }
  });

  it('cada vista previa lleva la insignia «Ejemplo»', () => {
    const html = renderLanding(false);
    for (const [key, next] of [['free', 'pro'], ['pro', 'elite'], ['elite', 'fideliza'], ['fideliza', null]]) {
      expect(planCard(html, key, next)).toContain('Ejemplo');
    }
  });

  it('Fideliza muestra la tarjeta de lealtad REAL de SSAM (la azul, no un mockup)', () => {
    const html = renderLanding(false);
    const card = planCard(html, 'fideliza', null);
    // La tarjeta REAL de SSAM (loyalty_cards, activa): degradado azul,
    // 5 sellos, premio «1 ramén y bebida gratis», con el MISMO componente
    // que ven los clientes (LoyaltyCard). Progreso de muestra: 2 de 5.
    expect(card).toContain('Programa de Lealtad');
    expect(card).toContain('1 ramén y bebida gratis');
    expect(card).toContain('de 5');
    expect(card).toContain('linear-gradient(135deg, #1E3A8A, #0891B2)');
    expect(card).toContain('1791990555541_jdbn9u.jpg');
    // Solo la tarjeta, sin fondo/modal/QR/botones de wallet.
    expect(card).not.toContain('Muestra este código');
    expect(card).not.toContain('Añadir a Google Wallet');
    expect(card).not.toContain('Añadir a Apple Wallet');
    // El mockup morado viejo (9 círculos inventados) ya no está.
    expect(card).not.toContain('9 sellos = 1 premio');
    expect(html).not.toContain('9 sellos = 1 premio');
    // Solo Fideliza la lleva: Ventas no.
    expect(planCard(html, 'elite', 'fideliza')).not.toContain('1 ramén y bebida gratis');
    expect(planCard(html, 'elite', 'fideliza')).not.toContain('linear-gradient(135deg, #1E3A8A, #0891B2)');
  });

  it('los mockups ya no llevan el encabezado con el negocio del ejemplo', () => {
    const html = renderLanding(false);
    // El nombre ya no va pegado a la captura: se cortaba («SSAM Comida…»,
    // «Four Seasons Resort Punt…») y se repetía en cada captura (15 nov
    // 2026, Jonathan: quitarlo).
    expect(planCard(html, 'elite', 'fideliza')).not.toContain('Four Seasons Resort Punta Mita</span></div><img src="/plans/menu-interactivo.png"');
    const fideliza = planCard(html, 'fideliza', null);
    expect(fideliza).not.toContain('SSAM Comida Coreana</span></div><img src="/plans/estadisticas.png"');
    expect(fideliza).not.toContain('SSAM Comida Coreana</span></div><img src="/plans/reservas.png"');
    // Las capturas y sus etiquetas siguen ahí.
    expect(planCard(html, 'elite', 'fideliza')).toContain('<img src="/plans/menu-interactivo.png"');
    expect(fideliza).toContain('<img src="/plans/estadisticas.png"');
    expect(fideliza).toContain('<img src="/plans/reservas.png"');
    expect(fideliza).toContain('Panel de Estadísticas');
    expect(fideliza).toContain('Gestión de Reservas');
  });

  it('Dalila (ejemplo gratuito) no muestra fila de calificación: ni estrellas vacías ni número inventado', () => {
    const card = planCard(renderLanding(false), 'free', 'pro');
    // Sin rating guardado (regla 12 nov: Google solo en planes de pago)
    // y con hideReviews en la vista previa, la fila no se renderiza.
    expect(card).not.toContain('4.9');
    expect(card).not.toContain('(762)');
    const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';
    expect(card.split(STAR_POINTS).length - 1).toBe(0);
  });

  it('las tarjetas de ejemplo van a medida real: salen del relleno del plan para igualar el ancho de las categorías', () => {
    const html = renderLanding(false);
    // Cada vista previa rompe el padding lateral de la tarjeta del plan
    // (24px): 4 tarjetas de ejemplo + la tarjeta de lealtad de Fideliza.
    // Así quedan del mismo ancho que las tarjetas de las categorías
    // (350px en el teléfono) y el nombre cabe en una línea como ahí
    // (22 nov 2026, Jonathan: «SSAM Comida Coreana» se partía en dos).
    expect(html.split('margin:12px -24px 0').length - 1).toBe(5);
    for (const [key, next] of [['free', 'pro'], ['pro', 'elite'], ['elite', 'fideliza'], ['fideliza', null]]) {
      expect(planCard(html, key, next)).toContain('margin:12px -24px 0');
    }
    // Fideliza lleva el margen dos veces: ejemplo + lealtad.
    expect(planCard(html, 'fideliza', null).split('margin:12px -24px 0').length - 1).toBe(2);
  });

  it('defecto 2: el nombre de Four Seasons ya no se trunca con elipsis', () => {
    const card = planCard(renderLanding(false), 'elite', 'fideliza');
    expect(card).toContain('Four Seasons Resort Punta Mita');
    // El nombre puede tomar 2 líneas (mismo patrón que la variante
    // compacta) en vez de una sola con elipsis («Four Seasons Resor…»).
    expect(card).toContain('-webkit-line-clamp:2');
    expect(card).not.toContain('text-overflow:ellipsis');
  });
});
