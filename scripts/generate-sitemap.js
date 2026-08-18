import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createSlug, cleanCityPrefix } from '../src/lib/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = "https://dpkjxhjkzdlkvyotoeai.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE";

// Format a date to YYYY-MM-DD for lastmod (sitemap spec requires W3C date format)
const toW3CDate = (dateStr) => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  try {
    return new Date(dateStr).toISOString().split('T')[0];
  } catch {
    return new Date().toISOString().split('T')[0];
  }
};

const TODAY = new Date().toISOString().split('T')[0];

async function generateSitemap() {
  console.log("Generating sitemap.xml...");

  try {
    // Fetch approved businesses — include updated_at and created_at for lastmod
    const bizRes = await fetch(
      `${SUPABASE_URL}/rest/v1/businesses?status=eq.approved&select=id,name,slug,city_slug,logo_url,photos,created_at`,
      { headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}` } }
    );
    if (!bizRes.ok) throw new Error(`Failed to fetch businesses: ${bizRes.statusText}`);
    const businesses = await bizRes.json();

    // Fetch approved events — include updated_at and created_at
    const evRes = await fetch(
      `${SUPABASE_URL}/rest/v1/events?status=eq.approved&select=id,title,slug,city_slug,img_url,img,created_at`,
      { headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}` } }
    );
    if (!evRes.ok) throw new Error(`Failed to fetch events: ${evRes.statusText}`);
    const events = await evRes.json();

    // Fetch approved experiences — include updated_at and created_at
    const expRes = await fetch(
      `${SUPABASE_URL}/rest/v1/experiences?status=eq.approved&select=id,title,slug,city_slug,gallery,created_at`,
      { headers: { "apikey": SUPABASE_ANON, "Authorization": `Bearer ${SUPABASE_ANON}` } }
    );
    if (!expRes.ok) throw new Error(`Failed to fetch experiences: ${expRes.statusText}`);
    const experiences = await expRes.json();

    // Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://citymap.mx/</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`;

    for (const b of businesses) {
      let imagesXml = '';
      if (b.logo_url) imagesXml += `\n    <image:image><image:loc>${b.logo_url.replace(/&/g, '&amp;')}</image:loc></image:image>`;
      if (b.photos && Array.isArray(b.photos)) {
        b.photos.slice(0, 3).forEach(p => {
          if (p.url) imagesXml += `\n    <image:image><image:loc>${p.url.replace(/&/g, '&amp;')}</image:loc></image:image>`;
        });
      }
      const lastmod = toW3CDate(b.created_at);
      xml += `
  <url>
    <loc>https://citymap.mx/${b.city_slug || "tepic"}/${cleanCityPrefix(b.slug || createSlug(b.name, b.id), b.city_slug || "tepic")}</loc>${imagesXml}
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    for (const ev of events) {
      let imagesXml = '';
      const img = ev.img_url || ev.img;
      if (img) imagesXml += `\n    <image:image><image:loc>${img.replace(/&/g, '&amp;')}</image:loc></image:image>`;
      const lastmod = toW3CDate(ev.created_at);
      xml += `
  <url>
    <loc>https://citymap.mx/evento/${cleanCityPrefix(ev.slug || createSlug(ev.title, ev.id), ev.city_slug || "tepic")}</loc>${imagesXml}
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
    }

    for (const exp of experiences) {
      let imagesXml = '';
      if (exp.gallery && Array.isArray(exp.gallery)) {
        exp.gallery.slice(0, 3).forEach(g => {
          if (g) imagesXml += `\n    <image:image><image:loc>${g.replace(/&/g, '&amp;')}</image:loc></image:image>`;
        });
      }
      const lastmod = toW3CDate(exp.created_at);
      xml += `
  <url>
    <loc>https://citymap.mx/experiencias/${exp.city_slug || "tepic"}/${cleanCityPrefix(exp.slug || createSlug(exp.title, exp.id), exp.city_slug || "tepic")}</loc>${imagesXml}
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }

    const categories = ["restaurantes", "cafe", "salud", "belleza", "fitness", "compras", "tech", "ocio", "hoteles", "educacion", "antros-y-bares"];
    const cities = new Set([
      ...businesses.map(b => b.city_slug || "tepic"),
      ...experiences.map(e => e.city_slug || "tepic")
    ]);

    for (const city of cities) {
      // City home and map pages — fresh every day
      xml += `
  <url>
    <loc>https://citymap.mx/${city}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://citymap.mx/mapa/${city}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://citymap.mx/experiencias/${city}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>`;

      // Category pages per city
      for (const cat of categories) {
        xml += `
  <url>
    <loc>https://citymap.mx/${city}/${cat}</loc>
    <lastmod>${TODAY}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
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
    
    console.log(`✅ Sitemap generated: ${businesses.length} negocios, ${events.length} eventos, ${experiences.length} experiencias, ${cities.size} ciudades × ${categories.length} categorías.`);

  } catch (error) {
    console.error("❌ Error generating sitemap:", error);
    process.exit(1);
  }
}

generateSitemap();
