import { sb } from './src/lib/supabase.js';

async function check() {
  try {
    const res = await sb.get('events', '?limit=1');
    console.log("Events keys:", Object.keys(res[0] || {}));
  } catch(e) {
    console.error("Error:", e);
  }
}
check();
