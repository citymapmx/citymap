/* global process */
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { buildReminderPlan, countReminderPairs, todayInMexicoCity } from '../src/lib/recordatoriosEventos.js';
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
      const r = await fetch(`${supabaseUrl}/rest/v1/events?select=id,title,slug,city_slug,date,time,status,event_category,img_url,img&status=eq.approved&date=eq.${today}&order=time.asc&limit=1000&offset=${offset}`, { headers });
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
        if (userRes.ok && userData?.id && (isListedAdmin || isManagedAdmin)) {
          isAuthorized = true;
          authenticatedUserId = userData.id;
        }
      } catch { /* JWT inválido */ }
    }

    // Modo recordatorios: el cron lo distingue por CRON_SECRET; el disparo
    // manual, por ADMIN_SECRET o JWT de admin + bandera explícita.
    if (isCron || (isAuthorized && wantsReminders)) {
      return runReminders(req, res);
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
