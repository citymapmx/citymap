import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env variables
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env.production.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`
};

const BASE_URL = "https://citymap.mx";

async function generateSitemap() {
  console.log("Fetching data from Supabase for Sitemap...");
  
  try {
    // 1. Fetch cities
    const citiesRes = await fetch(`${SUPABASE_URL}/rest/v1/cities?select=slug`, { headers });
    const cities = await citiesRes.json();
    
    // 2. Fetch active businesses
    const bizRes = await fetch(`${SUPABASE_URL}/rest/v1/businesses?status=eq.approved&select=slug,city_slug,category`, { headers });
    const businesses = await bizRes.json();
    
    // 3. Fetch active events
    const eventRes = await fetch(`${SUPABASE_URL}/rest/v1/events?status=eq.approved&select=slug,id`, { headers });
    const events = await eventRes.json();

    const urls = [];

    // Static pages
    urls.push({ loc: `${BASE_URL}/`, priority: 1.0 });
    urls.push({ loc: `${BASE_URL}/eventos`, priority: 0.9 });
    urls.push({ loc: `${BASE_URL}/mapa`, priority: 0.9 });
    urls.push({ loc: `${BASE_URL}/about`, priority: 0.5 });
    
    // Cities and their main category pages
    const mainCategories = ['restaurantes', 'cafe', 'salud', 'belleza', 'fitness', 'compras', 'tech', 'ocio', 'hoteles', 'educacion'];
    
    for (const city of cities) {
      const cSlug = city.slug;
      urls.push({ loc: `${BASE_URL}/${cSlug}`, priority: 0.9 });
      urls.push({ loc: `${BASE_URL}/experiencias/${cSlug}`, priority: 0.8 });
      
      for (const cat of mainCategories) {
        urls.push({ loc: `${BASE_URL}/${cSlug}/${cat}`, priority: 0.7 });
      }
    }

    // Businesses
    for (const biz of businesses) {
      if (!biz.slug) continue;
      const cSlug = biz.city_slug || 'tepic';
      const bCleaned = biz.slug.startsWith(`${cSlug}-`) ? biz.slug.slice(cSlug.length + 1) : biz.slug;
      urls.push({ loc: `${BASE_URL}/${cSlug}/${bCleaned}`, priority: 0.8 });
      urls.push({ loc: `${BASE_URL}/${cSlug}/${bCleaned}/menu`, priority: 0.7 });
    }

    // Events
    for (const ev of events) {
      const eSlug = ev.slug || ev.id;
      urls.push({ loc: `${BASE_URL}/evento/${eSlug}`, priority: 0.7 });
    }

    // Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    const today = new Date().toISOString().split('T')[0];
    
    for (const u of urls) {
      xml += `  <url>\n`;
      xml += `    <loc>${u.loc}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += `    <changefreq>daily</changefreq>\n`;
      xml += `    <priority>${u.priority.toFixed(1)}</priority>\n`;
      xml += `  </url>\n`;
    }
    
    xml += `</urlset>`;

    // Write to public/sitemap.xml
    const outPath = path.join(__dirname, 'public', 'sitemap.xml');
    fs.writeFileSync(outPath, xml, 'utf8');
    
    console.log(`✅ Sitemap successfully generated with ${urls.length} URLs at ${outPath}`);
  } catch (err) {
    console.error("❌ Error generating sitemap:", err);
  }
}

generateSitemap();
