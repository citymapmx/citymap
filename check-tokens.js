import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Try to find the keys from the source code directly
const file = readFileSync('src/supabase.js', 'utf8');
const urlMatch = file.match(/createClient\(['"]([^'"]+)['"]/);
const keyMatch = file.match(/createClient\([^,]+,\s*['"]([^'"]+)['"]/);

if (urlMatch && keyMatch) {
  const supabaseUrl = urlMatch[1];
  const supabaseKey = keyMatch[1];
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  supabase.from('push_tokens').select('*').then(({ data, error }) => {
    console.log("Tokens:", data?.length);
    console.log(data);
    if (error) console.error("Error:", error);
  });
} else {
  console.log("Could not find keys in src/supabase.js");
}
