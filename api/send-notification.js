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
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { title, body, deepLink, secret, user_id: requestedUserId, test_self = false, imageUrl, type = 'system', target_city } = req.body;

    // Proteger el endpoint — acepta ADMIN_SECRET o JWT de usuario autenticado
    const authHeader = req.headers['authorization'];
    const jwtToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    let isAuthorized = false;
    let authenticatedUserId = null;

    if (secret && secret === process.env.ADMIN_SECRET) {
      // Autenticación clásica con secret (retro-compatible)
      isAuthorized = true;
    } else if (jwtToken) {
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

    if (!isAuthorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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

    // 1. Si hay user_id, insertar notificacion en DB (bypass RLS)
    if (user_id) {
      const inboxResult = await fetch(`${supabaseUrl}/rest/v1/notifications`, {
        method: 'POST',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id, title, body, type, read: false })
      });
      if (!inboxResult.ok) throw new Error("No se pudo guardar la notificación en la bandeja");
    }

    // 2. Fetch push tokens
    let tokens = [];
    let queryUrl = `${supabaseUrl}/rest/v1/push_tokens?select=token`;
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
      if (data.length < 1000) break;
    }
    tokens = [...new Set(tokens)];

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
          android: { notification: { sound: 'default' } }
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
