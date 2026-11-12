/* global process */
// Recordatorios de eventos guardados (PR #213).
// Cron diario de Vercel (vercel.json): 15:00 UTC = 09:00 CST.
// Busca los eventos de hoy (status approved), toma a los usuarios que los
// guardaron en event_favorites y les manda el aviso por send-notification
// (que guarda la copia en la bandeja y envía el push por FCM).
// Auth: el cron de Vercel manda Authorization: Bearer <CRON_SECRET>; las
// pruebas manuales pueden usar el mismo secreto en el cuerpo, o el JWT de
// una sesión de administrador (mismo patrón que api/send-notification.js).
// ?dry=1 (o body.dry): calcula el plan sin mandar nada.

import { buildReminderPlan, countReminderPairs, todayInMexicoCity } from '../src/lib/recordatoriosEventos.js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://dpkjxhjkzdlkvyotoeai.supabase.co';
const SEND_URL = `${process.env.PUBLIC_URL || 'https://citymap.mx'}/api/send-notification`;

const isAdminUser = async (jwtToken) => {
  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return false;
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${jwtToken}` },
    });
    const userData = await userRes.json();
    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    const isListedAdmin = Boolean(userData?.email_confirmed_at && userData?.email && adminEmails.includes(userData.email.toLowerCase()));
    const isManagedAdmin = userData?.app_metadata?.isAdmin === true;
    return userRes.ok && Boolean(userData?.id) && (isListedAdmin || isManagedAdmin);
  } catch { return false; }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  // Auth: secreto del cron o JWT de administrador.
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'] || '';
  const jwtToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const bodySecret = req.body?.secret;
  let authorized = false;
  if (cronSecret && (authHeader === `Bearer ${cronSecret}` || bodySecret === cronSecret)) {
    authorized = true;
  } else if (jwtToken && jwtToken !== cronSecret && await isAdminUser(jwtToken)) {
    authorized = true;
  }
  if (!authorized) return res.status(401).json({ error: 'Unauthorized' });

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || SUPABASE_URL;
  if (!serviceRoleKey) return res.status(500).json({ error: 'Supabase env vars missing' });
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

  const dry = req.query?.dry === '1' || req.body?.dry === true;
  const today = todayInMexicoCity();
  const adminSecret = process.env.ADMIN_SECRET;

  try {
    // 1. Eventos de hoy aprobados.
    const events = [];
    for (let offset = 0; ; offset += 1000) {
      const r = await fetch(`${supabaseUrl}/rest/v1/events?select=id,title,slug,city_slug,date,time,status,event_category&status=eq.approved&date=eq.${today}&order=time.asc&limit=1000&offset=${offset}`, { headers });
      if (!r.ok) throw new Error(`PostgREST events: HTTP ${r.status}`);
      const batch = await r.json();
      events.push(...batch);
      if (batch.length < 1000) break;
    }
    if (events.length === 0) {
      return res.status(200).json({ ok: true, dry, today, events: 0, reminders: 0, sent: [], failed: [], skipped: 0 });
    }

    // 2. Quién guardó esos eventos.
    const eventIds = [...new Set(events.map((e) => e.id))];
    const favorites = [];
    const idsParam = encodeURIComponent(eventIds.map((id) => JSON.stringify(id)).join(','));
    for (let offset = 0; ; offset += 1000) {
      const r = await fetch(`${supabaseUrl}/rest/v1/event_favorites?select=user_id,event_id&event_id=in.(${idsParam})&limit=1000&offset=${offset}`, { headers });
      if (!r.ok) throw new Error(`PostgREST event_favorites: HTTP ${r.status}`);
      const batch = await r.json();
      favorites.push(...batch);
      if (batch.length < 1000) break;
    }

    // 3. Avisos de hoy ya enviados (anti-duplicados).
    const userIds = [...new Set(favorites.map((f) => f.user_id).filter(Boolean))];
    let existingNotifs = [];
    if (userIds.length > 0) {
      const usersParam = encodeURIComponent(userIds.map((id) => JSON.stringify(id)).join(','));
      const r = await fetch(`${supabaseUrl}/rest/v1/notifications?select=user_id,deep_link,type,read,created_at&type=eq.reminder&user_id=in.(${usersParam})&created_at=gte.${today}T00:00:00Z&limit=1000`, { headers });
      if (!r.ok) throw new Error(`PostgREST notifications: HTTP ${r.status}`);
      existingNotifs = await r.json();
    }

    const pairs = countReminderPairs(events, favorites, today);
    const plan = buildReminderPlan({ events, favorites, existingNotifs, todayISO: today });
    const skipped = pairs - plan.length;
    if (dry) {
      return res.status(200).json({ ok: true, dry: true, today, events: events.length, reminders: plan.length, plan, sent: [], failed: [], skipped });
    }
    if (!adminSecret) return res.status(500).json({ error: 'ADMIN_SECRET no configurado' });

    // 4. Mandar cada aviso por send-notification (que guarda la copia en la
    // bandeja y envía el push). Un fallo no frena los demás.
    const sent = [];
    const failed = [];
    for (const item of plan) {
      try {
        const r = await fetch(SEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: item.title, body: item.body, type: 'reminder', user_id: item.userId, deepLink: item.deepLink, secret: adminSecret }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        sent.push({ eventId: item.eventId, userId: item.userId, successCount: data.successCount ?? null });
      } catch (err) {
        failed.push({ eventId: item.eventId, userId: item.userId, error: String(err?.message || err) });
      }
    }
    return res.status(200).json({ ok: true, dry: false, today, events: events.length, reminders: plan.length, sent, failed, skipped });
  } catch (err) {
    console.error('recordatorios-eventos error:', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}
