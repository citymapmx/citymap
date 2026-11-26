// Rueda sin eventos recurrentes (26 nov 2026, Jonathan): los eventos
// semanales (is_recurring, píldora «Cada semana») se repetían cada semana
// en el carrusel y parecía que la página no se actualizaba. Fuera de la
// rueda (ciudad e inicio global); siguen en la lista de Eventos y en su
// ficha, con su píldora.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { selectHomeEvents } from '../lib/homeEventSelection.js';

const read = (p) => readFileSync(join(process.cwd(), p), 'utf8');
const event = (id, date, extra = {}) => ({ id, title: id, date, status: 'approved', ...extra });
const ids = (rows) => rows.map((row) => row.id);

describe('selectHomeEvents: los semanales no entran en la rueda', () => {
  it('un recurrente vigente queda fuera aunque sea de hoy', () => {
    const rows = [
      event('gig', '2026-11-26'),
      event('martes-glamour', '2026-11-24', { is_recurring: true }),
    ];
    const result = selectHomeEvents(rows, '2026-11-26');
    expect(ids(result.featured)).toEqual(['gig']);
    expect(ids(result.seasonal)).toEqual([]);
  });

  it('un recurrente de larga duración tampoco va a la sección de temporada', () => {
    const rows = [
      event('palenque', '2026-11-01', { end_date: '2026-11-30' }),
      event('via-recreactiva', '2026-11-22', { end_date: '2026-11-30', is_recurring: true }),
    ];
    const result = selectHomeEvents(rows, '2026-11-26');
    expect(ids(result.seasonal)).toEqual(['palenque']);
    expect(ids(result.featured)).toEqual([]);
  });

  it('un evento normal sin la marca sigue entrando igual que antes', () => {
    const rows = [event('gig', '2026-11-26')];
    expect(ids(selectHomeEvents(rows, '2026-11-26').featured)).toEqual(['gig']);
  });
});

describe('inicio global: la rueda tampoco toma los semanales', () => {
  const src = read('src/views/GlobalHomeView.jsx');

  it('la consulta de eventos trae is_recurring para poder filtrar', () => {
    const line = src.split('\n').find((l) => l.includes("sb.get('events'") && l.includes('status=eq.approved'));
    expect(line).toBeDefined();
    expect(line).toContain('event_category,is_recurring,biz_id');
  });

  it('el filtro de cliente descarta los recurrentes junto a los privados', () => {
    expect(src).toContain("if (ev.visibility === 'private') return false;");
    expect(src).toContain('if (ev.is_recurring) return false;');
  });
});
