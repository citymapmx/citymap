import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/cities?status=eq.active&select=slug`, {
  headers: { apikey: process.env.VITE_SUPABASE_ANON_KEY, Authorization: `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}` }
}).then(r => r.json()).then(console.log);
