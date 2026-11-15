import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Fallback WEB del login con Apple ──────────────────────────────────────────
// El login NATIVO con Apple falla con error 1000 («Registro no completado»)
// por un fallo de Apple en sus servidores con equipos nuevos (hilo 837986);
// se arregla solo en días/semanas. Mientras tanto, el fallback web usa la
// OAuth de Supabase (appleid.apple.com) y el mismo retorno que Google
// (deep link mx.citymap.app://login).

const browserMocks = vi.hoisted(() => ({
  open: vi.fn(async () => {}),
  close: vi.fn(async () => {}),
  addListener: vi.fn(async () => ({ remove: async () => {} })),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
}));

vi.mock('@capacitor/browser', () => ({ Browser: browserMocks }));

import { sb } from '../lib/supabase.js';
import { useAuthStore } from '../store/useAuthStore.js';

const readSource = (rel) =>
  fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

const APPLE_AUTHORIZE_URL =
  'https://dpkjxhjkzdlkvyotoeai.supabase.co/auth/v1/authorize?provider=apple&redirect_to=https%3A%2F%2Fcitymap.mx%2Flogin%3Ffrom%3Dapp';

let alertSpy;

beforeEach(() => {
  // En Node `navigator` es solo-lectura: definirlo como propiedad.
  Object.defineProperty(globalThis, 'navigator', {
    value: { onLine: true },
    configurable: true,
  });
  alertSpy = vi.fn();
  globalThis.alert = alertSpy;
  browserMocks.open.mockClear();
  browserMocks.addListener.mockClear();
});

afterEach(() => {
  delete globalThis.navigator;
  delete globalThis.alert;
  vi.restoreAllMocks();
});

describe('fallback web Apple: URL de authorize', () => {
  it('appleWebOAuthUrl apunta a Supabase con provider apple y retorno /login?from=app', () => {
    expect(sb.appleWebOAuthUrl()).toBe(APPLE_AUTHORIZE_URL);
  });
});

describe('fallback web Apple: signInWithOAuth en la app nativa', () => {
  it("con provider apple abre el authorize de Apple en el Custom Tab", async () => {
    await sb.signInWithOAuth('apple');
    expect(browserMocks.open).toHaveBeenCalledTimes(1);
    expect(browserMocks.open).toHaveBeenCalledWith({ url: APPLE_AUTHORIZE_URL });
  });

  it('con provider google sigue abriendo la página de login con el botón GIS (sin tocar)', async () => {
    await sb.signInWithOAuth('google');
    expect(browserMocks.open).toHaveBeenCalledTimes(1);
    expect(browserMocks.open).toHaveBeenCalledWith({ url: 'https://citymap.mx/login?from=app' });
  });

  it('sin conexión no abre nada y avisa', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true,
    });
    await sb.signInWithOAuth('apple');
    expect(browserMocks.open).not.toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalled();
  });
});

describe('fallback web Apple: acción del store', () => {
  it('signInWithAppleWebFallback llama a sb.signInWithOAuth con apple', async () => {
    const spy = vi.spyOn(sb, 'signInWithOAuth').mockResolvedValue(undefined);
    await useAuthStore.getState().signInWithAppleWebFallback();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith('apple');
  });
});

describe('fallback web Apple: cableado en AuthModal', () => {
  const SRC = readSource('../components/AuthModal.jsx');

  it('el catch de Apple abre el fallback web cuando no es cancelación', () => {
    expect(SRC).toContain('signInWithAppleWebFallback');
    expect(SRC).toContain('await signInWithAppleWebFallback();');
    // La cancelación por el usuario sigue sin abrir la web.
    const appleCatch = SRC.slice(SRC.indexOf('signInWithNativeApple()'));
    expect(appleCatch.indexOf('isUserCancelledError(err)')).toBeLessThan(
      appleCatch.indexOf('signInWithAppleWebFallback()'),
    );
  });

  it('el catch de Apple registra el error crudo a consola (diagnóstico)', () => {
    expect(SRC).toContain('Error con Apple (crudo):');
    expect(SRC).toContain('code: err?.code');
    expect(SRC).toContain('domain: err?.domain');
    expect(SRC).toContain('userInfo: err?.userInfo');
  });

  it('si el respaldo web también falla, se muestra el mensaje amigable (nada técnico)', () => {
    expect(SRC).toContain("Error con Apple (respaldo web):");
    expect(SRC).toContain("setAuthErr(mapAuthError(err2, 'apple'))");
  });

  it('el flujo de Google no se toca (su respaldo sigue igual)', () => {
    expect(SRC).toContain("sb.signInWithOAuth('google')");
  });
});

describe('fallback web Apple: botón en /login?from=app', () => {
  const SRC = readSource('../views/AppLoginView.jsx');

  it('hay un botón de Apple que navega a la OAuth web', () => {
    expect(SRC).toContain('sb.appleWebOAuthUrl()');
    expect(SRC).toContain('modal_continuar_apple');
    expect(SRC).toContain('Continuar con Apple');
  });

  it('el botón de Apple solo se muestra con from=app (en web no se ofrece)', () => {
    const idx = SRC.indexOf('sb.appleWebOAuthUrl()');
    const before = SRC.slice(0, idx);
    // La única aparición vive dentro de un bloque {fromApp && (...)}.
    expect(before.lastIndexOf('{fromApp && (')).toBeGreaterThan(
      before.lastIndexOf('handleFallbackGoogle'),
    );
  });

  it('el flujo de Google (GIS) no se toca', () => {
    expect(SRC).toContain('renderButton(googleBtnRef.current');
    expect(SRC).toContain('promptGoogleOneTap');
    expect(SRC).toContain('handleFallbackGoogle');
  });
});

describe('fallback web Apple: retorno por deep link (App.jsx)', () => {
  const SRC = readSource('../App.jsx');

  it('tras parseOAuthHash, si el token acaba de llegar a /login?from=app, pasa la sesión a la app', () => {
    expect(SRC).toContain('const oauthReturned = sb.parseOAuthHash();');
    expect(SRC).toContain("window.location.pathname === '/login'");
    expect(SRC).toContain("get('from') === 'app'");
    expect(SRC).toContain('mx.citymap.app://login#access_token=');
  });

  it('el deep link solo se dispara cuando el token acaba de llegar (no con una sesión vieja)', () => {
    const idx = SRC.indexOf('mx.citymap.app://login#access_token=');
    const before = SRC.slice(0, idx);
    expect(before).toContain('if (');
    expect(before.lastIndexOf('oauthReturned')).toBeGreaterThan(
      before.lastIndexOf('sb.parseOAuthHash()'),
    );
  });
});
