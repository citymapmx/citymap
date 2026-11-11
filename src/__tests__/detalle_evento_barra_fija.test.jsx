import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import EventInformation, { EventTicketBar } from '../components/detail/EventInformation.jsx';

const T = {
  text: '#111', sub: '#666', bg: '#fff', border: '#ddd', white: '#fff',
  shadow: 'none', dark: false, green: '#000', greenD: '#000',
};

const baseEvent = {
  id: 'ev1',
  title: 'Concierto de prueba',
  date: '2026-12-11',
  time: '21:00',
  venue_name: 'Auditorio Telmex',
  venue_address: 'Av. Patria 1, Zapopan',
  price: 850,
  price_type: 'paid',
  description: 'Un concierto de prueba.',
  booking_config: {
    enabled: true,
    type: 'external',
    externalLinks: [{ platform: 'comprar_entradas', url: 'https://ticketmaster.com.mx/evento' }],
  },
};

function renderBar(event, props = {}) {
  return renderToStaticMarkup(
    <EventTicketBar event={event} T={T} onShare={() => {}} {...props} />,
  );
}

function renderInfo(event, props = {}) {
  return renderToStaticMarkup(
    <EventInformation event={event} associatedBiz={null} T={T} {...props} />,
  );
}

// 11 nov 2026 (Jonathan): detalle de evento con (a) barra fija abajo con
// precio y botón de boletos, (b) «Agregar al calendario» en la tarjeta de
// fecha y (c) compartir junto al botón de boletos. La barra es
// EventTicketBar y el modal la pinta como hija directa del wrapper del
// detalle: dentro de EventInformation su bloque contenedor terminaba a
// mitad del contenido y la barra se iba al bajar en vez de quedarse
// pegada abajo.
describe('detalle de evento: barra fija, calendario y compartir', () => {
  it('la barra fija lleva el precio y el botón de boletos', () => {
    const html = renderBar(baseEvent);
    expect(html).toContain('position:sticky');
    expect(html).toContain('bottom:0');
    expect(html).toContain('Entrada: $850');
    expect(html).toContain('Comprar boletos');
    expect(html).toContain('ticketmaster.com.mx/evento');
  });

  it('el botón de compartir va junto al botón de boletos', () => {
    const html = renderBar(baseEvent);
    expect(html).toContain('Compartir evento');
  });

  it('sin onShare no se pinta el botón de compartir en la barra', () => {
    const html = renderToStaticMarkup(
      <EventTicketBar event={baseEvent} T={T} />,
    );
    expect(html).not.toContain('aria-label="Compartir evento"');
  });

  it('la tarjeta de fecha lleva «Añadir a mi calendario» con fecha, hora, título y recinto reales', () => {
    const html = renderInfo(baseEvent);
    expect(html).toContain('Añadir a mi calendario');
    expect(html).toContain('calendar.google.com/calendar/render');
    // Título, fecha y dirección van en la URL del calendario
    // (URLSearchParams codifica los espacios como +).
    expect(html).toContain('Concierto+de+prueba');
    expect(html).toContain('20261211');
    expect(html).toContain('Av.+Patria+1');
  });

  it('sin fecha válida no hay botón de calendario', () => {
    const html = renderInfo({ ...baseEvent, date: 'sin-fecha' });
    expect(html).not.toContain('Añadir a mi calendario');
    expect(html).not.toContain('calendar.google.com');
  });

  it('evento gratis: la barra dice «Entrada gratuita»', () => {
    const html = renderBar({ ...baseEvent, price_type: 'gratis', price: 0 });
    expect(html).toContain('Entrada gratuita');
  });

  it('sin precio ni boletos no hay barra fija', () => {
    const html = renderBar({ ...baseEvent, price: null, website: null, booking_config: null });
    expect(html).not.toContain('position:sticky');
    expect(html).toBe('');
  });

  it('el modal pinta la barra como última hija del wrapper, con onShare', () => {
    const src = readFileSync(new URL('../components/modals/EventDetailModal.jsx', import.meta.url), 'utf8');
    expect(src).toContain('import EventInformation, { EventTicketBar }');
    expect(src).toContain('<EventTicketBar event={evLocalized} T={T} hideTickets={isPast} onShare={() => setShowShareCard(true)} />');
    // Después de «Ver todos los eventos» (última sección del contenido):
    // hija directa del wrapper, no dentro de EventInformation.
    expect(src.indexOf('<EventTicketBar')).toBeGreaterThan(src.indexOf('eventos_ver_todos'));
    expect(src).not.toMatch(/<EventInformation[^>]*onShare/);
  });

  it('EventInformation ya no pinta la barra (es del modal)', () => {
    const html = renderInfo(baseEvent);
    expect(html).not.toContain('position:sticky');
    expect(html).not.toContain('Comprar boletos');
  });
});
