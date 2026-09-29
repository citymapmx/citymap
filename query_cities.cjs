const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/);

const supabase = createClient(urlMatch[1], keyMatch[1]);

async function check() {
  const { data } = await supabase.from('businesses').select('city_slug');
  const slugs = new Set(data.map(d => d.city_slug));
  console.log("Slugs found:", Array.from(slugs));
}
check();
