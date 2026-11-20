import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Rueda del inicio global (20 Nov 2026, reporte de Jonathan): solo
// mostraba 4 eventos y dos eran el mismo LUDÕ. Causa: la consulta de
// eventos pedía `order=date.asc&limit=60` SIN filtro de fecha, así que
// traía los 60 eventos APROBADOS MÁS VIEJOS y el filtro de cliente
// dejaba solo los que seguían vigentes (7 de 60; 4 en ciudades
// mexicanas). El arreglo: el filtro de fecha va en el servidor para
// que `limit=60` traiga los 60 PRÓXIMOS, y el filtro de cliente juzga
// cada evento en la zona horaria de SU ciudad (isEventUpcoming).
// La rueda muestra los 10 más próximos (MAX_FACES en EventWheel3D,
// igual que en la página de ciudad).
describe('rueda del inicio global: trae los próximos eventos, no los más viejos', () => {
  const src = read('../views/GlobalHomeView.jsx');

  it('la consulta de eventos filtra por fecha en el servidor (date o end_date)', () => {
    const filterLine = src.split('\n').find((l) => l.includes('eventsDateFilter = '));
    expect(filterLine).toBeDefined();
    expect(filterLine).toContain('or=(date.gte.');
    expect(filterLine).toContain('end_date.gte.');
    const line = src.split('\n').find((l) => l.includes("sb.get('events'") && l.includes('status=eq.approved'));
    expect(line).toBeDefined();
    expect(line).toContain('${eventsDateFilter}');
    expect(line).toContain('order=date.asc&limit=60');
  });

  it('el filtro de cliente usa isEventUpcoming (hoy en la zona de la ciudad del evento)', () => {
    expect(src).toContain('isEventUpcoming(ev, today, CITY_TZ)');
    expect(src).not.toContain('ev.end_date >= todayStr');
    expect(src).not.toContain('ev.date >= todayStr');
  });

  it('no hay recorte propio: la rueda (EventWheel3D) pone el tope de 10 como en ciudad', () => {
    const wheel = read('../components/home/EventWheel3D.jsx');
    expect(wheel).toContain('MAX_FACES = 10');
    expect(wheel).toContain('slice(0, MAX_FACES)');
  });
});
