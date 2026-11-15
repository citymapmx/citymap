import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Nonce OIDC para el login nativo (src/lib/authNonce.js) ──────────────────
// Regla de GoTrue (logs de Auth de Supabase, 14 Nov 22:39): el nonce pasado
// y el claim `nonce` del id_token deben existir los dos o ninguno; si
// existen, el claim debe ser el SHA-256 en hex del nonce pasado. La app
// no pasaba ningún nonce y el token de Google sí traía claim → rechazo.

import {
  generateNonce,
  getIdTokenNonceClaim,
  nonceForIdToken,
  sha256Hex,
} from '../lib/authNonce.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { sb } from '../lib/supabase.js';

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

function makeStorage() {
  const store = new Map();
  return {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

// JWT falso (firma falsa, payload real) para probar la lectura del claim.
// Sin Buffer (no existe en el navegador): base64url manual con btoa.
function fakeIdToken(payload) {
  const b64 = (o) => {
    const binary = [...new TextEncoder().encode(JSON.stringify(o))]
      .map((b) => String.fromCharCode(b))
      .join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };
  return `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64(payload)}.firma-falsa`;
}

beforeEach(() => {
  globalThis.localStorage = makeStorage();
  useAuthStore.setState({
    user: null, profile: null, showAuth: false, authMode: 'login',
    authForm: { name: '', email: '', password: '', city: '' },
    authLoading: false, authErr: '',
  });
  vi.clearAllMocks();
  sb.signInWithIdToken.mockResolvedValue({ user: { id: 'u1' } });
  sb.get.mockResolvedValue([]);
  sb.patch.mockResolvedValue([]);
});

describe('authNonce: generateNonce', () => {
  it('devuelve 43 caracteres base64url (32 bytes aleatorios)', () => {
    const n = generateNonce();
    expect(n).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('cada llamada genera un nonce distinto', () => {
    const seen = new Set(Array.from({ length: 20 }, () => generateNonce()));
    expect(seen.size).toBe(20);
  });
});

describe('authNonce: sha256Hex', () => {
  it('coincide con los vectores conocidos de SHA-256', async () => {
    await expect(sha256Hex('')).resolves.toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    await expect(sha256Hex('abc')).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('devuelve 64 caracteres hex en minúsculas', async () => {
    const h = await sha256Hex('un-nonce-cualquiera');
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('authNonce: getIdTokenNonceClaim', () => {
  it('lee el claim nonce del payload del id_token', () => {
    const tok = fakeIdToken({ sub: '123', nonce: 'abc123hash' });
    expect(getIdTokenNonceClaim(tok)).toBe('abc123hash');
  });

  it('devuelve null si el token no trae claim nonce', () => {
    expect(getIdTokenNonceClaim(fakeIdToken({ sub: '123' }))).toBe(null);
    expect(getIdTokenNonceClaim(fakeIdToken({ sub: '123', nonce: '' }))).toBe(null);
  });

  it('devuelve null y nunca lanza con tokens mal formados', () => {
    expect(getIdTokenNonceClaim(null)).toBe(null);
    expect(getIdTokenNonceClaim(undefined)).toBe(null);
    expect(getIdTokenNonceClaim('')).toBe(null);
    expect(getIdTokenNonceClaim('no-es-un-jwt')).toBe(null);
    expect(getIdTokenNonceClaim('a.b')).toBe(null);
    expect(getIdTokenNonceClaim('a.!!!.c')).toBe(null);
    expect(getIdTokenNonceClaim('a.bm8tLWpzb24.c')).toBe(null); // payload no es JSON
    expect(getIdTokenNonceClaim(fakeIdToken({ sub: '123', nonce: 42 }))).toBe(null);
  });
});

describe('authNonce: nonceForIdToken', () => {
  const tokenConNonce = fakeIdToken({ sub: '123', nonce: 'hash-del-nonce' });
  const tokenSinNonce = fakeIdToken({ sub: '123' });

  it('pasa el nonce generado cuando el token trae claim nonce', () => {
    expect(nonceForIdToken(tokenConNonce, 'raw-generado')).toBe('raw-generado');
  });

  it('no pasa nonce cuando el token NO trae claim nonce (ambos ausentes)', () => {
    expect(nonceForIdToken(tokenSinNonce, 'raw-generado')).toBe(undefined);
  });

  it('no pasa nonce cuando no se generó ninguno', () => {
    expect(nonceForIdToken(tokenConNonce, undefined)).toBe(undefined);
    expect(nonceForIdToken(tokenSinNonce, undefined)).toBe(undefined);
  });
});

describe('store: el nonce llega a Supabase solo si el token trae claim', () => {
  it('Google: token con claim nonce → se pasa el nonce raw', async () => {
    const tok = fakeIdToken({ sub: '123', nonce: 'hash-del-nonce' });
    const uid = await useAuthStore.getState().handleGoogleIdToken(tok, 'raw-generado');
    expect(uid).toBe('u1');
    expect(sb.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: tok,
      nonce: 'raw-generado',
    });
  });

  it('Google: token sin claim nonce → NO se pasa nonce (flujo web GIS, intacto)', async () => {
    const tok = fakeIdToken({ sub: '123' });
    await useAuthStore.getState().handleGoogleIdToken(tok);
    expect(sb.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: tok,
      nonce: undefined,
    });
  });

  it('Google: token sin claim aunque se haya generado nonce → NO se pasa', async () => {
    const tok = fakeIdToken({ sub: '123' });
    await useAuthStore.getState().handleGoogleIdToken(tok, 'raw-generado');
    expect(sb.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'google',
      token: tok,
      nonce: undefined,
    });
  });

  it('Apple: token con claim nonce → se pasa el nonce raw', async () => {
    const tok = fakeIdToken({ sub: '123', nonce: 'hash-del-nonce' });
    const uid = await useAuthStore.getState().handleAppleIdToken(tok, { givenName: 'Prueba' }, 'raw-generado');
    expect(uid).toBe('u1');
    expect(sb.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: tok,
      nonce: 'raw-generado',
    });
  });

  it('Apple: token sin claim nonce → NO se pasa nonce', async () => {
    const tok = fakeIdToken({ sub: '123' });
    await useAuthStore.getState().handleAppleIdToken(tok, null);
    expect(sb.signInWithIdToken).toHaveBeenCalledWith({
      provider: 'apple',
      token: tok,
      nonce: undefined,
    });
  });
});
