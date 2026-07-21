export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { token, user_id } = req.body;

    if (!token || !user_id) {
      return res.status(400).json({ error: 'Missing token or user_id' });
    }

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Supabase env vars missing' });
    }

    // 1. Eliminar el token de cualquier otro usuario que lo haya registrado antes (orphaned tokens)
    await fetch(`${supabaseUrl}/rest/v1/push_tokens?token=eq.${token}`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });

    // 2. Insertar el token para el usuario actual
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/push_tokens`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ token, user_id })
    });

    if (!insertRes.ok) {
      const errText = await insertRes.text();
      throw new Error(`Failed to insert token: ${insertRes.status} ${errText}`);
    }

    return res.status(200).json({ success: true, message: 'Token registered successfully' });

  } catch (err) {
    console.error("Register token error:", err);
    return res.status(500).json({ error: err.message });
  }
}
