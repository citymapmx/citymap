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
//
// Refresco también desde el panel de admin (botón «Actualizar reseñas
// de Google»): el mismo refresco acepta el JWT de un admin (verificado
// contra Supabase Auth, igual que completar-place-ids) y soporta
// offset+limit para procesar por tandas. Los place_id se recortan y
// los que no empiezan por «ChIJ» se saltan sin llamar a Google.
// ?action=completar-place-ids llena el google_place_id de los negocios
// aprobados que no lo tienen, con Text Search de Places API (New) y
// verificación de nombre + distancia/dirección (ver src/lib/placeIdMatch.js).
// Auth de esta acción: JWT del admin (NO CRON_SECRET), verificado contra
// Supabase Auth. Costo: Text Search ~$32 por cada 1,000 llamadas.

import { acceptPlaceCandidate, buildPlaceSearchQuery } from '../src/lib/placeIdMatch.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dpkjxhjkzdlkvyotoeai.supabase.co';
const PLACES_URL = 'https://places.googleapis.com/v1/places';
const SEARCH_TEXT_URL = 'https://places.googleapis.com/v1/places:searchText';
const CACHE_TTL_DAYS = 30;
const CONCURRENCY = 10;
const PLACE_IDS_BATCH = 20;
const PLACE_IDS_CONCURRENCY = 5;
const ADMIN_EMAIL = 'admin@cityguide.com';

const shiftDays = (iso, days) => {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString();
};

// Verifica el JWT del usuario contra Supabase Auth. Solo pasa si el
// usuario es admin (app_metadata.isAdmin) o es admin@cityguide.com.
// user_metadata NUNCA autoriza: la edita el propio usuario.
async function requireAdmin(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return { ok: false, status: 401 };
  const supabaseUrl = process.env.VITE_SUPABASE_URL || SUPABASE_URL;
  const apiKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!apiKey) return { ok: false, status: 500 };
  try {
    const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
    });
    if (!r.ok) return { ok: false, status: 401 };
    const user = await r.json();
    const isAdmin = user?.app_metadata?.isAdmin === true;
    const isAdminEmail = typeof user?.email === 'string'
      && user.email.toLowerCase() === ADMIN_EMAIL
      && Boolean(user?.email_confirmed_at);
    if (user?.id && (isAdmin || isAdminEmail)) return { ok: true, userId: user.id };
    return { ok: false, status: 403 };
  } catch {
    return { ok: false, status: 401 };
  }
}

