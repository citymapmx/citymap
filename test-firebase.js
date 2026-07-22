import fs from 'fs';
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

async function run() {
  const envContent = fs.readFileSync('.env.production.local', 'utf-8');
  const envVars = {};
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      envVars[match[1]] = match[2].replace(/^["']|["']$/g, '').trim();
    }
  });

  const supabaseUrl = envVars['VITE_SUPABASE_URL'];
  const serviceRoleKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];
  const firebaseSa = envVars['FIREBASE_SERVICE_ACCOUNT'];

  console.log("Fetching tokens from Supabase...");
  const r = await fetch(`${supabaseUrl}/rest/v1/push_tokens?select=token`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    }
  });
  const data = await r.json();
  const tokens = data.map(t => t.token);
  console.log("Tokens in DB:", tokens.length);

  if (tokens.length === 0) return;

  initializeApp({ credential: cert(JSON.parse(firebaseSa)) });

  console.log("Sending test push...");
  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: "Test", body: "Test from terminal" },
  });

  console.log(`Success: ${response.successCount}, Failure: ${response.failureCount}`);
  response.responses.forEach((resp, i) => {
    if (!resp.success) {
      console.log(`Token ${i} failed:`, resp.error);
    }
  });
}
run();
