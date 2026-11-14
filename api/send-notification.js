/* global process */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { buildReminderPlan, countReminderPairs, todayInMexicoCity } from '../src/lib/recordatoriosEventos.js';
import { buildChatMessage, chatRecipients, CHAT_MESSAGE_DEDUP_MINUTES } from '../src/lib/chatNotifications.js';
import { buildBookingMessage, bookingRecipients, isDuplicateBookingNotification, BOOKING_NOTIFICATION_TYPE, BOOKING_NOTIFICATION_FRESH_MINUTES, BOOKING_NOTIFICATION_DEDUP_MINUTES } from '../src/lib/bookingNotifications.js';
import { PUSH_ALERT_CHANNEL_ID, PUSH_ALERT_SOUND_NAME } from '../src/lib/pushAlertChannel.js';

// 1. Iniciar Firebase Admin si no está iniciado
if (!getApps().length) {
  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) throw new Error("FIREBASE_SERVICE_ACCOUNT env var missing");
    initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  } catch (err) {
    console.error("Firebase init error:", err);
  }
}

// Recordatorios de eventos guardados (PR #214; antes vivían en
// api/recordatorios-eventos.js, borrado). Sin función nueva: Vercel Hobby
// permite máx. 12 Serverless Functions y el endpoint aparte era la 13ª, por
// eso falló el despliegue de producción del #213. El modo recordatorios vive
// aquí: el cron de Vercel (vercel.json) llama con GET + Authorization:
// Bearer <CRON_SECRET>; el disparo manual usa ADMIN_SECRET o JWT de admin +
// bandera explícita (body {recordatorios: true} o query ?recordatorios=1).
// El escaneo reutiliza la lógica pura de src/lib/recordatoriosEventos.js y
// manda cada aviso por este mismo endpoint (que guarda la copia en la
// bandeja y envía el push por FCM).
const SUPABASE_URL_FALLBACK = 'https://dpkjxhjkzdlkvyotoeai.supabase.co';
const SEND_URL = `${process.env.PUBLIC_URL || 'https://citymap.mx'}/api/send-notification`;

