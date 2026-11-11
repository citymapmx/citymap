import { describe, it, expect, beforeAll } from 'vitest';
import { TRANSLATIONS, ensureEnglishTranslations, translateDynamicStatus } from '../lib/i18n.js';

// El inglés se carga en diferido (rendimiento teléfono): antes de comparar
// los diccionarios hay que pedirlo explícitamente.
beforeAll(async () => {
  await ensureEnglishTranslations();
});

const getPlaceholders = (s) => new Set([
  ...s.matchAll(/\$\{(\w+)\}/g),
  ...s.matchAll(/\{(\w+)\}/g),
].map((m) => m[1]));

describe('i18n: paridad de diccionarios (fase 1 inglés)', () => {
  it('toda clave de es existe en en y viceversa', () => {
    const esKeys = Object.keys(TRANSLATIONS.es);
    const enKeys = Object.keys(TRANSLATIONS.en);
    expect(esKeys.sort()).toEqual(enKeys.sort());
  });

  it('ningún valor en inglés está vacío', () => {
    const empty = Object.entries(TRANSLATIONS.en).filter(([, v]) => !v || !String(v).trim());
    expect(empty).toEqual([]);
  });

  it('ningún valor en español está vacío', () => {
    const empty = Object.entries(TRANSLATIONS.es).filter(([, v]) => !v || !String(v).trim());
    expect(empty).toEqual([]);
  });

  it('ninguna clave tiene mayúsculas (t() pasa la clave a minúsculas)', () => {
    const upper = Object.keys(TRANSLATIONS.es).filter((k) => k !== k.toLowerCase());
    expect(upper).toEqual([]);
  });

  it('los placeholders ${var} y {var} coinciden entre es y en', () => {
    const mismatched = Object.keys(TRANSLATIONS.es).filter((k) => {
      const a = getPlaceholders(TRANSLATIONS.es[k]);
      const b = getPlaceholders(TRANSLATIONS.en[k]);
      return a.size !== b.size || [...a].some((x) => !b.has(x));
    });
    expect(mismatched).toEqual([]);
  });

  it('las claves de horario existen en ambos idiomas', () => {
    for (const k of ['abierto 24/7', 'abierto ahora', '· previa cita', '· solo para llevar']) {
      expect(TRANSLATIONS.es[k]).toBeTruthy();
      expect(TRANSLATIONS.en[k]).toBeTruthy();
    }
  });
});

describe('translateDynamicStatus: textos dinámicos de horario', () => {
  it('traduce "Cierra pronto (45m)" y "Abre pronto (30m)"', () => {
    expect(translateDynamicStatus('Cierra pronto (45m)', 'en')).toBe('Closing soon (45m)');
    expect(translateDynamicStatus('Abre pronto (30m)', 'en')).toBe('Opening soon (30m)');
  });

  it('traduce "Cerrado, abre hoy / mañana / el día"', () => {
    expect(translateDynamicStatus('Cerrado, abre hoy a las 9:00am', 'en'))
      .toBe('Closed, opens today at 9:00am');
    expect(translateDynamicStatus('Cerrado, abre mañana a la 1:00pm', 'en'))
      .toBe('Closed, opens tomorrow at 1:00pm');
    expect(translateDynamicStatus('Cerrado, abre el domingo a las 10:00am', 'en'))
      .toBe('Closed, opens Sunday at 10:00am');
    expect(translateDynamicStatus('Cerrado, abre el miércoles a las 8:00am', 'en'))
      .toBe('Closed, opens Wednesday at 8:00am');
  });

  it('en español devuelve null (el texto ya está en español)', () => {
    expect(translateDynamicStatus('Cierra pronto (45m)', 'es')).toBeNull();
    expect(translateDynamicStatus('Cerrado, abre hoy a las 9:00am', 'es')).toBeNull();
  });

  it('devuelve null si el texto no coincide con ningún patrón', () => {
    expect(translateDynamicStatus('Abierto', 'en')).toBeNull();
    expect(translateDynamicStatus('Cerrado', 'en')).toBeNull();
    expect(translateDynamicStatus('', 'en')).toBeNull();
  });
});
