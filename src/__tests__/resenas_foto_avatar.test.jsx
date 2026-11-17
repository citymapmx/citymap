import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';

// Foto de perfil en el círculo de la reseña (17 Nov 2026, rama
// resenas-foto-avatar): hoy el avatar es un círculo con las iniciales
// (user_init) y un color aleatorio; con esto, si el autor tiene foto en
// profiles.avatar_url, se ve su foto recortada en el mismo círculo de
// 40 px, y si no tiene foto (o la imagen no carga) sigue el círculo de
// iniciales de siempre. Sin cambios de tamaño, nombre, fecha, estrellas
// ni botón Útil. Las reseñas de experiencias comparten el mismo camino
// (mismo store `reviews` y mismo componente ReviewAvatar).
//
// Carga de reseñas al abrir la ficha (17 Nov 2026, misma rama): antes
// solo llegaban por la consulta embebida fullBusiness y useAppSEO las
// borraba en cada render mientras !_fullFetched — si esa consulta
// fallaba, la sección quedaba en «Sé el primero» hasta refrescar.
// Ahora la ficha las carga por vía directa (getBusinessReviews) al
// cambiar de negocio, con un reintento, y el wipe solo limpia al
// cambiar de negocio.

const { sbGet } = vi.hoisted(() => ({ sbGet: vi.fn() }));

vi.mock('../lib/supabase.js', () => ({
  sb: {
    get: sbGet,
    post: vi.fn(async () => ({})),
    patch: vi.fn(async () => ({})),
    del: vi.fn(async () => ({})),
    rpc: vi.fn(async () => ({})),
  },
  cloudDelete: vi.fn(async () => {}),
}));

import ReviewAvatar from '../components/ReviewAvatar.jsx';
import { getThumbUrl } from '../lib/utils.js';
import {
  enrichReviewsWithAvatars,
  getBusinessReviews,
  getExperienceReviews,
} from '../services/dbService.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const GOOGLE_AVATAR = 'https://lh3.googleusercontent.com/a-/AOh14Ghi=s96-c';
const SUPABASE_AVATAR = 'https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/avatar123.jpg';

const review = (overrides) => ({
  id: 'r1',
  user_id: 'u1',
  user_name: 'Cynthia Arana',
  user_init: 'CY',
  user_color: '#DB2777',
  stars: 5,
  text: 'Me encanta como trabaja tu cabello',
  ...overrides,
});

