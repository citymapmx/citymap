import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { useDataStore } from '../store/useDataStore.js';
import { sb } from '../lib/supabase.js';

// Filas de ejemplo: mitad free, mitad premium, como en la BD real.
let get;
const rows = (start, count, city = 'guadalajara') => Array.from({ length: count }, (_, i) => ({
  id: `biz-${start + i}`, name: `Place ${start + i}`, city_slug: city, status: 'approved',
  category: 'restaurantes', plan: i % 2 === 0 ? 'free' : 'premium',
  photos: '[]', schedule: '{}', social_links: '{}', rating: 5, review_count: 2,
}));

const setupStoreMocks = () => {
  vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => {} });
  useDataStore.setState({ timeBasedBiz: [], timeBasedBizCity: null });
  get = vi.spyOn(sb, 'get').mockResolvedValue([]);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
};

describe('loadTimeBasedBiz (pool de las listas por horario)', () => {
  beforeEach(setupStoreMocks);
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

describe('loadData difiere el pool de 200 hasta después del primer pintado', () => {
  beforeEach(setupStoreMocks);
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  const poolCalls = () => get.mock.calls.filter(([, q]) => String(q || '').includes('limit=200'));

  it('no pide el pool en el arranque: llega al disparar el diferido', async () => {
    vi.useFakeTimers();
    try {
      const rpcSpy = vi.spyOn(sb, 'rpc').mockResolvedValue([]);
      get.mockImplementation(async (table, query = '') => {
        if (table === 'cities') return [{ slug: 'guadalajara', name: 'Guadalajara' }];
        if (table === 'businesses' && String(query).includes('limit=200')) return rows(0, 5);
        return [];
      });
      useDataStore.setState({ dbReady: false, homeCoreCity: null, mapPinsCity: null, timeBasedBiz: [], timeBasedBizCity: null });
      const loadPromise = useDataStore.getState().loadData('guadalajara');
      await loadPromise;
      // El muro quedó listo y el pool todavía no se pidió.
      expect(useDataStore.getState().dbReady).toBe(true);
      expect(poolCalls()).toHaveLength(0);
      expect(useDataStore.getState().timeBasedBiz).toEqual([]);
      // Al disparar el diferido, el pool llega igual que antes.
      await vi.advanceTimersByTimeAsync(0);
      expect(poolCalls()).toHaveLength(1);
      expect(useDataStore.getState().timeBasedBiz).toHaveLength(5);
      expect(useDataStore.getState().timeBasedBizCity).toBe('guadalajara');
      rpcSpy.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });

  it('cancela el pool diferido de la ciudad anterior si se cambia de ciudad', async () => {
    vi.useFakeTimers();
    try {
      const rpcSpy = vi.spyOn(sb, 'rpc').mockResolvedValue([]);
      get.mockImplementation(async (table, query = '') => {
        if (table === 'cities') return [{ slug: 'guadalajara', name: 'Guadalajara' }, { slug: 'tepic', name: 'Tepic' }];
        if (table === 'businesses' && String(query).includes('limit=200')) {
          return rows(0, 3, String(query).includes('tepic') ? 'tepic' : 'guadalajara');
        }
        return [];
      });
      useDataStore.setState({ dbReady: false, homeCoreCity: null, mapPinsCity: null, timeBasedBiz: [], timeBasedBizCity: null });
      const p1 = useDataStore.getState().loadData('guadalajara');
      const p2 = useDataStore.getState().loadData('tepic');
      await p2;
      expect(poolCalls()).toHaveLength(0);
      await vi.advanceTimersByTimeAsync(0);
      const calls = poolCalls();
      expect(calls).toHaveLength(1);
      expect(calls[0][1]).toContain('tepic');
      expect(useDataStore.getState().timeBasedBizCity).toBe('tepic');
      await p1;
      rpcSpy.mockRestore();
    } finally {
      vi.useRealTimers();
    }
  });

  it('usa requestIdleCallback cuando existe', async () => {
    const idleCallbacks = [];
    vi.stubGlobal('window', {
      requestIdleCallback: vi.fn((cb) => { idleCallbacks.push(cb); return 1; }),
      cancelIdleCallback: vi.fn(),
    });
    try {
      const rpcSpy = vi.spyOn(sb, 'rpc').mockResolvedValue([]);
      get.mockImplementation(async (table, query = '') => {
        if (table === 'cities') return [{ slug: 'guadalajara', name: 'Guadalajara' }];
        if (table === 'businesses' && String(query).includes('limit=200')) return rows(0, 4);
        return [];
      });
      useDataStore.setState({ dbReady: false, homeCoreCity: null, mapPinsCity: null, timeBasedBiz: [], timeBasedBizCity: null });
      const loadPromise = useDataStore.getState().loadData('guadalajara');
      await loadPromise;
      expect(poolCalls()).toHaveLength(0);
      expect(idleCallbacks).toHaveLength(1);
      idleCallbacks[0]();
      await new Promise(r => setTimeout(r, 0));
      expect(poolCalls()).toHaveLength(1);
      expect(useDataStore.getState().timeBasedBiz).toHaveLength(4);
      rpcSpy.mockRestore();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
