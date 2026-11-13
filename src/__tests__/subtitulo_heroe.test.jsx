// Subtítulo del héroe del inicio de ciudad (13 nov 2026, reporte de
// Jonathan a la 1:43 a.m.): el saludo decía "¡Linda noche!" pero el
// subtítulo decía "Empieza tu día de descanso con un buen brunch". La
// franja de mañana empezaba a las 0:00 (h < 11); ahora la mañana empieza
// a las 6:00 y de 22:00 a 05:59 el subtítulo es de noche, nunca de
// desayuno/brunch. La frase rota por día (día del año % nº de frases),
// estable dentro del día.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  HERO_SUBTITLE_POOLS,
  HERO_SUBTITLE_SLOTS,
  dayOfYear,
  getHeroSubtitle,
  heroSubtitleSlot,
  pickStableForDay,
} from '../lib/heroSubtitle.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
// t de mentira que devuelve el respaldo en español (como t(clave, es)).
const tEs = (_key, fallback) => fallback;
const PROHIBIDO_NOCHE = ['desayuno', 'brunch', 'empieza tu día', 'empieza el día'];

// 9–15 nov 2026: lunes a domingo (vie 13 = fin de semana para el héroe).
const at = (day, hour, minute = 0) => new Date(2026, 10, day, hour, minute);

