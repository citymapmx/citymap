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

  it('renders a plain row without a drum when there are fewer than 3 events', () => {
    const html = renderWheel({ events: events.slice(0, 2) });
    expect(html).not.toContain('event-wheel-drum');
    expect(html).toContain('Evento 1');
    expect(html).toContain('Evento 2');
    expect(html).toContain('Próximos eventos');
  });

  it('renders nothing without events', () => {
    expect(renderWheel({ events: [] })).toBe('');
  });
});
