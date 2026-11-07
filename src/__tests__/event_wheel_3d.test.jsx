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

const events = Array.from({ length: 8 }, (_, i) => makeEvent(i));

function renderWheel(props = {}) {
  return renderToStaticMarkup(
    <EventWheel3D
      events={events}
      onSelect={() => {}}
      onToggleSave={() => {}}
      isSaved={() => false}
      cityName={() => 'Guadalajara'}
      {...props}
    />,
  );
}

describe('event wheel 3D', () => {
  it('renders one drum face per event with the first one in front', () => {
    const html = renderWheel();
    expect(html.match(/event-wheel-face/g)).toHaveLength(5);
    // 5 faces -> 72 deg per face, radius 131 px; the first event is in front.
    expect(html).toContain('rotateY(0deg) translateZ(131px)');
    expect(html).toContain('rotateY(72deg) translateZ(131px)');
    expect(html).toContain('rotateY(288deg) translateZ(131px)');
  });

  it('shows the detail card of the front event with dots and counter', () => {
    const html = renderWheel();
    expect(html).toContain('Evento 1');
    expect(html).toContain('10 de nov');
    expect(html).toContain('Recinto 1 · Guadalajara');
    expect(html).toContain('01/05');
    expect(html.match(/Ir al evento/g)).toHaveLength(5);
    expect(html).toContain('Ver detalles');
    // El giro lo mueve un resorte por requestAnimationFrame, no una
    // transición CSS: el tambor solo lleva el transform.
    expect(html).toContain('class="event-wheel-drum" style="transform:rotateY(0deg)"');
  });

  it('shows the black fallback with the title for events without a poster', () => {
    const noImg = [{ ...makeEvent(0), img: null }, ...events.slice(1)];
    const html = renderWheel({ events: noImg });
    expect(html).toContain('Evento 1');
    expect(html.match(/event-wheel-face/g)).toHaveLength(5);
  });

  it('renders a plain row without a drum when there are fewer than 3 events', () => {
    const html = renderWheel({ events: events.slice(0, 2) });
    expect(html).not.toContain('event-wheel-drum');
    expect(html).toContain('Evento 1');
    expect(html).toContain('Evento 2');
  });

  it('renders nothing without events', () => {
    expect(renderWheel({ events: [] })).toBe('');
  });
});
