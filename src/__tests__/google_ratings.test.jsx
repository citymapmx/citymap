import { describe, it, expect } from 'vitest';
import { displayRating, formatReviewCount } from '../lib/googleRatings.js';

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