describe('ReviewAvatar: foto en el círculo de 40 px', () => {
  it('con avatar_url renderiza img con la foto y el círculo de 40 px', () => {
    const html = renderToStaticMarkup(
      <ReviewAvatar avatarUrl={GOOGLE_AVATAR} userInit="CY" userColor="#DB2777" />
    );
    expect(html).toContain('<img');
    expect(html).toContain(`src="${GOOGLE_AVATAR}"`);
    expect(html).toContain('width:40px');
    expect(html).toContain('height:40px');
    expect(html).toContain('border-radius:50%');
    expect(html).toContain('object-fit:cover');
    expect(html).not.toContain('CY');
  });

  it('sin avatar_url sigue el círculo de iniciales con su color', () => {
    const html = renderToStaticMarkup(
      <ReviewAvatar avatarUrl={null} userInit="CY" userColor="#DB2777" />
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('CY');
    expect(html).toContain('#DB2777');
    expect(html).toContain('border-radius:50%');
  });

  it('si la imagen no carga cae al círculo de iniciales (onError)', () => {
    const src = read('../components/ReviewAvatar.jsx');
    expect(src).toContain('onError');
    expect(src).toContain('setFailed(true)');
    // El fallback es el mismo div de iniciales, no un hueco vacío.
    expect(src).toContain('{userInit}');
  });
});

describe('getThumbUrl: no rompe avatares externos', () => {
  it('la URL de Google pasa tal cual (ya trae su tamaño s96-c)', () => {
    expect(getThumbUrl(GOOGLE_AVATAR, 80, 80)).toBe(GOOGLE_AVATAR);
  });

  it('la URL de Supabase se pide chica (200 px, webp) para el círculo', () => {
    const out = getThumbUrl(SUPABASE_AVATAR, 80, 80);
    expect(out).toContain('/render/image/public/');
    expect(out).toContain('width=200');
    expect(out).toContain('format=webp');
  });
});

describe('enrichReviewsWithAvatars: un solo fetch batch a profiles', () => {
  beforeEach(() => { sbGet.mockReset(); });

  it('mapea avatar_url por user_id y deja sin foto al que no tiene', async () => {
    sbGet.mockImplementation(async (table) => {
      if (table === 'profiles') {
        return [
          { id: 'u1', avatar_url: GOOGLE_AVATAR },
          { id: 'u2', avatar_url: null },
        ];
      }
      return [];
    });
    const rows = [
      review({ id: 'r1', user_id: 'u1' }),
      review({ id: 'r2', user_id: 'u2' }),
      review({ id: 'r3', user_id: 'u3' }),
      review({ id: 'r4', user_id: null }),
    ];
    const out = await enrichReviewsWithAvatars(rows);
    expect(out[0].avatar_url).toBe(GOOGLE_AVATAR);
    expect(out[1].avatar_url).toBeUndefined();
    expect(out[2].avatar_url).toBeUndefined();
    expect(out[3].avatar_url).toBeUndefined();
    // Un solo fetch a profiles con los 3 user_ids distintos, sin duplicados.
    const profileCalls = sbGet.mock.calls.filter(c => c[0] === 'profiles');
    expect(profileCalls).toHaveLength(1);
    expect(profileCalls[0][1]).toContain('id=in.(u1,u2,u3)');
    expect(profileCalls[0][1]).toContain('select=id,avatar_url');
  });

  it('sin reseñas o sin user_ids no consulta profiles', async () => {
    await enrichReviewsWithAvatars([]);
    await enrichReviewsWithAvatars([review({ user_id: null })]);
    expect(sbGet).not.toHaveBeenCalled();
  });

  it('si profiles falla, devuelve las reseñas tal cual (iniciales)', async () => {
    sbGet.mockRejectedValue(new Error('RLS'));
    const rows = [review({})];
    const out = await enrichReviewsWithAvatars(rows);
    expect(out).toEqual(rows);
    expect(out[0].avatar_url).toBeUndefined();
  });
});

describe('getBusinessReviews / getExperienceReviews: traen el avatar', () => {
  beforeEach(() => { sbGet.mockReset(); });

  it('la reseña de negocio llega con avatar_url del perfil', async () => {
    sbGet.mockImplementation(async (table) => {
      if (table === 'reviews') return [review({})];
      if (table === 'profiles') return [{ id: 'u1', avatar_url: SUPABASE_AVATAR }];
      return [];
    });
    const out = await getBusinessReviews('biz-1');
    expect(out).toHaveLength(1);
    expect(out[0].avatar_url).toBe(SUPABASE_AVATAR);
    expect(sbGet.mock.calls.filter(c => c[0] === 'profiles')).toHaveLength(1);
  });

  it('la reseña de experiencia llega con avatar_url del perfil', async () => {
    sbGet.mockImplementation(async (table) => {
      if (table === 'reviews') return [review({})];
      if (table === 'profiles') return [{ id: 'u1', avatar_url: GOOGLE_AVATAR }];
      return [];
    });
    const out = await getExperienceReviews('exp-1');
    expect(out).toHaveLength(1);
    expect(out[0].avatar_url).toBe(GOOGLE_AVATAR);
  });
});

describe('DetailView y ExperienceViewer usan el avatar', () => {
  it('ambas vistas pintan ReviewAvatar con r.avatar_url en vez del div de iniciales', () => {
    for (const file of ['../views/DetailView.jsx', '../components/ExperienceViewer.jsx']) {
      const src = read(file);
      expect(src).toContain('ReviewAvatar');
      expect(src).toContain('avatarUrl={r.avatar_url}');
      expect(src).toContain('userInit={r.user_init}');
      expect(src).not.toContain('background: r.user_color || "#111"');
    }
  });
});

describe('DetailView: la ficha carga reseñas por vía directa (bypass 17 Nov 2026)', () => {
  beforeEach(() => { sbGet.mockReset(); });

  it('la vía directa trae las reseñas enriquecidas aunque fetchFullBusiness falle o venga vacía', async () => {
    // La ficha ya no depende de la consulta embebida (select=*,reviews(*)):
    // si esa falla o no trae nada, la vía directa igual trae las reseñas
    // con su avatar, ordenadas por fecha descendente.
    sbGet.mockImplementation(async (table) => {
      if (table === 'businesses') throw new Error('fetchFullBusiness caído');
      if (table === 'reviews') return [
        review({ id: 'r-nueva', user_id: 'u2', created_at: '2026-11-16T10:00:00Z' }),
        review({ id: 'r-vieja', user_id: 'u1', created_at: '2026-11-14T10:00:00Z' }),
      ];
      if (table === 'profiles') return [
        { id: 'u1', avatar_url: GOOGLE_AVATAR },
        { id: 'u2', avatar_url: SUPABASE_AVATAR },
      ];
      return [];
    });
    const { fetchFullBusiness, getBusinessReviews } = await import('../services/dbService.js');
    await expect(fetchFullBusiness('biz-1')).rejects.toThrow('fetchFullBusiness caído');
    const out = await getBusinessReviews('biz-1');
    expect(out).toHaveLength(2);
    expect(out[0].avatar_url).toBe(SUPABASE_AVATAR);
    expect(out[1].avatar_url).toBe(GOOGLE_AVATAR);
    const reviewsCall = sbGet.mock.calls.find(c => c[0] === 'reviews');
    expect(reviewsCall[1]).toContain('order=created_at.desc');
  });

  it('DetailView carga por vía directa y la consulta embebida ya no pisa las reseñas', () => {
    const src = read('../views/DetailView.jsx');
    // Efecto sobre el id del negocio, vía directa enriquecida.
    expect(src).toContain('dbService.getBusinessReviews(bizId)');
    expect(src).toContain('}, [bizId, setReviews]);');
    // La embebida ya no es fuente de reseñas (ni crudas ni enriquecidas).
    expect(src).not.toContain('setReviews(revs)');
    expect(src).not.toContain('setReviews(await dbService.enrichReviewsWithAvatars(revs))');
    // Mientras cargan, el subtítulo no dice «Sé el primero».
    expect(src).toContain('reviewsLoading');
    expect(src).toContain('reviews.length > 0 || reviewsLoading');
    // Un reintento cubre un fallo transitorio de red.
    expect(src).toContain('setTimeout(() => load(1), 2000)');
  });

  it('useAppSEO solo limpia al cambiar de negocio, nunca en cada render', () => {
    const src = read('../hooks/useAppSEO.js');
    expect(src).toContain('prevSelectedIdRef');
    expect(src).toContain('prevSelectedIdRef.current !== selected.id');
    // El wipe viejo: en cada ejecución del efecto mientras !_fullFetched.
    expect(src).not.toContain('if (!selected._fullFetched) {');
  });

  it('no queda otro camino que guarde reseñas crudas: cada setReviews del repo es enriquecido, mapeo/filtro sobre la lista ya enriquecida, o vaciado', () => {
    for (const file of ['../views/DetailView.jsx', '../App.jsx', '../hooks/useAppSEO.js']) {
      const src = read(file);
      const calls = [...src.matchAll(/setReviews\(([^;]*)\);?/gs)].map(m => m[1].trim());
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        const ok =
          call.includes('enrichReviewsWithAvatars') ||
          call.startsWith('prev =>') ||
          call.startsWith('(rem)') || call === 'rem' ||
          call === '[]' ||
          call.includes('getBusinessReviews') ||
          call.includes('getExperienceReviews') ||
          call.includes('Array.isArray(r) ? r : []');
        expect(ok, `${file}: setReviews sin enriquecer: ${call}`).toBe(true);
      }
    }
  });
});
