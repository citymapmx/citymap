const SUPABASE_URL  = "https://dpkjxhjkzdlkvyotoeai.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE";

function esc(s = "") {
  return String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Remove city prefix from slug if present
function cleanSlug(slug, citySlug) {
  if (!slug || !citySlug) return slug || "";
  if (slug.startsWith(citySlug + "-")) return slug.slice(citySlug.length + 1);
  return slug;
}

export default async function handler(req) {
  try {
    const headers = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` };
    
    // Fetch all approved businesses (with city_slug for proper URLs)
    let allBiz = [];
    let offset = 0;
    while (true) {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/businesses?status=eq.approved&select=slug,id,city_slug,category,updated_at&limit=1000&offset=${offset}`, { headers });
      const chunk = res.ok ? await res.json() : [];
      allBiz = allBiz.concat(chunk);
      if (chunk.length < 1000) break;
      offset += 1000;
    }

    // Fetch all approved events
    const eRes = await fetch(`${SUPABASE_URL}/rest/v1/events?status=eq.approved&select=slug,id,updated_at`, { headers });
    const events = eRes.ok ? await eRes.json() : [];

    // Fetch all cities
    const cRes = await fetch(`${SUPABASE_URL}/rest/v1/cities?select=slug,name`, { headers });
    const cities = cRes.ok ? await cRes.json() : [];

    const BASE_URL = "https://citymap.mx";
    const CATEGORIES = ["restaurantes", "cafe", "salud", "belleza", "fitness", "compras", "tech", "ocio", "hoteles", "educacion"];
    const today = new Date().toISOString().split('T')[0];

    let urls = [];

    // Core routes
    urls.push({ loc: `${BASE_URL}/`, freq: "daily", priority: "1.0", lastmod: today });
    urls.push({ loc: `${BASE_URL}/mapa`, freq: "daily", priority: "0.8" });
    urls.push({ loc: `${BASE_URL}/eventos`, freq: "daily", priority: "0.8" });
    urls.push({ loc: `${BASE_URL}/about`, freq: "monthly", priority: "0.4" });
    urls.push({ loc: `${BASE_URL}/privacy`, freq: "yearly", priority: "0.2" });
    urls.push({ loc: `${BASE_URL}/terms`, freq: "yearly", priority: "0.2" });

    // City pages + Category pages per city
    for (const c of cities) {
      if (!c.slug) continue;
      urls.push({ loc: `${BASE_URL}/${esc(c.slug)}`, freq: "daily", priority: "0.9", lastmod: today });
      
      // Category landing pages (e.g. /tepic/restaurantes)
      for (const cat of CATEGORIES) {
        // Only add if there are businesses in this city+category
        const hasBiz = allBiz.some(b => b.city_slug === c.slug && (b.category === cat || b.category === c.slug));
        if (hasBiz || true) { // Always include for indexing
          urls.push({ loc: `${BASE_URL}/${esc(c.slug)}/${esc(cat)}`, freq: "weekly", priority: "0.85" });
        }
      }
    }

    // Individual business pages with clean URLs: /city/business-slug
    for (const b of allBiz) {
      const slug = b.slug || b.id;
      const city = b.city_slug || "tepic";
      const cleanedSlug = cleanSlug(slug, city);
      if (!cleanedSlug) continue;
      
      urls.push({
        loc: `${BASE_URL}/${esc(city)}/${esc(cleanedSlug)}`,
        freq: "weekly",
        priority: "0.7",
        lastmod: b.updated_at ? b.updated_at.split('T')[0] : undefined
      });
    }

    // Events
    for (const e of events) {
      const evSlug = e.slug || e.id;
      if (!evSlug) continue;
      urls.push({
        loc: `${BASE_URL}/evento/${esc(evSlug)}`,
        freq: "daily",
        priority: "0.7",
        lastmod: e.updated_at ? e.updated_at.split('T')[0] : undefined
      });
    }

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `
    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.freq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("Sitemap error:", error);
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://citymap.mx/</loc></url></urlset>`, { 
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" }
    });
  }
}

export const config = { runtime: "edge" };
