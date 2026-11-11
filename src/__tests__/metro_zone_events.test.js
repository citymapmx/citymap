// Carrera de la zona metropolitana (bug de Maná, 11 Nov 2026): el early
// fetch de eventos se disparaba antes de que refreshCities() llenara
// METRO_ZONES, así que la primera carga de Guadalajara traía solo
// Guadalajara (75 eventos) y nunca los 37 de Zapopan (Maná incluido).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useDataStore } from '../store/useDataStore.js';
import { sb } from '../lib/supabase.js';
import { METRO_ZONES, updateMetroZones } from '../lib/utils.js';

const CITIES = [
  { slug: 'guadalajara', name: 'Guadalajara', state: 'Jalisco', lat: 20.6597, lng: -103.3496 },
  { slug: 'zapopan', name: 'Zapopan', state: 'Jalisco;guadalajara', lat: 20.7236, lng: -103.3979 },
  { slug: 'tlaquepaque', name: 'Tlaquepaque', state: 'Jalisco;guadalajara', lat: 20.6407, lng: -103.3114 },
];

function future(days) {
  const d = new Date(Date.now() + days * 86400000);
  return d.toISOString().slice(0, 10);
}

const gdlEvent = { id: 'gdl-1', title: 'Concierto GDL', date: future(3), city_slug: 'guadalajara', status: 'approved', visibility: 'public', img_url: 'https://example.supabase.co/gdl.jpg' };
const zapopanEvent = { id: 'zap-1', title: 'Maná — Vivir Sin Aire Tour', date: future(30), city_slug: 'zapopan', status: 'approved', visibility: 'public', img_url: 'https://example.supabase.co/mana.jpg' };

function resetStore() {
  useDataStore.setState({ events: [], experiences: [], homeSecondaryCity: null, homeSecondaryError: false, dbReady: false, cities: [] });
  Object.keys(METRO_ZONES).forEach(k => delete METRO_ZONES[k]);
}

describe('zona metropolitana de eventos (carrera del early fetch)', () => {
  beforeEach(() => {
    resetStore();
    const storage = { getItem: key => (key === 'cg_city_slug' ? 'guadalajara' : null), setItem: vi.fn(), removeItem: vi.fn() };
    vi.stubGlobal('localStorage', storage);
  });

  it('en la primera carga en frío, Guadalajara trae también los eventos de Zapopan', async () => {
    // La primera consulta (filtro estrecho, sin zona) solo trae
    // Guadalajara; la segunda (filtro de zona) trae también Zapopan.
    const getSpy = vi.spyOn(sb, 'get').mockImplementation(async (table, query = '') => {
      if (table === 'cities') return CITIES;
      if (table === 'events') return String(query).includes('zapopan') ? [gdlEvent, zapopanEvent] : [gdlEvent];
      return [];
    });
    const rpc = vi.spyOn(sb, 'rpc').mockResolvedValue([]);
    try {
      await useDataStore.getState().loadData('guadalajara');
      await vi.waitFor(() => expect(useDataStore.getState().homeSecondaryCity).toBe('guadalajara'));
      const ids = useDataStore.getState().events.map(e => e.id);
      expect(ids).toContain('gdl-1');
      expect(ids).toContain('zap-1');
      // El refetch con la zona: la consulta de eventos salió dos veces.
      expect(getSpy.mock.calls.filter(([t]) => t === 'events')).toHaveLength(2);
    } finally {
      getSpy.mockRestore();
      rpc.mockRestore();
      vi.unstubAllGlobals();
    }
  });

  it('con la zona ya conocida no se repite la consulta de eventos', async () => {
    updateMetroZones(CITIES);
    const getSpy = vi.spyOn(sb, 'get').mockImplementation(async (table, query = '') => {
      if (table === 'cities') return CITIES;
      if (table === 'events') return [gdlEvent, zapopanEvent];
      return [];
    });
    const rpc = vi.spyOn(sb, 'rpc').mockResolvedValue([]);
    try {
      await useDataStore.getState().loadData('guadalajara');
      await vi.waitFor(() => expect(useDataStore.getState().homeSecondaryCity).toBe('guadalajara'));
      expect(useDataStore.getState().events.map(e => e.id)).toContain('zap-1');
      expect(getSpy.mock.calls.filter(([t]) => t === 'events')).toHaveLength(1);
    } finally {
      getSpy.mockRestore();
      rpc.mockRestore();
      vi.unstubAllGlobals();
    }
  });
});
