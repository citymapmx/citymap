import { describe, it, expect } from 'vitest';
import { parseRevistaPath, isRevistaPath, isRevistaArticlePath } from '../lib/revistaRoute.js';

describe('parseRevistaPath', () => {
  it('reconoce /revista sola, con ciudad y con artículo', () => {
    expect(parseRevistaPath('/revista')).toEqual({ city: '', slug: '' });
    expect(parseRevistaPath('/revista/tepic')).toEqual({ city: 'tepic', slug: '' });
    expect(parseRevistaPath('/revista/tepic/tuneles-catedral')).toEqual({ city: 'tepic', slug: 'tuneles-catedral' });
  });

  it('reconoce /experiencias y /mis-planes', () => {
    expect(parseRevistaPath('/experiencias/guadalajara')).toEqual({ city: 'guadalajara', slug: '' });
    expect(parseRevistaPath('/experiencias/guadalajara/ruta-cafe')).toEqual({ city: 'guadalajara', slug: 'ruta-cafe' });
    expect(parseRevistaPath('/mis-planes')).toEqual({ city: '', slug: '' });
  });

  it('acepta barra final', () => {
    expect(parseRevistaPath('/revista/tepic/')).toEqual({ city: 'tepic', slug: '' });
  });

  it('rechaza rutas que no son Revista', () => {
    expect(parseRevistaPath('/mapa/tepic')).toBeNull();
    expect(parseRevistaPath('/tepic')).toBeNull();
    expect(parseRevistaPath('/evento/algo')).toBeNull();
    expect(parseRevistaPath('/revista/tepic/slug/extra')).toBeNull();
    expect(isRevistaPath('/revista/tepic')).toBe(true);
    expect(isRevistaPath('/tepic')).toBe(false);
  });
});

describe('isRevistaArticlePath', () => {
  it('es detalle solo con ciudad y artículo', () => {
    expect(isRevistaArticlePath('/revista/tepic/tuneles-catedral')).toBe(true);
    expect(isRevistaArticlePath('/experiencias/guadalajara/ruta-cafe')).toBe(true);
  });

  it('la lista de Revista no es detalle', () => {
    expect(isRevistaArticlePath('/revista')).toBe(false);
    expect(isRevistaArticlePath('/revista/tepic')).toBe(false);
    expect(isRevistaArticlePath('/experiencias/guadalajara')).toBe(false);
    expect(isRevistaArticlePath('/mis-planes')).toBe(false);
  });

  it('otras rutas no son detalle de artículo', () => {
    expect(isRevistaArticlePath('/mapa/tepic')).toBe(false);
    expect(isRevistaArticlePath('/tepic')).toBe(false);
    expect(isRevistaArticlePath('/evento/tepic/algo')).toBe(false);
  });
});
