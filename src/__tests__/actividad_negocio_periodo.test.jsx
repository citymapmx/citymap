import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ANALYTICS_PERIODS,
  analyticsBuckets,
  analyticsInPeriod,
  analyticsPeriodRange,
  countAnalyticsByType,
} from '../lib/businessAnalytics.js';

// Detalle de actividad de un negocio (24 nov 2026): filtros por mes.
// Las fechas van sin zona horaria ("2026-11-19T12:00:00" = mediodía
// local) para que el test no dependa de la zona del equipo, igual que
// la gráfica, que agrupa por día local.
const NOW = new Date(2026, 10, 24, 18, 35); // mar 24 nov 2026, 18:35 local

const rows = [
  { event_type: 'view', created_at: '2026-11-18T10:00:00' },
  { event_type: 'view', created_at: '2026-11-19T10:00:00' },
  { event_type: 'view', created_at: '2026-11-19T11:00:00' },
  { event_type: 'view', created_at: '2026-11-20T10:00:00' },
  { event_type: 'maps', created_at: '2026-11-20T10:30:00' },
  { event_type: 'whatsapp', created_at: '2026-11-23T10:00:00' },
  { event_type: 'view', created_at: '2026-11-24T10:00:00' },
  { event_type: 'menu_order', created_at: '2026-11-02T10:00:00' },
  { event_type: 'view', created_at: '2026-10-25T10:00:00' },
  { event_type: 'view', created_at: '2026-10-05T10:00:00' },
  { event_type: 'view', created_at: null },
];

describe('Filtros por mes en el detalle de actividad', () => {
  it('los periodos son 7 días, 30 días, este mes, mes anterior y todo', () => {
    expect(ANALYTICS_PERIODS.map((p) => p.id)).toEqual(['7', '30', 'month', 'prevMonth', 'all']);
    expect(ANALYTICS_PERIODS.map((p) => p.short)).toEqual(['7 días', '30 días', 'Este mes', 'Mes anterior', 'Todo']);
  });

  it('cada periodo tiene su rango en fecha local', () => {
    expect(analyticsPeriodRange('7', NOW)).toMatchObject({ startYMD: '2026-11-18', endYMD: '2026-11-24', label: 'Últimos 7 días' });
    expect(analyticsPeriodRange('30', NOW)).toMatchObject({ startYMD: '2026-10-26', endYMD: '2026-11-24', label: 'Últimos 30 días' });
    expect(analyticsPeriodRange('month', NOW)).toMatchObject({ startYMD: '2026-11-01', endYMD: '2026-11-24', label: 'noviembre de 2026' });
    expect(analyticsPeriodRange('prevMonth', NOW)).toMatchObject({ startYMD: '2026-10-01', endYMD: '2026-10-31', label: 'octubre de 2026' });
    expect(analyticsPeriodRange('all', NOW)).toMatchObject({ startYMD: null, label: 'Todo el tiempo' });
  });

  it('el filtro deja fuera lo anterior al periodo y lo sin fecha', () => {
    expect(analyticsInPeriod(rows, '7', NOW)).toHaveLength(7);
    expect(analyticsInPeriod(rows, 'month', NOW)).toHaveLength(8);
    expect(analyticsInPeriod(rows, 'prevMonth', NOW)).toHaveLength(2);
    expect(analyticsInPeriod(rows, 'all', NOW)).toHaveLength(10);
  });

  it('en 7 días hay una cubeta por día con su etiqueta corta', () => {
    const buckets = analyticsBuckets(rows, '7', NOW);
    expect(buckets).toHaveLength(7);
    expect(buckets[0]).toMatchObject({ key: '2026-11-18', label: 'mié 18', vistas: 1, total: 1 });
    expect(buckets[1]).toMatchObject({ key: '2026-11-19', label: 'jue 19', vistas: 2, total: 2 });
    expect(buckets[2]).toMatchObject({ key: '2026-11-20', label: 'vie 20', vistas: 1, total: 1 });
    expect(buckets[3]).toMatchObject({ key: '2026-11-21', label: 'sáb 21', total: 0 });
    expect(buckets[5]).toMatchObject({ key: '2026-11-23', label: 'lun 23', whatsapp: 1, total: 1 });
    expect(buckets[6]).toMatchObject({ key: '2026-11-24', label: 'mar 24', vistas: 1, total: 1 });
  });

  it('en 30 días y en el mes la etiqueta es solo el número de día', () => {
    const buckets = analyticsBuckets(rows, '30', NOW);
    expect(buckets).toHaveLength(30);
    expect(buckets[0]).toMatchObject({ key: '2026-10-26', label: '26' });
    expect(buckets.find((b) => b.key === '2026-11-02')).toMatchObject({ pedidos: 1, total: 1 });
    const month = analyticsBuckets(rows, 'month', NOW);
    expect(month).toHaveLength(24);
    expect(month[0]).toMatchObject({ key: '2026-11-01', label: '1' });
    const prev = analyticsBuckets(rows, 'prevMonth', NOW);
    expect(prev).toHaveLength(31);
    expect(prev.find((b) => b.key === '2026-10-05')).toMatchObject({ vistas: 1 });
    expect(prev.find((b) => b.key === '2026-10-25')).toMatchObject({ vistas: 1 });
  });

  it('en todo el tiempo hay una cubeta por mes, de corrido', () => {
    const buckets = analyticsBuckets(rows, 'all', NOW);
    expect(buckets).toHaveLength(2);
    expect(buckets[0]).toMatchObject({ key: '2026-10', label: 'oct 2026', vistas: 2, total: 2 });
    expect(buckets[1]).toMatchObject({ key: '2026-11', label: 'nov 2026', vistas: 5, whatsapp: 1, pedidos: 1, total: 7 });
  });

  it('el conteo por tipo cuenta cada tipo (también mapas y web, que van en tarjetas aparte)', () => {
    expect(countAnalyticsByType(rows)).toEqual({
      view: 8, phone: 0, whatsapp: 1, menu_order: 1, maps: 1, website: 0,
    });
  });
});

describe('El detalle del admin usa los periodos', () => {
  const src = readFileSync(new URL('../components/AdminPanel.jsx', import.meta.url), 'utf8');

  it('ofrece los 5 periodos y la gráfica y las tarjetas siguen al elegido', () => {
    expect(src).toContain('analyticsBuckets');
    expect(src).toContain('analyticsInPeriod');
    expect(src).toContain('ANALYTICS_PERIODS');
    expect(src).toContain('ANALYTICS_PERIODS.map');
    expect(src).toContain('p.short');
  });

  it('al abrir otro negocio el periodo vuelve a 7 días', () => {
    expect(src).toContain('setAnalyticsPeriod("7")');
  });

  it('debajo de la gráfica hay un renglón de totales del periodo', () => {
    expect(src).toContain('Total en');
  });
});
