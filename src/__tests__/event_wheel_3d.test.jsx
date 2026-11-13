import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import EventWheel3D, { WHEEL_ROW_MAX_EVENTS } from '../components/home/EventWheel3D.jsx';

function makeEvent(i) {
  return {
    key: `e-${i}`,
    kind: 'eventos',
    title: `Evento ${i + 1}`,
    subtitle: `2026-11-${10 + i} · Recinto ${i + 1} · Guadalajara`,
    img: `https://example.supabase.co/poster-${i + 1}.jpg`,
    date: `2026-11-${10 + i}`,
    citySlug: 'guadalajara',
    raw: { id: i + 1, venue_name: `Recinto ${i + 1}` },
  };
}

const events = Array.from({ length: 12 }, (_, i) => makeEvent(i));

function renderWheel(props = {}) {
  return renderToStaticMarkup(
    <EventWheel3D
      events={events}
      onSelect={() => {}}
      cityName={() => 'Guadalajara'}
      T={{ text: '#111', sub: '#666' }}
      {...props}
    />,
  );
}

describe('event wheel 3D', () => {
  it('renders one drum face per event, capped at the next 10', () => {
    const html = renderWheel();
    expect(html.match(/event-wheel-face/g)).toHaveLength(10);
    // 10 caras de 162 px -> radio 249 px (apotema: las tarjetas quedan
    // casi pegadas); la primera está al frente.
    expect(html).toContain('rotateY(0deg) translateZ(249px)');
    expect(html).toContain('rotateY(36deg) translateZ(249px)');
    expect(html).toContain('rotateY(324deg) translateZ(249px)');
    // The 11th and 12th events stay out of the drum.
    expect(html).not.toContain('Evento 11');
    expect(html).not.toContain('Evento 12');
  });

  it('with 7 events (a city like Tepic) the drum keeps the global radius, not a smaller one', () => {
    const html = renderWheel({ events: events.slice(0, 7) });
    expect(html.match(/event-wheel-face/g)).toHaveLength(7);
    expect(html.match(/event-wheel-dot[ "]/g)).toHaveLength(7);
    // Radio fijo de 10 caras (249 px en escritorio): con 7 eventos el
    // tambor medía 168 px y se veía chico y centrado en la página de
    // ciudad; ahora mide lo mismo que el del inicio global.
    expect(html).toContain('rotateY(0deg) translateZ(249px)');
    expect(html).not.toContain('translateZ(168px)');
    // La cara del frente sigue siendo la primera.
    expect(html).toContain('>Evento 1</button>');
  });

  it('shows the heading without a subheading, same size as the other section titles', () => {
    const html = renderWheel();
    expect(html).toContain('Próximos eventos');
    // Sin subtítulo (PR #196): ni el de ciudad ni el global aparecen.
    expect(html).not.toContain('Los eventos que vienen en tu ciudad');
    expect(html).not.toContain('Los eventos que vienen en todas las ciudades');
    // Título de sección unificado: 22 px como «Para cerrar el día» y
    // «Los 5 imperdibles», en mayúsculas y centrado.
    expect(html).toContain('font-size:22px');
    expect(html).toContain('text-transform:uppercase');
    expect(html).toContain('text-align:center');
    // Opción #5: las tarjetas del tambor son solo imagen, sin texto
    // encima (sin píldora de ciudad ni de fecha).
    expect(html).not.toContain('event-wheel-city');
    expect(html).not.toContain('Guadalajara');
    expect(html).not.toContain('2026-11');
    expect(html).not.toContain('event-wheel-detail');
    expect(html).not.toContain('Ver detalles');
    // El giro continuo lo mueve un bucle requestAnimationFrame, no una
    // transición CSS: el tambor solo lleva el transform.
    expect(html).toContain('class="event-wheel-drum" style="transform:rotateY(0deg)"');
  });

  it('shows dots and the front event name below the wheel, without chevrons', () => {
    const html = renderWheel();
    // Un punto por cara, el primero activo; tocan para saltar de evento.
    expect(html.match(/event-wheel-dot[ "]/g)).toHaveLength(10);
    expect(html).toContain('event-wheel-dot-active');
    expect(html).toContain('Ir al evento 1');
    expect(html).toContain('Ir al evento 10');
    // Sin chevrones (PR #194): no hay flechas ‹ › a los lados del nombre;
    // se navega con los puntos, el giro automático o el arrastre.
    expect(html).not.toContain('event-wheel-arrow');
    expect(html).not.toContain('Evento anterior');
    expect(html).not.toContain('Evento siguiente');
    expect(html).not.toContain('home_rueda_anterior');
    expect(html).not.toContain('home_rueda_siguiente');
    // El nombre del evento de enfrente se lee debajo de la rueda.
    expect(html).toContain('event-wheel-front-name');
    expect(html).toContain('>Evento 1</button>');
    // Sin aviso de estado del giro: no se pinta «Girando sola» ni
    // «En pausa» (la pausa sigue existiendo, pero no se anuncia).
    expect(html).not.toContain('event-wheel-state');
    expect(html).not.toContain('Girando sola');
    expect(html).not.toContain('En pausa');
  });

  it('the front event name is uppercase and bigger (CSS), and faces dim with a shade, not a filter', () => {
    const html = renderWheel();
    const css = readFileSync(new URL('../components/home/EventWheel3D.css', import.meta.url), 'utf8');
    // Nombre en mayúsculas y más grande (PR #194): 19 px en escritorio,
    // 17 px en teléfono; se corta con «…» si no cabe, no se desborda.
    expect(css).toMatch(/\.event-wheel-front-name\{[^}]*text-transform:\s*uppercase/);
    expect(css).toMatch(/\.event-wheel-front-name\{[^}]*font-size:\s*19px/);
    expect(css).toMatch(/@media \(max-width:640px\)\{[\s\S]*\.event-wheel-front-name\{font-size:17px\}/);
    expect(css).not.toContain('event-wheel-arrow');
    // Sin `filter: brightness` en las caras: el brillo cambiaba en cada
    // fotograma y obligaba a re-rasterizar las 10 caras sin parar, lo que
    // hacía parpadear la sección en blanco y negro al hacer scroll en el
    // teléfono (PR #194). El velo negro con opacidad da el mismo
    // oscurecido sin re-rasterizar (la opacidad la mueve el compositor).
    expect(html).not.toContain('filter:brightness');
    expect(html).toContain('class="event-wheel-face" style="transform:rotateY(0deg) translateZ(249px)"');
    expect(html.match(/event-wheel-shade/g)).toHaveLength(10);
    // Frente sin velo (opacidad 0), vecinas con velo (0.12 a ±36°, 0.24
    // a ±72°, 0.3 atrás): mismo oscurecido que brightness(0.88/0.76/0.7).
    expect(html).toContain('opacity:0');
    expect(html).toContain('opacity:0.12');
    expect(html).toContain('opacity:0.24');
    expect(html).toContain('opacity:0.3');
    expect(css).toMatch(/\.event-wheel-shade\{[^}]*background:#000/);
  });

  it('shows the black fallback with the title for events without a poster', () => {
    const noImg = [{ ...makeEvent(0), img: null }, ...events.slice(1)];
    const html = renderWheel({ events: noImg });
    expect(html).toContain('Evento 1');
    expect(html.match(/event-wheel-face/g)).toHaveLength(10);
    expect(html).not.toContain('event-wheel-city');
  });

  it('mounts <img> only on the faces near the front (7 of 10 at rest, plus the sharp front one)', () => {
    const html = renderWheel();
    // Frente 0 + 3 a cada lado: caras 0, 1, 2, 3, 7, 8 y 9 (base 400 px).
    // La cara del frente lleva además la versión nítida a 800 px encima.
    expect(html.match(/<img/g)).toHaveLength(8);
    expect(html).toContain('poster-1.jpg');
    expect(html).toContain('poster-2.jpg');
    expect(html).toContain('poster-3.jpg');
    expect(html).toContain('poster-4.jpg');
    expect(html).toContain('poster-8.jpg');
    expect(html).toContain('poster-9.jpg');
    expect(html).toContain('poster-10.jpg');
    expect(html).not.toContain('poster-5.jpg');
    expect(html).not.toContain('poster-6.jpg');
    expect(html).not.toContain('poster-7.jpg');
    // Las 10 caras siguen en el tambor (solo falta la imagen, no la cara).
    expect(html.match(/event-wheel-face/g)).toHaveLength(10);
  });

  it('never shows a bare black face while a poster loads: shimmer + title placeholder', () => {
    const html = renderWheel();
    // Un placeholder por cara con póster (10): el shimmer del repo más
    // el título del evento, debajo del <img> que lo tapa al cargar.
    expect(html.match(/skel-shimmer/g)).toHaveLength(10);
    // Las caras que aún no montan <img> (5, 6, 7) ya muestran su título
    // en vez de la tarjeta negra vacía.
    expect(html).toContain('Evento 5');
    expect(html).toContain('Evento 6');
    expect(html).toContain('Evento 7');
  });

  it('the front face gets a sharp 800 px image over the 400 px base', () => {
    const sb = (n) => `https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/poster-${n}.jpg`;
    const sbEvents = Array.from({ length: 10 }, (_, i) => ({ ...makeEvent(i), img: sb(i + 1) }));
    const html = renderWheel({ events: sbEvents });
    const imgs = [...html.matchAll(/<img[^>]*>/g)].map((m) => m[0]);
    // 7 bases (400 px) + 1 nítida de frente (800 px).
    expect(imgs).toHaveLength(8);
    const front = imgs.filter((t) => t.includes('event-wheel-front-img'));
    expect(front).toHaveLength(1);
    expect(front[0]).toContain('width=800');
    expect(front[0]).toContain('800w');
    const base = imgs.filter((t) => !t.includes('event-wheel-front-img'));
    expect(base).toHaveLength(7);
    // La base pide 400 px (src y srcset), nunca 800 px.
    expect(base.every((t) => t.includes('width=400'))).toBe(true);
    expect(base.every((t) => !t.includes('width=800'))).toBe(true);
  });

  it('renders a scrollable row without a drum when there are 3 or fewer events', () => {
    const html = renderWheel({ events: events.slice(0, 3) });
    // Opción B (13 Nov 2026): con 3 o menos no hay tambor: fila
    // horizontal deslizable con las tarjetas a tamaño completo.
    expect(html).not.toContain('event-wheel-drum');
    expect(html).not.toContain('event-wheel-dot');
    expect(html).not.toContain('event-wheel-front-name');
    expect(html).toContain('event-wheel-row');
    // El scroll con snap es el indicador (sin puntos de la rueda).
    expect(html).toContain('scroll-snap-type:x mandatory');
    expect(html).toContain('Próximos eventos');
    expect(html).toContain('Evento 1');
    expect(html).toContain('Evento 2');
    expect(html).toContain('Evento 3');
    // La hilera sí lleva la píldora con la ciudad, como antes (es la
    // única que muestra ese dato).
    expect(html.match(/event-wheel-city/g)).toHaveLength(3);
    // Tarjetas a tamaño completo: min(78%, 300px), no 170 px.
    expect(html).toMatch(/min\(78%, ?300px\)/);
    expect(html).not.toContain('0 0 170px');
  });

  it('with 1 event renders the row, not the drum', () => {
    const html = renderWheel({ events: events.slice(0, 1) });
    expect(html).not.toContain('event-wheel-drum');
    expect(html).toContain('event-wheel-row');
    expect(html).toContain('Evento 1');
    expect(html).not.toContain('Evento 2');
  });

  it('with 2 events renders the row, not the drum', () => {
    const html = renderWheel({ events: events.slice(0, 2) });
    expect(html).not.toContain('event-wheel-drum');
    expect(html).toContain('event-wheel-row');
    expect(html).toContain('Evento 1');
    expect(html).toContain('Evento 2');
    expect(html.match(/event-wheel-city/g)).toHaveLength(2);
  });

  it('with 4 events renders the drum, not the row', () => {
    const html = renderWheel({ events: events.slice(0, 4) });
    expect(html).toContain('event-wheel-drum');
    expect(html).not.toContain('event-wheel-row');
    expect(html.match(/event-wheel-dot[ "]/g)).toHaveLength(4);
    expect(html).toContain('>Evento 1</button>');
  });

  it('the row serves sharp 800 px posters (300 px cards, not 400 px)', () => {
    const sbImg = 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/poster.jpg';
    const html = renderWheel({ events: [{ ...makeEvent(0), img: sbImg }, { ...makeEvent(1), img: sbImg }] });
    expect(html.match(/<img/g)).toHaveLength(2);
    // A 300 px CSS y 3x en teléfono son ~900 px de dispositivo: el
    // póster va a 800 px (SRCSET_CARD); a 400 se veía blando, igual que
    // la cara del frente de la rueda (PR #264).
    expect(html).toContain('width=800');
    expect(html).toContain('800w');
  });

  it('the row threshold is a named constant (3) so it can be adjusted', () => {
    expect(WHEEL_ROW_MAX_EVENTS).toBe(3);
  });

  it('renders nothing without events', () => {
    expect(renderWheel({ events: [] })).toBe('');
  });

  it('ignores a subheading prop (city pages no longer pass one) and ignores pill props in the drum', () => {
    const html = renderWheel({ pillLabel: () => '13 NOV', subheading: 'Los eventos que vienen en tu ciudad' });
    // La prop subheading ya no existe (PR #196): no se pinta nada.
    expect(html).not.toContain('Los eventos que vienen en tu ciudad');
    expect(html).not.toContain('Los eventos que vienen en todas las ciudades');
    // La píldora de fecha ya no se pinta sobre las tarjetas del tambor.
    expect(html).not.toContain('13 NOV');
    expect(html).not.toContain('event-wheel-city');
    expect(html.match(/event-wheel-dot[ "]/g)).toHaveLength(10);
  });
});