async function handleCompletarPlaceIds(req, res) {
  const admin = await requireAdmin(req);
  if (!admin.ok) {
    return res.status(admin.status || 401).json({ error: admin.status === 403 ? 'Forbidden: se requiere administrador' : 'Unauthorized' });
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || SUPABASE_URL;
  if (!serviceRoleKey) return res.status(500).json({ error: 'Supabase env vars missing' });

  const dry = req.query?.dry === '1' || req.body?.dry === true;
  const limit = Math.min(PLACE_IDS_BATCH, Math.max(1, parseInt(req.query?.limit ?? req.body?.limit ?? PLACE_IDS_BATCH, 10) || PLACE_IDS_BATCH));
  const excludeIds = new Set(
    (Array.isArray(req.body?.exclude_ids) ? req.body.exclude_ids : []).filter((id) => typeof id === 'string'),
  );
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!dry && !googleKey) return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY no configurado' });

  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

  try {
    // 1. Negocios aprobados sin google_place_id + mapa de ciudades.
    const rows = [];
    for (let offset = 0; ; offset += 1000) {
      const r = await fetch(`${supabaseUrl}/rest/v1/businesses?select=id,name,address,lat,lng,city_slug,social_links&status=eq.approved&order=id.asc&limit=1000&offset=${offset}`, { headers });
      if (!r.ok) throw new Error(`PostgREST businesses: HTTP ${r.status}`);
      const batch = await r.json();
      rows.push(...batch);
      if (batch.length < 1000) break;
    }
    const without = rows.filter((b) => !(b.social_links?.google_place_id || '').trim());
    const remainingBefore = without.length;
    // exclude_ids: negocios ya intentados en tandas anteriores de esta
    // corrida (los ambiguos no se vuelven a consultar a Google).
    const targets = without.filter((b) => !excludeIds.has(b.id)).slice(0, limit);

    let citiesBySlug = {};
    try {
      const cr = await fetch(`${supabaseUrl}/rest/v1/cities?select=slug,name,country_code&limit=1000`, { headers });
      if (cr.ok) {
        const cities = await cr.json();
        citiesBySlug = Object.fromEntries((Array.isArray(cities) ? cities : []).map((c) => [c.slug, c]));
      }
    } catch { /* sin mapa de ciudades: la consulta usa solo nombre + dirección */ }

    if (dry) {
      return res.status(200).json({
        ok: true, dry: true, remaining: remainingBefore,
        wouldProcess: targets.map((t) => ({ business_id: t.id, name: t.name, city_slug: t.city_slug })),
      });
    }

    // 2. Text Search por negocio; aceptar solo con verificación.
    const updated = [];
    const ambiguous = [];
    const failed = [];
    for (let i = 0; i < targets.length; i += PLACE_IDS_CONCURRENCY) {
      const chunk = targets.slice(i, i + PLACE_IDS_CONCURRENCY);
      const results = await Promise.all(chunk.map(async (biz) => {
        try {
          const city = citiesBySlug[biz.city_slug] || {};
          const body = { textQuery: buildPlaceSearchQuery(biz, city.name || ''), languageCode: 'es', maxResultCount: 1 };
          if (city.country_code) body.regionCode = String(city.country_code).toUpperCase();
          const r = await fetch(SEARCH_TEXT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': googleKey, 'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location' },
            body: JSON.stringify(body),
          });
          if (!r.ok) return { biz, error: `Places API: HTTP ${r.status}` };
          const data = await r.json();
          const place = (data.places || [])[0] || null;
          const check = acceptPlaceCandidate(biz, place);
          if (!check.accepted) return { biz, ambiguous: check };
          return { biz, place, distanceMeters: check.distanceMeters ?? null };
        } catch (err) {
          return { biz, error: String(err?.message || err) };
        }
      }));
      for (const item of results) {
        if (item.error) { failed.push({ business_id: item.biz.id, name: item.biz.name, error: item.error }); continue; }
        if (item.ambiguous) {
          ambiguous.push({
            business_id: item.biz.id, name: item.biz.name, reason: item.ambiguous.reason,
            ...(item.ambiguous.distanceMeters != null ? { distanceMeters: item.ambiguous.distanceMeters } : {}),
            ...(item.ambiguous.candidate ? { candidate: item.ambiguous.candidate } : {}),
          });
          continue;
        }
        // 3. Escribir solo si sigue vacío: releer antes del PATCH.
        try {
          const current = await fetch(`${supabaseUrl}/rest/v1/businesses?select=social_links&id=eq.${encodeURIComponent(item.biz.id)}`, { headers });
          const currentRows = current.ok ? await current.json() : [];
          const currentLinks = currentRows?.[0]?.social_links || {};
          if ((currentLinks.google_place_id || '').trim()) {
            ambiguous.push({ business_id: item.biz.id, name: item.biz.name, reason: 'ya-tiene-place-id' });
            continue;
          }
          const merged = { ...currentLinks, google_place_id: item.place.id };
          const up = await fetch(`${supabaseUrl}/rest/v1/businesses?id=eq.${encodeURIComponent(item.biz.id)}`, {
            method: 'PATCH',
            headers: { ...headers, 'Content-Type': 'application/json', Prefer: 'return=representation' },
            body: JSON.stringify({ social_links: merged }),
          });
          if (!up.ok) { failed.push({ business_id: item.biz.id, name: item.biz.name, error: `PostgREST PATCH: HTTP ${up.status}` }); continue; }
          const saved = await up.json().catch(() => []);
          const savedId = saved?.[0]?.social_links?.google_place_id || '';
          if (savedId !== item.place.id) {
            failed.push({ business_id: item.biz.id, name: item.biz.name, error: 'La relectura no muestra el place_id guardado' });
            continue;
          }
          updated.push({ business_id: item.biz.id, name: item.biz.name, place_id: item.place.id });
        } catch (err) {
          failed.push({ business_id: item.biz.id, name: item.biz.name, error: String(err?.message || err) });
        }
      }
    }

    const alreadyFilled = ambiguous.filter((a) => a.reason === 'ya-tiene-place-id').length;
    return res.status(200).json({
      ok: true, processed: targets.length, updated, ambiguous, failed,
      remaining: remainingBefore - updated.length - alreadyFilled,
    });
  } catch (err) {
    console.error('completar-place-ids error:', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Acción del panel de admin: NO usa CRON_SECRET, usa el JWT del admin.
  const action = req.query?.action || req.body?.action;
  if (action === 'completar-place-ids') return handleCompletarPlaceIds(req, res);

  // Refresco: lo dispara el cron con CRON_SECRET o un admin con su JWT
  // (botón del panel). El cron sigue funcionando exactamente igual.
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers['authorization'] || '';
  const bodySecret = req.body?.secret;
  const isCron = Boolean(cronSecret) && (auth === `Bearer ${cronSecret}` || bodySecret === cronSecret);
  if (!isCron) {
    const admin = await requireAdmin(req);
    if (!admin.ok) {
      return res.status(admin.status || 401).json({ error: admin.status === 403 ? 'Forbidden: se requiere administrador' : 'Unauthorized' });
    }
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || SUPABASE_URL;
  if (!serviceRoleKey) return res.status(500).json({ error: 'Supabase env vars missing' });

  const dry = req.query?.dry === '1' || req.body?.dry === true;
  const limit = Math.max(1, parseInt(req.query?.limit ?? req.body?.limit ?? 1000, 10) || 1000);
  const offset = Math.max(0, parseInt(req.query?.offset ?? req.body?.offset ?? 0, 10) || 0);
  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!dry && !googleKey) return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY no configurado' });

  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

  try {
    // 1. Negocios aprobados con place_id de Google.
    const rows = [];
    for (let page = 0; ; page += 1000) {
      const r = await fetch(`${supabaseUrl}/rest/v1/businesses?select=id,name,social_links&status=eq.approved&order=id.asc&limit=1000&offset=${page}`, { headers });
      if (!r.ok) throw new Error(`PostgREST businesses: HTTP ${r.status}`);
      const batch = await r.json();
      rows.push(...batch);
      if (batch.length < 1000) break;
    }
    // place_id recortado; los que no empiezan por «ChIJ» no son IDs de
    // Google (hay strings CID y blancos en la base) y se saltan sin gastar
    // llamadas, contándolos como fallidos en la tanda que les toque.
    const withPlaceId = rows
      .map(b => ({ id: b.id, name: b.name || '', placeId: (b.social_links?.google_place_id || '').trim() || null }))
      .filter(t => t.placeId);
    const targets = withPlaceId.slice(offset, offset + limit);
    const remaining = Math.max(0, withPlaceId.length - offset - targets.length);

    if (dry) {
      return res.status(200).json({ ok: true, dry: true, checked: rows.length, withPlaceId: withPlaceId.length, offset, remaining, wouldRefresh: targets.map(t => t.id) });
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
    // `updated` lleva solo las columnas del caché (el upsert rechaza
    // columnas desconocidas); `updatedItems` es el mismo reporte con nombre.
    const updated = [];
    const updatedItems = [];
    const sinCalificacion = [];
    const failed = [];
    for (let i = 0; i < targets.length; i += CONCURRENCY) {
      const chunk = targets.slice(i, i + CONCURRENCY);
      const results = await Promise.all(chunk.map(async (t) => {
        if (!t.placeId.startsWith('ChIJ')) return { t, invalid: true };
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
        if (res.invalid) { failed.push({ business_id: res.t.id, name: res.t.name, place_id: res.t.placeId, error: 'Place ID inválido (no es un ID de Google)' }); continue; }
        if (res.error) failed.push({ business_id: res.t.id, name: res.t.name, place_id: res.t.placeId, error: res.error });
        else if (res.noRating) sinCalificacion.push({ business_id: res.t.id, name: res.t.name, place_id: res.t.placeId });
        else {
          updated.push({ business_id: res.t.id, place_id: res.t.placeId, rating: res.rating, review_count: res.count, fetched_at: nowIso, expires_at: shiftDays(nowIso, CACHE_TTL_DAYS) });
          updatedItems.push({ business_id: res.t.id, name: res.t.name, place_id: res.t.placeId, rating: res.rating, review_count: res.count });
        }
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

    return res.status(200).json({ ok: true, dry: false, checked: rows.length, withPlaceId: withPlaceId.length, offset, remaining, processed: targets.length, updated: updated.length, updatedItems, sinCalificacion: sinCalificacion.length, sinCalificacionItems: sinCalificacion, failed, deletedExpired });
  } catch (err) {
    console.error('actualizar-calificaciones-google error:', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
