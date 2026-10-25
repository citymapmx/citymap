import { describe, it, expect } from 'vitest';
import { categoryFromUrl } from '../lib/categoryRouting.js';
describe('category URL restoration', () => {
  it('restores a category after a hard refresh', () => {
    expect(categoryFromUrl('/tepic/c/restaurantes')).toBe('restaurantes');
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
