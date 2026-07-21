export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { id, share_token } = req.query;

  if (!id && !share_token) {
    return res.status(400).json({ error: 'Missing id or share_token' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return res.status(500).json({ error: 'Supabase env vars missing' });
  }

  try {
    const query = share_token
      ? `?share_token=eq.${share_token}&select=*,profiles(name,avatar_url),plan_items(*)`
      : `?id=eq.${id}&select=*,profiles(name,avatar_url),plan_items(*)`;

    const r = await fetch(`${supabaseUrl}/rest/v1/plans${query}`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });

    if (!r.ok) {
      throw new Error(`Supabase error: ${r.status}`);
    }

    const data = await r.json();
    
    // Si no se encuentra el plan, devolvemos array vacío para que el frontend lo maneje
    if (!data || data.length === 0) {
      return res.status(200).json([]);
    }

    const plan = data[0];

    // Chequeo de seguridad:
    // Si buscamos por ID, el plan DEBE ser público para devolverlo (o el usuario debe estar autenticado, pero aquí no sabemos quién es).
    // Si no es público y NO usaron share_token, denegamos el acceso (a menos que quieran saltarse RLS arbitrariamente, lo cual es inseguro).
    if (id && !share_token && !plan.is_public) {
      return res.status(403).json({ error: 'Plan is not public' });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error("Fetch shared plan error:", err);
    return res.status(500).json({ error: err.message });
  }
}
