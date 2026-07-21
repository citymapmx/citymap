import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function check() {
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/notifications?limit=1`, {
    headers: { 'apikey': process.env.VITE_SUPABASE_ANON_KEY }
  });
  console.log(await res.json());
}
check();
