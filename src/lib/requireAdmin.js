/* global process */
// Autorización de administrador para los endpoints de servidor.
//
// El secreto compartido (ADMIN_SECRET) vivía incrustado en el bundle del
// cliente y cualquier visitante podía leerlo y usarlo para mandar push
// masivos o gastar la cuota de Gemini. Ya no se acepta como credencial: el
// admin se verifica por su JWT de sesión contra Supabase Auth. Solo
// autoriza lo que gestiona el servidor:
// app_metadata.isAdmin === true (booleano estricto) o un correo confirmado
// en la lista ADMIN_EMAILS (o admin@cityguide.com). user_metadata NUNCA
// autoriza: la edita el propio usuario.

const SUPABASE_URL_FALLBACK = 'https://dpkjxhjkzdlkvyotoeai.supabase.co';
const ADMIN_EMAIL = 'admin@cityguide.com';

function bearerToken(req) {
  const headers = req?.headers;
  if (!headers) return null;
  const auth = typeof headers.get === 'function'
    ? headers.get('authorization')
    : headers['authorization'];
  if (typeof auth !== 'string') return null;
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

// Verifica el JWT de sesión contra Supabase Auth. Devuelve el usuario o null
// (sin JWT, JWT inválido, Auth caído o sin llave de Supabase).
export async function getAuthUser(req) {
  const token = bearerToken(req);
  if (!token) return null;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK;
  const apiKey = process.env.VITE_SUPABASE_ANON_KEY
    || process.env.SUPABASE_ANON_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey) return null;
  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return null;
    const user = await r.json();
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

// Solo lo que gestiona el servidor autoriza como admin.
export function isAdminUser(user) {
  if (!user) return false;
  if (user?.app_metadata?.isAdmin === true) return true;
  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  const email = typeof user?.email === 'string' ? user.email.toLowerCase() : '';
  return Boolean(user?.email_confirmed_at && email
    && (adminEmails.includes(email) || email === ADMIN_EMAIL));
}

// Para endpoints solo de admin: 401 sin JWT válido, 403 si no es admin.
export async function requireAdmin(req) {
  const user = await getAuthUser(req);
  if (!user) return { ok: false, status: 401 };
  if (!isAdminUser(user)) return { ok: false, status: 403 };
  return { ok: true, userId: user.id };
}
