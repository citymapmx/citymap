import { authenticatePushRequest, pushCors } from '../server/pushTokenAuth.js';
export default async function handler(req, res) {
  if (pushCors(req, res)) return;
  const auth = await authenticatePushRequest(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const { token, city_slug, platform = 'android' } = req.body || {};
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096 || !['web', 'android', 'ios'].includes(platform)) return res.status(400).json({ error: 'Dispositivo inválido' });
  try {
    const filter = encodeURIComponent(token);
    const previous = await fetch(`${auth.url}/rest/v1/push_tokens?select=user_id&token=eq.${filter}`, { headers: auth.headers });
    if (!previous.ok) throw new Error();
    const rows = await previous.json();
    if (rows.some(row => row.user_id && row.user_id !== auth.userId)) return res.status(409).json({ error: 'Este dispositivo debe desvincularse de su cuenta anterior' });
    const endpoint = rows.length ? `${auth.url}/rest/v1/push_tokens?token=eq.${filter}&or=(user_id.is.null,user_id.eq.${encodeURIComponent(auth.userId)})` : `${auth.url}/rest/v1/push_tokens`;
    const response = await fetch(endpoint, {
      method: rows.length ? 'PATCH' : 'POST', headers: auth.headers,
      body: JSON.stringify({ token, user_id: auth.userId, city_slug: typeof city_slug === 'string' ? city_slug.slice(0, 120) : null, platform, updated_at: new Date().toISOString() })
    });
    if (!response.ok) throw new Error();
    return res.status(200).json({ success: true });
  } catch { return res.status(500).json({ error: 'No se pudo registrar el dispositivo' }); }
}