// Escaneo de recordatorios: eventos de hoy (status approved), usuarios que
// los guardaron en event_favorites, aviso por este mismo endpoint.
// ?dry=1 (o body.dry): calcula el plan sin mandar nada.
async function runReminders(req, res) {
  const query = req.query || {};
  const reqBody = req.body || {};
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK;
  if (!serviceRoleKey) return res.status(500).json({ error: 'Supabase env vars missing' });
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };

  const dry = query.dry === '1' || reqBody.dry === true;
  const today = todayInMexicoCity();
  const adminSecret = process.env.ADMIN_SECRET;

  try {
    // 1. Eventos de hoy aprobados.
    const events = [];
    for (let offset = 0; ; offset += 1000) {
      const r = await fetch(`${supabaseUrl}/rest/v1/events?select=id,title,slug,city_slug,date,time,status,venue_name,img_url,img&status=eq.approved&date=eq.${today}&order=time.asc&limit=1000&offset=${offset}`, { headers });
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

    // 4. Mandar cada aviso por este mismo endpoint (que guarda la copia en la
    // bandeja y envía el push). Un fallo no frena los demás.
    const sent = [];
    const failed = [];
    for (const item of plan) {
      try {
        const r = await fetch(SEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: item.title, body: item.body, type: 'reminder', user_id: item.userId, deepLink: item.deepLink, ...(item.imageUrl ? { imageUrl: item.imageUrl } : {}), secret: adminSecret }),
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
    console.error('recordatorios error:', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}

// Aviso de mensaje nuevo en el chat de un evento privado (PR #227). El
// cliente lo dispara tras enviar su mensaje, con su propio JWT; el servidor
// verifica ese JWT y la pertenencia al evento antes de avisar a los demás
// participantes (anfitrión + invitados que confirmaron con cuenta + quienes
// ya escribieron en ese chat, menos el remitente; PR #230: antes faltaban
// los invitados confirmados que nunca escribieron). El cuerpo del aviso
// sale del mensaje guardado en la base, nunca del cliente: un usuario solo
// puede avisar del mensaje que él mismo escribió, a los participantes del
// evento en el que lo escribió. Los invitados sin cuenta no disparan avisos
// (sin JWT no hay identidad verificable). Sin función nueva: vive en este
// mismo endpoint.
async function runChatMessage(req, res, senderId) {
  const reqBody = req.body || {};
  const { eventId, messageId } = reqBody;
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  if (!senderId) return res.status(401).json({ error: 'Unauthorized' });
  const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
  if (!isUuid(eventId) || !isUuid(messageId)) {
    return res.status(400).json({ error: 'Faltan campos: eventId y messageId son requeridos' });
  }
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK;
  if (!serviceRoleKey) return res.status(500).json({ error: 'Supabase env vars missing' });
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
  const adminSecret = process.env.ADMIN_SECRET;

  try {
    // 1. Evento (título, enlace e imagen del aviso; anfitrión).
    const evRes = await fetch(`${supabaseUrl}/rest/v1/events?select=id,title,slug,city_slug,user_id,img_url,img&id=eq.${eventId}`, { headers });
    if (!evRes.ok) throw new Error(`PostgREST events: HTTP ${evRes.status}`);
    const event = (await evRes.json())?.[0];
    if (!event) return res.status(404).json({ error: 'Evento no encontrado' });

    // 2. Mensaje exacto del remitente: el cuerpo real sale de la base.
    // Si no existe o no es suyo, no hay aviso (y no hay pertenencia).
    const msgRes = await fetch(`${supabaseUrl}/rest/v1/event_messages?select=id,guest_name,user_id,body,created_at&id=eq.${messageId}&event_id=eq.${eventId}&user_id=eq.${senderId}`, { headers });
    if (!msgRes.ok) throw new Error(`PostgREST event_messages: HTTP ${msgRes.status}`);
    const message = (await msgRes.json())?.[0];
    if (!message) return res.status(403).json({ error: 'Mensaje no encontrado o no es tuyo' });

    // 3. Destinatarios: anfitrión + invitados que confirmaron con cuenta
    // (RSVP) + autores del chat, menos el remitente. La lectura de RSVP
    // tolera que la columna user_id aún no exista (migración pendiente):
    // en ese caso solo avisa a anfitrión y autores, como antes.
    const chatRes = await fetch(`${supabaseUrl}/rest/v1/event_messages?select=user_id&event_id=eq.${eventId}&limit=1000`, { headers });
    if (!chatRes.ok) throw new Error(`PostgREST event_messages: HTTP ${chatRes.status}`);
    const chatRows = await chatRes.json();
    let rsvpUserIds = [];
    try {
      const rsvpRes = await fetch(`${supabaseUrl}/rest/v1/event_rsvps?select=user_id&event_id=eq.${eventId}&limit=1000`, { headers });
      if (rsvpRes.ok) rsvpUserIds = ((await rsvpRes.json()) || []).map((r) => r.user_id);
      else console.warn('aviso chat: no se pudieron leer los RSVP', rsvpRes.status);
    } catch (err) {
      console.warn('aviso chat: no se pudieron leer los RSVP', String(err?.message || err));
    }
    const recipientIds = chatRecipients({
      hostId: event.user_id,
      messageUserIds: (chatRows || []).map((r) => r.user_id),
      rsvpUserIds,
      senderId,
    });
    const built = buildChatMessage({
      authorName: message.guest_name,
      eventTitle: event.title,
      messageBody: message.body,
      event,
    });
    if (!built) return res.status(400).json({ error: 'No se pudo armar el aviso' });
    if (recipientIds.length === 0) {
      return res.status(200).json({ ok: true, sent: [], failed: [], skipped: 0 });
    }
    if (!adminSecret) return res.status(500).json({ error: 'ADMIN_SECRET no configurado' });

    // 4. Anti-duplicados: el mismo aviso en los últimos 5 minutos no se
    // vuelve a mandar a ese participante (reenvío o doble toque).
    // La bandeja guarda el enlace absoluto, así que se compara con ese.
    const since = new Date(Date.now() - CHAT_MESSAGE_DEDUP_MINUTES * 60000).toISOString();
    const absoluteLink = `https://citymap.mx${built.deepLink}`;
    const dupRes = await fetch(
      `${supabaseUrl}/rest/v1/notifications?select=user_id&type=eq.chat&deep_link=eq.${encodeURIComponent(absoluteLink)}&body=eq.${encodeURIComponent(built.body)}&created_at=gte.${since}&limit=1000`,
      { headers },
    );
    const already = new Set();
    if (dupRes.ok) {
      for (const n of (await dupRes.json()) || []) if (n?.user_id) already.add(n.user_id);
    }

    // 5. Mandar cada aviso por este mismo endpoint (que guarda la copia en
    // la bandeja y envía el push). Un fallo no frena los demás.
    const sent = [];
    const failed = [];
    let skipped = 0;
    for (const userId of recipientIds) {
      if (already.has(userId)) { skipped++; continue; }
      try {
        const r = await fetch(SEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: built.title, body: built.body, type: 'chat', user_id: userId, deepLink: built.deepLink, ...(built.imageUrl ? { imageUrl: built.imageUrl } : {}), secret: adminSecret }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        sent.push({ eventId, userId, successCount: data.successCount ?? null });
      } catch (err) {
        failed.push({ eventId, userId, error: String(err?.message || err) });
      }
    }
    return res.status(200).json({ ok: true, sent, failed, skipped });
  } catch (err) {
    console.error('aviso chat error:', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}

// Quiénes son admins para la copia del aviso de reserva: la unión de
// (1) perfiles con role 'admin', (2) correos de ADMIN_EMAILS y (3)
// usuarios con app_metadata.isAdmin. Ninguna fuente sola alcanza:
// Jonathan tiene role 'user' en profiles y su admin viene de (2) o (3).
// Falla abierta por fuente: si una lectura falla, se usan las demás.
async function resolveAdminUserIds({ serviceRoleKey, supabaseUrl }) {
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
  const ids = new Set();
  try {
    const r = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id&role=eq.admin&limit=1000`, { headers });
    if (r.ok) {
      for (const row of (await r.json()) || []) if (row?.id) ids.add(row.id);
    } else {
      console.warn('aviso reserva: no se pudieron leer los perfiles admin', r.status);
    }
  } catch (err) {
    console.warn('aviso reserva: no se pudieron leer los perfiles admin', String(err?.message || err));
  }
  try {
    const wantedEmails = new Set(
      (process.env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
    );
    let page = 1;
    for (;;) {
      const r = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=100`, { headers });
      if (!r.ok) {
        console.warn('aviso reserva: no se pudieron listar los usuarios de Auth', r.status);
        break;
      }
      const data = await r.json();
      for (const u of data?.users || []) {
        if (!u?.id) continue;
        const email = String(u?.email || '').toLowerCase();
        if ((email && wantedEmails.has(email)) || u?.app_metadata?.isAdmin === true) ids.add(u.id);
      }
      if (!data?.next_page || page >= 20) break;
      page = data.next_page;
    }
  } catch (err) {
    console.warn('aviso reserva: no se pudieron listar los usuarios de Auth', String(err?.message || err));
  }
  return [...ids];
}

// Aviso de reserva nueva (PR #301). El cliente lo dispara tras confirmar
// con secure_reserve, con su JWT si tiene sesión (o sin él si fue
// invitado). El servidor verifica la reserva en la base — nunca confía en
// el cuerpo que manda el cliente — y avisa al dueño y a los admins por
// este mismo endpoint (que guarda la copia en la bandeja y envía el push
// por FCM). Sin función nueva: vive en este mismo endpoint, como el modo
// de aviso de chat.
async function runBookingNotification(req, res, callerId) {
  const reqBody = req.body || {};
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const { reservationId, bizId, date, time, clientPhone } = reqBody;
  const isUuid = (v) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''));
  const phoneDigits = String(clientPhone || '').replace(/\D/g, '');
  if (reservationId && !isUuid(reservationId)) {
    return res.status(400).json({ error: 'reservationId inválido' });
  }
  if (!reservationId && (!isUuid(bizId) || !/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || !/^\d{1,2}:\d{2}/.test(String(time || '')))) {
    return res.status(400).json({ error: 'Faltan campos: bizId, date y time son requeridos' });
  }
  if (!phoneDigits) {
    return res.status(400).json({ error: 'Falta el teléfono de la reserva' });
  }
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || SUPABASE_URL_FALLBACK;
  if (!serviceRoleKey) return res.status(500).json({ error: 'Supabase env vars missing' });
  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
  const adminSecret = process.env.ADMIN_SECRET;

  try {
    // 1. La reserva exacta, de la base. Por id si el cliente lo trae (el
    // RPC lo devuelve a veces); si no, por negocio+fecha+hora y se filtra
    // por teléfono en código (el teléfono guardado puede llevar formato).
    let reservation = null;
    if (reservationId) {
      const r = await fetch(`${supabaseUrl}/rest/v1/reservations?select=id,biz_id,date,time,client_name,client_phone,service,status,user_id,created_at&id=eq.${reservationId}`, { headers });
      if (!r.ok) throw new Error(`PostgREST reservations: HTTP ${r.status}`);
      reservation = (await r.json())?.[0] || null;
    } else {
      const r = await fetch(`${supabaseUrl}/rest/v1/reservations?select=id,biz_id,date,time,client_name,client_phone,service,status,user_id,created_at&biz_id=eq.${bizId}&date=eq.${date}&time=eq.${time}&order=created_at.desc&limit=10`, { headers });
      if (!r.ok) throw new Error(`PostgREST reservations: HTTP ${r.status}`);
      reservation = ((await r.json()) || []).find((row) => String(row?.client_phone || '').replace(/\D/g, '') === phoneDigits) || null;
    }
    if (!reservation) return res.status(404).json({ error: 'Reserva no encontrada' });

    // 2. Solo reservas vigentes y recientes: canceladas o viejas no avisan
    // (así una reserva vieja no se puede reutilizar para avisar de más).
    if (reservation.status === 'cancelled' || reservation.status === 'deleted') {
      return res.status(400).json({ error: 'La reserva ya no está vigente' });
    }
    const createdAt = new Date(reservation.created_at).getTime();
    if (!Number.isFinite(createdAt) || Date.now() - createdAt > BOOKING_NOTIFICATION_FRESH_MINUTES * 60000) {
      return res.status(400).json({ error: 'La reserva ya no es reciente' });
    }

    // 3. Identidad: si la reserva tiene usuario, quien dispara debe ser
    // ese usuario (JWT verificado arriba); si fue invitado, el teléfono
    // que manda debe coincidir con el guardado.
    if (reservation.user_id) {
      if (!callerId || callerId !== reservation.user_id) {
        return res.status(403).json({ error: 'No eres quien hizo esta reserva' });
      }
    } else if (String(reservation.client_phone || '').replace(/\D/g, '') !== phoneDigits) {
      return res.status(403).json({ error: 'El teléfono no coincide con la reserva' });
    }

    // 4. El negocio (dueño) y el mensaje, armados desde la base.
    const bizRes = await fetch(`${supabaseUrl}/rest/v1/businesses?select=id,name,slug,owner_id,user_id,logo_url,banner_url,photos&id=eq.${reservation.biz_id}`, { headers });
    if (!bizRes.ok) throw new Error(`PostgREST businesses: HTTP ${bizRes.status}`);
    const business = (await bizRes.json())?.[0];
    if (!business) return res.status(404).json({ error: 'Negocio no encontrado' });
    const built = buildBookingMessage({ reservation, business });
    if (!built) return res.status(400).json({ error: 'No se pudo armar el aviso' });

    // 5. Destinatarios: dueño + admins, sin quien reservó. Si la
    // resolución de admins falla, el aviso al dueño sale igual (falla
    // abierta: el dueño es lo principal).
    const ownerId = business.owner_id || business.user_id || null;
    let adminIds = [];
    try {
      adminIds = await resolveAdminUserIds({ serviceRoleKey, supabaseUrl });
    } catch (err) {
      console.warn('aviso reserva: no se pudieron resolver los admins', String(err?.message || err));
    }
    const recipientIds = bookingRecipients({ ownerId, adminIds, callerId });
    if (recipientIds.length === 0) {
      return res.status(200).json({ ok: true, sent: [], failed: [], skipped: 0 });
    }
    if (!adminSecret) return res.status(500).json({ error: 'ADMIN_SECRET no configurado' });

    // 6. Anti-duplicados: el mismo aviso en los últimos 30 minutos no se
    // vuelve a mandar a ese destinatario (reenvío o doble toque).
    const since = new Date(Date.now() - BOOKING_NOTIFICATION_DEDUP_MINUTES * 60000).toISOString();
    const absoluteLink = `https://citymap.mx${built.deepLink}`;
    const dupRes = await fetch(
      `${supabaseUrl}/rest/v1/notifications?select=user_id&type=eq.${BOOKING_NOTIFICATION_TYPE}&deep_link=eq.${encodeURIComponent(absoluteLink)}&body=eq.${encodeURIComponent(built.body)}&created_at=gte.${since}&limit=1000`,
      { headers },
    );
    const dupRows = dupRes.ok ? (await dupRes.json()) || [] : [];

    // 7. Mandar cada aviso por este mismo endpoint (que guarda la copia
    // en la bandeja y envía el push). Un fallo no frena los demás.
    const sent = [];
    const failed = [];
    let skipped = 0;
    for (const userId of recipientIds) {
      if (isDuplicateBookingNotification(dupRows, userId, absoluteLink, built.body, since)) { skipped++; continue; }
      try {
        const r = await fetch(SEND_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: built.title, body: built.body, type: BOOKING_NOTIFICATION_TYPE, user_id: userId, deepLink: built.deepLink, ...(built.imageUrl ? { imageUrl: built.imageUrl } : {}), secret: adminSecret }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data?.error || `HTTP ${r.status}`);
        sent.push({ reservationId: reservation.id, userId, successCount: data.successCount ?? null });
      } catch (err) {
        failed.push({ reservationId: reservation.id, userId, error: String(err?.message || err) });
      }
    }
    return res.status(200).json({ ok: true, sent, failed, skipped });
  } catch (err) {
    console.error('aviso reserva error:', err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const reqBody = req.body || {};
  const query = req.query || {};
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers['authorization'] || '';
  const jwtToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const bodySecret = reqBody.secret;
  // El cron de Vercel manda Authorization: Bearer <CRON_SECRET> (también se
  // acepta el secreto en el cuerpo, como en limpiar-imagenes-pasadas.js).
  const isCron = Boolean(cronSecret && (authHeader === `Bearer ${cronSecret}` || bodySecret === cronSecret));
  const wantsReminders = reqBody.recordatorios === true || query.recordatorios === '1';

  // El cron de Vercel llama con GET; el envío normal solo acepta POST
  // (el GET con autenticación válida pero sin modo recordatorios cae en 405
  // más abajo, tras la autenticación).
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Proteger el endpoint — acepta ADMIN_SECRET o JWT de usuario autenticado
    let isAuthorized = false;
    let authenticatedUserId = null;
    // Cualquier JWT válido identifica al remitente (no solo admins): el modo
    // de aviso de chat lo usa para verificar pertenencia al evento.
    let verifiedUserId = null;

    if (bodySecret && bodySecret === process.env.ADMIN_SECRET) {
      // Autenticación clásica con secret (retro-compatible)
      isAuthorized = true;
    } else if (jwtToken && jwtToken !== cronSecret) {
      // Autenticación moderna: verificar JWT con Supabase
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${jwtToken}` }
        });
        const userData = await userRes.json();
        // Solo administradores autorizados por el servidor
        // Only server-managed metadata or a verified allowlisted email can grant access.
        // user_metadata is editable by the user and must never authorize an admin.
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
        const isListedAdmin = Boolean(userData?.email_confirmed_at && userData?.email && adminEmails.includes(userData.email.toLowerCase()));
        const isManagedAdmin = userData?.app_metadata?.isAdmin === true;
        if (userRes.ok && userData?.id) {
          verifiedUserId = userData.id;
          if (isListedAdmin || isManagedAdmin) {
            isAuthorized = true;
            authenticatedUserId = userData.id;
          }
        }
      } catch { /* JWT inválido */ }
    }

    // Modo recordatorios: el cron lo distingue por CRON_SECRET; el disparo
    // manual, por ADMIN_SECRET o JWT de admin + bandera explícita.
    if (isCron || (isAuthorized && wantsReminders)) {
      return runReminders(req, res);
    }

    // Modo aviso de chat: cualquier usuario autenticado puede dispararlo,
    // solo para un mensaje que él mismo escribió en ese evento. runChatMessage
    // verifica el mensaje y la pertenencia antes de avisar a los demás.
    const wantsChatMessage = reqBody.chatMensaje === true;
    if (wantsChatMessage) {
      return runChatMessage(req, res, verifiedUserId);
    }

    // Modo aviso de reserva: lo dispara quien reservó tras confirmar con
    // secure_reserve (con su JWT si tiene sesión, o sin él si fue
    // invitado). runBookingNotification verifica la reserva en la base
    // antes de avisar al dueño y a los admins.
    const wantsBooking = reqBody.reserva === true;
    if (wantsBooking) {
      return runBookingNotification(req, res, verifiedUserId);
    }

    if (!isAuthorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { title, body, deepLink, user_id: requestedUserId, test_self = false, imageUrl, type = 'system', target_city } = reqBody;

    if (test_self && !authenticatedUserId) return res.status(401).json({ error: "La prueba requiere una sesión de administrador" });
    const user_id = test_self ? authenticatedUserId : requestedUserId;

    if (!title || !body) {
      return res.status(400).json({ error: 'Faltan campos: title y body son requeridos' });
    }

    if (!getApps().length) {
      return res.status(500).json({ error: 'Firebase Admin no está inicializado' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Supabase env vars missing' });
    }

    const safeUrl = (value, base) => {
      if (!value) return undefined;
      try { const url = new URL(value, base); return url.protocol === 'https:' ? url.href : undefined; } catch { return undefined; }
    };
    const link = safeUrl(deepLink, "https://citymap.mx");
    if (deepLink && (!link || !['citymap.mx', 'www.citymap.mx', 'citymap.world', 'www.citymap.world'].includes(new URL(link).hostname))) return res.status(400).json({ error: 'El destino debe ser una URL HTTPS de CityMap' });
    const image = safeUrl(imageUrl);
    if (imageUrl && !image) return res.status(400).json({ error: 'La imagen debe usar HTTPS' });

    // 1. Fetch push tokens (con su user_id para la bandeja de notificaciones)
    let tokens = [];
    let inboxUserIds = new Set();
    let queryUrl = `${supabaseUrl}/rest/v1/push_tokens?select=token,user_id`;
    if (user_id) {
      // Fetch SOLO los tokens de ese usuario específico
      queryUrl += `&user_id=eq.${user_id}`;
    } else if (target_city) {
      // Filtro por ciudad si se solicita envío masivo segmentado
      queryUrl += `&city_slug=eq.${target_city}`;
    } // else: Fetch ALL tokens (Envío masivo global)

    for (let offset = 0; ; offset += 1000) {
      const r = await fetch(`${queryUrl}&order=token.asc&limit=1000&offset=${offset}`, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } });
      if (!r.ok) throw new Error(`Supabase fetch tokens error: ${r.status}`);
      const data = await r.json();
      if (!Array.isArray(data)) throw new Error('Respuesta de dispositivos inválida');
      tokens.push(...data.map(t => t.token).filter(token => typeof token === 'string' && token.length));
      data.forEach(t => { if (typeof t.user_id === 'string' && t.user_id) inboxUserIds.add(t.user_id); });
      if (data.length < 1000) break;
    }
    tokens = [...new Set(tokens)];

    // 2. Guardar copia en la bandeja de notificaciones (bypass RLS con service role).
    // Envío a un usuario: una fila para él. Envío masivo o por ciudad: una fila por
    // cada usuario con token en el destino, con el enlace para abrir el destino.
    const saveInbox = async (rows) => fetch(`${supabaseUrl}/rest/v1/notifications`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rows)
    });
    if (user_id) {
      const inboxResult = await saveInbox([{ user_id, title, body, type, read: false, deep_link: link || null }]);
      if (!inboxResult.ok) throw new Error("No se pudo guardar la notificación en la bandeja");
    } else if (inboxUserIds.size > 0) {
      try {
        const inboxResult = await saveInbox([...inboxUserIds].map(uid => ({ user_id: uid, title, body, type, read: false, deep_link: link || null })));
        if (!inboxResult.ok) console.error("No se pudo guardar la bandeja de notificaciones:", inboxResult.status);
      } catch (err) {
        console.error("No se pudo guardar la bandeja de notificaciones:", err);
      }
    }

    if (!tokens || tokens.length === 0) {
      return res.status(200).json({ message: 'No hay tokens registrados para enviar push', successCount: 0, failureCount: 0 });
    }

    // 3. Enviar en lotes de 500 (límite de FCM)
    const messages = [];
    for (let i = 0; i < tokens.length; i += 500) {
      const chunk = tokens.slice(i, i + 500);
      messages.push(
        getMessaging().sendEachForMulticast({
          tokens: chunk,
          notification: { title, body, ...(image ? { imageUrl: image } : {}) },
          data: link ? { deepLink: link } : {},
          webpush: { fcmOptions: { link: link || "https://citymap.mx" }, notification: { icon: "/icon-192.png", ...(image ? { image } : {}) } },
          // Sonido y canal propios de la app Android (canal citymap_alerts con
          // res/raw/citymap_alert.mp3). En la app vieja (sin el recurso)
          // Android cae al sonido por defecto. En el navegador el sonido
          // sigue siendo el del sistema: webpush no se toca.
          android: { notification: { channelId: PUSH_ALERT_CHANNEL_ID, sound: PUSH_ALERT_SOUND_NAME } }
        })
      );
    }

    const responses = await Promise.all(messages);
    const successCount = responses.reduce((acc, r) => acc + r.successCount, 0);
    const failureCount = responses.reduce((acc, r) => acc + r.failureCount, 0);

    // Limpiar tokens inválidos
    const invalidTokens = [];
    responses.forEach((r, batchIndex) => {
      r.responses.forEach((resp, idx) => {
        if (!resp.success && (
          resp.error?.code === 'messaging/invalid-registration-token' ||
          resp.error?.code === 'messaging/registration-token-not-registered'
        )) {
          invalidTokens.push(tokens[batchIndex * 500 + idx]);
        }
      });
    });

    // Opcional: borrar invalidTokens de la base de datos (se podría hacer aquí con serviceRoleKey)
    if (invalidTokens.length > 0) {
      const deleteUrl = `${supabaseUrl}/rest/v1/push_tokens?token=in.(${encodeURIComponent(invalidTokens.map(token => JSON.stringify(token)).join(','))})`;
      await fetch(deleteUrl, {
        method: 'DELETE',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
        }
      });
    }

    return res.status(200).json({
      success: true,
      successCount,
      failureCount,
      invalidTokensCleaned: invalidTokens.length,
      message: `Notificaciones enviadas: ${successCount} exitosas, ${failureCount} fallidas`
    });

  } catch (err) {
    console.error("Send push error:", err);
    return res.status(500).json({ error: err.message });
  }
}
