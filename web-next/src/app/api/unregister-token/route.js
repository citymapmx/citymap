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
    const { token } = await req.json();
    if (!token) return Response.json({ error: 'Missing token' }, { status: 400, headers: CORS });

    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey)
      return Response.json({ error: 'Env vars missing' }, { status: 500, headers: CORS });

    await fetch(`${supabaseUrl}/rest/v1/push_tokens?token=eq.${encodeURIComponent(token)}`, {
      method: 'DELETE',
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` },
    });

    return Response.json({ success: true }, { headers: CORS });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500, headers: CORS });
  }
}
