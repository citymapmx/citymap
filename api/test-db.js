export default async function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  
  // Try to insert a dummy notification
  const r = await fetch(`${url}/rest/v1/notifications`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      user_id: '123e4567-e89b-12d3-a456-426614174000', // random uuid
      title: 'Test',
      body: 'Test',
      type: 'booking'
    })
  });
  
  const text = await r.text();
  res.status(200).json({ status: r.status, ok: r.ok, text });
}
