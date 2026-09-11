import { createClient } from '@supabase/supabase-js';
const sb = createClient("https://dpkjxhjkzdlkvyotoeai.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE");

async function check() {
  const { data, error } = await sb.from('businesses').select('name, category, type, tagline, tags').ilike('name', '%Frogurth%');
  console.log("DATA:", data);
  console.log("ERROR:", error);
}
check();
