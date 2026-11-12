import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { useAuthStore } from '../store/useAuthStore.js';
import { sb } from '../lib/supabase.js';
import { markDeviceHasAccount, deviceHasAccount, HAS_ACCOUNT_KEY } from '../lib/hasAccountFlag.js';

// El store habla con Supabase: aquí todo va mockeado, sin red.
vi.mock('../lib/supabase.js', () => ({
  sb: {
    signIn: vi.fn(),
    signUp: vi.fn(),
    signInWithIdToken: vi.fn(),
    getUser: vi.fn(),
    patch: vi.fn(),
    get: vi.fn(),
    signOut: vi.fn(),
    signInWithOAuth: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
  },
}));

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const T = {
  text: '#111', sub: '#666', bg: '#fff', white: '#fff', border: '#eee',
  green: '#000', greenL: '#EDE9FE', red: '#DC2626', dark: false,
};

function makeStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

let storage;

beforeEach(() => {
  storage = makeStorage();
  globalThis.localStorage = storage;
  globalThis.window = {
    location: { search: '', origin: 'https://citymap.mx' },
    matchMedia: () => ({ matches: false }),
    google: undefined,
  };
  useAuthStore.setState({
    user: null, profile: null, showAuth: false, authMode: 'login',
    authForm: { name: '', email: '', password: '', city: '' },
    authLoading: false, authErr: '',
  });
  vi.clearAllMocks();
});

describe('saludo según primera vez', () => {
  it('sin marca, abrir el modal lo pone en registro', () => {
    expect(deviceHasAccount()).toBe(false);
    useAuthStore.getState().setShowAuth(true);
    expect(useAuthStore.getState().authMode).toBe('register');
  });

  it('con marca, abrir el modal lo pone en login', () => {
    markDeviceHasAccount();
    useAuthStore.getState().setShowAuth(true);
    expect(useAuthStore.getState().authMode).toBe('login');
  });

  it('el cambio manual de modo no se pisa mientras el modal está abierto', () => {
    useAuthStore.getState().setShowAuth(true);
    expect(useAuthStore.getState().authMode).toBe('register');
    useAuthStore.getState().setAuthMode('login');
    // Otro setShowAuth(true) con el modal ya abierto no reinicia el modo.
    useAuthStore.getState().setShowAuth(true);
    expect(useAuthStore.getState().authMode).toBe('login');
  });

  it('login por email marca el dispositivo', async () => {
    sb.signIn.mockResolvedValue({ user: { id: 'u1' } });
    sb.get.mockResolvedValue([]);
    useAuthStore.setState({
      authMode: 'login',
      authForm: { name: '', email: 'a@b.c', password: 'x', city: '' },
    });
    const id = await useAuthStore.getState().handleAuth();
    expect(id).toBe('u1');
    expect(deviceHasAccount()).toBe(true);
  });

  it('login con Google marca el dispositivo', async () => {
    sb.signInWithIdToken.mockResolvedValue({ user: { id: 'u2' } });
    sb.get.mockResolvedValue([]);
    const id = await useAuthStore.getState().handleGoogleIdToken('tok');
    expect(id).toBe('u2');
    expect(deviceHasAccount()).toBe(true);
  });

  it('cerrar sesión NO borra la marca', async () => {
    useAuthStore.getState().setUser({ id: 'u1' });
    expect(deviceHasAccount()).toBe(true);
    await useAuthStore.getState().handleSignOut();
    expect(useAuthStore.getState().user).toBeNull();
    expect(deviceHasAccount()).toBe(true);
  });
});

describe('opción A: solo citymap.mx, sin respaldo por Supabase', () => {
  it('el modal web no tiene botón de respaldo: un solo llamado a signInWithOAuth (la rama nativa)', () => {
    const src = read('../components/AuthModal.jsx');
    const hits = (src.match(/signInWithOAuth/g) || []).length;
    expect(hits).toBe(1);
    expect(src).toContain('modal_cargando_boton_google');
  });

  it('la página /login no llama a signInWithOAuth y el respaldo solo existe en la app nativa', () => {
    const src = read('../views/AppLoginView.jsx');
    expect(src).not.toContain('signInWithOAuth');
    expect(src).toContain('gisTimedOut && !gisReady && fromApp');
  });

  it('la librería conserva signInWithOAuth para la app nativa', () => {
    const src = read('../lib/supabase.js');
    expect(src).toContain('signInWithOAuth');
    expect(src).toContain("login?from=app");
  });
});

describe('ojo de contraseña', () => {
  it('el modal alterna el tipo del campo y el aria-label (login y registro)', () => {
    const src = read('../components/AuthModal.jsx');
    expect(src).toContain('type={showPw ? "text" : "password"}');
    expect(src).toContain('setShowPw');
    expect(src).toContain('modal_mostrar_contrasena');
    expect(src).toContain('modal_ocultar_contrasena');
    expect(src).toContain('"eyeOff"');
    expect(src).toContain('"eye"');
    expect(src).toContain('padding: "14px 48px 14px 42px"');
  });

  it('el icono eyeOff existe en la librería de iconos', () => {
    const src = read('../components/ui/Icon.jsx');
    expect(src).toContain('eyeOff');
  });
});

describe('¿Olvidaste tu contraseña?', () => {
  it('el modal tiene el enlace solo en login y el flujo de envío', () => {
    const src = read('../components/AuthModal.jsx');
    expect(src).toContain('modal_olvidaste_contrasena');
    expect(src).toContain('sendPasswordReset');
    expect(src).toContain('modal_revisa_correo');
    expect(src).toContain('modal_recuperacion_enviada');
    expect(src).toContain('modal_volver_inicio_sesion');
  });

  it('sendPasswordReset manda el correo con el enlace de vuelta a /login?recovery=1', async () => {
    const { sendPasswordReset, buildRecoveryRedirect } = await import('../lib/passwordRecovery.js');
    expect(buildRecoveryRedirect('https://citymap.mx')).toBe('https://citymap.mx/login?recovery=1');
    sb.resetPasswordForEmail.mockResolvedValue({});
    await sendPasswordReset('  Usuario@Citymap.MX ');
    expect(sb.resetPasswordForEmail).toHaveBeenCalledWith(
      'usuario@citymap.mx',
      'https://citymap.mx/login?recovery=1'
    );
  });

  it('sendPasswordReset rechaza sin correo válido', async () => {
    const { sendPasswordReset } = await import('../lib/passwordRecovery.js');
    await expect(sendPasswordReset('')).rejects.toThrow();
    await expect(sendPasswordReset('sin-arroba')).rejects.toThrow();
    expect(sb.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('la librería tiene los helpers de recuperación con los endpoints de Supabase', () => {
    const src = read('../lib/supabase.js');
    expect(src).toContain('resetPasswordForEmail');
    expect(src).toContain('/recover');
    expect(src).toContain('updateUser');
    expect(src).toContain('method: "PUT"');
  });
});

describe('recuperación en /login', () => {
  it('la página detecta ?recovery=1 y muestra el formulario de contraseña nueva', () => {
    const src = read('../views/AppLoginView.jsx');
    expect(src).toContain("get('recovery') === '1'");
    expect(src).toContain('updateUser');
    expect(src).toContain('modal_actualizar_contrasena');
    expect(src).toContain('modal_contrasenas_no_coinciden');
    expect(src).toContain('modal_enlace_expirado');
    expect(src).toContain('modal_contrasena_actualizada');
    expect(src).toContain('checkPassword');
  });
});

