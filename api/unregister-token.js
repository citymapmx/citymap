import { authenticatePushRequest, pushCors } from '../server/pushTokenAuth.js';
export default async function handler(req, res) {
  if (pushCors(req, res)) return;
  const auth = await authenticatePushRequest(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const { token } = req.body || {};
  if (typeof token !== 'string' || token.length < 20 || token.length > 4096) return res.status(400).json({ error: 'Dispositivo inválido' });
  try {
    const response = await fetch(`${auth.url}/rest/v1/push_tokens?token=eq.${encodeURIComponent(token)}&user_id=eq.${encodeURIComponent(auth.userId)}`, { method: 'DELETE', headers: auth.headers });
    if (!response.ok) throw new Error();
    return res.status(200).json({ success: true });
  } catch { return res.status(500).json({ error: 'No se pudo desvincular el dispositivo' }); }
}
