import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

if (!getApps().length) {
  try {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!sa) throw new Error('FIREBASE_SERVICE_ACCOUNT env var missing');
    initializeApp({ credential: cert(JSON.parse(sa)) });
  } catch (err) {
    console.error('Firebase init error:', err);
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { title, body: msgBody, deepLink, imageUrl, secret, user_id, type = 'system', target_city } = body;

    const authHeader = req.headers.get('authorization');
    const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    let isAuthorized = false;
    if (secret && secret === process.env.ADMIN_SECRET) {
      isAuthorized = true;
    } else if (jwtToken) {
      try {
        const supabaseUrl = process.env.VITE_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: { apikey: serviceRoleKey, Authorization: `Bearer ${jwtToken}` },
        });
        const userData = await userRes.json();
        const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
        if (userRes.ok && userData?.email && (adminEmails.includes(userData.email) || userData?.user_metadata?.isAdmin)) {
          isAuthorized = true;
        }
      } catch { /* JWT inválido */ }
    }

    if (!isAuthorized) return Response.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });
    if (!title || !msgBody) return Response.json({ error: 'Faltan campos: title y body' }, { status: 400, headers: CORS });
    if (!getApps().length) return Response.json({ error: 'Firebase Admin no está inicializado' }, { status: 500, headers: CORS });

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) return Response.json({ error: 'Supabase env vars missing' }, { status: 500, headers: CORS });

    // 1. Insertar notificación en DB si hay user_id
    if (user_id) {
      await fetch(`${supabaseUrl}/rest/v1/notifications`, {
        method: 'POST',
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, title, body: msgBody, type, read: false }),
      });
    }

    // 2. Fetch push tokens and unique users
    let queryUrl = `${supabaseUrl}/rest/v1/push_tokens?select=token,user_id`;
    if (user_id) queryUrl += `&user_id=eq.${user_id}`;
    else if (target_city) queryUrl += `&city_slug=eq.${target_city}`;

    const r = await fetch(queryUrl, { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } });
    if (!r.ok) throw new Error(`Supabase fetch tokens error: ${r.status}`);
    const tokensData = await r.json();
    const tokens = tokensData.map(t => t.token);

    // Save notification to inbox for all users in the broadcast
    if (!user_id && tokensData.length > 0) {
      const uniqueUserIds = [...new Set(tokensData.map(t => t.user_id).filter(Boolean))];
      if (uniqueUserIds.length > 0) {
        const payload = uniqueUserIds.map(uid => ({
          user_id: uid, title, body: msgBody, type, read: false
        }));
        await fetch(`${supabaseUrl}/rest/v1/notifications`, {
          method: 'POST',
          headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    }

    if (!tokens.length) return Response.json({ message: 'No hay tokens registrados', successCount: 0, failureCount: 0 }, { headers: CORS });

    // 3. Enviar en lotes de 500 (límite FCM)
    const messages = [];
    for (let i = 0; i < tokens.length; i += 500) {
      messages.push(getMessaging().sendEachForMulticast({
        tokens: tokens.slice(i, i + 500),
        notification: { 
          title, 
          body: msgBody,
          ...(imageUrl ? { imageUrl } : {})
        },
        data: {
          ...(deepLink ? { deepLink } : {}),
          ...(imageUrl ? { imageUrl } : {})
        },
        android: { notification: { sound: 'default' } },
        apns: { payload: { aps: { 'mutable-content': 1 } } }
      }));
    }

    const responses = await Promise.all(messages);
    const successCount = responses.reduce((acc, r) => acc + r.successCount, 0);
    const failureCount = responses.reduce((acc, r) => acc + r.failureCount, 0);

    // 4. Limpiar tokens inválidos
    const invalidTokens = [];
    responses.forEach((r, ri) => {
      r.responses.forEach((resp, idx) => {
        if (!resp.success && (
          resp.error?.code === 'messaging/invalid-registration-token' ||
          resp.error?.code === 'messaging/registration-token-not-registered'
        )) {
          invalidTokens.push(tokens[ri * 500 + idx]);
        }
      });
    });

    if (invalidTokens.length) {
      await fetch(`${supabaseUrl}/rest/v1/push_tokens?token=in.(${invalidTokens.join(',')})`, {
        method: 'DELETE',
        headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
      });
    }

    return Response.json({ success: true, successCount, failureCount, invalidTokensCleaned: invalidTokens.length }, { headers: CORS });
  } catch (err) {
    console.error('Send push error:', err);
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
