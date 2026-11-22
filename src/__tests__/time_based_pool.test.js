// Pool por horario derivado de cityPins (A12, 21 nov 2026): antes era una
// tercera descarga de los mismos negocios (200 filas pesadas con
// limit=200, que además truncaba Guadalajara). Ahora el pool es la ciudad
// completa ligera que ya trae el mapa; loadTimeBasedBiz solo se asegura
// de que los pines estén cargados y deriva el pool de ellos.
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
  useDataStore.setState({
    dbReady: false, homeCoreCity: null, mapPinsCity: null,
    cityPins: [], cityPinsCity: null, timeBasedBiz: [], timeBasedBizCity: null,
  });
  get = vi.spyOn(sb, 'get').mockResolvedValue([]);
  vi.spyOn(console, 'warn').mockImplementation(() => {});
};

describe('loadTimeBasedBiz deriva el pool de cityPins (A12)', () => {
  beforeEach(setupStoreMocks);
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  const poolCalls = () => get.mock.calls.filter(([, q]) => String(q || '').includes('limit=200'));

  it('usa los pines ya cargados sin pedir nada más', async () => {
    const pins = rows(0, 5);
    useDataStore.setState({ cityPins: pins, cityPinsCity: 'guadalajara' });
    await useDataStore.getState().loadTimeBasedBiz('guadalajara');
    expect(get).not.toHaveBeenCalled();
    expect(useDataStore.getState().timeBasedBiz).toHaveLength(5);
    expect(useDataStore.getState().timeBasedBizCity).toBe('guadalajara');
    // free y premium en igualdad dentro del pool
    const plans = new Set(useDataStore.getState().timeBasedBiz.map(b => b.plan));
    expect(plans.has('free')).toBe(true);
    expect(plans.has('premium')).toBe(true);
  });

  it('si los pines no están, los pide una vez con la consulta ligera y deriva el pool', async () => {
    get.mockResolvedValue(rows(0, 7));
    await useDataStore.getState().loadTimeBasedBiz('guadalajara');
    expect(poolCalls()).toHaveLength(0);
    expect(get.mock.calls[0][0]).toBe('businesses');
    expect(get.mock.calls[0][1]).toContain('limit=1000');
    expect(useDataStore.getState().cityPins).toHaveLength(7);
    expect(useDataStore.getState().timeBasedBiz).toHaveLength(7);
    expect(useDataStore.getState().timeBasedBizCity).toBe('guadalajara');
  });

  it('ignora la respuesta si ya se pidió otra ciudad', async () => {
    get.mockImplementation(async (table, query = '') => {
      if (table === 'businesses') {
        return rows(0, 3, String(query).includes('tepic') ? 'tepic' : 'guadalajara');
      }
      return [];
    });
    const first = useDataStore.getState().loadTimeBasedBiz('guadalajara');
    await useDataStore.getState().loadTimeBasedBiz('tepic');
    await first;
    expect(useDataStore.getState().timeBasedBizCity).toBe('tepic');
    expect(useDataStore.getState().timeBasedBiz.every(b => b.city_slug === 'tepic')).toBe(true);
  });
});

describe('loadData ya no pide el pool aparte (A12)', () => {
  beforeEach(setupStoreMocks);
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  const poolCalls = () => get.mock.calls.filter(([, q]) => String(q || '').includes('limit=200'));

  it('el pool llega con los pines de la ciudad, sin consulta limit=200', async () => {
    const rpcSpy = vi.spyOn(sb, 'rpc').mockResolvedValue([]);
    get.mockImplementation(async (table) => {
      if (table === 'cities') return [{ slug: 'guadalajara', name: 'Guadalajara' }];
      if (table === 'businesses') return rows(0, 5);
      return [];
    });
    await useDataStore.getState().loadData('guadalajara');
    expect(useDataStore.getState().dbReady).toBe(true);
    expect(poolCalls()).toHaveLength(0);
    expect(useDataStore.getState().timeBasedBiz).toHaveLength(5);
    expect(useDataStore.getState().timeBasedBizCity).toBe('guadalajara');
    rpcSpy.mockRestore();
  });

  it('al cambiar de ciudad el pool es el de la ciudad nueva', async () => {
    const rpcSpy = vi.spyOn(sb, 'rpc').mockResolvedValue([]);
    get.mockImplementation(async (table, query = '') => {
      if (table === 'cities') return [{ slug: 'guadalajara', name: 'Guadalajara' }, { slug: 'tepic', name: 'Tepic' }];
      if (table === 'businesses') {
        return rows(0, 3, String(query).includes('tepic') ? 'tepic' : 'guadalajara');
      }
      return [];
    });
    await useDataStore.getState().loadData('guadalajara');
    await useDataStore.getState().loadData('tepic');
    expect(poolCalls()).toHaveLength(0);
    expect(useDataStore.getState().timeBasedBizCity).toBe('tepic');
    expect(useDataStore.getState().timeBasedBiz.every(b => b.city_slug === 'tepic')).toBe(true);
    rpcSpy.mockRestore();
  });
});
