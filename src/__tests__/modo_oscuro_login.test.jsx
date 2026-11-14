import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { getT } from '../lib/constants.js';
import AuthModal from '../components/AuthModal.jsx';
import AppLoginView from '../views/AppLoginView.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// 14 nov 2026 (modo oscuro del login): el botón oficial de Google (GIS)
// usa theme 'filled_black' en oscuro y se fundía con la tarjeta oscura
// (#1e1e1e): solo se veía el texto blanco, sin borde que delimitara la
// píldora. Además la tarjeta y los inputs usaban el gris fijo #1e1e1e en
// vez de T.card/T.white, la caja de éxito de recuperación y la de error
// eran cajas CLARAS (#F0FDF4 / #FEF2F2) sobre fondo oscuro, el texto de
// error #dc2626 quedaba a ~3,3:1 sobre la tarjeta, y los botones negros
// fijos (#111, «Volver a la app» / «Entrar a CityMap») también se fundían.
//
// Arreglo (estrategia A, patrón PR #313): en oscuro los fondos usan
// T.card/T.white y el texto T.text/T.sub; el contenedor del botón GIS
// lleva un anillo claro (rgba(255,255,255,0.35), ~3,2:1 sobre la tarjeta
// y ~4,3:1 sobre el botón negro) solo en oscuro; el theme del GIS NO se
// toca ('filled_black' en oscuro, 'outline' en claro). En claro todo
// queda byte a byte igual (las ramas claras de los ternarios conservan
// los valores originales).

const mockAuthState = vi.hoisted(() => ({
  showAuth: true, authMode: 'login',
  authForm: { name: '', email: '', password: '', city: '' },
  authLoading: false, authErr: '',
  setShowAuth: () => {}, setAuthMode: () => {}, setAuthForm: () => {},
  setAuthErr: () => {}, handleGoogleIdToken: () => Promise.resolve(null),
}));

// Stubs ANTES de los imports: useUIStore lee localStorage y window al
// crear el store, y AppLoginView lee window.location.search al renderizar.
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

// ── Contraste WCAG (misma fórmula que usa el navegador) ──
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// Mezcla un rgba sobre un fondo opaco (como lo compone el navegador).
const blend = ([r, g, b, a], overHex) => {
  const base = [1, 3, 5].map((i) => parseInt(overHex.slice(i, i + 2), 16));
  const mix = base.map((bc, i) => Math.round(a * [r, g, b][i] + (1 - a) * bc));
  return '#' + mix.map((v) => v.toString(16).padStart(2, '0')).join('');
};

const TD = getT(true);
const TL = getT(false);

const renderLogin = (dark) =>
  renderToStaticMarkup(<AppLoginView T={dark ? TD : TL} dark={dark} navigate={vi.fn()} />);
const renderModal = (dark) =>
  renderToStaticMarkup(<AuthModal T={dark ? TD : TL} dark={dark} cities={[]} doAuth={vi.fn()} />);

beforeEach(() => {
  mockAuthState.showAuth = true;
  mockAuthState.authMode = 'login';
  mockAuthState.authForm = { name: '', email: '', password: '', city: '' };
  mockAuthState.authLoading = false;
  mockAuthState.authErr = '';
  globalThis.localStorage.clear();
  globalThis.window.location.search = '';
  vi.clearAllMocks();
});

describe('modo oscuro: anillo del botón de Google en /login', () => {
  it('en oscuro el contenedor del botón GIS lleva un contorno claro (el botón filled_black ya no se funde con la tarjeta)', () => {
    const html = renderLogin(true);
    expect(html).toContain('border:1px solid rgba(255,255,255,0.35)');
    expect(html).toContain('border-radius:999px');
  });

  it('en claro no hay anillo: el botón GIS en theme outline ya trae su propio borde', () => {
    const html = renderLogin(false);
    expect(html).not.toContain('rgba(255,255,255,0.35)');
    expect(html).not.toContain('border-radius:999px');
  });

  it('el theme del GIS no se tocó: filled_black en oscuro, outline en claro', () => {
    const src = read('../views/AppLoginView.jsx');
    expect(src).toContain("theme: dark ? 'filled_black' : 'outline'");
  });

  it('en oscuro la tarjeta y los inputs usan T.card/T.white, no el gris fijo #1e1e1e', () => {
    const html = renderLogin(true);
    expect(html).toContain('background:#232326');
    expect(html).not.toContain('#1e1e1e');
    const src = read('../views/AppLoginView.jsx');
    expect(src).toContain('background: dark ? T.card');
    expect(src).toContain('background: dark ? T.white');
  });

  it('en claro la tarjeta y los inputs quedan exactos como antes', () => {
    const html = renderLogin(false);
    expect(html).toContain('background:#fff');
    expect(html).not.toContain('#232326');
    expect(html).not.toContain('#1e1e1e');
  });
});

