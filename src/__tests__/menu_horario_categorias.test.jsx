import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { isCategoryVisibleNow, timeToMinutes, categoryScheduleLabel, formatMinutes12h, categoryScheduleLabel12h, offHoursMessage } from '../lib/menuCategoryHours.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Tepic = America/Mazatlan (UTC-7 en noviembre, sin horario de verano).
// 10:00 en Tepic = 17:00 UTC, 14:00 = 21:00 UTC, 11:23 = 18:23 UTC,
// 16:00 = 23:00 UTC, 08:30 = 15:30 UTC, 13:00 = 20:00 UTC.
const at = (utc) => new Date(utc);
const MAZ = 'America/Mazatlan';
const breakfast = { id: 'des', name: 'DESAYUNOS', available_from: '08:30', available_to: '13:00' };
const lunch = { id: 'com', name: 'HAMBURGUESAS 3:00pm - 9:00pm', available_from: '15:00', available_to: '21:00' };
const drinks = { id: 'beb', name: 'BEBIDAS', available_from: null, available_to: null };
const overnight = { id: 'noc', name: 'NOCTURNO', available_from: '18:00', available_to: '02:00' };

describe('Visibilidad de secciones de menú por horario', () => {
  it('desayunos están en horario a las 10:00 y fuera a las 14:00', () => {
    expect(isCategoryVisibleNow(breakfast, { now: at('2026-11-12T17:00:00Z'), timeZone: MAZ })).toBe(true);
    expect(isCategoryVisibleNow(breakfast, { now: at('2026-11-12T21:00:00Z'), timeZone: MAZ })).toBe(false);
  });

  it('respeta los bordes exactos: 08:30 sí, 13:00 no', () => {
    expect(isCategoryVisibleNow(breakfast, { now: at('2026-11-12T15:30:00Z'), timeZone: MAZ })).toBe(true);
    expect(isCategoryVisibleNow(breakfast, { now: at('2026-11-12T20:00:00Z'), timeZone: MAZ })).toBe(false);
  });

  it('la comida de la tarde está fuera a las 11:23 y en horario a las 16:00', () => {
    expect(isCategoryVisibleNow(lunch, { now: at('2026-11-12T18:23:00Z'), timeZone: MAZ })).toBe(false);
    expect(isCategoryVisibleNow(lunch, { now: at('2026-11-12T23:00:00Z'), timeZone: MAZ })).toBe(true);
    expect(isCategoryVisibleNow(lunch, { now: at('2026-11-12T22:00:00Z'), timeZone: MAZ })).toBe(true);
    expect(isCategoryVisibleNow(lunch, { now: at('2026-11-13T04:00:00Z'), timeZone: MAZ })).toBe(false);
  });

  it('en el hueco 12:30–15:00 de KAVA solo las bebidas están en horario', () => {
    const menu = [breakfast, lunch, drinks];
    const visibleAt1400 = menu.filter((c) => isCategoryVisibleNow(c, { now: at('2026-11-12T21:00:00Z'), timeZone: MAZ }));
    expect(visibleAt1400.map((c) => c.id)).toEqual(['beb']);
  });

  it('una sección sin horario siempre se muestra', () => {
    for (const now of ['2026-11-12T02:00:00Z', '2026-11-12T17:00:00Z', '2026-11-12T23:00:00Z']) {
      expect(isCategoryVisibleNow(drinks, { now: at(now), timeZone: MAZ })).toBe(true);
      expect(isCategoryVisibleNow({ id: 'x', name: 'SIN HORARIO' }, { now: at(now), timeZone: MAZ })).toBe(true);
      expect(isCategoryVisibleNow({ id: 'y', name: 'SOLO DESDE', available_from: '08:00', available_to: null }, { now: at(now), timeZone: MAZ })).toBe(true);
    }
  });

  it('soporta ventana nocturna (18:00–02:00)', () => {
    expect(isCategoryVisibleNow(overnight, { now: at('2026-11-13T03:00:00Z'), timeZone: MAZ })).toBe(true);
    expect(isCategoryVisibleNow(overnight, { now: at('2026-11-13T08:00:00Z'), timeZone: MAZ })).toBe(true);
    expect(isCategoryVisibleNow(overnight, { now: at('2026-11-12T17:00:00Z'), timeZone: MAZ })).toBe(false);
    expect(isCategoryVisibleNow(overnight, { now: at('2026-11-13T01:00:00Z'), timeZone: MAZ })).toBe(true);
    expect(isCategoryVisibleNow(overnight, { now: at('2026-11-13T09:00:00Z'), timeZone: MAZ })).toBe(false);
  });

  it('usa la zona horaria del negocio, no la del dispositivo', () => {
    const now = at('2026-11-12T17:00:00Z'); // 10:00 en Tepic, 18:00 en Madrid
    expect(isCategoryVisibleNow(breakfast, { now, timeZone: 'America/Mazatlan' })).toBe(true);
    expect(isCategoryVisibleNow(breakfast, { now, timeZone: 'Europe/Madrid' })).toBe(false);
  });

  it('parsea "HH:MM" y "HH:MM:SS" de Postgres y rechaza valores inválidos', () => {
    expect(timeToMinutes('08:30')).toBe(510);
    expect(timeToMinutes('08:30:00')).toBe(510);
    expect(timeToMinutes('21:00')).toBe(1260);
    expect(timeToMinutes(null)).toBeNull();
    expect(timeToMinutes('')).toBeNull();
    expect(timeToMinutes('99:00')).toBeNull();
    expect(timeToMinutes('08:60')).toBeNull();
  });

  it('etiqueta el horario o "Siempre visible"', () => {
    expect(categoryScheduleLabel(breakfast)).toBe('08:30–13:00');
    expect(categoryScheduleLabel(drinks)).toBe('Siempre visible');
  });
});

