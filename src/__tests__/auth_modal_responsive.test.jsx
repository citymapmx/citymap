import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { getT } from '../lib/constants.js';
import AuthModal from '../components/AuthModal.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// ── Modal de autenticación responsive (auditoría 14 nov 2026) ───────────────
// En iPhone (~390 px) el modal desbordaba en horizontal: la caja de error
// mostraba el token crudo de Google (71 caracteres sin espacios, ~470 px),
// la hoja quedaba recortada arriba por el safe-area (Dynamic Island) y el
// botón oficial de Google tenía un suelo de 280 px. Los errores además
// llegaban en inglés con detalle técnico. Estos tests fijan cada arreglo.

const TOKEN_71 =
  '128467245162-b1di6bji2ejd0ior0mv6kr0atv9e6fia.apps.googleusercontent.com';

const mockAuthState = vi.hoisted(() => ({
  showAuth: true, authMode: 'login',
  authForm: { name: '', email: '', password: '', city: '' },
  authLoading: false, authErr: '',
  setShowAuth: () => {}, setAuthMode: () => {}, setAuthForm: () => {},
  setAuthErr: () => {}, handleGoogleIdToken: () => Promise.resolve(null),
  handleAppleIdToken: () => Promise.resolve(null),
}));

vi.hoisted(() => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(String(k), String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
  globalThis.window = {
    location: { search: '', hostname: 'citymap.mx', pathname: '/', origin: 'https://citymap.mx' },
    matchMedia: () => ({ matches: false }),
    google: undefined,
  };
});

vi.mock('../store/useAuthStore.js', () => ({
  useAuthStore: (sel) => (typeof sel === 'function' ? sel(mockAuthState) : mockAuthState),
}));

vi.mock('../lib/supabase.js', () => ({
  sb: {
    signIn: vi.fn(), signUp: vi.fn(), signInWithIdToken: vi.fn(),
    getUser: vi.fn(), patch: vi.fn(), get: vi.fn(), signOut: vi.fn(),
    signInWithOAuth: vi.fn(), resetPasswordForEmail: vi.fn(), updateUser: vi.fn(),
  },
}));

const T = getT(false);
const renderModal = () =>
  renderToStaticMarkup(<AuthModal T={T} dark={false} cities={[]} doAuth={vi.fn()} />);

beforeEach(() => {
  mockAuthState.showAuth = true;
  mockAuthState.authMode = 'login';
  mockAuthState.authForm = { name: '', email: '', password: '', city: '' };
  mockAuthState.authLoading = false;
  mockAuthState.authErr = '';
  globalThis.localStorage.clear();
  vi.clearAllMocks();
});

describe('modal responsive: caja de error parte palabras largas', () => {
  it('un token de 71 caracteres sin espacios se renderiza dentro de un span que lo parte', () => {
    mockAuthState.authErr = `Unacceptable audience in id_token: [${TOKEN_71}]`;
    const html = renderModal();
    expect(html).toContain('role="alert"');
    expect(html).toContain(TOKEN_71);
    // El texto va envuelto: el span puede encogerse (min-width:0) y parte
    // la palabra en cualquier punto; el icono no se encoge.
    expect(html).toContain('overflow-wrap:anywhere');
    expect(html).toContain('word-break:break-word');
    expect(html).toContain('min-width:0');
    expect(html).toContain('flex:1');
    expect(html).toContain('flex-shrink:0');
  });

  it('la caja de error alinea arriba (el icono no se centra con un texto de varias líneas)', () => {
    mockAuthState.authErr = 'Algo salió mal. Inténtalo de nuevo.';
    const html = renderModal();
    const alert = html.match(/<div role="alert"[^>]*style="([^"]*)"/)?.[1] || '';
    expect(alert).toContain('align-items:flex-start');
    expect(alert).not.toContain('align-items:center');
  });
});

describe('modal responsive: la hoja cabe en el viewport con safe-area', () => {
  it('el overlay ya no centra con align-items:center: la hoja usa margin:auto y el overlay tiene scroll', () => {
    const html = renderModal();
    const overlay = html.match(/<div class="ov"[^>]*style="([^"]*)"/)?.[1] || '';
    expect(overlay).not.toContain('align-items:center');
    expect(overlay).toContain('overflow-y:auto');
    expect(html).toContain('margin:auto');
  });

  it('la maxHeight de la hoja descuenta el safe-area superior e inferior, no solo 32 px', () => {
    const html = renderModal();
    expect(html).toContain('env(safe-area-inset-top)');
    expect(html).toContain('env(safe-area-inset-bottom)');
    expect(html).not.toContain('max-height:calc(100dvh - 32px)');
  });

  it('el overlay lateral también respeta el safe-area (.ov en App.jsx)', () => {
    const css = read('../App.jsx');
    expect(css).toContain('env(safe-area-inset-left)');
    expect(css).toContain('env(safe-area-inset-right)');
  });

  it('la hoja tiene red de seguridad anti-overflow (.sh en App.jsx) y cinturón en App.css', () => {
    const css = read('../App.jsx');
    expect(css).toContain('overflow-x:hidden');
    expect(css).toContain('min-width:0');
    expect(read('../App.css')).toContain('.sh * { overflow-wrap: break-word; }');
  });
});

describe('modal responsive: botón oficial de Google y rejilla de contraseña', () => {
  it('el suelo del botón GIS bajó de 280 a 200 px (ya no desborda en viewports ≤352 px)', () => {
    const src = read('../components/AuthModal.jsx');
    expect(src).toContain(', 200), 380)');
    expect(src).not.toContain(', 280), 380)');
  });

  it('el contenedor del botón de Google no puede desbordar (min-width:0 + overflow:hidden)', () => {
    const html = renderModal();
    expect(html).toContain('min-width:0;overflow:hidden');
  });

  it('la rejilla de requisitos usa minmax(0, 1fr) y cada hijo tiene min-width:0', () => {
    mockAuthState.authMode = 'register';
    mockAuthState.authForm = { name: '', email: '', password: 'abc', city: '' };
    const html = renderModal();
    expect(html).toContain('grid-template-columns:repeat(2, minmax(0, 1fr))');
    expect(html).toContain('min-width:0');
  });
});

describe('modal responsive: errores mapeados, sin prefijos técnicos', () => {
  it('AuthModal y el store usan mapAuthError; ya no se concatena "Error con Google/Apple: "', () => {
    const modal = read('../components/AuthModal.jsx');
    expect(modal).toContain("mapAuthError(err, 'apple')");
    expect(modal).toContain("mapAuthError(err2, 'google')");
    expect(modal).toContain('mapAuthError(e');
    expect(modal).not.toContain('modal_error_google');
    expect(modal).not.toContain('modal_error_apple');
    expect(modal).not.toContain('"Error con Google: "');
    expect(modal).not.toContain('"Error con Apple: "');

    const store = read('../store/useAuthStore.js');
    expect(store).toContain("mapAuthError(e, 'google')");
    expect(store).toContain("mapAuthError(e, 'apple')");
    expect(store).toContain('mapAuthError(e)');
    expect(store).not.toContain('set({ authErr: e.message })');
  });

  it('la clave modal_error_apple existe en ambos idiomas (antes faltaba y usaba fallback)', () => {
    expect(read('../lib/i18n.js')).toContain('"modal_error_apple"');
    expect(read('../lib/i18n-en.js')).toContain('"modal_error_apple"');
  });

  it('el fix #344 de Google sigue intacto: no se tocó nativeGoogleAuth.js', () => {
    expect(read('../lib/nativeGoogleAuth.js')).toContain('iOSServerClientId');
  });
});
