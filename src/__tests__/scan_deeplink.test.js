import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Deep links: escaneo de tarjeta de lealtad (src/hooks/useCapacitorHardwareBack.js) ──
// El QR de la tarjeta codifica https://citymap.mx/scan/<member.id>. Al
// escanear con la cámara, el App Link abre la app y esta debe navegar a
// /scan/<member.id> (ScanView, modo dueño con «Dar 1 Sello»). Antes el
// enlace se perdía: en arranque en frío nadie llamaba getLaunchUrl() y en
// caliente la rama que navegaba era código muerto.

const mocks = vi.hoisted(() => ({
  addListener: vi.fn(() => Promise.resolve({ remove: vi.fn() })),
  getLaunchUrl: vi.fn(async () => ({ url: '' })),
  exitApp: vi.fn(),
  uiGetState: vi.fn(() => ({})),
  uiSetState: vi.fn(),
  authSetState: vi.fn(),
  sbSetSessionFromUrl: vi.fn(async () => false),
  sbGetUser: vi.fn(async () => null),
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: mocks.addListener,
    getLaunchUrl: mocks.getLaunchUrl,
    exitApp: mocks.exitApp,
  },
}));

vi.mock('../store/useUIStore.js', () => ({
  useUIStore: { getState: mocks.uiGetState, setState: mocks.uiSetState },
}));

vi.mock('../store/useAuthStore.js', () => ({
  useAuthStore: { setState: mocks.authSetState, getState: () => ({}) },
}));

vi.mock('../lib/supabase.js', () => ({
  sb: {
    setSessionFromUrl: mocks.sbSetSessionFromUrl,
    getUser: mocks.sbGetUser,
  },
}));

import {
  __resetDeepLinkRoutingForTests,
  routeDeepLink,
  routeDeepLinkOnce,
} from '../hooks/useCapacitorHardwareBack.js';