describe('Formato 12 h y aviso de fuera de servicio (opción A)', () => {
  it('formatea minutos a 12 h sin cero inicial en la hora', () => {
    expect(formatMinutes12h(0)).toBe('12:00 a.m.');
    expect(formatMinutes12h(60)).toBe('1:00 a.m.');
    expect(formatMinutes12h(480)).toBe('8:00 a.m.');
    expect(formatMinutes12h(510)).toBe('8:30 a.m.');
    expect(formatMinutes12h(720)).toBe('12:00 p.m.');
    expect(formatMinutes12h(750)).toBe('12:30 p.m.');
    expect(formatMinutes12h(1260)).toBe('9:00 p.m.');
    expect(formatMinutes12h(null)).toBe('');
  });

  it('etiqueta el horario en 12 h o null sin horario', () => {
    expect(categoryScheduleLabel12h(breakfast)).toBe('8:30 a.m. – 1:00 p.m.');
    expect(categoryScheduleLabel12h(lunch)).toBe('3:00 p.m. – 9:00 p.m.');
    expect(categoryScheduleLabel12h(drinks)).toBeNull();
  });

  it('el aviso dice la próxima apertura (available_from) en 12 h', () => {
    expect(offHoursMessage(breakfast)).toBe('Fuera de servicio, vuelve a las 8:30 a.m.');
    expect(offHoursMessage(lunch)).toBe('Fuera de servicio, vuelve a las 3:00 p.m.');
    // Ventana nocturna: la próxima apertura también es available_from.
    expect(offHoursMessage(overnight)).toBe('Fuera de servicio, vuelve a las 6:00 p.m.');
    expect(offHoursMessage(drinks)).toBeNull();
  });
});

describe('Cableado de la visibilidad por horario', () => {
  it('el menú público ya no oculta secciones fuera de horario: las atenúa y avisa', () => {
    const store = read('../components/store/BusinessStore.jsx');
    expect(store).toContain('isCategoryVisibleNow');
    // La consulta vive en el helper compartido (carga única, hallazgo
    // #2): BusinessStore la usa vía fetchStoreCategories, no en línea.
    expect(store).toContain('fetchStoreCategories');
    const helper = read('../lib/storeCategories.js');
    expect(helper).toContain('available_from,available_to');
    expect(store).toContain('setInterval');
    expect(store).toContain('activeCategories.flatMap');
    // Ya no hay estado vacío de "todo fuera de horario": las secciones
    // siempre se muestran.
    expect(store).not.toContain('En este momento no hay secciones disponibles');
    // Opción A: atenuado + etiqueta con horario + aviso al tocar.
    expect(store).toContain('isCatOffHours');
    expect(store).toContain('offHoursMessage');
    expect(store).toContain('showOffHoursNotice');
    expect(store).toContain('Fuera de servicio');
    expect(store).toContain('categoryScheduleLabel12h');
    expect(store).toContain('aria-disabled');
    expect(store).toContain('offHoursNotice');
  });

  it('el panel del dueño recibe las columnas y edita el horario por categoría', () => {
    const admin = read('../components/store/StoreAdminPanel.jsx');
    expect(admin).toContain('available_from,available_to');
    const tab = read('../components/store/StoreCategoriesTab.jsx');
    expect(tab).toContain('type="time"');
    expect(tab).toContain('Siempre visible');
    expect(tab).toContain("sb.patch('store_categories', id, { available_from");
    expect(tab).toContain('categoryScheduleLabel');
  });

  it('la migración agrega las columnas available_from/available_to', () => {
    const migration = read('../../supabase/migrations/20261112130000_add_menu_category_hours.sql');
    expect(migration).toContain('alter table public.store_categories');
    expect(migration).toContain('available_from time');
    expect(migration).toContain('available_to time');
  });
});
