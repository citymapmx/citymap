import { describe, it, expect } from 'vitest';
import {
  isNightSpot,
  isLunchSpot,
  isBreakfastSpot,
  isFoodSpot,
  getTimeSlot,
  spotForSlot,
  shuffleBySeed,
} from '../lib/timeBasedLists.js';

const biz = (category, extra = {}) => ({ id: 'x', category, tags: [], ...extra });

describe('isNightSpot (Para cerrar el día)', () => {
  it.each([
    'restaurantes', 'restaurante', 'cafeterias', 'cafeteria', 'cafe',
    'antros y bares', 'bar', 'antros', 'club', 'cerveceria',
  ])('incluye categoría %s sin importar el plan', (cat) => {
    expect(isNightSpot(biz(cat, { plan: 'free' }))).toBe(true);
    expect(isNightSpot(biz(cat, { plan: 'premium' }))).toBe(true);
  });

  it.each(['hospedaje', 'compras', 'lugares', 'fitness', 'unidad deportiva', 'salud', 'ocio'])(
    'excluye categoría %s',
    (cat) => expect(isNightSpot(biz(cat))).toBe(false),
  );

  it('incluye por tag cenas aunque la categoría no sea de noche', () => {
    expect(isNightSpot(biz('lugares', { tags: ['Cenas'] }))).toBe(true);
  });

  it('no distingue mayúsculas ni espacios en la categoría', () => {
    expect(isNightSpot(biz('  Restaurantes '))).toBe(true);
    expect(isNightSpot(biz('CAFETERIAS'))).toBe(true);
  });
});

describe('isLunchSpot / isBreakfastSpot', () => {
  it('mediodía: restaurantes y comida, o tag comidas', () => {
    expect(isLunchSpot(biz('restaurantes'))).toBe(true);
    expect(isLunchSpot(biz('tacos'))).toBe(true);
    expect(isLunchSpot(biz('lugares', { tags: ['comidas'] }))).toBe(true);
    expect(isLunchSpot(biz('hospedaje'))).toBe(false);
  });

  it('mañana: cafeterías, desayunos o lugares para comer', () => {
    expect(isBreakfastSpot(biz('cafe'))).toBe(true);
    expect(isBreakfastSpot(biz('lugares', { tags: ['Desayunos'] }))).toBe(true);
    expect(isBreakfastSpot(biz('restaurantes'))).toBe(true);
    expect(isBreakfastSpot(biz('hospedaje'))).toBe(false);
  });
});

describe('isFoodSpot (respaldo)', () => {
  it('solo restaurantes y cafeterías', () => {
    expect(isFoodSpot(biz('restaurantes'))).toBe(true);
    expect(isFoodSpot(biz('cafeterias'))).toBe(true);
    expect(isFoodSpot(biz('cafe'))).toBe(true);
    expect(isFoodSpot(biz('antros y bares'))).toBe(false);
    expect(isFoodSpot(biz('hospedaje'))).toBe(false);
  });
});

describe('getTimeSlot', () => {
  it.each([
    [19, 'night', 'Para cerrar el día'],
    [23, 'night', 'Para cerrar el día'],
    [3, 'night', 'Para cerrar el día'],
    [4, 'morning', 'Para iniciar el día'],
    [11, 'morning', 'Para iniciar el día'],
    [12, 'lunch', 'Hora de comer'],
    [16, 'lunch', 'Hora de comer'],
    [17, 'night', 'Para cerrar el día'],
  ])('%s h -> %s (%s)', (hour, key, title) => {
    expect(getTimeSlot(hour)).toEqual({ key, title });
  });
});

describe('spotForSlot', () => {
  it('enruta cada franja a su regla', () => {
    expect(spotForSlot(biz('cafeterias'), 'night')).toBe(true);
    expect(spotForSlot(biz('cafeterias'), 'lunch')).toBe(false);
    expect(spotForSlot(biz('tacos'), 'lunch')).toBe(true);
    expect(spotForSlot(biz('cafe'), 'morning')).toBe(true);
    expect(spotForSlot(biz('hospedaje'), 'night')).toBe(false);
  });
});

describe('shuffleBySeed (orden aleatorio, sin plan)', () => {
  const list = Array.from({ length: 12 }, (_, i) => ({
    id: `b${i}`,
    plan: i < 6 ? 'premium' : 'free',
  }));

  it('es una permutación: los mismos negocios, sin duplicados ni bajas', () => {
    const shuffled = shuffleBySeed(list, 7);
    expect(shuffled.map(b => b.id).sort()).toEqual(list.map(b => b.id).sort());
    expect(shuffled).toHaveLength(12);
  });

  it('misma semilla = mismo orden (estable dentro de la carga)', () => {
    expect(shuffleBySeed(list, 7).map(b => b.id)).toEqual(shuffleBySeed(list, 7).map(b => b.id));
  });

  it('semilla distinta = orden distinto', () => {
    expect(shuffleBySeed(list, 1).map(b => b.id)).not.toEqual(shuffleBySeed(list, 2).map(b => b.id));
  });

  it('no ordena por plan: un free puede quedar antes que un premium', () => {
    const firsts = [1, 2, 3, 4, 5].map(s => shuffleBySeed(list, s)[0].plan);
    expect(firsts).toContain('free');
  });
});
