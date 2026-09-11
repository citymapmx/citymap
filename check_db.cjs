const { createClient } = require('@supabase/supabase-js');
const sb = createClient("https://dpkjxhjkzdlkvyotoeai.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE");

async function check() {
  const { data } = await sb.from('businesses').select('id, name, slug, city_slug').ilike('name', '%teatro%');
  console.log(data);
}
check();