describe('franjas horarias del subtítulo', () => {
  it('madrugada: 0–5 y 22–23; mañana empieza a las 6:00', () => {
    expect(heroSubtitleSlot(0)).toBe('madrugada');
    expect(heroSubtitleSlot(5)).toBe('madrugada');
    expect(heroSubtitleSlot(6)).toBe('manana');
    expect(heroSubtitleSlot(10)).toBe('manana');
    expect(heroSubtitleSlot(11)).toBe('mediodia');
    expect(heroSubtitleSlot(13)).toBe('mediodia');
    expect(heroSubtitleSlot(14)).toBe('tarde');
    expect(heroSubtitleSlot(17)).toBe('tarde');
    expect(heroSubtitleSlot(18)).toBe('noche');
    expect(heroSubtitleSlot(21)).toBe('noche');
    expect(heroSubtitleSlot(22)).toBe('madrugada');
    expect(heroSubtitleSlot(23)).toBe('madrugada');
  });

  it('cada franja tiene al menos 3 frases por tipo de día', () => {
    for (const slot of HERO_SUBTITLE_SLOTS) {
      expect(HERO_SUBTITLE_POOLS[slot].weekend.length).toBeGreaterThanOrEqual(3);
      expect(HERO_SUBTITLE_POOLS[slot].weekday.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('ninguna clave se repite entre franjas', () => {
    const claves = Object.values(HERO_SUBTITLE_POOLS).flatMap((p) => [
      ...p.weekend.map((e) => e.key),
      ...p.weekday.map((e) => e.key),
    ]);
    expect(new Set(claves).size).toBe(claves.length);
  });
});

describe('de noche nunca se habla de desayuno ni de empezar el día', () => {
  it('a las 0:00, 1:43, 3:00 y 5:00, todos los días de una semana', () => {
    for (let day = 9; day <= 15; day++) {
      for (const hour of [0, 1, 3, 5]) {
        const frase = getHeroSubtitle(tEs, at(day, hour, hour === 1 ? 43 : 0));
        for (const palabra of PROHIBIDO_NOCHE) {
          expect(frase.toLowerCase()).not.toContain(palabra);
        }
      }
    }
  });

  it('a las 22:00 y 23:59, todos los días de una semana', () => {
    for (let day = 9; day <= 15; day++) {
      for (const [hour, minute] of [[22, 0], [23, 59]]) {
        const frase = getHeroSubtitle(tEs, at(day, hour, minute));
        for (const palabra of PROHIBIDO_NOCHE) {
          expect(frase.toLowerCase()).not.toContain(palabra);
        }
      }
    }
  });

  it('ninguna frase del pool de madrugada menciona desayuno/brunch', () => {
    const pool = [...HERO_SUBTITLE_POOLS.madrugada.weekend, ...HERO_SUBTITLE_POOLS.madrugada.weekday];
    for (const { es } of pool) {
      for (const palabra of PROHIBIDO_NOCHE) {
        expect(es.toLowerCase()).not.toContain(palabra);
      }
    }
  });

  it('las traducciones de las frases de noche tampoco (ES e inglés)', () => {
    const es = read('../lib/i18n.js');
    const en = read('../lib/i18n-en.js');
    for (let n = 41; n <= 54; n++) {
      const key = `home_hero_msg_${n}`;
      const valorEs = es.match(new RegExp(`"${key}":\\s*"([^"]*)"`))?.[1] ?? '';
      const valorEn = en.match(new RegExp(`"${key}":\\s*"([^"]*)"`))?.[1] ?? '';
      for (const palabra of ['desayuno', 'brunch']) expect(valorEs.toLowerCase()).not.toContain(palabra);
      for (const palabra of ['breakfast', 'brunch']) expect(valorEn.toLowerCase()).not.toContain(palabra);
    }
  });
});

describe('rotación por día: estable dentro del día, cambia con los días', () => {
  it('misma fecha = misma frase (mañana, tarde y noche)', () => {
    expect(getHeroSubtitle(tEs, at(13, 1, 43))).toBe(getHeroSubtitle(tEs, at(13, 1, 50)));
    expect(getHeroSubtitle(tEs, at(13, 8, 0))).toBe(getHeroSubtitle(tEs, at(13, 8, 59)));
    expect(getHeroSubtitle(tEs, at(13, 20, 0))).toBe(getHeroSubtitle(tEs, at(13, 20, 30)));
  });

  it('a lo largo de 30 días la frase sí rota (más de una distinta por franja)', () => {
    const pool = HERO_SUBTITLE_POOLS.madrugada.weekday;
    const vistas = new Set();
    for (let d = 0; d < 30; d++) {
      const fecha = new Date(2026, 0, 5 + d); // enero 2026, lunes 5 en adelante
      fecha.setHours(1, 0, 0, 0);
      vistas.add(pickStableForDay(pool, fecha)?.es);
    }
    expect(vistas.size).toBeGreaterThan(1);
  });

  it('dayOfYear crece de 1 en 1 dentro del año', () => {
    expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
    expect(dayOfYear(new Date(2026, 0, 2))).toBe(2);
    expect(dayOfYear(new Date(2026, 11, 31))).toBe(365);
  });
});

describe('todas las claves existen en ES e inglés', () => {
  it('cada clave del pool está en i18n.js y en i18n-en.js', () => {
    const es = read('../lib/i18n.js');
    const en = read('../lib/i18n-en.js');
    const claves = Object.values(HERO_SUBTITLE_POOLS).flatMap((p) => [
      ...p.weekend.map((e) => e.key),
      ...p.weekday.map((e) => e.key),
    ]);
    for (const key of claves) {
      expect(es).toContain(`"${key}":`);
      expect(en).toContain(`"${key}":`);
    }
  });
});

describe('HomeHero usa el subtítulo por franja, sin aleatorio', () => {
  it('llama a getHeroSubtitle y ya no usa Math.random para el subtítulo', () => {
    const src = read('../components/home/HomeHero.jsx');
    expect(src).toContain('getHeroSubtitle');
    expect(src).not.toContain('Math.random');
    expect(src).not.toContain('home_hero_msg_');
  });

  it('el saludo grande no se tocó', () => {
    const src = read('../components/home/HomeHero.jsx');
    expect(src).toContain('home_saludo_linda_noche');
    // La clase del efecto Animista en el h1 la cubre animista_heroe.test.js
    // (ese test exige que solo 4 archivos contengan esa cadena; no se
    // repite la cadena aquí para no romperlo).
  });
});
