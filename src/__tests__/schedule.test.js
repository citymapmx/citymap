/**
 * Tests para isOpenNow(), getMinutesToClose() y getSmartScheduleInfo()
 * 
 * Estos son los tests que habrían detectado el bug de turnos de medianoche (10:30 PM - 3:00 AM)
 * que reportó el usuario a las 12:27 AM del domingo.
 */
import { describe, it, expect } from 'vitest';
import { isOpenNow, getMinutesToClose } from '../lib/utils.js';

// Helper: crea un objeto negocio con el horario especificado
function makeBiz(schedule) {
  return { schedule, open: false };
}

// Helper: crea un Date en horario de México (UTC-6) para un día y hora específicos
// day: 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
function makeDate(dayOfWeek, hour, minute = 0) {
  // Ajuste a UTC para que en Mexico_City (UTC-6) quede en el día/hora correctos
  const now = new Date('2026-01-04T00:00:00Z'); // Domingo 4 enero 2026, medianoche UTC
  // El domingo en UTC = domingo en Mexico_City (0:00 AM CST = 06:00 UTC)
  // Base: domingo 4 enero a las 06:00 UTC = domingo 0:00 CST
  const baseSundayMidnight_UTC = new Date('2026-01-04T06:00:00Z');
  
  const totalMinutes = (dayOfWeek * 24 * 60) + (hour * 60) + minute;
  return new Date(baseSundayMidnight_UTC.getTime() + totalMinutes * 60000);
}

const TZ = 'America/Mexico_City';

