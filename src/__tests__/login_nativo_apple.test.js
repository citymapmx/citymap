import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Login nativo con Apple en iOS (src/lib/nativeAppleAuth.js) ───────────────
// Guideline 4.8 de App Store: si la app ofrece login de Google, también
// debe ofrecer "Iniciar sesión con Apple". Solo en iOS nativo.

const mocks = vi.hoisted(() => ({
  isNative: true,
  platform: 'ios',
  initialize: vi.fn(async () => {}),
  login: vi.fn(async () => ({
    provider: 'apple',
    result: {
      idToken: 'id-token-apple-de-prueba',
      accessToken: null,
      profile: {
        user: 'apple-user-1',
        email: 'prueba@privaterelay.appleid.com',
        givenName: 'Prueba',
        familyName: 'Appleseed',
      },
    },
  })),
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: () => mocks.isNative,
    getPlatform: () => mocks.platform,
  },
}));

vi.mock('@capgo/capacitor-social-login', () => ({
  SocialLogin: { initialize: mocks.initialize, login: mocks.login },
}));

import {
  extractAppleIdToken,
  isNativeAppleAuthAvailable,
  signInWithNativeApple,
} from '../lib/nativeAppleAuth.js';
import { __resetNativeGoogleAuthForTests } from '../lib/nativeGoogleAuth.js';

const readSource = (rel) =>
  fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

describe('login nativo con Apple: disponibilidad', () => {
  it('solo está disponible en iOS nativo', () => {
    mocks.isNative = true;
    mocks.platform = 'ios';
    expect(isNativeAppleAuthAvailable()).toBe(true);
    mocks.platform = 'android';
    expect(isNativeAppleAuthAvailable()).toBe(false);
    mocks.platform = 'web';
    expect(isNativeAppleAuthAvailable()).toBe(false);
    mocks.isNative = false;
    mocks.platform = 'ios';
    expect(isNativeAppleAuthAvailable()).toBe(false);
    mocks.isNative = true;
    mocks.platform = 'ios';
  });
});

describe('login nativo con Apple: extractAppleIdToken', () => {
  it('saca el idToken de la respuesta', () => {
    expect(extractAppleIdToken({ idToken: 'abc' })).toBe('abc');
  });
  it('devuelve null si no hay token o no hay respuesta', () => {
    expect(extractAppleIdToken({ idToken: null })).toBe(null);
    expect(extractAppleIdToken({ idToken: '' })).toBe(null);
    expect(extractAppleIdToken(null)).toBe(null);
    expect(extractAppleIdToken(undefined)).toBe(null);
  });
});

describe('login nativo con Apple: signInWithNativeApple', () => {
  beforeEach(() => {
    __resetNativeGoogleAuthForTests();
    mocks.initialize.mockClear();
    mocks.login.mockClear();
  });

  it('llama al plugin con provider apple y scopes nombre+email', async () => {
    const res = await signInWithNativeApple({ socialLogin: undefined }).catch(() => null);
    // La importación dinámica del plugin está mockeada arriba: el flujo
    // real pasa por el mock de SocialLogin.
    expect(res).not.toBe(null);
    expect(res.idToken).toBe('id-token-apple-de-prueba');
    expect(res.profile.givenName).toBe('Prueba');
    expect(mocks.login).toHaveBeenCalledWith({
      provider: 'apple',
      options: { scopes: ['name', 'email'] },
    });
  });

  it('inicializa el plugin con redirectUrl vacío en iOS', async () => {
    await signInWithNativeApple();
    expect(mocks.initialize).toHaveBeenCalled();
    const opts = mocks.initialize.mock.calls[0][0];
    expect(opts.apple).toEqual({ redirectUrl: '' });
    expect(opts.google.webClientId).toContain('apps.googleusercontent.com');
  });

  it('lanza si Apple no devuelve token', async () => {
    mocks.login.mockResolvedValueOnce({ provider: 'apple', result: { idToken: null, profile: null } });
    await expect(signInWithNativeApple()).rejects.toThrow('Apple no devolvió un token de identidad');
  });
});

