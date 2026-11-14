import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  normalizeSchedule,
  scheduleTimeToMinutes,
  to12h,
  to24h,
  validateSchedule,
} from '../lib/scheduleFormat.js';

// Eduardo Barber antes del arreglo: todos los días "09:00 a.m. - " sin cierre.
const BARBER_SCHEDULE = Object.fromEntries(
  ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'].map((d) => [d, '09:00 a.m. - ']),
);

describe('guardado del horario: parseo de horas', () => {
  it('scheduleTimeToMinutes lee la hora de cierre que usa BookingModal', () => {
    expect(scheduleTimeToMinutes('09:00 a.m.')).toBe(540);
    expect(scheduleTimeToMinutes('10:00 p.m.')).toBe(1320);
    expect(scheduleTimeToMinutes('12:00 a.m.')).toBe(0);
    expect(scheduleTimeToMinutes('12:00 p.m.')).toBe(720);
    expect(scheduleTimeToMinutes('18:00')).toBe(1080);
    expect(scheduleTimeToMinutes('09:00 a.m. - ')).toBe(540);
    expect(scheduleTimeToMinutes('09:00 a.m. - 10:00 p.m.')).toBe(540);
    expect(scheduleTimeToMinutes('09:00 a.m. - 10:00 p.m.\n04:00 p.m. - 08:00 p.m.')).toBe(540);
    expect(scheduleTimeToMinutes('Cerrado')).toBeNull();
    expect(scheduleTimeToMinutes('')).toBeNull();
  });
  it('las horas con puntos se leen bien: "10:00 p.m." son las 22:00, no las 10:00', () => {
    expect(scheduleTimeToMinutes('10:00 p.m.')).toBe(1320);
    expect(scheduleTimeToMinutes('06:00 p.m.')).toBe(1080);
    expect(scheduleTimeToMinutes('12:00 p.m.')).toBe(720);
    expect(scheduleTimeToMinutes('12:00 a.m.')).toBe(0);
    expect(scheduleTimeToMinutes('02:00 p.m.')).toBe(840);
  });
  it('to24h/to12h se complementan en todos los formatos habituales', () => {
    expect(to24h('10:00 p.m.')).toBe('22:00');
    expect(to24h('22:00')).toBe('22:00');
    expect(to24h('10pm')).toBe('22:00');
    expect(to24h('9:30am')).toBe('09:30');
    expect(to24h('')).toBe('');
    expect(to24h('xyz')).toBe('');
    expect(to12h('22:00')).toBe('10:00 p.m.');
    expect(to12h('09:00')).toBe('09:00 a.m.');
    expect(to12h('00:00')).toBe('12:00 a.m.');
    expect(to12h('12:00')).toBe('12:00 p.m.');
    expect(to12h('')).toBe('');
    expect(to12h('xyz')).toBe('');
  });
});

describe('guardado del horario: normalización (el cierre que se ve es el que se guarda)', () => {
  it('Eduardo Barber: un día abierto sin cierre se guarda con 10:00 p. m. (lo que mostraba el formulario)', () => {
    const { schedule, problems } = normalizeSchedule(BARBER_SCHEDULE);
    expect(problems).toHaveLength(0);
    for (const day of Object.keys(BARBER_SCHEDULE)) {
      expect(schedule[day]).toBe('09:00 a.m. - 10:00 p.m.');
    }
  });
  it('con el modal del dueño el cierre por defecto es 6:00 p. m.', () => {
    const { schedule, problems } = normalizeSchedule(BARBER_SCHEDULE, { defaultOpen24: '09:00', defaultClose24: '18:00' });
    expect(problems).toHaveLength(0);
    expect(schedule.lun).toBe('09:00 a.m. - 06:00 p.m.');
  });
  it('una apertura sin cierre se guarda con el cierre por defecto ("09:00 - " también)', () => {
    expect(normalizeSchedule({ lun: '09:00 - ' }).schedule.lun).toBe('09:00 a.m. - 10:00 p.m.');
    expect(normalizeSchedule({ lun: '09:00 a.m.' }).schedule.lun).toBe('09:00 a.m. - 10:00 p.m.');
    expect(normalizeSchedule({ lun: '10:00am - ' }).schedule.lun).toBe('10:00 a.m. - 10:00 p.m.');
    expect(normalizeSchedule({ lun: '09:00 a.m. - 06:00 p.m.' }).schedule.lun).toBe('09:00 a.m. - 06:00 p.m.');
  });
  it('un rango con cierre se normaliza a 12 h ("09:00 - 18:00" → "09:00 a.m. - 06:00 p.m.")', () => {
    expect(normalizeSchedule({ lun: '09:00 - 18:00' }).schedule.lun).toBe('09:00 a.m. - 06:00 p.m.');
    expect(normalizeSchedule({ lun: '09:00 a.m. - 06:00 p.m.' }).schedule.lun).toBe('09:00 a.m. - 06:00 p.m.');
    expect(normalizeSchedule({ lun: '9:30am - 9pm' }).schedule.lun).toBe('09:30 a.m. - 09:00 p.m.');
  });
  it('los días cerrados quedan como "Cerrado"', () => {
    const { schedule, problems } = normalizeSchedule({ lun: 'Cerrado', mar: '', mie: '  ' });
    expect(problems).toHaveLength(0);
    expect(schedule.lun).toBe('Cerrado');
    expect(schedule.mar).toBe('Cerrado');
    expect(schedule.mie).toBe('Cerrado');
  });
  it('los turnos de varias líneas se normalizan línea por línea (cierre faltante con el valor por defecto)', () => {
    const { schedule, problems } = normalizeSchedule({ lun: '09:00 a.m. - 02:00 p.m.\n04:00 p.m. - 08:00 p.m.' });
    expect(problems).toHaveLength(0);
    expect(schedule.lun).toBe('09:00 a.m. - 02:00 p.m.\n04:00 p.m. - 08:00 p.m.');
    expect(normalizeSchedule({ lun: '09:00 a.m. - 02:00 p.m.\n04:00 p.m. - ' }).schedule.lun)
      .toBe('09:00 a.m. - 02:00 p.m.\n04:00 p.m. - 10:00 p.m.');
  });
  it('con type always_open los días no se tocan (no hay editor por día) y las claves se conservan', () => {
    const { schedule, problems } = normalizeSchedule({ type: 'always_open', lun: '09:00 a.m. - ', otra: 'x' });
    expect(problems).toHaveLength(0);
    expect(schedule.type).toBe('always_open');
    expect(schedule.lun).toBe('09:00 a.m. - ');
    expect(schedule.otra).toBe('x');
  });
});

