import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.production.local' });

async function run() {
  const sb = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await sb.from('push_tokens').select('*');
  console.log("Tokens in DB:", data);
  if (error) console.error("Error:", error);
}
run();