describe('login con Apple: cableado en la app', () => {
  it('capacitor.config.json tiene apple: true en SocialLogin', () => {
    const cfg = JSON.parse(readSource('../../capacitor.config.json'));
    expect(cfg.plugins.SocialLogin.providers.apple).toBe(true);
    expect(cfg.plugins.SocialLogin.providers.google).toBe(true);
    expect(cfg.appId).toBe('mx.citymap.app');
  });

  it('AuthModal muestra el botón de Apple solo en iOS nativo', () => {
    const src = readSource('../components/AuthModal.jsx');
    expect(src).toContain('Continuar con Apple');
    expect(src).toContain('isNativeAppleAuthAvailable');
    expect(src).toContain('signInWithNativeApple');
    expect(src).toContain('handleAppleIdToken');
  });

  it('el store autentica el token de Apple con Supabase (provider apple)', () => {
    const src = readSource('../store/useAuthStore.js');
    expect(src).toContain('handleAppleIdToken');
    expect(src).toContain("provider: 'apple'");
  });
});

describe('iOS Fase 1: AASA, middleware y proyecto Xcode', () => {
  it('el AASA trae el Team ID real y el bundle id', () => {
    const aasa = JSON.parse(
      readSource('../../public/.well-known/apple-app-site-association'),
    );
    expect(aasa.applinks.details[0].appID).toBe('74S45QN779.mx.citymap.app');
    expect(aasa.applinks.details[0].paths).toEqual(['*']);
  });

  it('el middleware exime el AASA de la redirección 308', () => {
    const src = readSource('../../middleware.js');
    expect(src).toContain("pathname !== '/.well-known/apple-app-site-association'");
  });

  it('vercel.json sirve el AASA como application/json', () => {
    const cfg = JSON.parse(readSource('../../vercel.json'));
    const rule = cfg.headers.find(
      (h) => h.source === '/.well-known/apple-app-site-association',
    );
    expect(rule).toBeDefined();
    expect(rule.headers).toContainEqual({ key: 'Content-Type', value: 'application/json' });
  });

  it('el proyecto Xcode es 1.40 / build 41 con entitlements', () => {
    const pbx = readSource('../../ios/App/App.xcodeproj/project.pbxproj');
    expect(pbx).toContain('MARKETING_VERSION = 1.40;');
    expect(pbx).toContain('CURRENT_PROJECT_VERSION = 41;');
    expect(pbx).toContain('CODE_SIGN_ENTITLEMENTS = App/App.entitlements;');
    expect(pbx).toContain('PRODUCT_BUNDLE_IDENTIFIER = mx.citymap.app;');
    const ent = readSource('../../ios/App/App/App.entitlements');
    for (const d of ['applinks:citymap.mx', 'applinks:www.citymap.mx', 'applinks:citymap.world', 'applinks:www.citymap.world']) {
      expect(ent).toContain(d);
    }
    expect(ent).toContain('com.apple.developer.applesignin');
  });

  it('Info.plist trae los permisos en español y el modo background de push', () => {
    const plist = readSource('../../ios/App/App/Info.plist');
    for (const key of ['NSLocationWhenInUseUsageDescription', 'NSCameraUsageDescription', 'NSPhotoLibraryUsageDescription', 'UIBackgroundModes']) {
      expect(plist).toContain(key);
    }
    expect(plist).toContain('remote-notification');
    expect(plist).toContain('CityMap usa tu ubicación');
  });

  it('el icono 1024 se genera con scripts/generar-icono-ios.py', () => {
    // El PNG (assets/icon-1024.png) no se versiona por CLI: lo genera el
    // script en la Mac a partir de public/apple-touch-icon.png. Aquí solo
    // se verifica que el script exista y use la fuente correcta.
    const script = readSource('../../scripts/generar-icono-ios.py');
    expect(script).toContain('apple-touch-icon.png');
    expect(script).toContain('AppIcon-512@2x.png');
    expect(script).toContain('1024');
  });
});
