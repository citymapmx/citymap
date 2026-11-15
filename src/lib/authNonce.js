// Nonce OIDC para el login nativo con Google y Apple — evita que Supabase
// rechace el id_token con «Passed nonce and nonce in id_token should
// either both exist or not» (logs de Auth de Supabase, 14 Nov 22:39).
//
// El problema: la app no pasaba ningún nonce a Supabase, pero el id_token
// que devuelve el login nativo SÍ trae un claim `nonce`. GoTrue
// (supabase/auth, internal/api/token_oidc.go) exige que el nonce pasado y
// el claim del token existan los dos o no exista ninguno, y si existen,
// que el claim sea el SHA-256 en hex del nonce pasado:
//   SHA256hex(params.nonce) == id_token.nonce
//
// El contrato es el documentado por Supabase para el login nativo:
//  - la app genera un nonce aleatorio (raw) por cada intento de login;
//  - al IdP se le pasa el SHA-256 en hex de ese nonce (el plugin lo acepta
//    en `options.nonce`, en iOS —GIDSignIn— y en Android —Credential
//    Manager—; Google y Apple lo devuelven tal cual como claim `nonce`
//    del id_token);
//  - a Supabase se le pasa el nonce RAW (signInWithIdToken), y GoTrue
//    comprueba que su SHA-256 coincide con el claim del token.
//  - si el token NO trae claim `nonce`, no se pasa ninguno: ambos
//    ausentes también es válido para GoTrue. Eso cubre el login web con
//    GIS, cuyos tokens no llevan nonce y cuyo flujo no se toca.
//
// NUNCA se desactiva la validación: «Skip nonce checks» sigue apagado en
// Supabase y este archivo no toca ninguna configuración del backend.

const NONCE_BYTES = 32;

// Genera un nonce aleatorio (32 bytes, base64url sin padding, 43 chars).
// Usa crypto.getRandomValues: un nonce predecible anularía la protección
// contra replay, así que si no hay crypto disponible se lanza un error
// claro en vez de degradar a Math.random.
export function generateNonce() {
  const cryptoObj = globalThis.crypto;
  if (!cryptoObj || typeof cryptoObj.getRandomValues !== 'function') {
    throw new Error('crypto.getRandomValues no está disponible para generar el nonce');
  }
  const bytes = new Uint8Array(NONCE_BYTES);
  cryptoObj.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

function base64UrlEncode(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  // btoa existe en navegadores y en Node (global). Sin Buffer: el código
  // corre igual en el WebView de Capacitor y en la web.
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// SHA-256 en hexadecimal (minúsculas) de un string UTF-8. Requiere
// crypto.subtle (contexto seguro: WebView de Capacitor, https y
// localhost lo son). El login es asíncrono, así que el digest asíncrono
// no cambia el flujo.
export async function sha256Hex(value) {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || typeof subtle.digest !== 'function') {
    throw new Error('crypto.subtle no está disponible para calcular el hash del nonce');
  }
  const digest = await subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Lee el claim `nonce` del payload de un id_token (JWT), sin verificar la
// firma (la verificación la hace Supabase). Devuelve el claim si es un
// string no vacío y null en cualquier otro caso (token mal formado,
// sin claim, claim no string). Nunca lanza.
export function getIdTokenNonceClaim(idToken) {
  try {
    if (typeof idToken !== 'string') return null;
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    const payloadJson = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson);
    const nonce = payload?.nonce;
    return typeof nonce === 'string' && nonce.length > 0 ? nonce : null;
  } catch {
    return null;
  }
}

// Decide qué nonce pasar a Supabase para un id_token dado, según la regla
// de GoTrue («ambos o ninguno»):
//  - si el token trae claim `nonce`, se pasa el nonce generado (el raw;
//    GoTrue comprueba SHA256(raw) == claim);
//  - si el token NO trae claim, no se pasa nada (undefined) aunque se
//    haya generado uno: pasar uno rompería con el mismo error.
// El login web (GIS) no genera nonce y sus tokens no traen claim: sigue
// pasando undefined, como hasta ahora.
export function nonceForIdToken(idToken, generatedNonce) {
  if (!generatedNonce) return undefined;
  return getIdTokenNonceClaim(idToken) ? generatedNonce : undefined;
}