describe('guardado del horario: validación (día abierto sin cierre no se guarda)', () => {
  it('un día con texto ilegible es problema (con su etiqueta)', () => {
    expect(validateSchedule({ lun: 'xyz' })).toEqual([{ day: 'lun', label: 'Lunes', reason: 'no se pudo leer el horario ("xyz")' }]);
    expect(validateSchedule({ lun: '09:00 a.m. - xyz' })).toEqual([{ day: 'lun', label: 'Lunes', reason: 'no se pudo leer el horario ("09:00 a.m. - xyz")' }]);
  });
  it('varios días problemáticos se reportan todos', () => {
    const problems = validateSchedule({ lun: 'xyz', mar: '09:00 a.m. - 10:00 p.m.', mie: 'abc' });
    expect(problems.map((p) => p.label)).toEqual(['Lunes', 'Miércoles']);
  });
  it('un horario válido (con cierre, cerrado o vacío) no tiene problemas', () => {
    expect(validateSchedule({ lun: '09:00 a.m. - 10:00 p.m.', mar: 'Cerrado', mie: '' })).toEqual([]);
    expect(validateSchedule(BARBER_SCHEDULE)).toEqual([]);
    expect(validateSchedule(null)).toEqual([]);
    expect(validateSchedule({})).toEqual([]);
  });
  it('lo que no es un objeto se devuelve tal cual, sin problemas (no se puede normalizar sin romperlo)', () => {
    expect(validateSchedule('09:00 a.m. - ')).toEqual([]);
    expect(normalizeSchedule('09:00 a.m. - ').schedule).toBe('09:00 a.m. - ');
  });
});

// ── Cableado (fuente) ───────────────────────────────────────────────────────

describe('guardado del horario: cableado (fuente)', () => {
  it('AdminBizTab normaliza al abrir el formulario y al guardar (el cierre visible queda en la base)', () => {
    const src = fs.readFileSync(new URL('../components/admin/AdminBizTab.jsx', import.meta.url), 'utf8');
    expect(src).toContain("import { normalizeSchedule } from '../../lib/scheduleFormat.js';");
    expect(src).toContain('schedule: normalizeSchedule(b.schedule || {}).schedule');
    expect(src).toContain('normalizeSchedule(bizForm.schedule || {})');
    expect(src).toContain('schedule: normalizedSchedule');
  });
  it('ScheduleManagerModal normaliza al abrir y valida al guardar', () => {
    const src = fs.readFileSync(new URL('../components/ScheduleManagerModal.jsx', import.meta.url), 'utf8');
    expect(src).toContain("import { normalizeSchedule } from \"../lib/scheduleFormat.js\";");
    expect(src).toContain('normalizeSchedule(biz.schedule || {}, { defaultOpen24: "09:00", defaultClose24: "18:00" })');
    expect(src).toContain('normalizeSchedule(schedule, { defaultOpen24: "09:00", defaultClose24: "18:00" })');
    expect(src).toContain('Completa el horario en:');
    expect(src).toContain('schedule: normalizedSchedule');
  });
  it('BookingModal y ScheduleManagerModal leen a.m./p.m. con puntos (si no, un cierre "06:00 p.m." se leería como 6:00 a. m.)', () => {
    const booking = fs.readFileSync(new URL('../components/BookingModal.jsx', import.meta.url), 'utf8');
    const manager = fs.readFileSync(new URL('../components/ScheduleManagerModal.jsx', import.meta.url), 'utf8');
    expect(booking).toContain('a\\.?m\\.?|p\\.?m\\.?');
    expect(manager).toContain('a\\.?m\\.?|p\\.?m\\.?');
  });
});
