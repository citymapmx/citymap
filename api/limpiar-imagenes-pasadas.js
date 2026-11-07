/* global process */
// Limpieza automática de imágenes de eventos pasados.
// La invoca el cron de Vercel (vercel.json) el día 1 de cada mes a las 09:00 CST.
// Borra del bucket `media` (carpeta cityguide/) la foto de los eventos cuyo
// último día terminó hace más de `graceDays` (30 por defecto) y deja img_url
// en NULL en la fila, para que la página no muestre una imagen rota.
// El evento, su texto y su lugar en Google quedan intactos.
// Auth: Vercel envía Authorization: Bearer <CRON_SECRET> en las llamadas del cron.

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dpkjxhjkzdlkvyotoeai.supabase.co';
const BUCKET = 'media';
const FOLDER = 'cityguide/';

const dateOnly = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? value : null;
const lastDayOf = event => {
  const start = dateOnly(event.date);
  const end = dateOnly(event.end_date);
  return end && (!start || end >= start) ? end : start;
};
const todayInMexicoCity = () => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = type => parts.find(p => p.type === type).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};
const shiftDays = (iso, days) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};
// Solo acepta imágenes de nuestro Storage, dentro de media/cityguide/.
const storagePathOf = url => {
  try {
    const u = new URL(url);
    const prefix = `/storage/v1/object/public/${BUCKET}/${FOLDER}`;
    if (u.hostname !== new URL(SUPABASE_URL).hostname || !u.pathname.startsWith(prefix)) return null;
    return decodeURIComponent(u.pathname.slice(`/storage/v1/object/public/${BUCKET}/`.length));
  } catch { return null; }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  // El cron de Vercel llama con GET; las pruebas manuales pueden usar POST.
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return res.status(500).json({ error: 'CRON_SECRET no configurado' });
  const auth = req.headers['authorization'] || '';
  const bodySecret = req.body?.secret;
  if (auth !== `Bearer ${cronSecret}` && bodySecret !== cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || SUPABASE_URL;
  if (!serviceRoleKey) return res.status(500).json({ error: 'Supabase env vars missing' });

  const dry = req.query?.dry === '1' || req.body?.dry === true;
  const graceDays = Math.min(365, Math.max(0, parseInt(req.query?.graceDays ?? req.body?.graceDays ?? 30, 10) || 30));
  const cutoff = shiftDays(todayInMexicoCity(), -graceDays);
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

  try {
    // 1. Eventos aprobados con imagen en Storage.
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const r = await fetch(`${supabaseUrl}/rest/v1/events?select=id,slug,title,date,end_date,img_url,img&status=eq.approved&order=id.asc&limit=1000&offset=${offset}`, { headers });
      if (!r.ok) throw new Error(`PostgREST events: HTTP ${r.status}`);
      const batch = await r.json();
      rows.push(...batch);
      if (batch.length < 1000) break;
    }
    const candidates = rows
      .map(ev => ({ ev, path: storagePathOf(ev.img_url || ev.img) }))
      .filter(({ ev, path }) => path && (lastDayOf(ev) || '') < cutoff);

    const deleted = [];
    const failed = [];
    for (const { ev, path } of candidates) {
      if (dry) { deleted.push({ slug: ev.slug, path, dry: true }); continue; }
      const del = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${path}`, { method: 'DELETE', headers });
      if (!del.ok) { failed.push({ slug: ev.slug, path, error: `Storage DELETE: HTTP ${del.status}` }); continue; }
      const patch = await fetch(`${supabaseUrl}/rest/v1/events?id=eq.${ev.id}`, {
        method: 'PATCH',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ img_url: null, img: null }),
      });
      if (!patch.ok) { failed.push({ slug: ev.slug, path, error: `PostgREST PATCH: HTTP ${patch.status}` }); continue; }
      deleted.push({ slug: ev.slug, path });
    }
    return res.status(200).json({ ok: true, dry, cutoff, graceDays, checked: rows.length, candidates: candidates.length, deleted, failed });
  } catch (err) {
    console.error('limpiar-imagenes-pasadas error:', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
