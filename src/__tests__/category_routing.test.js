import { describe, it, expect } from 'vitest';
import { categoryFromUrl } from '../lib/categoryRouting.js';
describe('category URL restoration', () => {
  it('restores a category after a hard refresh', () => {
    expect(categoryFromUrl('/tepic/c/restaurantes')).toBe('restaurantes');
  });
  it('resolves the direct form /:city/:category the same as the internal /c/ form', () => {
    expect(categoryFromUrl('/guadalajara/restaurantes')).toBe('restaurantes');
    expect(categoryFromUrl('/guadalajara/antros-y-bares')).toBe('antros y bares');
  });
  it('resolves the direct form with loaded categories by id', () => {
    expect(categoryFromUrl('/guadalajara/antros-y-bares', '', [{ id: 'antros-y-bares' }])).toBe('antros-y-bares');
  });
  it('supports country-prefixed direct links', () => {
    expect(categoryFromUrl('/mx/guadalajara/restaurantes', '', [], true)).toBe('restaurantes');
  });
  it('preserves IDs with hyphens when categories are loaded', () => {
    expect(categoryFromUrl('/tepic/c/antros-y-bares', '', [{id:'antros-y-bares'}])).toBe('antros-y-bares');
  });
  it('supports country-prefixed links', () => {
    expect(categoryFromUrl('/mx/tepic/c/cafe', '', [], true)).toBe('cafe');
  });
  it('keeps legacy query links', () => {
    expect(categoryFromUrl('/tepic', '?cat=cafe')).toBe('cafe');
  });
  it('does not interpret business links as categories', () => {
    expect(categoryFromUrl('/tepic/kava')).toBeNull();
    expect(categoryFromUrl('/tepic')).toBeNull();
  });
});
