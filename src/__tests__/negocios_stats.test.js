import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  NEGOCIOS_STATS_FALLBACK,
  todayLocalStr,
  negociosStatsQueries,
  fetchNegociosStats,
} from '../lib/negociosStats.js';

// Las cifras de /negocios son datos en vivo (conteos PostgREST con
// count=exact). Los valores fijos de antes (330/35/167/153) solo son la
// reserva mientras cargan o si alguna consulta falla.

describe('todayLocalStr', () => {
  it('formatea la fecha local como YYYY-MM-DD', () => {
    expect(todayLocalStr(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(todayLocalStr(new Date(2026, 10, 10))).toBe('2026-11-10');
  });
});

describe('negociosStatsQueries', () => {
  const q = negociosStatsQueries('2026-11-10');

  it('negocios: solo publicados (approved, sin plan menu)', () => {
    expect(q.businesses).toContain('status=eq.approved');
    expect(q.businesses).toContain('plan=neq.menu');
  });

  it('ciudades: solo activas', () => {
    expect(q.cities).toContain('active=eq.true');
  });

  it('eventos vigentes: approved + active + no privados y fecha de hoy en adelante, con cola multi-día', () => {
    expect(q.events).toContain('status=eq.approved');
    expect(q.events).toContain('active=eq.true');
    expect(q.events).toContain('visibility=neq.private');
    expect(q.events).toContain('date.gte.2026-11-10');
    // Un evento de varios días sigue vigente mientras su end_date no pase.
    expect(q.events).toContain('end_date.gte.2026-11-10');
  });

  it('tours y guías: experiences approved con activity_type Tour o Guía', () => {
    expect(q.tours).toContain('status=eq.approved');
    expect(q.tours).toContain('activity_type=in.(Tour,Gu%C3%ADa)');
  });
});

describe('fetchNegociosStats (con fetch simulado)', () => {
  const realFetch = globalThis.fetch;

  // Conteos que devuelve la base simulada (los vivos del 10 Nov 2026).
  const LIVE = { businesses: 328, cities: 33, events: 227, experiences: 204 };
  const calls = [];

  function stubFetch(failTables = []) {
    calls.length = 0;
    globalThis.fetch = vi.fn(async (url, init) => {
      calls.push({ url, init });
      const table = new URL(url).pathname.split('/').pop();
      if (failTables.includes(table)) {
        return { ok: false, status: 500, headers: { get: () => null } };
      }
      return {
        ok: true,
        headers: { get: (name) => (name.toLowerCase() === 'content-range' ? `*/${LIVE[table]}` : null) },
      };
    });
  }

  beforeEach(() => { stubFetch(); });
  afterEach(() => { globalThis.fetch = realFetch; });

  it('devuelve los 4 conteos vivos', async () => {
    const stats = await fetchNegociosStats();
    expect(stats).toEqual({ businesses: 328, cities: 33, events: 227, tours: 204 });
  });

  it('pide HEAD con count=exact a las 4 tablas', async () => {
    await fetchNegociosStats();
    expect(calls).toHaveLength(4);
    const tables = calls.map((c) => new URL(c.url).pathname.split('/').pop());
    expect(tables.sort()).toEqual(['businesses', 'cities', 'events', 'experiences']);
    for (const c of calls) {
      expect(c.init.method).toBe('HEAD');
      expect(c.init.headers['Prefer']).toBe('count=exact');
    }
  });

  it('si una consulta falla, solo ese campo usa la reserva', async () => {
    stubFetch(['events']);
    const stats = await fetchNegociosStats();
    expect(stats).toEqual({
      businesses: 328,
      cities: 33,
      events: NEGOCIOS_STATS_FALLBACK.events,
      tours: 204,
    });
  });

  it('si fallan todas, devuelve la reserva completa (nunca ceros)', async () => {
    stubFetch(['businesses', 'cities', 'events', 'experiences']);
    const stats = await fetchNegociosStats();
    expect(stats).toEqual(NEGOCIOS_STATS_FALLBACK);
    expect(Object.values(stats).every((v) => v > 0)).toBe(true);
  });
});
