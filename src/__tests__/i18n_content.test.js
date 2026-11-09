import { describe, it, expect } from 'vitest';
import { localizedTitle, localizedDescription } from '../lib/i18nContent.js';

describe('localizedTitle', () => {
  it("con title_en null y lang 'en' → título en español", () => {
    expect(localizedTitle({ title: 'Tour por Tlaquepaque', title_en: null }, 'en'))
      .toBe('Tour por Tlaquepaque');
  });

  it("con title_en presente y lang 'en' → inglés", () => {
    expect(localizedTitle({ title: 'Tour por Tlaquepaque', title_en: 'Tlaquepaque Tour' }, 'en'))
      .toBe('Tlaquepaque Tour');
  });

  it("con lang 'es' → español aunque exista title_en", () => {
    expect(localizedTitle({ title: 'Tour por Tlaquepaque', title_en: 'Tlaquepaque Tour' }, 'es'))
      .toBe('Tour por Tlaquepaque');
  });

  it('con title_en vacío o solo espacios y lang en → español', () => {
    expect(localizedTitle({ title: 'Tour por Tlaquepaque', title_en: '' }, 'en'))
      .toBe('Tour por Tlaquepaque');
    expect(localizedTitle({ title: 'Tour por Tlaquepaque', title_en: '   ' }, 'en'))
      .toBe('Tour por Tlaquepaque');
  });

  it('con title_en undefined (columna aún sin valor) y lang en → español', () => {
    expect(localizedTitle({ title: 'Tour por Tlaquepaque' }, 'en'))
      .toBe('Tour por Tlaquepaque');
  });

  it('tolera item null/undefined', () => {
    expect(localizedTitle(null, 'en')).toBe('');
    expect(localizedTitle(undefined, 'es')).toBe('');
  });
});

describe('localizedDescription', () => {
  it("con description_en presente y lang 'en' → inglés", () => {
    expect(localizedDescription({ description: 'Recorrido por el centro.', description_en: 'A walk through downtown.' }, 'en'))
      .toBe('A walk through downtown.');
  });

  it('con description_en vacía y lang en → español', () => {
    expect(localizedDescription({ description: 'Recorrido por el centro.', description_en: '' }, 'en'))
      .toBe('Recorrido por el centro.');
    expect(localizedDescription({ description: 'Recorrido por el centro.', description_en: '  ' }, 'en'))
      .toBe('Recorrido por el centro.');
  });

  it("con description_en null y lang 'en' → español", () => {
    expect(localizedDescription({ description: 'Recorrido por el centro.', description_en: null }, 'en'))
      .toBe('Recorrido por el centro.');
  });

  it("con lang 'es' → español aunque exista description_en", () => {
    expect(localizedDescription({ description: 'Recorrido por el centro.', description_en: 'A walk through downtown.' }, 'es'))
      .toBe('Recorrido por el centro.');
  });

  it('tolera item null/undefined', () => {
    expect(localizedDescription(null, 'en')).toBe('');
    expect(localizedDescription(undefined, 'es')).toBe('');
  });
});
