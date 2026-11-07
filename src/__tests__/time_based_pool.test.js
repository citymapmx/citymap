import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useDataStore } from '../store/useDataStore.js';
import { sb } from '../lib/supabase.js';

// Filas de ejemplo: mitad free, mitad premium, como en la BD real.
const rows = (start, count, city = 'guadalajara') => Array.from({ length: count }, (_, i) => ({
  id: `biz-${start + i}`, name: `Place ${start + i}`, city_slug: city, status: 'approved',
  category: 'restaurantes', plan: i % 2 === 0 ? 'free' : 'premium',
  photos: '[]', schedule: '{}', social_links: '{}', rating: 5, review_count: 2,
}));

describe('loadTimeBasedBiz (pool de las listas por horario)', () => {
  let get;
  beforeEach(() => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
    useDataStore.setState({ timeBasedBiz: [], timeBasedBizCity: null });
    get = vi.spyOn(sb, 'get').mockResolvedValue([]);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('trae hasta 200 negocios sin ordenar por plan', async () => {
    get.mockResolvedValue(rows(0, 50));
    await useDataStore.getState().loadTimeBasedBiz('guadalajara');
    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][0]).toBe('businesses');
    expect(get.mock.calls[0][1]).toContain('status=eq.approved');
    expect(get.mock.calls[0][1]).toContain('limit=200');
    expect(get.mock.calls[0][1]).toContain('order=id.asc');
    expect(get.mock.calls[0][1]).not.toContain('plan.desc');
    expect(useDataStore.getState().timeBasedBiz).toHaveLength(50);
    expect(useDataStore.getState().timeBasedBizCity).toBe('guadalajara');
    // free y premium en igualdad dentro del pool
    const plans = new Set(useDataStore.getState().timeBasedBiz.map(b => b.plan));
    expect(plans.has('free')).toBe(true);
    expect(plans.has('premium')).toBe(true);
  });

  it('ignora la respuesta si ya se pidió otra ciudad', async () => {
    get.mockResolvedValue(rows(0, 10));
    const first = useDataStore.getState().loadTimeBasedBiz('guadalajara');
    await useDataStore.getState().loadTimeBasedBiz('tepic');
    await first;
    expect(useDataStore.getState().timeBasedBizCity).toBe('tepic');
  });
});
