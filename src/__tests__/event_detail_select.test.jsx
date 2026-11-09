import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { getEventMusicQuery } from '../lib/eventDetails.js';

const modalSrc = fs.readFileSync(new URL('../components/modals/EventDetailModal.jsx', import.meta.url), 'utf8');
const landingSrc = fs.readFileSync(new URL('../components/store/NoMenuLanding.jsx', import.meta.url), 'utf8');

// Columnas que el detalle de evento lee del objeto que recibe: sin ellas el
// detalle abierto desde una lista queda degradado (sin reproductor de
// música, sin precio ni descripción, sin enlace de boletos y sin mapa).
const DETAIL_COLUMNS = ['event_category', 'description', 'price', 'price_type', 'website', 'lat', 'lng', 'biz_id', 'end_time', 'visibility'];

function eventSelectColumns(src, fileLabel) {
  const m = src.match(/sb\.get\('events', [`']?\?select=([A-Za-z0-9_,]+)/);
  expect(m, `no se encontró el select de events en ${fileLabel}`).not.toBeNull();
  return m[1].split(',');
}

describe('select de "Más eventos" del detalle de evento', () => {
  it('incluye las columnas que el detalle necesita (categoría, precio, descripción, boletos, ubicación)', () => {
    const cols = eventSelectColumns(modalSrc, 'EventDetailModal.jsx');
    for (const col of DETAIL_COLUMNS) expect(cols).toContain(col);
  });

  it('un evento como los que devuelve "Más eventos" produce la búsqueda de música', () => {
    // Fila de concierto con las columnas del select: hay query y el
    // reproductor se muestra. Sin event_category la query es null y la
    // sección "Música del artista" nunca se renderiza (bug reportado al
    // abrir Dimash desde "Más eventos").
    expect(getEventMusicQuery({ title: 'Dimash Qudaibergen en Guadalajara', event_category: 'Concierto' })).toBe('Dimash Qudaibergen');
    expect(getEventMusicQuery({ title: 'Dimash Qudaibergen en Guadalajara' })).toBeNull();
  });
});

describe('select de eventos de la página sin menú', () => {
  it('incluye las columnas que el detalle necesita', () => {
    const cols = eventSelectColumns(landingSrc, 'NoMenuLanding.jsx');
    for (const col of DETAIL_COLUMNS) expect(cols).toContain(col);
  });
});
