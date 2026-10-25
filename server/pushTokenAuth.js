/* global process */
export async function authenticatePushRequest(req) {
  const bearer = req.headers?.authorization;
  if (!bearer?.startsWith('Bearer ')) return { status: 401, error: 'Debes iniciar sesión' };
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { status: 503, error: 'Servicio no disponible' };
  try {
    const result = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: bearer } });
    const user = await result.json();
    if (!result.ok || !user?.id) return { status: 401, error: 'Sesión inválida' };
    return { userId: user.id, url, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } };
  } catch { return { status: 503, error: 'No se pudo validar la sesión' }; }
}
export function pushCors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method Not Allowed' }); return true; }
  return false;
}
