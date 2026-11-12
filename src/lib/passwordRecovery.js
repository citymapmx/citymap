import { sb } from './supabase.js';

// Enlace de recuperación de contraseña: el correo de Supabase lleva al
// usuario a /login?recovery=1, donde crea su contraseña nueva. La página
// /login detecta ese parámetro (el hash con el token lo consume el arranque
// con parseOAuthHash, pero el query queda intacto).
export function buildRecoveryRedirect(origin) {
  return `${origin}/login?recovery=1`;
}

// Envía el correo de restablecimiento al email dado. Valida el formato
// antes de llamar a Supabase; GoTrue no revela si el email existe (devuelve
// 200 aunque no haya cuenta), así que el éxito no confirma el registro.
export async function sendPasswordReset(email) {
  const clean = (email || '').trim().toLowerCase();
  if (!clean || !clean.includes('@')) {
    throw new Error('Ingresa un correo válido');
  }
  return sb.resetPasswordForEmail(clean, buildRecoveryRedirect(window.location.origin));
}
