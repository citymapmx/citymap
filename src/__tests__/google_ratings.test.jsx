import { describe, it, expect } from 'vitest';
import { displayRating, formatReviewCount, rankTopRated } from '../lib/googleRatings.js';

describe('displayRating: conteo de Google en tarjetas y ficha', () => {
  it('usa el dato de Google cuando hay caché vigente para el negocio', () => {
    const biz = { id: 'biz-1', rating: 5.0, review_count: 1 };
    const map = { 'biz-1': { rating: 4.8, count: 8824 } };
    expect(displayRating(biz, map)).toEqual({ rating: 4.8, count: 8824, source: 'google' });
  });

  it('usa el conteo de CityMap cuando no hay dato de Google', () => {
    const biz = { id: 'biz-2', rating: 5.0, review_count: 1 };
    expect(displayRating(biz, {})).toEqual({ rating: 5.0, count: 1, source: 'citymap' });
    expect(displayRating(biz, null)).toEqual({ rating: 5.0, count: 1, source: 'citymap' });
  });

  it('ignora el dato de Google si no trae calificación numérica', () => {
    const biz = { id: 'biz-3', rating: '4,5', review_count: 12 };
    const map = { 'biz-3': { rating: null, count: 0 } };
    expect(displayRating(biz, map)).toEqual({ rating: 4.5, count: 12, source: 'citymap' });
  });

  it('convierte rating en texto con coma y conteo ausente en 0', () => {
    expect(displayRating({ id: 'x', rating: '4,5' }, {})).toEqual({ rating: 4.5, count: 0, source: 'citymap' });
    expect(displayRating({ id: 'x', rating: 'no-numerico', review_count: 3 }, {})).toEqual({ rating: null, count: 3, source: 'citymap' });
    expect(displayRating(null, {})).toEqual({ rating: null, count: 0, source: 'citymap' });
  });
});

describe('formatReviewCount', () => {
  it('pone separador de miles', () => {
    expect(formatReviewCount(8824)).toBe('8,824');
    expect(formatReviewCount(12)).toBe('12');
    expect(formatReviewCount(0)).toBe('0');
  });
});

describe('rankTopRated: "Los más valorados" por Google con mínimo de reseñas', () => {
  const biz = (id, rating, review_count) => ({ id, rating, review_count });

  it('un 2.5 de Google con 82 reseñas no queda en #1 aunque tenga 5.0 interno (caso Café Drama)', () => {
    const list = [biz('drama', 5.0, 2), biz('andares', 4.7, 259), biz('paulette', 4.5, 2224)];
    const map = {
      drama: { rating: 2.5, count: 82 },
      andares: { rating: 4.7, count: 259 },
      paulette: { rating: 4.5, count: 2224 },
    };
    expect(rankTopRated(list, map).map((b) => b.id)).toEqual(['andares', 'paulette', 'drama']);
  });

  it('exige 50 reseñas: un 5.0 con pocas no entra cuando ya hay 10 calificados', () => {
    const many = Array.from({ length: 10 }, (_, i) => biz(`top-${i}`, 4.6, 100 + i));
    const map = Object.fromEntries(many.map((b) => [b.id, { rating: 4.6, count: b.review_count }]));
    const ranked = rankTopRated([...many, biz('chico', 5.0, 2)], map);
    expect(ranked).toHaveLength(10);
    expect(ranked.map((b) => b.id)).not.toContain('chico');
  });

  it('completa la lista con los mejores restantes cuando hay menos de 10 calificados', () => {
    const list = [biz('a', 4.9, 200), biz('b', 4.8, 30), biz('c', 4.7, 10)];
    expect(rankTopRated(list, {}).map((b) => b.id)).toEqual(['a', 'b', 'c']);
  });

  it('usa el conteo de CityMap cuando no hay dato de Google', () => {
    const list = [biz('a', 4.9, 120), biz('b', 4.5, 300)];
    expect(rankTopRated(list, {}).map((b) => b.id)).toEqual(['a', 'b']);
  });

  it('descarta negocios sin calificación', () => {
    const list = [biz('a', 4.9, 120), { id: 'b', rating: null, review_count: 500 }];
    expect(rankTopRated(list, {}).map((b) => b.id)).toEqual(['a']);
  });
});