// sessionStorage falso (los tests corren en node): el dedupe persistido
// sobrevive a la recarga simulada, igual que en la WebView real.
const fakeStorage = (() => {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
globalThis.sessionStorage = fakeStorage;

beforeEach(() => {
  fakeStorage.clear();
});

const readSource = (rel) =>
  fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

function makeDeps(overrides = {}) {
  return {
    closeBrowser: vi.fn(async () => {}),
    getPlatform: vi.fn(async () => 'android'),
    setSessionFromUrl: vi.fn(async () => false),
    getUser: vi.fn(async () => null),
    setAuthUser: vi.fn(),
    reload: vi.fn(),
    navigate: vi.fn(),
    // Por defecto la WebView está en home, así que navegar procede.
    getCurrentPath: vi.fn(() => '/'),
    ...overrides,
  };
}

describe('routeDeepLink: retorno OAuth (sin cambios)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetDeepLinkRoutingForTests();
  });

  it('mx.citymap.app://login con #access_token cierra el Browser, guarda la sesión y recarga', async () => {
    const deps = makeDeps({
      setSessionFromUrl: vi.fn(async () => true),
      getUser: vi.fn(async () => ({ id: 'u1' })),
    });
    const url = 'mx.citymap.app://login#access_token=tok&refresh_token=rt';
    expect(await routeDeepLink(url, deps)).toBe(true);
    expect(deps.closeBrowser).toHaveBeenCalledTimes(1);
    expect(deps.setSessionFromUrl).toHaveBeenCalledWith(url);
    expect(deps.getUser).toHaveBeenCalledTimes(1);
    expect(deps.setAuthUser).toHaveBeenCalledWith({ id: 'u1' });
    expect(deps.reload).toHaveBeenCalledTimes(1);
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  it('https://citymap.mx/login con #access_token sigue el mismo camino OAuth', async () => {
    const deps = makeDeps({
      setSessionFromUrl: vi.fn(async () => true),
      getUser: vi.fn(async () => ({ id: 'u1' })),
    });
    expect(
      await routeDeepLink('https://citymap.mx/login#access_token=tok', deps),
    ).toBe(true);
    expect(deps.setSessionFromUrl).toHaveBeenCalledTimes(1);
    expect(deps.reload).toHaveBeenCalledTimes(1);
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  it('si setSessionFromUrl devuelve false, no recarga ni pide el usuario', async () => {
    const deps = makeDeps({ setSessionFromUrl: vi.fn(async () => false) });
    expect(
      await routeDeepLink('mx.citymap.app://login#access_token=tok', deps),
    ).toBe(true);
    expect(deps.getUser).not.toHaveBeenCalled();
    expect(deps.reload).not.toHaveBeenCalled();
  });

  it('un host ajeno con #access_token se ignora (no se guarda la sesión)', async () => {
    const deps = makeDeps();
    expect(
      await routeDeepLink('https://evil.com/login#access_token=tok', deps),
    ).toBe(false);
    expect(deps.setSessionFromUrl).not.toHaveBeenCalled();
    expect(deps.navigate).not.toHaveBeenCalled();
  });
});

describe('routeDeepLink: enlace interno (App Link)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetDeepLinkRoutingForTests();
  });

  it('/scan/<member.id> navega a pathname + search en Android', async () => {
    const deps = makeDeps();
    expect(
      await routeDeepLink('https://citymap.mx/scan/abc-123', deps),
    ).toBe(true);
    expect(deps.navigate).toHaveBeenCalledWith('/scan/abc-123');
    expect(deps.setSessionFromUrl).not.toHaveBeenCalled();
    expect(deps.reload).not.toHaveBeenCalled();
  });

  it('conserva el query string al navegar', async () => {
    const deps = makeDeps();
    await routeDeepLink('https://citymap.mx/scan/abc-123?origen=qr', deps);
    expect(deps.navigate).toHaveBeenCalledWith('/scan/abc-123?origen=qr');
  });

  it('citymap.world también navega', async () => {
    const deps = makeDeps();
    expect(await routeDeepLink('https://citymap.world/fr/paris', deps)).toBe(true);
    expect(deps.navigate).toHaveBeenCalledWith('/fr/paris');
  });

  it('la home (/) no navega', async () => {
    const deps = makeDeps();
    expect(await routeDeepLink('https://citymap.mx/', deps)).toBe(true);
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  it('en web no navega (la web ya está en esa URL)', async () => {
    const deps = makeDeps({ getPlatform: vi.fn(async () => 'web') });
    expect(
      await routeDeepLink('https://citymap.mx/scan/abc-123', deps),
    ).toBe(false);
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  it('un host ajeno no navega', async () => {
    const deps = makeDeps();
    expect(await routeDeepLink('https://google.com/scan/abc', deps)).toBe(false);
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  it('URL inválida o vacía no hace nada', async () => {
    const deps = makeDeps();
    expect(await routeDeepLink('no-es-una-url', deps)).toBe(false);
    expect(await routeDeepLink('', deps)).toBe(false);
    expect(await routeDeepLink(null, deps)).toBe(false);
    expect(deps.navigate).not.toHaveBeenCalled();
  });
});

describe('routeDeepLinkOnce: dedupe al arrancar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetDeepLinkRoutingForTests();
  });

  it('la misma URL dos veces seguidas solo navega una vez', async () => {
    const deps = makeDeps();
    const url = 'https://citymap.mx/scan/abc-123';
    expect(await routeDeepLinkOnce(url, deps)).toBe(true);
    expect(await routeDeepLinkOnce(url, deps)).toBe(false);
    expect(deps.navigate).toHaveBeenCalledTimes(1);
  });

  it('pasada la ventana de dedupe persistida, la misma URL vuelve a navegar', async () => {
    const nowSpy = vi.spyOn(Date, 'now');
    const deps = makeDeps();
    const url = 'https://citymap.mx/scan/abc-123';
    nowSpy.mockReturnValue(1_000_000);
    expect(await routeDeepLinkOnce(url, deps)).toBe(true);
    // A los 6 s el dedupe en memoria expiró, pero el persistido (30 s)
    // sigue bloqueando: es el caso de la recarga lenta tras el bucle.
    nowSpy.mockReturnValue(1_000_000 + 6000);
    expect(await routeDeepLinkOnce(url, deps)).toBe(false);
    nowSpy.mockReturnValue(1_000_000 + 31000);
    expect(await routeDeepLinkOnce(url, deps)).toBe(true);
    expect(deps.navigate).toHaveBeenCalledTimes(2);
    nowSpy.mockRestore();
  });

  it('URLs distintas navegan cada una', async () => {
    const deps = makeDeps();
    expect(
      await routeDeepLinkOnce('https://citymap.mx/scan/aaa', deps),
    ).toBe(true);
    expect(
      await routeDeepLinkOnce('https://citymap.mx/scan/bbb', deps),
    ).toBe(true);
    expect(deps.navigate).toHaveBeenCalledTimes(2);
  });
});

describe('bucle de recarga (regresión #349)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetDeepLinkRoutingForTests();
  });

  it('si la WebView ya está en el destino, no navega (no recarga)', async () => {
    const deps = makeDeps({
      getCurrentPath: vi.fn(() => '/scan/abc-123'),
    });
    expect(
      await routeDeepLink('https://citymap.mx/scan/abc-123', deps),
    ).toBe(true);
    expect(deps.navigate).not.toHaveBeenCalled();
  });

  it('con otro query la ruta sí es distinta y navega', async () => {
    const deps = makeDeps({
      getCurrentPath: vi.fn(() => '/scan/abc-123'),
    });
    await routeDeepLink('https://citymap.mx/scan/abc-123?origen=qr', deps);
    expect(deps.navigate).toHaveBeenCalledWith('/scan/abc-123?origen=qr');
  });

  it('segundo arranque en frío con la misma URL y ya en el destino: no navega', async () => {
    let current = '/';
    const deps = makeDeps({ getCurrentPath: vi.fn(() => current) });
    const url = 'https://citymap.mx/scan/abc-123';
    // Primer arranque: la WebView está en home, navega a /scan/abc-123.
    expect(await routeDeepLinkOnce(url, deps)).toBe(true);
    expect(deps.navigate).toHaveBeenCalledTimes(1);
    // La recarga deja la WebView ya en el destino y getLaunchUrl() vuelve
    // a devolver la misma URL: no debe navegar otra vez.
    current = '/scan/abc-123';
    expect(await routeDeepLinkOnce(url, deps)).toBe(false);
    expect(deps.navigate).toHaveBeenCalledTimes(1);
  });

  it('simular una recarga (memoria borrada, storage intacto) no vuelve a navegar', async () => {
    const deps = makeDeps();
    const url = 'https://citymap.mx/scan/abc-123';
    expect(await routeDeepLinkOnce(url, deps)).toBe(true);
    expect(deps.navigate).toHaveBeenCalledTimes(1);
    // La recarga borra el Map en memoria pero no sessionStorage.
    __resetDeepLinkRoutingForTests();
    expect(await routeDeepLinkOnce(url, deps)).toBe(false);
    expect(deps.navigate).toHaveBeenCalledTimes(1);
  });

  it('tras la recarga, una URL distinta sí navega', async () => {
    const deps = makeDeps();
    expect(
      await routeDeepLinkOnce('https://citymap.mx/scan/aaa', deps),
    ).toBe(true);
    __resetDeepLinkRoutingForTests();
    expect(
      await routeDeepLinkOnce('https://citymap.mx/scan/bbb', deps),
    ).toBe(true);
    expect(deps.navigate).toHaveBeenCalledTimes(2);
  });

  it('el retorno OAuth no pasa por la guarda de ruta actual', async () => {
    const deps = makeDeps({
      getCurrentPath: vi.fn(() => '/login'),
      setSessionFromUrl: vi.fn(async () => true),
      getUser: vi.fn(async () => ({ id: 'u1' })),
    });
    expect(
      await routeDeepLink('mx.citymap.app://login#access_token=tok', deps),
    ).toBe(true);
    expect(deps.setSessionFromUrl).toHaveBeenCalledTimes(1);
    expect(deps.reload).toHaveBeenCalledTimes(1);
    expect(deps.navigate).not.toHaveBeenCalled();
  });
});

