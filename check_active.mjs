import { createClient } from '@supabase/supabase-js';
const supabaseUrl = "https://dpkjxhjkzdlkvyotoeai.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDQzNjM1MCwiZXhwIjoyMDk2MDEyMzUwfQ.dOco_AbLMN-fiFM4seo0gqikGFzBMwasGxaPIlmbFjg";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data: banners } = await supabase.from('banners').select('img_url');
  console.log("Banners:", banners);
  const { data: promos } = await supabase.from('promos').select('*');
  console.log("Promos:", promos);
}
check();
