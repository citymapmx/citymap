import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import HomeEvents from '../components/home/HomeEvents.jsx';
import NextHomeEvents from '../../web-next/src/components/home/HomeEvents.jsx';

const T = { text: '#111', sub: '#666', bg: '#fff', border: '#ddd' };

// Día en la zona de Guadalajara, como lo calcula el componente.
function dayKey(offset) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = type => parts.find(part => part.type === type).value;
  const d = new Date(Date.UTC(Number(value('year')), Number(value('month')) - 1, Number(value('day')) + offset));
  return d.toISOString().slice(0, 10);
}
const tagDate = value => new Date(`${value}T12:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '').toUpperCase();
const shortDate = value => new Date(`${value}T12:00:00Z`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });

const singleDate = dayKey(3);
const longStart = dayKey(0);
const longEnd = dayKey(8);

const events = [
  { id: 'corto', title: 'Concierto Corto', date: singleDate, city_slug: 'guadalajara', status: 'approved', venue_name: 'Teatro Diana', img_url: 'https://example.supabase.co/poster-corto.jpg' },
  { id: 'largo', title: 'Festival Largo', date: longStart, end_date: longEnd, city_slug: 'guadalajara', status: 'approved', venue_name: 'Expo Guadalajara', img_url: 'https://example.supabase.co/poster-largo.jpg' },
];

describe('Vite home events (rueda 3D, como el inicio global)', () => {
  it('merges long-duration events into the wheel and drops their section', () => {
    const html = renderToStaticMarkup(
      <HomeEvents events={events} activeCity="guadalajara" userCoords={null} dbReady dark={false} handleEventTap={() => {}} T={T} />,
    );
    // Un solo carrusel con el título de siempre, sin la sección aparte.
    expect(html.match(/Próximos eventos/g)).toHaveLength(1);
    // Sin subtítulo (PR #196): el encabezado es solo el título de sección.
    expect(html).not.toContain('Los eventos que vienen en tu ciudad');
    expect(html).not.toContain('Eventos de larga duración');
    expect(html).not.toContain('Carrusel de eventos de larga duración');
    // La rueda no tiene ficha con fecha/lugar debajo ni aria-label del coverflow.
    expect(html).not.toContain('aria-label="Eventos destacados"');
    expect(html).not.toContain('Hasta el ');
    // Los dos eventos están en la rueda, ordenados por fecha de inicio.
    expect(html).toContain('Concierto Corto');
    expect(html).toContain('Festival Largo');
    expect(html.indexOf('Festival Largo')).toBeLessThan(html.indexOf('Concierto Corto'));
    // El de un día lleva su fecha en la píldora; el largo lleva el rango (ya empezó).
    expect(html).toContain(tagDate(singleDate));
    expect(html).toContain(`HASTA ${tagDate(longEnd)}`);
    expect(html.match(/event-wheel-city/g)).toHaveLength(2);
  });
  it('con lang en muestra el título en inglés cuando hay title_en (fase 2 i18n)', () => {
    const bilingual = [
      { id: 'corto', title: 'Concierto Corto', title_en: 'Short Concert', date: singleDate, city_slug: 'guadalajara', status: 'approved', venue_name: 'Teatro Diana', img_url: 'https://example.supabase.co/poster-corto.jpg' },
      { id: 'largo', title: 'Festival Largo', title_en: 'Long Festival', date: longStart, end_date: longEnd, city_slug: 'guadalajara', status: 'approved', venue_name: 'Expo Guadalajara', img_url: 'https://example.supabase.co/poster-largo.jpg' },
    ];
    const html = renderToStaticMarkup(
      <HomeEvents events={bilingual} activeCity="guadalajara" userCoords={null} dbReady dark={false} handleEventTap={() => {}} T={T} lang="en" />,
    );
    expect(html).toContain('Short Concert');
    expect(html).toContain('Long Festival');
    expect(html).not.toContain('Concierto Corto');
    expect(html).not.toContain('Festival Largo');
  });
  it('con lang es muestra el título en español aunque haya title_en', () => {
    const bilingual = [
      { id: 'corto', title: 'Concierto Corto', title_en: 'Short Concert', date: singleDate, city_slug: 'guadalajara', status: 'approved', venue_name: 'Teatro Diana', img_url: 'https://example.supabase.co/poster-corto.jpg' },
    ];
    const html = renderToStaticMarkup(
      <HomeEvents events={bilingual} activeCity="guadalajara" userCoords={null} dbReady dark={false} handleEventTap={() => {}} T={T} lang="es" />,
    );
    expect(html).toContain('Concierto Corto');
    expect(html).not.toContain('Short Concert');
  });
});

describe('Next home events (coverflow)', () => {
  it('merges long-duration events into the main carousel and drops their section', () => {
    const html = renderToStaticMarkup(
      <NextHomeEvents events={events} activeCity="guadalajara" userCoords={null} dbReady dark={false} handleEventTap={() => {}} T={T} />,
    );
    // Un solo carrusel con el título de siempre, sin la sección aparte.
    expect(html.match(/Próximos eventos/g)).toHaveLength(1);
    expect(html).not.toContain('Eventos de larga duración');
    expect(html).not.toContain('Carrusel de eventos de larga duración');
    expect(html.match(/aria-label="Eventos destacados"/g)).toHaveLength(1);
    // Los dos eventos están en el carrusel, ordenados por fecha de inicio.
    expect(html).toContain('Concierto Corto');
    expect(html).toContain('Festival Largo');
    expect(html.indexOf('Festival Largo')).toBeLessThan(html.indexOf('Concierto Corto'));
    // El de un día lleva su fecha; el largo lleva el rango (ya empezó).
    expect(html).toContain(tagDate(singleDate));
    expect(html).toContain(`HASTA ${tagDate(longEnd)}`);
    expect(html).toContain(`Hasta el ${shortDate(longEnd)}`);
  });
});

describe('Vite home events: ciudad sin eventos (sección oculta)', () => {
  // t() que interpola ${ciudad} como el de useTranslation.
  const t = (k, f, vars) => {
    const v = f !== undefined ? f : k;
    return vars && typeof v === 'string' ? v.replace(/\$\{(\w+)\}/g, (m, n) => vars[n] ?? m) : v;
  };
  const cities = [
    { slug: 'tlaquepaque', name: 'Tlaquepaque' },
    { slug: 'guadalajara', name: 'Guadalajara' },
    { slug: 'zapopan', name: 'Zapopan' },
  ];
  const nearby = [
    { id: 'n1', title: 'Concierto Cercano', date: dayKey(5), city_slug: 'guadalajara', status: 'approved', venue_name: 'Teatro Diana', img_url: 'https://example.supabase.co/n1.jpg' },
    { id: 'n2', title: 'Festival Vecino', date: dayKey(9), city_slug: 'zapopan', status: 'approved', venue_name: 'Auditorio Telmex', img_url: 'https://example.supabase.co/n2.jpg' },
  ];

  // Decisión de Jonathan, 13 Nov 2026: sin eventos, la sección
  // «Próximos eventos» no se monta (ni título, ni mensaje, ni cubos).
  it('no monta nada: ni título, ni mensaje, ni cubos', () => {
    const html = renderToStaticMarkup(
      <HomeEvents events={[]} activeCity="tlaquepaque" userCoords={null} dbReady dark={false} handleEventTap={() => {}} T={T} t={t} cities={cities} />,
    );
    expect(html).toBe('');
    expect(html).not.toContain('Próximos eventos');
    expect(html).not.toContain('todavía no hay eventos');
    expect(html).not.toContain('Concierto Cercano');
  });

  it('aunque lleguen eventos cercanos por props viejos, no se monta nada', () => {
    const html = renderToStaticMarkup(
      <HomeEvents events={[]} activeCity="tlaquepaque" userCoords={null} dbReady dark={false} handleEventTap={() => {}} T={T} t={t} cities={cities} nearbyEvents={nearby} onRequestNearbyEvents={() => {}} />,
    );
    expect(html).toBe('');
    expect(html).not.toContain('todavía no hay eventos');
    expect(html).not.toContain('Concierto Cercano');
    expect(html).not.toContain('Festival Vecino');
    expect(html).not.toContain('Eventos cerca de');
  });

  it('mientras carga muestra el esqueleto, no el mensaje', () => {
    const html = renderToStaticMarkup(
      <HomeEvents events={[]} activeCity="tlaquepaque" userCoords={null} dbReady={false} dark={false} handleEventTap={() => {}} T={T} cities={cities} nearbyEvents={[]} onRequestNearbyEvents={() => {}} />,
    );
    expect(html).not.toContain('todavía no hay eventos');
  });
});