describe('modo oscuro: caja de éxito de recuperación y errores en /login', () => {
  it('en recuperación oscura los inputs usan T.white', () => {
    globalThis.window.location.search = '?recovery=1';
    const html = renderLogin(true);
    expect(html).toContain('Crea tu contraseña nueva');
    expect(html).toContain('background:#232326');
    expect(html).not.toContain('#1e1e1e');
  });

  it('la caja de éxito de recuperación tiene variante oscura (fondo verde oscuro + texto #4ADE80), no la caja clara de antes', () => {
    const src = read('../views/AppLoginView.jsx');
    expect(src).toContain("background: dark ? 'rgba(34,197,94,0.12)' : '#F0FDF4'");
    expect(src).toContain("color: dark ? '#4ADE80' : '#166534'");
    // El botón negro fijo («Entrar a CityMap») ahora es claro en oscuro.
    expect(src).toContain("background: dark ? '#f1f5f9' : '#111'");
  });

  it('el texto de error usa T.red en oscuro (el #dc2626 fijo quedaba a ~3,3:1)', () => {
    const src = read('../views/AppLoginView.jsx');
    expect(src).toContain("color: dark ? T.red : '#dc2626'");
    expect(src).not.toContain("color: '#dc2626'");
  });
});

describe('modo oscuro: anillo del botón de Google en el modal web', () => {
  it('en oscuro el contenedor del botón GIS lleva el mismo contorno claro', () => {
    const html = renderModal(true);
    expect(html).toContain('border:1px solid rgba(255,255,255,0.35)');
    expect(html).toContain('border-radius:999px');
  });

  it('en claro no hay anillo', () => {
    const html = renderModal(false);
    expect(html).not.toContain('rgba(255,255,255,0.35)');
  });

  it('el theme del GIS del modal no se tocó', () => {
    const src = read('../components/AuthModal.jsx');
    expect(src).toContain('const theme = dark ? "filled_black" : "outline"');
  });

  it('en oscuro los inputs usan T.white y la hoja ya era T.white (sin grises fijos)', () => {
    const html = renderModal(true);
    expect(html).toContain('background:#232326');
    expect(html).not.toContain('#1e1e1e');
  });

  it('la caja de error tiene variante oscura (fondo rojo oscuro + texto #FCA5A5)', () => {
    mockAuthState.authErr = 'Algo falló';
    const html = renderModal(true);
    expect(html).toContain('rgba(220,38,38,0.12)');
    expect(html).toContain('#FCA5A5');
    expect(html).not.toContain('#FEF2F2');
  });

  it('en claro la caja de error queda exacta como antes', () => {
    mockAuthState.authErr = 'Algo falló';
    const html = renderModal(false);
    expect(html).toContain('#FEF2F2');
    expect(html).toContain('#DC2626');
    expect(html).not.toContain('rgba(220,38,38,0.12)');
  });

  it('la caja de éxito de recuperación («Revisa tu correo») tiene variante oscura', () => {
    const src = read('../components/AuthModal.jsx');
    expect(src).toContain('background: dark ? "rgba(34,197,94,0.12)" : "#F0FDF4"');
    expect(src).toContain('color: dark ? "#4ADE80" : "#166534"');
  });
});

describe('contraste calculado (WCAG) en modo oscuro', () => {
  it('texto y subtítulo sobre la tarjeta superan 4,5:1', () => {
    expect(contrast(TD.text, TD.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(TD.sub, TD.card)).toBeGreaterThanOrEqual(4.5);
  });

  it('el anillo supera 3:1 contra la tarjeta y contra el botón negro (límite no-texto)', () => {
    const ring = blend([255, 255, 255, 0.35], TD.card);
    expect(contrast(ring, TD.card)).toBeGreaterThanOrEqual(3);
    expect(contrast(ring, '#000000')).toBeGreaterThanOrEqual(3);
  });

  it('el verde de éxito #4ADE80 sobre su fondo oscuro supera 4,5:1', () => {
    const bg = blend([34, 197, 94, 0.12], TD.card);
    expect(contrast('#4ADE80', bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('el rojo claro de error #FCA5A5 sobre su fondo oscuro supera 4,5:1', () => {
    const bg = blend([220, 38, 38, 0.12], TD.card);
    expect(contrast('#FCA5A5', bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('T.red sobre la tarjeta supera 4,5:1 (texto de error en /login)', () => {
    expect(contrast(TD.red, TD.card)).toBeGreaterThanOrEqual(4.5);
  });
});
