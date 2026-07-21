import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSlug, cleanCityPrefix } from '../src/lib/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = "https://dpkjxhjkzdlkvyotoeai.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE";

async function generateSitemap() {
  console.log("Generating sitemap.xml...");

  try {
    // Fetch approved businesses
    const bizRes = await fetch(`${SUPABASE_URL}/rest/v1/businesses?status=eq.approved&select=id,name,slug,city_slug`, {
      headers: {
        "apikey": SUPABASE_ANON,
        "Authorization": `Bearer ${SUPABASE_ANON}`
      }
    });
    
    if (!bizRes.ok) throw new Error(`Failed to fetch businesses: ${bizRes.statusText}`);
    const businesses = await bizRes.json();

    // Fetch approved events
    const evRes = await fetch(`${SUPABASE_URL}/rest/v1/events?status=eq.approved&select=id,title,slug,city_slug`, {
      headers: {
        "apikey": SUPABASE_ANON,
        "Authorization": `Bearer ${SUPABASE_ANON}`
      }
    });
    
    if (!evRes.ok) throw new Error(`Failed to fetch events: ${evRes.statusText}`);
    const events = await evRes.json();

    // Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://citymap.mx/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    for (const b of businesses) {
      xml += `
  <url>
    <loc>https://citymap.mx/${b.city_slug || "tepic"}/${cleanCityPrefix(b.slug || createSlug(b.name, b.id), b.city_slug || "tepic")}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    for (const ev of events) {
      xml += `
  <url>
    <loc>https://citymap.mx/evento/${cleanCityPrefix(ev.slug || createSlug(ev.title, ev.id), ev.city_slug || "tepic")}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    const categories = ["restaurantes", "cafe", "salud", "belleza", "fitness", "compras", "tech", "ocio", "hoteles", "educacion"];
    const cities = new Set(businesses.map(b => b.city_slug || "tepic"));
    for (const city of cities) {
      for (const cat of categories) {
        xml += `
  <url>
    <loc>https://citymap.mx/${city}/${cat}</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;
      }
    }

    xml += `
</urlset>`;

    const publicDir = path.join(__dirname, '..', 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const sitemapPath = path.join(publicDir, 'sitemap.xml');
    fs.writeFileSync(sitemapPath, xml, 'utf8');
    
    console.log(`✅ Sitemap successfully generated at public/sitemap.xml with ${businesses.length} businesses and ${events.length} events.`);

  } catch (error) {
    console.error("❌ Error generating sitemap:", error);
    process.exit(1);
  }
}

generateSitemap();
