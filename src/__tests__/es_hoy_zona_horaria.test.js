import { describe, it, expect } from 'vitest';
import {
  eventCalendarDay, eventCoversDay, isEventToday, eventOverlapsRange,
  matchesDateFilter, cityTimeZone, eventCityTimeZone,
} from '../lib/eventListing.js';
import { CITY_TZ } from '../lib/constants.js';
import { eventDayKey } from '../lib/homeEventSelection.js';

// Bug A8 (auditoría 21 nov 2026): la rueda de Guadalajara un sábado
// mostraba «ES HOY» en las 8 tarjetas, incluido Martes de Glamour, que
// es los martes. Causa: isEventToday era solo cobertura de rango
// (date <= hoy <= end_date), así que un recurrente semanal con rango
// largo marcaba «Hoy» todos los días del rango.
describe('ES HOY con recurrentes semanales', () => {
  // Martes de Glamour, Lucha libre CMLL: todos los martes, 17 nov 2026
  // (martes) a 12 ene 2027. El 21 nov 2026 es sábado.
  const cmll = { date: '2026-11-17', end_date: '2027-01-12', is_recurring: true };

  it('un recurrente semanal NO es hoy fuera de su día', () => {
    expect(isEventToday(cmll, '2026-11-21')).toBe(false); // sábado
    expect(isEventToday(cmll, '2026-11-22')).toBe(false); // domingo
    expect(isEventToday(cmll, '2026-11-23')).toBe(false); // lunes
    expect(isEventToday(cmll, '2026-11-28')).toBe(false); // sábado siguiente
  });

  it('un recurrente semanal SÍ es hoy en su día, dentro del rango', () => {
    expect(isEventToday(cmll, '2026-11-17')).toBe(true); // martes, inicio
    expect(isEventToday(cmll, '2026-11-24')).toBe(true); // martes
    expect(isEventToday(cmll, '2027-01-12')).toBe(true); // martes, fin
  });

  it('un recurrente semanal fuera de su rango no es hoy ni en su día', () => {
    expect(isEventToday(cmll, '2027-01-19')).toBe(false); // martes, ya pasó
    expect(isEventToday(cmll, '2026-11-10')).toBe(false); // martes, antes
  });

  it('un recurrente sin end_date solo es hoy en su día de inicio', () => {
    const sinFin = { date: '2026-11-17', is_recurring: true };
    expect(isEventToday(sinFin, '2026-11-17')).toBe(true);
    expect(isEventToday(sinFin, '2026-11-24')).toBe(false);
  });

  it('un evento de varios días NO recurrente sí es hoy en todo su rango', () => {
    const festival = { date: '2026-11-20', end_date: '2026-11-23' };
    expect(isEventToday(festival, '2026-11-20')).toBe(true);
    expect(isEventToday(festival, '2026-11-21')).toBe(true);
    expect(isEventToday(festival, '2026-11-23')).toBe(true);
    expect(isEventToday(festival, '2026-11-19')).toBe(false);
    expect(isEventToday(festival, '2026-11-24')).toBe(false);
  });

  it('un evento de un día solo es hoy ese día', () => {
    const unico = { date: '2026-11-21' };
    expect(isEventToday(unico, '2026-11-21')).toBe(true);
    expect(isEventToday(unico, '2026-11-22')).toBe(false);
  });

  it('eventCoversDay respeta la recurrencia (filtros Hoy/Mañana y fecha personalizada)', () => {
    expect(eventCoversDay(cmll, '2026-11-21')).toBe(false);
    expect(eventCoversDay(cmll, '2026-11-24')).toBe(true);
    expect(matchesDateFilter(cmll, 'hoy', '2026-11-21')).toBe(false);
    expect(matchesDateFilter(cmll, 'hoy', '2026-11-24')).toBe(true);
    expect(matchesDateFilter(cmll, 'manana', '2026-11-23')).toBe(true); // mañana es martes
    expect(matchesDateFilter(cmll, 'manana', '2026-11-21')).toBe(false); // mañana es domingo
  });

  it('eventOverlapsRange con recurrente: solo si una ocurrencia cae en la ventana', () => {
    // Fin de semana 20–22 nov 2026 (vie–dom): el martes no cae dentro.
    expect(eventOverlapsRange(cmll, '2026-11-20', '2026-11-22')).toBe(false);
    // Ventana 23–25 nov (lun–mié): incluye el martes 24.
    expect(eventOverlapsRange(cmll, '2026-11-23', '2026-11-25')).toBe(true);
    // Ventana fuera del rango del evento.
    expect(eventOverlapsRange(cmll, '2027-02-01', '2027-02-07')).toBe(false);
    // Sin recurrencia el solape de rangos no cambia.
    expect(eventOverlapsRange({ date: '2026-11-20', end_date: '2026-11-23' }, '2026-11-22', '2026-11-25')).toBe(true);
    expect(eventOverlapsRange({ date: '2026-11-20', end_date: '2026-11-23' }, '2026-11-24', '2026-11-25')).toBe(false);
  });

  it('sin fecha se preserva el comportamiento anterior', () => {
    expect(eventCoversDay({}, '2026-11-21')).toBe(true);
    expect(isEventToday({}, '2026-11-21')).toBe(false);
  });
});

