import dotenv from 'dotenv';
dotenv.config({ path: '.env.production.local' });
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

async function run() {
  if (!getApps().length) {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  console.log("Fetching tokens...");
  const r = await fetch(`${supabaseUrl}/rest/v1/push_tokens?select=token`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    }
  });

  const data = await r.json();
  console.log("Tokens fetched:", data);

  const tokens = data.map(t => t.token);
  if (tokens.length === 0) {
    console.log("No tokens");
    return;
  }

  console.log("Sending push to tokens:", tokens);
  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: "Test", body: "Test" },
    android: { notification: { sound: 'default' } }
  });

  console.log("Success count:", response.successCount);
  console.log("Failure count:", response.failureCount);
  response.responses.forEach((resp, idx) => {
    if (!resp.success) {
      console.log(`Token ${idx} failed:`, resp.error);
    }
  });
}
run();
