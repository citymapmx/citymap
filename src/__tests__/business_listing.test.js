import { describe, expect, it, vi } from 'vitest';
import { orderBusinessIds, appendBusinessIds, getBusinessQueryState } from '../lib/businessListing.js';
import { useDataStore } from '../store/useDataStore.js';
import { sb } from '../lib/supabase.js';

describe('category business loading', () => {
  it('does not publish another category as ready while its request is pending', () => {
    const previous = { key: 'cafeterias', ids: ['coffee'], status: 'ready' };
    expect(getBusinessQueryState(previous, 'restaurantes', true)).toBe('loading');
    expect(getBusinessQueryState({ ...previous, key: 'restaurantes', status: 'loading' }, 'restaurantes', true)).toBe('loading');
    expect(getBusinessQueryState({ key: 'restaurantes', ids: [], status: 'error' }, 'restaurantes', true)).toBe('error');
    expect(getBusinessQueryState({ key: 'restaurantes', ids: ['burger'], status: 'ready' }, 'restaurantes', true)).toBe('ready');
  });
  it('keeps the existing plan priority and appends new pages without moving visible businesses', () => {
    const first = orderBusinessIds([{ id: 'free', name: 'Cafe', plan: 'free' }, { id: 'featured', name: 'Bistro', plan: 'destacado' }, { id: 'premium', name: 'Starbucks', plan: 'premium' }]);
    expect(first).toEqual(['premium', 'featured', 'free']);
    expect(appendBusinessIds(first, ['new-premium', 'premium', 'new-free'])).toEqual(['premium', 'featured', 'free', 'new-premium', 'new-free']);
  });
  it('breaks equal name ranks deterministically', () => {
    const rows = [{ id: 'z', name: 'Cafe' }, { id: 'a', name: 'Cafe' }];
    expect(orderBusinessIds(rows)).toEqual(orderBusinessIds([...rows].reverse()));
  });
  it('publishes the requested batch rather than the previously cached city subset', async () => {
    useDataStore.setState({ mapPinsCity: 'tepic', mapPins: [{ id: 'old', category: 'cafeterias' }] });
    const get = vi.spyOn(sb, 'get').mockResolvedValue([{ id: 'new', category: 'restaurantes', photos: '[]' }]);
    const onBatch = vi.fn();
    try {
      expect(await useDataStore.getState().fetchMoreBiz({ targetCity: 'tepic', category: 'restaurantes', onBatch })).toBe(1);
      expect(onBatch).toHaveBeenCalledWith([expect.objectContaining({ id: 'new' })]);
      expect(onBatch.mock.calls[0][0].some(b => b.id === 'old')).toBe(false);
    } finally { get.mockRestore(); }
  });
  it('marks a successful empty batch as empty and does not publish a stale city response', async () => {
    useDataStore.setState({ mapPinsCity: 'tepic' });
    const get = vi.spyOn(sb, 'get').mockResolvedValue([]);
    const onBatch = vi.fn();
    try {
      expect(await useDataStore.getState().fetchMoreBiz({ targetCity: 'tepic', onBatch })).toBe(0);
      expect(onBatch).toHaveBeenCalledWith([]);
      onBatch.mockClear();
      expect(await useDataStore.getState().fetchMoreBiz({ targetCity: 'mazatlan', onBatch })).toBeNull();
      expect(onBatch).not.toHaveBeenCalled();
    } finally { get.mockRestore(); }
  });
});