describe('hoy en la zona horaria de la ciudad del evento', () => {
  it('el mismo instante es otro día en Tokio que en Ciudad de México', () => {
    const instant = Date.parse('2026-11-21T05:00:00Z'); // 23:00 del 20 en CDMX, 14:00 del 21 en Tokio
    expect(eventCalendarDay(instant, 'America/Mexico_City')).toBe('2026-11-20');
    expect(eventCalendarDay(instant, 'Asia/Tokyo')).toBe('2026-11-21');
    expect(eventDayKey(new Date(instant), 'America/Mexico_City')).toBe('2026-11-20');
    expect(eventDayKey(new Date(instant), 'Asia/Tokyo')).toBe('2026-11-21');
  });

  it('CITY_TZ cubre las 40 ciudades (antes faltaban 18)', () => {
    const slugs = [
      'bahia-de-banderas', 'barcelona', 'bogota', 'buenos-aires', 'cancun',
      'ciudad-de-mexico', 'colima', 'compostela', 'guadalajara', 'kioto',
      'londres', 'los-angeles', 'los-cabos', 'madrid', 'magdalena',
      'manzanillo', 'mazatlan', 'medellin', 'merida', 'monterrey',
      'new-york', 'nuevo-vallarta', 'paris', 'playa-del-carmen', 'puebla',
      'puerto-vallarta', 'queretaro', 'riviera-nayarit', 'san-antonio',
      'san-diego', 'san-miguel-de-allende', 'san-pedro-garza-garcia',
      'sayulita', 'tepic', 'tijuana', 'tlaquepaque', 'tokio', 'vancouver',
      'xalisco', 'zapopan',
    ];
    expect(slugs).toHaveLength(40);
    for (const slug of slugs) {
      const tz = CITY_TZ[slug];
      expect(tz, slug).toBeTruthy();
      // Zona IANA válida (si no lo fuera, Intl lanzaría).
      expect(() => new Intl.DateTimeFormat('en-US', { timeZone: tz })).not.toThrow();
    }
  });

  it('cityTimeZone prefiere cities.timezone, luego CITY_TZ, luego Ciudad de México', () => {
    const cities = [
      { slug: 'tokio', timezone: 'Asia/Tokyo' },
      { slug: 'guadalajara', timezone: null },
      { slug: 'bogota', timezone: '' },
    ];
    expect(cityTimeZone('tokio', cities)).toBe('Asia/Tokyo');
    expect(cityTimeZone('guadalajara', cities)).toBe('America/Mexico_City');
    expect(cityTimeZone('bogota', cities)).toBe('America/Bogota');
    expect(cityTimeZone('ciudad-inventada', cities)).toBe('America/Mexico_City');
    expect(cityTimeZone('tokio', new Map(cities.map(c => [c.slug, c])))).toBe('Asia/Tokyo');
    // Zona inválida en base: no rompe, cae al fallback.
    expect(cityTimeZone('x', [{ slug: 'x', timezone: 'No/Existe' }])).toBe('America/Mexico_City');
  });

  it('eventCityTimeZone usa la primera ciudad del evento multi-ciudad', () => {
    const cities = [{ slug: 'tijuana', timezone: 'America/Tijuana' }];
    expect(eventCityTimeZone({ city_slug: 'tijuana,los-angeles' }, cities)).toBe('America/Tijuana');
    expect(eventCityTimeZone({ city_slug: 'kioto' }, cities)).toBe('Asia/Tokyo');
    expect(eventCityTimeZone({}, cities)).toBe('America/Mexico_City');
  });
});
