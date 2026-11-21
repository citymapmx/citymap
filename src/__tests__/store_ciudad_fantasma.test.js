import { describe, expect, it, vi, afterEach } from 'vitest';

// Ciudad fantasma por código de país (20 nov 2026): al cambiar a una ciudad
// extranjera, el teléfono guardaba «us»/«es» como ciudad activa y el muro
// salía vacío. La tienda nunca debe aceptar un código de país como ciudad:
// ni al arrancar (valor guardado) ni en ningún cambio posterior.
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.resetModules(); });

describe('useUIStore: un código de país nunca es ciudad activa', () => {
  it('ignora setActiveCity con un código de país', async () => {
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() });
    const { useUIStore } = await import('../store/useUIStore.js');
    const store = useUIStore.getState();
    for (const code of ['mx', 'us', 'es', 'ca', 'ar', 'co', 'fr', 'gb', 'jp']) {
      store.setActiveCity(code);
      expect(useUIStore.getState().activeCity).not.toBe(code);
    }
    store.setActiveCity('tepic', { persist: false });
    expect(useUIStore.getState().activeCity).toBe('tepic');
  });

  it('al arrancar borra un código de país guardado y no lo usa como ciudad', async () => {
    const removeItem = vi.fn();
    vi.stubGlobal('localStorage', { getItem: () => 'us', setItem: vi.fn(), removeItem });
    const { useUIStore } = await import('../store/useUIStore.js');
    expect(removeItem).toHaveBeenCalledWith('cg_city_slug');
    expect(useUIStore.getState().activeCity).toBe('');
  });
});
