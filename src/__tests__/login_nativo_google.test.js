import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Login nativo de Google (src/lib/nativeGoogleAuth.js) ────────────────────

const mocks = vi.hoisted(() => ({
  isNative: true,
  initialize: vi.fn(async () => {}),
  login: vi.fn(async () => ({
    result: {
      responseType: 'online',
      idToken: 'id-token-de-prueba',
      accessToken: null,
      profile: {
        email: 'prueba@example.com',
        familyName: '',
        givenName: 'Prueba',
        id: '1',
        name: 'Prueba',
        imageUrl: null,
      },
    },
  })),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => mocks.isNative },
}));

vi.mock('@capgo/capacitor-social-login', () => ({
  SocialLogin: { initialize: mocks.initialize, login: mocks.login },
}));

import {
  GOOGLE_WEB_CLIENT_ID,
  __resetNativeGoogleAuthForTests,
  extractGoogleIdToken,
  isNativeGoogleAuthAvailable,
  isUserCancelledError,
  signInWithNativeGoogle,
} from '../lib/nativeGoogleAuth.js';

const readSource = (rel) =>
  fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('login nativo: constantes y detección', () => {
  it('usa el client ID web de citymap.mx (el de Android NO va aquí)', () => {
    expect(GOOGLE_WEB_CLIENT_ID).toBe(
      '128467245162-fjpgeqiqhr4f0p5f430ti0v41jlmuovm.apps.googleusercontent.com',
    );
  });

  it('solo está disponible en la app nativa', () => {
    mocks.isNative = true;
    expect(isNativeGoogleAuthAvailable()).toBe(true);
    mocks.isNative = false;
    expect(isNativeGoogleAuthAvailable()).toBe(false);
    mocks.isNative = true;
  });

  it('detecta la cancelación del usuario por código y por mensaje', () => {
    const cancelled = new Error('cerrado por el usuario');
    cancelled.code = 'USER_CANCELLED';
    expect(isUserCancelledError(cancelled)).toBe(true);
    expect(isUserCancelledError(new Error('user cancelled'))).toBe(true);
    expect(isUserCancelledError(new Error('Login canceled'))).toBe(true);
    expect(isUserCancelledError(new Error('access_denied'))).toBe(true);
    expect(isUserCancelledError(new Error('Developer console is not set up correctly'))).toBe(false);
    expect(isUserCancelledError(new Error('Network error'))).toBe(false);
    expect(isUserCancelledError(null)).toBe(false);
  });
});

describe('login nativo: extractGoogleIdToken', () => {
  it('saca el idToken de una respuesta online', () => {
    expect(extractGoogleIdToken({ responseType: 'online', idToken: 'abc' })).toBe('abc');
  });
  it('devuelve null si no hay token, si es offline o si no hay respuesta', () => {
    expect(extractGoogleIdToken({ responseType: 'online', idToken: null })).toBe(null);
    expect(extractGoogleIdToken({ responseType: 'online', idToken: '' })).toBe(null);
    expect(extractGoogleIdToken({ responseType: 'offline', serverAuthCode: 'xyz' })).toBe(null);
    expect(extractGoogleIdToken(null)).toBe(null);
    expect(extractGoogleIdToken(undefined)).toBe(null);
  });
});