// ──────────────────────────────────────────────────────────────────────────────
describe('isOpenNow — casos básicos', () => {

  it('retorna true si no hay horario y b.open es true', () => {
    expect(isOpenNow({ schedule: null, open: true }, TZ, makeDate(1, 14))).toBe(true);
  });

  it('retorna false si no hay horario y b.open es false', () => {
    expect(isOpenNow({ schedule: null, open: false }, TZ, makeDate(1, 14))).toBe(false);
  });

  it('retorna true si type === always_open', () => {
    const biz = makeBiz({ type: 'always_open' });
    expect(isOpenNow(biz, TZ, makeDate(0, 3))).toBe(true);
  });

  it('retorna false si el día está marcado como "cerrado"', () => {
    const biz = makeBiz({ lun: 'Cerrado' });
    expect(isOpenNow(biz, TZ, makeDate(1, 14))).toBe(false);
  });

  it('retorna false si no hay horario para ese día', () => {
    const biz = makeBiz({ mar: '10:00 - 18:00' });
    expect(isOpenNow(biz, TZ, makeDate(1, 14))).toBe(false); // Lunes no tiene horario
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('isOpenNow — horario normal (sin cruzar medianoche)', () => {

  const biz = makeBiz({
    lun: '9:00 - 21:00',
    mar: '9:00 - 21:00',
    mie: '9:00 - 21:00',
    jue: '9:00 - 21:00',
    vie: '9:00 - 22:00',
    sab: '10:00 - 22:00',
    dom: 'Cerrado',
  });

  it('está abierto a las 2:00 PM del lunes', () => {
    expect(isOpenNow(biz, TZ, makeDate(1, 14))).toBe(true);
  });

  it('está cerrado a las 8:59 AM del lunes (antes de abrir)', () => {
    expect(isOpenNow(biz, TZ, makeDate(1, 8, 59))).toBe(false);
  });

  it('está abierto a las 9:00 AM del lunes (justo al abrir)', () => {
    expect(isOpenNow(biz, TZ, makeDate(1, 9, 0))).toBe(true);
  });

  it('está cerrado a las 9:00 PM del lunes (justo al cerrar)', () => {
    expect(isOpenNow(biz, TZ, makeDate(1, 21, 0))).toBe(false);
  });

  it('está cerrado el domingo', () => {
    expect(isOpenNow(biz, TZ, makeDate(0, 15))).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('isOpenNow — 🐛 EL BUG REAL: turnos que cruzan medianoche (10:30 PM - 3:00 AM)', () => {
  /**
   * Este es exactamente el caso que el usuario reportó a las 12:27 AM del domingo:
   * "La Santa" abre el sábado a las 10:30 PM y cierra el domingo a las 3:00 AM
   * Pero la app mostraba "Cerrado" porque solo revisaba el horario del domingo.
   */
  const laSanta = makeBiz({
    lun: 'Cerrado',
    mar: 'Cerrado',
    mie: 'Cerrado',
    jue: 'Cerrado',
    vie: '22:30 - 03:00',
    sab: '22:30 - 03:00',
    dom: 'Cerrado',
  });

  it('🐛 BUG DETECTADO: estaba cerrado el domingo a las 12:27 AM (debería estar ABIERTO por turno del sábado)', () => {
    // Domingo, 0:27 AM — dentro del turno Sab 10:30 PM - 3:00 AM
    expect(isOpenNow(laSanta, TZ, makeDate(0, 0, 27))).toBe(true);
  });

  it('está abierto el domingo a las 2:00 AM (dentro del turno del sábado)', () => {
    expect(isOpenNow(laSanta, TZ, makeDate(0, 2, 0))).toBe(true);
  });

  it('está cerrado el domingo a las 3:00 AM (cuando termina el turno del sábado)', () => {
    expect(isOpenNow(laSanta, TZ, makeDate(0, 3, 0))).toBe(false);
  });

  it('está cerrado el domingo a las 4:00 AM (bien pasado el cierre)', () => {
    expect(isOpenNow(laSanta, TZ, makeDate(0, 4, 0))).toBe(false);
  });

  it('está abierto el sábado a las 11:00 PM (dentro del turno normal)', () => {
    expect(isOpenNow(laSanta, TZ, makeDate(6, 23, 0))).toBe(true);
  });

  it('está cerrado el sábado a las 10:29 PM (antes de abrir)', () => {
    expect(isOpenNow(laSanta, TZ, makeDate(6, 22, 29))).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('isOpenNow — múltiples turnos en un día', () => {
  const biz = makeBiz({
    lun: '8:00 - 14:00, 17:00 - 21:00',
  });

  it('está abierto en el primer turno (10:00 AM)', () => {
    expect(isOpenNow(biz, TZ, makeDate(1, 10))).toBe(true);
  });

  it('está cerrado en la pausa del mediodía (15:00)', () => {
    expect(isOpenNow(biz, TZ, makeDate(1, 15))).toBe(false);
  });

  it('está abierto en el segundo turno (19:00)', () => {
    expect(isOpenNow(biz, TZ, makeDate(1, 19))).toBe(true);
  });

  it('está cerrado después del segundo turno (21:30)', () => {
    expect(isOpenNow(biz, TZ, makeDate(1, 21, 30))).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('isOpenNow — horarios en formato 12h (am/pm)', () => {
  const biz = makeBiz({ lun: '10:00am - 10:00pm' });

  it('está abierto a la 1:00 PM', () => {
    expect(isOpenNow(biz, TZ, makeDate(1, 13))).toBe(true);
  });

  it('está cerrado a las 10:30 PM', () => {
    expect(isOpenNow(biz, TZ, makeDate(1, 22, 30))).toBe(false);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
describe('getMinutesToClose — tiempo restante para cerrar', () => {

  it('retorna Infinity si always_open', () => {
    const biz = makeBiz({ type: 'always_open' });
    expect(getMinutesToClose(biz, TZ, makeDate(1, 14))).toBe(Infinity);
  });

  it('retorna -1 si está cerrado', () => {
    const biz = makeBiz({ lun: 'Cerrado' });
    expect(getMinutesToClose(biz, TZ, makeDate(1, 14))).toBe(-1);
  });

  it('retorna los minutos correctos antes de cerrar (2h antes = 120 min)', () => {
    const biz = makeBiz({ lun: '9:00 - 21:00' });
    // 19:00 → cierra a las 21:00 → 120 minutos
    expect(getMinutesToClose(biz, TZ, makeDate(1, 19, 0))).toBe(120);
  });

  it('retorna minutos correctos en turno que cruza medianoche (domingo 1:00 AM → cierra 3:00 AM = 120 min)', () => {
    const biz = makeBiz({ sab: '22:00 - 03:00', dom: 'Cerrado' });
    // Domingo 1:00 AM = dentro del turno del sábado, faltan 2h = 120 min
    expect(getMinutesToClose(biz, TZ, makeDate(0, 1, 0))).toBe(120);
  });
});
