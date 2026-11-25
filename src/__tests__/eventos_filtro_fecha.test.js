import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { eventsDateFilterOr, localTodayStr, isPastEvent } from '../lib/eventListing.js';

const store = readFileSync(new URL('../store/useDataStore.js', import.meta.url), 'utf8');

// E5 (24 nov 2026): la consulta de eventos del store traía TODOS los
// aprobados, incluidos los ya pasados (395 filas; Guadalajara 60, de las
// que 10 ya pasaron). El filtro de servidor es el mismo predicado que el
// filtro de cliente (validEvents): un evento pasado — también un
// recurrente cuyo end_date ya pasó — no se muestra, así que no se pide.

const TODAY = '2026-11-24';

// Espejo en JS del fragmento PostgREST: se queda si termina hoy o
// después, o si empieza hoy o después cuando no tiene end_date.
const serverKeeps = (ev) => {
  if (ev.end_date) return ev.end_date >= TODAY;
  return ev.date >= TODAY;
};

describe('eventos: filtro de fecha del servidor', () => {
  it('el fragmento PostgREST es el predicado de vigente', () => {
    expect(eventsDateFilterOr('2026-11-24')).toBe(
      'or=(end_date.gte.2026-11-24,and(end_date.is.null,date.gte.2026-11-24))'
    );
  });

  it('localTodayStr formatea la fecha local en YYYY-MM-DD', () => {
    expect(localTodayStr(new Date(2026, 10, 24))).toBe('2026-11-24');
    expect(localTodayStr(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('el servidor se queda con los mismos que el cliente (isPastEvent)', () => {
    const cases = [
      // [evento, se queda]
      [{ date: '2026-11-20' }, false], // pasado de un día
      [{ date: '2026-11-24' }, true], // hoy
      [{ date: '2026-12-05' }, true], // futuro
      [{ date: '2026-11-20', end_date: '2026-11-24' }, true], // varios días, termina hoy
      [{ date: '2026-11-18', end_date: '2026-11-23' }, false], // varios días, terminó ayer
      [{ date: '2026-11-26', end_date: '2026-11-29' }, true], // varios días futuro
      [{ date: '2026-11-17', end_date: '2027-01-12', is_recurring: true }, true], // recurrente vigente
      [{ date: '2026-10-01', end_date: '2026-11-20', is_recurring: true }, false], // recurrente pasado
      [{ date: '2027-01-17' }, true], // futuro lejano
    ];
    for (const [ev, keeps] of cases) {
      expect(serverKeeps(ev)).toBe(keeps);
      expect(isPastEvent(ev, TODAY)).toBe(!keeps);
    }
  });

  it('las 3 consultas de eventos del store llevan el filtro de fecha', () => {
    const uses = store.match(/eventsDateFilterOr\(localTodayStr\(\)\)/g) || [];
    expect(uses).toHaveLength(3);
    const eventQueries = store.split('\n').filter(l => l.includes('sb.get("events"'));
    expect(eventQueries.length).toBe(3);
    for (const q of eventQueries) {
      expect(q).toContain('eventsDateFilterOr(localTodayStr())');
    }
  });

  it('las consultas de experiencias no llevan el filtro de eventos', () => {
    const expQueries = store.split('\n').filter(l => l.includes('sb.get("experiences"'));
    expect(expQueries.length).toBe(3);
    for (const q of expQueries) {
      expect(q).not.toContain('eventsDateFilterOr');
    }
  });
});
