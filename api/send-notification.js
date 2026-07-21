import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { title, body, deepLink, secret, user_id, type = 'system' } = req.body;

    // Proteger el endpoint
    if (secret !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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

    // 1. Si hay user_id, insertar notificacion en DB (bypass RLS)
    if (user_id) {
      await fetch(`${supabaseUrl}/rest/v1/notifications`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id, title, body, type, read: false })
      });
    }

    // 2. Fetch push tokens
    let tokens = [];
    let queryUrl = `${supabaseUrl}/rest/v1/push_tokens?select=token`;
    if (user_id) {
      // Fetch SOLO los tokens de ese usuario específico
      queryUrl += `&user_id=eq.${user_id}`;
    } // else: Fetch ALL tokens (Envío global)

    const r = await fetch(queryUrl, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      }
    });

    if (!r.ok) throw new Error(`Supabase fetch tokens error: ${r.status}`);
    const data = await r.json();
    tokens = data.map(t => t.token);

    if (!tokens || tokens.length === 0) {
      return res.status(200).json({ message: 'No hay tokens registrados para enviar push', count: 0 });
    }

    // 3. Enviar en lotes de 500 (límite de FCM)
    const messages = [];
    for (let i = 0; i < tokens.length; i += 500) {
      const chunk = tokens.slice(i, i + 500);
      messages.push(
        getMessaging().sendEachForMulticast({
          tokens: chunk,
          notification: { title, body },
          data: deepLink ? { deepLink } : {},
          android: { notification: { sound: 'default' } }
        })
      );
    }

    const responses = await Promise.all(messages);
    const successCount = responses.reduce((acc, r) => acc + r.successCount, 0);
    const failureCount = responses.reduce((acc, r) => acc + r.failureCount, 0);

    // Limpiar tokens inválidos
    const invalidTokens = [];
    responses.forEach(r => {
      r.responses.forEach((resp, idx) => {
        if (!resp.success && (
          resp.error?.code === 'messaging/invalid-registration-token' ||
          resp.error?.code === 'messaging/registration-token-not-registered'
        )) {
          invalidTokens.push(tokens[idx]);
        }
      });
    });

    // Opcional: borrar invalidTokens de la base de datos (se podría hacer aquí con serviceRoleKey)
    if (invalidTokens.length > 0) {
      const deleteUrl = `${supabaseUrl}/rest/v1/push_tokens?token=in.(${invalidTokens.join(',')})`;
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
