// Login nativo de Google en la app Android (Capacitor) con el plugin
// @capgo/capacitor-social-login (sucesor mantenido del plugin archivado
// @codetrix-studio/capacitor-google-auth: mismo linaje, versión 8 para
// Capacitor 8, y usa el Credential Manager de Google en vez de la API
// vieja GoogleSignInClient).
//
// Solo se usa en la app nativa: en web el botón oficial de Google (GIS)
// sigue siendo el único camino y no se toca. El plugin se importa de
// forma dinámica para no meterlo en el bundle web.
//
// El token que devuelve el plugin (idToken) se intercambia con el mismo
// sb.signInWithIdToken que ya usa el botón web, así la sesión de Supabase
// es idéntica por los dos caminos.
//
// Para que funcione, en Google Cloud Console debe existir un cliente
// OAuth de Android (paquete mx.citymap.app + huella SHA-1 del keystore de
// release) en el mismo proyecto que el cliente web de abajo. Sin ese
// cliente, el login nativo falla y el modal cae al respaldo (Custom Tab).
import { Capacitor } from '@capacitor/core';

// Cliente OAuth web de citymap.mx (el mismo que usa el botón oficial GIS).
// Credential Manager exige el ID del cliente WEB aquí, no el de Android.
export const GOOGLE_WEB_CLIENT_ID =
  '128467245162-fjpgeqiqhr4f0p5f430ti0v41jlmuovm.apps.googleusercontent.com';

// El plugin normaliza la cancelación del usuario con code
// 'USER_CANCELLED' (además de varios mensajes que él mismo detecta).
const CANCELLED_PATTERNS = [
  'access_denied',
  'access denied',
  'user_cancelled',
  'user cancelled',
  'user canceled',
  'login cancelled',
  'login canceled',
  'popup closed',
  'window was closed',
];

export function isUserCancelledError(err) {
  if (!err) return false;
  if (err.code === 'USER_CANCELLED') return true;
  const msg = String(err.message || err).toLowerCase();
  return CANCELLED_PATTERNS.some((p) => msg.includes(p));
}

// Solo en la app nativa hay plugin: en web (y en la Custom Tab de
// /login?from=app) no existe y no se debe intentar.
export function isNativeGoogleAuthAvailable() {
  return Capacitor.isNativePlatform();
}

// Saca el idToken de la respuesta del login. En modo 'online' la
// respuesta trae idToken + perfil; en 'offline' solo trae serverAuthCode
// (para backend) y no sirve para iniciar sesión en la app.
export function extractGoogleIdToken(result) {
  if (!result || result.responseType !== 'online') return null;
  const token = result.idToken;
  return typeof token === 'string' && token.length > 0 ? token : null;
}

let initializePromise = null;

function ensureInitialized(socialLogin) {
  if (!initializePromise) {
    initializePromise = socialLogin.initialize({
      google: {
        webClientId: GOOGLE_WEB_CLIENT_ID,
        mode: 'online',
        // En la BridgeActivity estándar el paso extra de autorización se
        // atora: se salta (el accessToken puede quedar en null) y se usa
        // el idToken para autenticar, que es lo que necesita Supabase.
        skipAuthOnlyAuthorizationAfterSignIn: true,
      },
    });
  }
  return initializePromise;
}

// Abre el selector nativo de cuentas de Google y devuelve el idToken.
// Lanza si el usuario cancela, si Google no devuelve token, o si el
// plugin no está configurado (falta el cliente Android en Cloud Console).
// `socialLogin` solo existe para inyectar el plugin en los tests.
export async function signInWithNativeGoogle({ socialLogin } = {}) {
  const plugin =
    socialLogin || (await import('@capgo/capacitor-social-login')).SocialLogin;
  await ensureInitialized(plugin);
  // Sin scopes: en la BridgeActivity estándar los scopes por defecto ya
  // son email + perfil, y pasarlos explícitos hace que el login rechace.
  const { result } = await plugin.login({ provider: 'google', options: {} });
  const idToken = extractGoogleIdToken(result);
  if (!idToken) {
    throw new Error('Google no devolvió un token de identidad');
  }
  return idToken;
}

// Solo para tests: reinicia el initialize cacheado.
export function __resetNativeGoogleAuthForTests() {
  initializePromise = null;
}
