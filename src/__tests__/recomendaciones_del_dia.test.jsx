import React from 'react';
import { describe, expect, it, beforeAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router-dom';
import RecomendacionesDia from '../components/home/RecomendacionesDia.jsx';
import {
  RECOMENDACIONES_POR_DIA,
  localDayNumber,
  filterRecomendacionesElegibles,
  pickRecomendacionesDelDia,
} from '../lib/recomendacionesDia.js';
import { TRANSLATIONS, ensureEnglishTranslations } from '../lib/i18n.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const T = { text: '#111', sub: '#666', bg: '#fff', card: '#fff', shadow: 'none', border: '#eee' };

// 10 negocios elegibles de Tepic (todos approved, planes mezclados, uno
// sin foto) + 4 que deben quedar fuera: plan menú, pendiente, otra ciudad.
const BIZ = (id, overrides = {}) => ({
  id,
  name: `Negocio ${id}`,
  status: 'approved',
  plan: 'free',
  city_slug: 'tepic',
  category: 'Restaurantes',
  rating: 4.5,
  photos: [{ url: `https://example.org/${id}.jpg` }],
  ...overrides,
});

const POOL_10 = [
  BIZ('b1', { plan: 'free' }),
  BIZ('b2', { plan: 'premium' }),
  BIZ('b3', { plan: 'destacado' }),
  BIZ('b4', { photos: [], img1: undefined }), // sin foto: también elegible
  BIZ('b5', { img1: 'https://example.org/b5.jpg', photos: [] }),
  BIZ('b6'),
  BIZ('b7'),
  BIZ('b8'),
  BIZ('b9'),
  BIZ('b10', { city_slug: 'tepic,guadalajara' }), // multi-ciudad: elegible
];

const POOL_12 = [...POOL_10, BIZ('b11'), BIZ('b12')];

const EXCLUIDOS = [
  BIZ('x-menu', { plan: 'menu' }),
  BIZ('x-pendiente', { status: 'pending' }),
  BIZ('x-gdl', { city_slug: 'guadalajara' }),
  BIZ('x-suspendido', { status: 'suspended' }),
];

const TODOS = [...POOL_10, ...EXCLUIDOS];

function renderRecomendaciones(list) {
  return renderToStaticMarkup(
    <MemoryRouter>
      <RecomendacionesDia list={list} T={T} cityImg={null} handleCardTap={() => {}} />
    </MemoryRouter>
  );
}

beforeAll(async () => {
  await ensureEnglishTranslations();
});

describe('Recomendaciones del día: título en plural (PR #238)', () => {
  it('la clave nueva existe en español e inglés, en plural', () => {
    expect(TRANSLATIONS.es['home_recomendaciones_dia']).toBe('✨ Recomendaciones del día');
    expect(TRANSLATIONS.en['home_recomendaciones_dia']).toBe('✨ Recommendations of the day');
  });

  it('la clave vieja en singular ya no existe en ningún idioma ni en HomeView', () => {
    expect(TRANSLATIONS.es['home_recomendacion_dia']).toBeUndefined();
    expect(TRANSLATIONS.en['home_recomendacion_dia']).toBeUndefined();
    for (const content of [read('../lib/i18n.js'), read('../lib/i18n-en.js'), read('../views/HomeView.jsx')]) {
      expect(content).not.toContain('"home_recomendacion_dia"');
    }
  });

  it('el componente muestra el título en plural', () => {
    const html = renderRecomendaciones(POOL_10.slice(0, 4));
    expect(html).toContain('Recomendaciones del día');
    expect(html).not.toContain('Recomendación del día');
  });
});

describe('Recomendaciones del día: turno justo (4 al día)', () => {
  it('son exactamente 4 por día', () => {
    expect(RECOMENDACIONES_POR_DIA).toBe(4);
    const eligible = filterRecomendacionesElegibles(TODOS, ['tepic']);
    expect(eligible).toHaveLength(10);
    for (const day of [0, 1, 2, 5, 100]) {
      expect(pickRecomendacionesDelDia(eligible, 'tepic', day)).toHaveLength(4);
    }
  });

  it('el conjunto cambia de un día a otro', () => {
    const eligible = filterRecomendacionesElegibles(TODOS, ['tepic']);
    const dia0 = pickRecomendacionesDelDia(eligible, 'tepic', 0).map((b) => b.id);
    const dia1 = pickRecomendacionesDelDia(eligible, 'tepic', 1).map((b) => b.id);
    expect(dia0).not.toEqual(dia1);
    expect(new Set([...dia0, ...dia1]).size).toBe(8);
  });

  it('nadie repite hasta que todos los elegibles aparecieron una vez (N múltiplo de 4)', () => {
    // Con 12 elegibles (3 grupos de 4) el ciclo es exacto: cada negocio
    // sale una sola vez por ciclo. Con N no múltiplo de 4 el último grupo
    // se completa dando la vuelta (ver el test siguiente).
    const eligible = filterRecomendacionesElegibles([...POOL_12, ...EXCLUIDOS], ['tepic']);
    expect(eligible).toHaveLength(12);
    const numGroups = Math.ceil(eligible.length / 4); // 12 → 3 grupos
    const vistos = [];
    for (let day = 0; day < numGroups; day++) {
      vistos.push(...pickRecomendacionesDelDia(eligible, 'tepic', day).map((b) => b.id));
    }
    // En un ciclo completo (3 días) salen los 12, cada uno una sola vez.
    expect(new Set(vistos).size).toBe(12);
    expect(vistos).toHaveLength(12);
    // Al día siguiente del ciclo se repite el primer grupo.
    expect(pickRecomendacionesDelDia(eligible, 'tepic', numGroups).map((b) => b.id))
      .toEqual(pickRecomendacionesDelDia(eligible, 'tepic', 0).map((b) => b.id));
  });

  it('con N no múltiplo de 4, en un ciclo salen todos y cada día salen 4', () => {
    const eligible = filterRecomendacionesElegibles(TODOS, ['tepic']);
    expect(eligible).toHaveLength(10);
    const vistos = [];
    for (let day = 0; day < 3; day++) {
      const pick = pickRecomendacionesDelDia(eligible, 'tepic', day);
      expect(pick).toHaveLength(4);
      vistos.push(...pick.map((b) => b.id));
    }
    // En 3 días salen los 10 al menos una vez; el último grupo se completa
    // dando la vuelta al principio, así que solo los primeros repiten.
    expect(new Set(vistos).size).toBe(10);
  });

  it('es determinístico: los mismos 4 para todos el mismo día', () => {
    const eligible = filterRecomendacionesElegibles(TODOS, ['tepic']);
    const a = pickRecomendacionesDelDia(eligible, 'tepic', 7).map((b) => b.id);
    const b = pickRecomendacionesDelDia(eligible, 'tepic', 7).map((b) => b.id);
    expect(a).toEqual(b);
  });

  it('el número de día local cambia a medianoche, no cada 6 horas', () => {
    expect(localDayNumber(new Date(2026, 10, 12, 8, 0))).toBe(localDayNumber(new Date(2026, 10, 12, 23, 30)));
    expect(localDayNumber(new Date(2026, 10, 12, 23, 30))).not.toBe(localDayNumber(new Date(2026, 10, 13, 0, 30)));
  });

  it('sin foto también salen: el negocio sin foto aparece en el ciclo', () => {
    const eligible = filterRecomendacionesElegibles(TODOS, ['tepic']);
    expect(eligible.map((b) => b.id)).toContain('b4');
    const vistos = [];
    for (let day = 0; day < 3; day++) {
      vistos.push(...pickRecomendacionesDelDia(eligible, 'tepic', day).map((b) => b.id));
    }
    expect(vistos).toContain('b4');
  });

  it('cualquier plan sale (gratuito, premium, destacado); menú y no aprobados no', () => {
    const eligible = filterRecomendacionesElegibles(TODOS, ['tepic']);
    const ids = eligible.map((b) => b.id);
    expect(ids).toContain('b1'); // free
    expect(ids).toContain('b2'); // premium
    expect(ids).toContain('b3'); // destacado
    expect(ids).not.toContain('x-menu');
    expect(ids).not.toContain('x-pendiente');
    expect(ids).not.toContain('x-suspendido');
    expect(ids).not.toContain('x-gdl');
    expect(ids).toContain('b10'); // multi-ciudad (tepic,guadalajara)
  });

  it('con 4 o menos elegibles, salen todos todos los días', () => {
    const pocos = filterRecomendacionesElegibles([BIZ('p1'), BIZ('p2')], ['tepic']);
    expect(pickRecomendacionesDelDia(pocos, 'tepic', 0)).toHaveLength(2);
    expect(pickRecomendacionesDelDia(pocos, 'tepic', 9)).toHaveLength(2);
    expect(pickRecomendacionesDelDia([], 'tepic', 0)).toEqual([]);
  });
});

describe('Recomendaciones del día: cuadrícula de 4', () => {
  it('muestra las 4 tarjetas con nombre, categoría y calificación', () => {
    const html = renderRecomendaciones(POOL_10.slice(0, 4));
    for (const b of POOL_10.slice(0, 4)) {
      expect(html).toContain(b.name);
    }
    expect(html).toContain('Restaurantes');
    expect(html).toContain('4.5');
    expect(html).toContain('grid-template-columns:1fr 1fr');
  });

  it('el negocio sin foto usa el placeholder con degradado (no se excluye)', () => {
    const sinFoto = BIZ('b4', { photos: [], img1: undefined, img2: undefined, img3: undefined, img_url: undefined });
    const html = renderRecomendaciones([sinFoto]);
    expect(html).toContain('Negocio b4');
    expect(html).toContain('linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%)');
  });

  it('sin lista no renderiza nada', () => {
    expect(renderRecomendaciones([])).toBe('');
  });
});

describe('Recomendaciones del día: el spotlight viejo desapareció', () => {
  it('HomeView ya no tiene el código del spotlight de 1 negocio', () => {
    const src = read('../views/HomeView.jsx');
    expect(src).not.toContain('spotlightBiz');
    expect(src).not.toContain('SPOTLIGHT_PERIOD');
    expect(src).not.toContain('SPOTLIGHT_CACHE');
    expect(src).not.toContain('hasSpotlightPhoto');
    expect(src).toContain('pickRecomendacionesDelDia');
    expect(src).toContain('RecomendacionesDia');
  });
});
