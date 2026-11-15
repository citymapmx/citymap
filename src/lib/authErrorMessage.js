// ── Errores de autenticación: mensajes amigables para el usuario ────────────
// Los errores crudos (Supabase, Apple, Google, red) llegan con detalle
// técnico en inglés — tokens, client IDs, códigos de NSError — que en el
// modal del iPhone desbordaban la caja y no le decían nada al usuario.
// mapAuthError traduce por subcadenas (en minúsculas) a un mensaje corto
// en español. El detalle técnico NO se muestra: quien llama debe mandarlo
// a console.error. Los mensajes que ya son amigables en español
// (los produce src/lib/supabase.js) pasan tal cual, sin reescribirse.

const FRIENDLY_ES = new Set([
  "Email o contraseña incorrectos",
  "Confirma tu email antes de iniciar sesión",
  "Revisa tu email para confirmar la cuenta antes de entrar",
  "Por favor ingresa tu nombre y elige tu ciudad",
  "No se pudo obtener el usuario",
  "Tu contraseña debe cumplir todos los requisitos",
  "Ingresa un correo válido",
  "No se pudo enviar el correo. Inténtalo de nuevo.",
  "No se pudo enviar el correo de recuperación",
  "No se pudo iniciar sesión, intenta de nuevo",
  "No hay sesión activa",
]);

const FRIENDLY_PREFIXES = [
  "Error al iniciar sesión",
  "No se pudo iniciar sesión con",
  "Error al registrarse",
];

const GENERIC = "Algo salió mal. Inténtalo de nuevo.";

/**
 * Traduce un error de autenticación a un mensaje corto en español.
 * @param {unknown} err - Error, string o cualquier valor lanzado.
 * @param {'google' | 'apple' | string} [provider] - Proveedor, para
 *   desambiguar los mensajes que no nombran al proveedor.
 * @returns {string} Mensaje listo para mostrar en el modal.
 */
export function mapAuthError(err, provider) {
  const raw = err instanceof Error ? err.message : typeof err === "string" ? err : err?.message;
  const msg = String(raw ?? "").trim();
  if (!msg) return GENERIC;
  if (FRIENDLY_ES.has(msg)) return msg;
  if (FRIENDLY_PREFIXES.some((p) => msg.startsWith(p))) return msg;

  const lower = msg.toLowerCase();
  const prov = String(provider || "").toLowerCase();

  // Google (fix #344): Supabase rechaza el id_token cuando su audiencia
  // no es el cliente web. El token crudo nunca debe llegar al usuario.
  if (lower.includes("unacceptable audience in id_token")) {
    return "No pudimos conectar con Google. Cierra la app y vuelve a intentarlo.";
  }
  // Apple: el error 1000 ocurre dentro de ASAuthorizationController, antes
  // de emitir token; es un fallo de conexión con Apple, no de la cuenta.
  if (
    lower.includes("authorizationerror error 1000") ||
    lower.includes("the operation couldn't be completed")
  ) {
    return "No pudimos conectar con Apple. Revisa tu conexión e inténtalo de nuevo.";
  }
  // El plugin nativo no devolvió token de identidad.
  if (lower.includes("no devolvió un token")) {
    const brand = lower.includes("apple") || prov === "apple"
      ? "Apple"
      : lower.includes("google") || prov === "google"
        ? "Google"
        : null;
    return brand
      ? `No recibimos tus datos de ${brand}. Inténtalo de nuevo.`
      : "No recibimos tus datos. Inténtalo de nuevo.";
  }
  if (lower.includes("invalid apple id token") || lower.includes("invalid id token")) {
    return "No pudimos verificar tu cuenta. Inténtalo de nuevo.";
  }
  if (lower.includes("user already registered")) {
    return "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.";
  }
  if (
    lower.includes("email rate limit exceeded") ||
    lower.includes("too many requests") ||
    lower.includes("rate limit")
  ) {
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }
  if (lower.includes("unable to validate email address") || lower.includes("invalid email")) {
    return "Ingresa un correo válido.";
  }
  if (
    lower.includes("failed to fetch") ||
    lower.includes("network request failed") ||
    lower.includes("load failed") ||
    lower.includes("networkerror")
  ) {
    return "Sin conexión a internet. Revisa tu conexión e inténtalo de nuevo.";
  }
  if (lower.includes("password should be at least")) {
    return "Tu contraseña debe tener al menos 8 caracteres.";
  }
  // Crudos de Supabase en inglés que normalmente ya traduce supabase.js;
  // por si alguno llega sin traducir, se mapean igual.
  if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
    return "Email o contraseña incorrectos";
  }
  if (lower.includes("email not confirmed") || lower.includes("not confirmed")) {
    return "Confirma tu email antes de iniciar sesión";
  }
  return GENERIC;
}

export default mapAuthError;
