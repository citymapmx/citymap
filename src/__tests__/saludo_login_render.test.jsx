import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import AuthModal from '../components/AuthModal.jsx';
import AppLoginView from '../views/AppLoginView.jsx';

// Los componentes leen el store con useSyncExternalStore: en
// renderToStaticMarkup el snapshot es el estado INICIAL, así que el estado
// del modal se mockea aquí (el comportamiento real del store se prueba en
// saludo_login_primer_vez.test.jsx, con el store de verdad).
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

const T = {
  text: '#111', sub: '#666', bg: '#fff', white: '#fff', border: '#eee',
  green: '#000', greenL: '#EDE9FE', red: '#DC2626', dark: false,
};

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

function renderModal() {
  return renderToStaticMarkup(
    <AuthModal T={T} dark={false} cities={[]} doAuth={vi.fn()} />
  );
}

describe('saludo del modal', () => {
  it('primera vez en registro saluda «¡Bienvenido a CityMap!»', () => {
    mockAuthState.authMode = 'register';
    const html = renderModal();
    expect(html).toContain('¡Bienvenido a CityMap!');
    expect(html).not.toContain('¡Hola de nuevo!');
  });

  it('con marca, en registro saluda «Únete a CityMap» como antes', () => {
    globalThis.localStorage.setItem('cg_has_account', '1');
    mockAuthState.authMode = 'register';
    const html = renderModal();
    expect(html).toContain('Únete a CityMap');
    expect(html).not.toContain('¡Bienvenido a CityMap!');
  });

  it('en login saluda «¡Hola de nuevo!»', () => {
    const html = renderModal();
    expect(html).toContain('¡Hola de nuevo!');
  });
});

describe('opción A en el modal', () => {
  it('en carga muestra el placeholder neutro, no un segundo botón de Google', () => {
    const html = renderModal();
    expect(html).toContain('Cargando el botón de Google');
    expect(html).not.toContain('Continuar con Google');
  });
});

describe('ojo de contraseña', () => {
  it('en login el campo empieza oculto con el botón «Mostrar contraseña»', () => {
    const html = renderModal();
    expect(html).toContain('type="password"');
    expect(html).toContain('Mostrar contraseña');
    expect(html).not.toContain('Ocultar contraseña');
  });

  it('en registro también hay ojo para ver la contraseña', () => {
    mockAuthState.authMode = 'register';
    const html = renderModal();
    expect(html).toContain('type="password"');
    expect(html).toContain('Mostrar contraseña');
  });
});

describe('¿Olvidaste tu contraseña?', () => {
  it('en login aparece el enlace', () => {
    const html = renderModal();
    expect(html).toContain('¿Olvidaste tu contraseña?');
  });

  it('en registro no aparece el enlace', () => {
    mockAuthState.authMode = 'register';
    const html = renderModal();
    expect(html).not.toContain('¿Olvidaste tu contraseña?');
  });
});

describe('/login sin splash: la tarjeta sale de inmediato', () => {
  it('muestra la tarjeta con el logo oficial sobre fondo negro, sin splash ni parpadeo, y conserva Cancelar', () => {
    const html = renderToStaticMarkup(
      <AppLoginView T={T} dark={false} navigate={vi.fn()} />
    );
    // La tarjeta es el encabezado: logo oficial (no el emoji 📍) + subtítulo.
    expect(html).toContain('/logo-brand.png');
    expect(html).not.toContain('📍');
    expect(html).toContain('Inicia sesión para continuar');
    expect(html).toContain('Cancelar');
    // Sin splash de carga: nada de la marca del splash.
    expect(html).not.toContain('Cargando CityMap');
    // Fondo negro detrás de la tarjeta.
    expect(html).toContain('background:#000');
    expect(html).not.toContain('Cargando el botón de Google');
    expect(html).not.toContain('Continuar con Google');
  });
});

describe('/login con enlace de recuperación', () => {
  it('con ?recovery=1 muestra el formulario de contraseña nueva, no el botón de Google', () => {
    globalThis.window.location.search = '?recovery=1';
    const html = renderToStaticMarkup(
      <AppLoginView T={T} dark={false} navigate={vi.fn()} />
    );
    expect(html).toContain('Crea tu contraseña nueva');
    expect(html).toContain('Actualizar contraseña');
    // El logo es el encabezado de la tarjeta y se ve también en recuperación.
    expect(html).toContain('/logo-brand.png');
    expect(html).not.toContain('Continuar con Google');
  });

  it('sin ?recovery=1 no muestra el formulario de recuperación', () => {
    const html = renderToStaticMarkup(
      <AppLoginView T={T} dark={false} navigate={vi.fn()} />
    );
    expect(html).not.toContain('Crea tu contraseña nueva');
    expect(html).not.toContain('Actualizar contraseña');
  });
});