describe('login nativo: signInWithNativeGoogle', () => {
  beforeEach(() => {
    __resetNativeGoogleAuthForTests();
    mocks.initialize.mockClear();
    mocks.login.mockClear();
    mocks.login.mockImplementation(async () => ({
      result: {
        responseType: 'online',
        idToken: 'id-token-de-prueba',
        accessToken: null,
        profile: { email: 'prueba@example.com', id: '1', name: 'Prueba' },
      },
    }));
  });

  it('inicializa con el client ID web, modo online y sin el paso extra de autorización', async () => {
    await expect(signInWithNativeGoogle()).resolves.toBe('id-token-de-prueba');
    expect(mocks.initialize).toHaveBeenCalledTimes(1);
    expect(mocks.initialize).toHaveBeenCalledWith({
      google: {
        webClientId: GOOGLE_WEB_CLIENT_ID,
        mode: 'online',
        skipAuthOnlyAuthorizationAfterSignIn: true,
      },
    });
  });

  it('inicializa una sola vez aunque se llame dos veces', async () => {
    await signInWithNativeGoogle();
    await signInWithNativeGoogle();
    expect(mocks.initialize).toHaveBeenCalledTimes(1);
    expect(mocks.login).toHaveBeenCalledTimes(2);
  });

  it('pide login de Google sin scopes (en la BridgeActivity estándar rechazan)', async () => {
    await signInWithNativeGoogle();
    expect(mocks.login).toHaveBeenCalledTimes(1);
    expect(mocks.login).toHaveBeenCalledWith({ provider: 'google', options: {} });
    const options = mocks.login.mock.calls[0][0].options;
    expect(options).not.toHaveProperty('scopes');
  });

  it('lanza si Google no devuelve idToken', async () => {
    mocks.login.mockImplementation(async () => ({
      result: { responseType: 'online', idToken: null, accessToken: null, profile: {} },
    }));
    await expect(signInWithNativeGoogle()).rejects.toThrow('token de identidad');
  });

  it('lanza si la respuesta es offline (solo trae serverAuthCode)', async () => {
    mocks.login.mockImplementation(async () => ({
      result: { responseType: 'offline', serverAuthCode: 'codigo' },
    }));
    await expect(signInWithNativeGoogle()).rejects.toThrow('token de identidad');
  });

  it('propaga la cancelación del usuario para que el modal se quede quieto', async () => {
    const err = new Error('User cancelled the sign-in flow');
    err.code = 'USER_CANCELLED';
    mocks.login.mockRejectedValue(err);
    await expect(signInWithNativeGoogle()).rejects.toMatchObject({ code: 'USER_CANCELLED' });
    expect(isUserCancelledError(err)).toBe(true);
  });
});

describe('login nativo: cableado en la app', () => {
  it('AuthModal intenta primero el login nativo y cae al Custom Tab si falla', () => {
    const src = readSource('../components/AuthModal.jsx');
    expect(src).toContain('signInWithNativeGoogle');
    expect(src).toContain('isUserCancelledError');
    expect(src).toContain("sb.signInWithOAuth('google')");
    expect(src).toContain('handleGoogleIdToken(idToken)');
    // El botón nativo vive solo en la rama de app (isNativeApp).
    expect(src).toMatch(/isNativeApp \? \(/);
  });

  it('el botón web de Google (GIS) sigue intacto', () => {
    const src = readSource('../components/AuthModal.jsx');
    expect(src).toContain('ensureGoogleIdentityServices');
    expect(src).toContain('window.google.accounts.id.renderButton');
    expect(src).toContain('window.google.accounts.id.initialize');
    expect(src).toContain('client_id: GOOGLE_CLIENT_ID');
  });

  it('capacitor.config.json deja solo Google habilitado', () => {
    const config = JSON.parse(readSource('../../capacitor.config.json'));
    expect(config.plugins.SocialLogin.providers).toEqual({
      google: true,
      facebook: false,
      apple: false,
      twitter: false,
    });
  });

  it('package.json trae el plugin de Cap-go para Capacitor 8', () => {
    const pkg = JSON.parse(readSource('../../package.json'));
    expect(pkg.dependencies['@capgo/capacitor-social-login']).toMatch(/^\^8\./);
    const lock = JSON.parse(readSource('../../package-lock.json'));
    const entry = lock.packages['node_modules/@capgo/capacitor-social-login'];
    expect(entry.version).toMatch(/^8\./);
    expect(entry.peerDependencies['@capacitor/core']).toContain('8');
  });

  it('el plugin quedó registrado en el proyecto Android', () => {
    const settings = readSource('../../android/capacitor.settings.gradle');
    expect(settings).toContain("include ':capgo-capacitor-social-login'");
    expect(settings).toContain('../node_modules/@capgo/capacitor-social-login/android');
    const build = readSource('../../android/app/capacitor.build.gradle');
    expect(build).toContain("implementation project(':capgo-capacitor-social-login')");
  });

  it('android/app/build.gradle no se tocó (el arreglo del sonido vive ahí en la Mac)', () => {
    const src = readSource('../../android/app/build.gradle');
    expect(src).toContain('citymap_alert.mp3.b64');
    expect(src).not.toContain('capgo');
    expect(src).not.toContain('SocialLogin');
  });
});
