import fs from 'fs';
const SUPABASE_URL = "https://dpkjxhjkzdlkvyotoeai.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE";

async function check() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/events?limit=1`, {
    headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}` }
  });
  const data = await res.json();
  console.log(Object.keys(data[0]));
}
check();
