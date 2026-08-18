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
    const host = req.headers.get("host") || "";
    const isWorld = host.endsWith("citymap.world");
    const BASE_URL = isWorld ? "https://citymap.world" : "https://citymap.mx";
    
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
    const eRes = await fetch(`${SUPABASE_URL}/rest/v1/events?status=eq.approved&select=slug,id,city_slug,updated_at`, { headers });
    const events = eRes.ok ? await eRes.json() : [];

    // Fetch all cities with country_code
    const cRes = await fetch(`${SUPABASE_URL}/rest/v1/cities?select=slug,name,country_code`, { headers });
    const cities = cRes.ok ? await cRes.json() : [];

    // Fetch all experiences
    const expRes = await fetch(`${SUPABASE_URL}/rest/v1/experiences?select=slug,id,city_slug,updated_at`, { headers });
    const experiences = expRes.ok ? await expRes.json() : [];

    const CATEGORIES = ["restaurantes", "cafe", "salud", "belleza", "fitness", "compras", "tech", "ocio", "hoteles", "educacion"];
    const today = new Date().toISOString().split('T')[0];

    // Helper functions for localized paths
    function getCountryCode(citySlug) {
      const city = cities.find(c => c.slug === citySlug);
      return city?.country_code || "mx";
    }

    function buildCityPath(citySlug) {
      if (!citySlug) return "/";
      if (!isWorld) return "/" + citySlug;
      return "/" + getCountryCode(citySlug) + "/" + citySlug;
    }

    // Filter based on target domain: citymap.mx only shows Mexican cities
    const filteredCities = isWorld ? cities : cities.filter(c => !c.country_code || c.country_code === "mx");
    
    const filteredBiz = isWorld ? allBiz : allBiz.filter(b => {
      const cc = getCountryCode(b.city_slug || "tepic");
      return cc === "mx";
    });

    const filteredEvents = isWorld ? events : events.filter(e => {
      const cc = getCountryCode(e.city_slug || "tepic");
      return cc === "mx";
    });

    const filteredExperiences = isWorld ? experiences : experiences.filter(exp => {
      const cc = getCountryCode(exp.city_slug || "tepic");
      return cc === "mx";
    });

    let urls = [];

    // Core routes
    urls.push({ loc: `${BASE_URL}/`, freq: "daily", priority: "1.0", lastmod: today });
    urls.push({ loc: `${BASE_URL}/mapa`, freq: "daily", priority: "0.8" });
    urls.push({ loc: `${BASE_URL}/eventos`, freq: "daily", priority: "0.8" });
    urls.push({ loc: `${BASE_URL}/about`, freq: "monthly", priority: "0.4" });
    urls.push({ loc: `${BASE_URL}/privacy`, freq: "yearly", priority: "0.2" });
    urls.push({ loc: `${BASE_URL}/terms`, freq: "yearly", priority: "0.2" });

    // City pages + Category pages per city
    for (const c of filteredCities) {
      if (!c.slug) continue;
      const cityPath = buildCityPath(c.slug);
      urls.push({ loc: `${BASE_URL}${cityPath}`, freq: "daily", priority: "0.9", lastmod: today });
      
      // Category landing pages (e.g. /tepic/restaurantes or /mx/tepic/restaurantes)
      for (const cat of CATEGORIES) {
        urls.push({ loc: `${BASE_URL}${cityPath}/${esc(cat)}`, freq: "weekly", priority: "0.85" });
      }

      // Experiencias page per city (always /experiencias/:city without country prefix)
      urls.push({ loc: `${BASE_URL}/experiencias/${esc(c.slug)}`, freq: "daily", priority: "0.9", lastmod: today });
    }

    // Individual business pages: /city/business-slug or /country/city/business-slug
    for (const b of filteredBiz) {
      const slug = b.slug || b.id;
      const city = b.city_slug || "tepic";
      const cleanedSlug = cleanSlug(slug, city);
      if (!cleanedSlug) continue;
      const cityPath = buildCityPath(city);
      
      urls.push({
        loc: `${BASE_URL}${cityPath}/${esc(cleanedSlug)}`,
        freq: "weekly",
        priority: "0.7",
        lastmod: b.updated_at ? b.updated_at.split('T')[0] : undefined
      });

      // Add /menu endpoint for food businesses
      if (b.category === 'restaurantes' || b.category === 'cafe') {
        urls.push({
          loc: `${BASE_URL}${cityPath}/${esc(cleanedSlug)}/menu`,
          freq: "weekly",
          priority: "0.6",
          lastmod: b.updated_at ? b.updated_at.split('T')[0] : undefined
        });
      }
    }

    // Events
    for (const e of filteredEvents) {
      const evSlug = e.slug || e.id;
      if (!evSlug) continue;
      urls.push({
        loc: `${BASE_URL}/evento/${esc(evSlug)}`,
        freq: "daily",
        priority: "0.7",
        lastmod: e.updated_at ? e.updated_at.split('T')[0] : undefined
      });
    }

    // Experiences (Individual)
    for (const exp of filteredExperiences) {
      const expSlug = exp.slug || exp.id;
      const city = exp.city_slug || "tepic";
      if (!expSlug) continue;
      urls.push({
        loc: `${BASE_URL}/experiencias/${esc(city)}/${esc(expSlug)}`,
        freq: "weekly",
        priority: "0.8",
        lastmod: exp.updated_at ? exp.updated_at.split('T')[0] : undefined
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
    const host = req.headers.get("host") || "";
    const isWorld = host.endsWith("citymap.world");
    const fallbackDomain = isWorld ? "https://citymap.world" : "https://citymap.mx";
    return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${fallbackDomain}/</loc></url></urlset>`, { 
      status: 200,
      headers: { "Content-Type": "application/xml; charset=utf-8" }
    });
  }
}

export const config = { runtime: "edge" };
