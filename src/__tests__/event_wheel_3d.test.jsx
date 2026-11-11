import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import EventWheel3D from '../components/home/EventWheel3D.jsx';

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
    // 10 faces -> 36 deg per face, radius 246 px; the first event is in front.
    expect(html).toContain('rotateY(0deg) translateZ(246px)');
    expect(html).toContain('rotateY(36deg) translateZ(246px)');
    expect(html).toContain('rotateY(324deg) translateZ(246px)');
    // The 11th and 12th events stay out of the drum.
    expect(html).not.toContain('Evento 11');
    expect(html).not.toContain('Evento 12');
  });

  it('shows the city heading, a city pill on each poster and no detail card below', () => {
    const html = renderWheel();
    expect(html).toContain('Próximos eventos');
    expect(html).toContain('Los eventos que vienen en todas las ciudades');
    expect(html.match(/event-wheel-city/g)).toHaveLength(10);
    expect(html).toContain('Guadalajara');
    // Sin banda oscura: ni ficha con fecha/título/corazón, ni puntos ni contador.
    expect(html).not.toContain('event-wheel-detail');
    expect(html).not.toContain('event-wheel-dot');
    expect(html).not.toContain('01/10');
    expect(html).not.toContain('Ver detalles');
    // El giro lo mueve un resorte por requestAnimationFrame, no una
    // transición CSS: el tambor solo lleva el transform.
    expect(html).toContain('class="event-wheel-drum" style="transform:rotateY(0deg)"');
  });

  it('shows the black fallback with the title for events without a poster', () => {
    const noImg = [{ ...makeEvent(0), img: null }, ...events.slice(1)];
    const html = renderWheel({ events: noImg });
    expect(html).toContain('Evento 1');
    expect(html.match(/event-wheel-face/g)).toHaveLength(10);
    expect(html.match(/event-wheel-city/g)).toHaveLength(10);
  });

  it('mounts <img> only on the faces near the front (5 of 10 at rest)', () => {
    const html = renderWheel();
    // Frente 0 + 2 a cada lado: caras 0, 1, 2, 8 y 9. Las demás van con su
    // fondo oscuro hasta que el giro las acerca (no descargan su póster).
    expect(html.match(/<img/g)).toHaveLength(5);
    expect(html).toContain('poster-1.jpg');
    expect(html).toContain('poster-2.jpg');
    expect(html).toContain('poster-3.jpg');
    expect(html).toContain('poster-9.jpg');
    expect(html).toContain('poster-10.jpg');
    expect(html).not.toContain('poster-4.jpg');
    expect(html).not.toContain('poster-5.jpg');
    expect(html).not.toContain('poster-6.jpg');
    expect(html).not.toContain('poster-7.jpg');
    expect(html).not.toContain('poster-8.jpg');
    // Las 10 caras siguen en el tambor (solo falta la imagen, no la cara).
    expect(html.match(/event-wheel-face/g)).toHaveLength(10);
  });

  it('renders a plain row without a drum when there are fewer than 3 events', () => {
    const html = renderWheel({ events: events.slice(0, 2) });
    expect(html).not.toContain('event-wheel-drum');
    expect(html).toContain('Evento 1');
    expect(html).toContain('Evento 2');
    expect(html).toContain('Próximos eventos');
  });

  it('the plain row serves 400 px posters (170 px cards, not 800 px)', () => {
    const sbImg = 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/poster.jpg';
    const html = renderWheel({ events: [{ ...makeEvent(0), img: sbImg }, { ...makeEvent(1), img: sbImg }] });
    expect(html.match(/<img/g)).toHaveLength(2);
    expect(html).toContain('width=400');
    expect(html).not.toContain('width=800');
  });

  it('renders nothing without events', () => {
    expect(renderWheel({ events: [] })).toBe('');
  });

  it('shows a custom pill label and subheading when provided (city pages)', () => {
    const html = renderWheel({ pillLabel: () => '13 NOV', subheading: 'Los eventos que vienen en tu ciudad' });
    expect(html).toContain('Los eventos que vienen en tu ciudad');
    expect(html).not.toContain('Los eventos que vienen en todas las ciudades');
    expect(html.match(/event-wheel-city/g)).toHaveLength(10);
    expect(html).toContain('13 NOV');
    expect(html).not.toContain('Guadalajara');
  });
});
