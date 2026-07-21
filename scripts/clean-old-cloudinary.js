// Script to find and clean broken Cloudinary URLs from old account
const SUPABASE_URL = "https://dpkjxhjkzdlkvyotoeai.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE";
const OLD_CLOUD = "dwgpsrybv";

const headers = {
  "apikey": SUPABASE_ANON,
  "Authorization": `Bearer ${SUPABASE_ANON}`,
  "Content-Type": "application/json",
  "Prefer": "return=representation"
};

async function run() {
  // 1. Fetch ALL businesses
  console.log("📡 Fetching all businesses...");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/businesses?select=id,name,photos,logo_url,video_url,menu_pdf_url&limit=500`, { headers });
  const biz = await r.json();
  console.log(`Found ${biz.length} businesses total.\n`);

  let affectedCount = 0;
  let cleanedCount = 0;

  for (const b of biz) {
    const issues = [];
    const updates = {};

    // Check photos array
    if (b.photos && Array.isArray(b.photos)) {
      const cleanPhotos = b.photos.filter(p => !p.url?.includes(OLD_CLOUD));
      const broken = b.photos.length - cleanPhotos.length;
      if (broken > 0) {
        issues.push(`${broken} foto(s) rotas`);
        updates.photos = cleanPhotos;
      }
    }

    // Check logo_url
    if (b.logo_url && b.logo_url.includes(OLD_CLOUD)) {
      issues.push("logo roto");
      updates.logo_url = null;
    }

    // Check video_url
    if (b.video_url && b.video_url.includes(OLD_CLOUD)) {
      issues.push("video roto");
      updates.video_url = null;
    }

    // Check menu_pdf_url
    if (b.menu_pdf_url && b.menu_pdf_url.includes(OLD_CLOUD)) {
      issues.push("menú PDF roto");
      updates.menu_pdf_url = null;
    }

    if (issues.length > 0) {
      affectedCount++;
      console.log(`❌ ${b.name} — ${issues.join(", ")}`);

      // Apply update
      const patchR = await fetch(`${SUPABASE_URL}/rest/v1/businesses?id=eq.${b.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(updates)
      });

      if (patchR.ok) {
        cleanedCount++;
        console.log(`   ✅ Limpiado correctamente`);
      } else {
        const err = await patchR.text();
        console.log(`   ⚠️ Error al limpiar: ${err}`);
      }
    }
  }

  // 2. Also check events
  console.log("\n📡 Checking events...");
  const evR = await fetch(`${SUPABASE_URL}/rest/v1/events?select=id,title,img_url,img&limit=200`, { headers });
  const events = await evR.json();

  for (const e of events) {
    const updates = {};
    const issues = [];

    if (e.img_url && e.img_url.includes(OLD_CLOUD)) {
      issues.push("img_url rota");
      updates.img_url = null;
    }
    if (e.img && e.img.includes(OLD_CLOUD)) {
      issues.push("img rota");
      updates.img = null;
    }

    if (issues.length > 0) {
      affectedCount++;
      console.log(`❌ Evento: ${e.title} — ${issues.join(", ")}`);
      const patchR = await fetch(`${SUPABASE_URL}/rest/v1/events?id=eq.${e.id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(updates)
      });
      if (patchR.ok) {
        cleanedCount++;
        console.log(`   ✅ Limpiado`);
      } else {
        console.log(`   ⚠️ Error`);
      }
    }
  }

  console.log(`\n════════════════════════════════`);
  console.log(`📊 RESUMEN:`);
  console.log(`   Negocios/Eventos afectados: ${affectedCount}`);
  console.log(`   Limpiados exitosamente: ${cleanedCount}`);
  console.log(`════════════════════════════════`);
}

run().catch(console.error);
