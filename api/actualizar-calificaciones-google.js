/* global process */
// Refresco mensual de calificaciones de Google para las tarjetas.
// La invoca el cron de Vercel (vercel.json) el día 1 de cada mes a las 04:00 CST.
// Pide a Places API (New) SOLO rating + userRatingCount (sin textos de
// reseñas: es la categoría Enterprise, $20 por cada 1,000 llamadas, con
// 1,000 gratis al mes; ~209 negocios con place_id = $0). El dato se guarda
// en public.google_ratings_cache con vencimiento a 30 días: por reglas de
// Google la calificación no se guarda fija en businesses, solo en caché
// con expiración, y el front solo lee filas vigentes. Las reseñas propias
// de CityMap no se tocan. Auth: Vercel envía Authorization: Bearer
// <CRON_SECRET> en las llamadas del cron (misma clave que
// limpiar-imagenes-pasadas). Llave de Google: GOOGLE_PLACES_API_KEY
// (llave de servidor restringida a Places API, en Vercel).

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dpkjxhjkzdlkvyotoeai.supabase.co';
const PLACES_URL = 'https://places.googleapis.com/v1/places';
const CACHE_TTL_DAYS = 30;
const CONCURRENCY = 10;

const shiftDays = (iso, days) => {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
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
  const limit = Math.max(1, parseInt(req.query?.limit ?? req.body?.limit ?? 1000, 10) || 1000);
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!dry && !googleKey) return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY no configurado' });

  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

  try {
    // 1. Negocios aprobados con place_id de Google.
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const r = await fetch(`${supabaseUrl}/rest/v1/businesses?select=id,social_links&status=eq.approved&order=id.asc&limit=1000&offset=${offset}`, { headers });
      if (!r.ok) throw new Error(`PostgREST businesses: HTTP ${r.status}`);
      const batch = await r.json();
      rows.push(...batch);
      if (batch.length < 1000) break;
    }
    const targets = rows
      .map(b => ({ id: b.id, placeId: b.social_links?.google_place_id || null }))
      .filter(t => t.placeId)
      .slice(0, limit);

    if (dry) {
      return res.status(200).json({ ok: true, dry: true, checked: rows.length, withPlaceId: targets.length, wouldRefresh: targets.map(t => t.id) });
    }

    // 2. Borrar filas vencidas (el caché nunca guarda datos de más de 30 días).
    let deletedExpired = 0;
    const nowIso = new Date().toISOString();
    const del = await fetch(`${supabaseUrl}/rest/v1/google_ratings_cache?expires_at=lt.${encodeURIComponent(nowIso)}`, { method: 'DELETE', headers });
    if (del.ok) {
      const deleted = await del.json().catch(() => []);
      deletedExpired = Array.isArray(deleted) ? deleted.length : 0;
    }

    // 3. Pedir rating + conteo a Places API (New), 10 llamadas a la vez.
    const updated = [];
    const sinCalificacion = [];
    const failed = [];
    for (let i = 0; i < targets.length; i += CONCURRENCY) {
      const chunk = targets.slice(i, i + CONCURRENCY);
      const results = await Promise.all(chunk.map(async (t) => {
        try {
          const r = await fetch(`${PLACES_URL}/${encodeURIComponent(t.placeId)}`, {
            headers: { 'X-Goog-Api-Key': googleKey, 'X-Goog-FieldMask': 'rating,userRatingCount' },
          });
          if (!r.ok) return { t, error: `Places API: HTTP ${r.status}` };
          const place = await r.json();
          if (typeof place.rating !== 'number') return { t, noRating: true };
          return { t, rating: place.rating, count: Number(place.userRatingCount) || 0 };
        } catch (err) {
          return { t, error: String(err?.message || err) };
        }
      }));
      for (const res of results) {
        if (res.error) failed.push({ business_id: res.t.id, place_id: res.t.placeId, error: res.error });
        else if (res.noRating) sinCalificacion.push({ business_id: res.t.id, place_id: res.t.placeId });
        else updated.push({ business_id: res.t.id, place_id: res.t.placeId, rating: res.rating, review_count: res.count, fetched_at: nowIso, expires_at: shiftDays(nowIso, CACHE_TTL_DAYS) });
      }
    }

    // 4. Guardar en el caché (upsert por business_id).
    if (updated.length > 0) {
      const up = await fetch(`${supabaseUrl}/rest/v1/google_ratings_cache?on_conflict=business_id`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates' },
        body: JSON.stringify(updated),
      });
      if (!up.ok) throw new Error(`PostgREST upsert google_ratings_cache: HTTP ${up.status}`);
    }

    return res.status(200).json({ ok: true, dry: false, checked: rows.length, withPlaceId: targets.length, updated: updated.length, sinCalificacion: sinCalificacion.length, failed, deletedExpired });
  } catch (err) {
    console.error('actualizar-calificaciones-google error:', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
