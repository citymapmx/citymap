// Login nativo con Apple en la app iOS (Capacitor) con el plugin
// @capgo/capacitor-social-login (el mismo que ya usa el login nativo
// de Google en src/lib/nativeGoogleAuth.js).
//
// Solo se usa en iOS nativo: Apple lo exige (App Store Review Guideline
// 4.8) cuando la app ofrece otro login de terceros (Google). En Android
// y en web el botón de Apple NO se muestra.
//
// El plugin devuelve el idToken (JWT de Apple) y se intercambia con el
// mismo sb.signInWithIdToken que ya usa Google, con provider 'apple'.
// El nombre solo lo entrega Apple la PRIMERA vez que el usuario inicia
// sesión (no viene en el idToken): se devuelve en `profile` para que el
// store lo guarde en profiles si aún no tiene nombre.
//
// Para que funcione falta configurar el proveedor Apple en el dashboard
// de Supabase (Auth → Providers → Apple): Service ID, Key ID y llave .p8
// creados en el portal de Apple, y el bundle ID mx.citymap.app en la
// lista de Client IDs. Sin eso, Supabase rechaza el token. Ver el cuerpo
// de la PR de la Fase 1 de iOS.
import { Capacitor } from '@capacitor/core';
import { ensureSocialLoginInitialized } from './nativeGoogleAuth.js';
import { generateNonce, sha256Hex } from './authNonce.js';

// Solo en iOS nativo hay login de Apple: en web (Safari) el flujo web de
// Apple necesitaría Service ID + redirect, y en Android no se ofrece.
export function isNativeAppleAuthAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';
}

// Saca el idToken de la respuesta del login de Apple.
export function extractAppleIdToken(result) {
  if (!result) return null;
  const token = result.idToken;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

// Abre el diálogo nativo de "Iniciar sesión con Apple" y devuelve
// { idToken, profile, nonce }. El nonce sigue el mismo contrato que en
// Google (ver src/lib/authNonce.js): Apple exige que el nonce de la
// petición sea el SHA-256 del nonce raw, y lo devuelve tal cual como
// claim `nonce` del id_token; el raw se pasa a Supabase, que comprueba
// SHA256(raw) == claim. Sin él, Supabase rechazaría el token con el
// mismo error de nonce que el de Google. Lanza si el usuario cancela o
// si Apple no devuelve token. `socialLogin` solo existe para inyectar el
// plugin en los tests.
export async function signInWithNativeApple({ socialLogin } = {}) {
  const plugin =
    socialLogin || (await import('@capgo/capacitor-social-login')).SocialLogin;
  await ensureSocialLoginInitialized(plugin);
  const nonce = generateNonce();
  const hashedNonce = await sha256Hex(nonce);
  const { result } = await plugin.login({
    provider: 'apple',
    options: { scopes: ['name', 'email'], nonce: hashedNonce },
  });
  const idToken = extractAppleIdToken(result);
  if (!idToken) {
    throw new Error('Apple no devolvió un token de identidad');
  }
  return { idToken, profile: result?.profile || null, nonce };
}