describe('useCapacitorHardwareBack: cableado del deep link', () => {
  it('el listener appUrlOpen y getLaunchUrl pasan por routeDeepLinkOnce', () => {
    const src = readSource('../hooks/useCapacitorHardwareBack.js');
    expect(src).toContain("CapApp.addListener('appUrlOpen'");
    expect(src).toContain('routeDeepLinkOnce(event?.url)');
    expect(src).toContain('CapApp.getLaunchUrl()');
    expect(src).toContain('routeDeepLinkOnce(launch.url)');
  });

  it('no queda la rama muerta del else-if que nunca navegaba', () => {
    const src = readSource('../hooks/useCapacitorHardwareBack.js');
    expect(src).not.toContain("else if (event.url.startsWith('https://citymap.mx'))");
    expect(src).not.toContain("event.url.includes('citymap.mx') || event.url.includes('mx.citymap.app')");
  });

  it('el camino OAuth sigue usando setSessionFromUrl', () => {
    const src = readSource('../hooks/useCapacitorHardwareBack.js');
    expect(src).toContain('setSessionFromUrl(url)');
    expect(src).toContain("hash.includes('access_token=')");
  });

  it('el fix del bucle está cableado: guarda de ruta actual y dedupe en sessionStorage', () => {
    const src = readSource('../hooks/useCapacitorHardwareBack.js');
    expect(src).toContain('getCurrentPath()');
    expect(src).toContain('current !== path');
    expect(src).toContain('citymap_routed_deep_link');
    expect(src).toContain('sessionStorage');
  });
});
