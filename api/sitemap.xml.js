import { seoSite } from '../src/lib/seoRoutes.js';
const SUPABASE_URL  = "https://dpkjxhjkzdlkvyotoeai.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE";


function esc(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function asArray(value) {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function imagesXml(values) {
  return [...new Set(values.map(value => typeof value === 'string' ? value : value?.url).filter(value => /^https?:\/\//i.test(value || '')))]
    .slice(0, 10).map(url => `<image:image><image:loc>${esc(url)}</image:loc></image:image>`).join('');
}

export default async function handler(req) {
  const { isWorld, origin } = seoSite(new URL(req.url).hostname);
  try {
    const headers = { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` };
    async function rows(table, query) {
      const all = [];
      for (let offset = 0; ; offset += 1000) {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}&order=id.asc&limit=1000&offset=${offset}`, { headers });
        if (!response.ok) throw new Error(`Sitemap ${table}: HTTP ${response.status}`);
        const batch = await response.json();
        if (!Array.isArray(batch)) throw new Error(`Invalid sitemap data: ${table}`);
        all.push(...batch);
        if (batch.length < 1000) return all;
      }
    }
    const [businesses, events, cities, experiences] = await Promise.all([
      rows('businesses', 'status=eq.approved&select=slug,id,city_slug,category,updated_at,logo_url,photos'),
      rows('events', 'status=eq.approved&select=slug,id,city_slug,updated_at,img_url,img'),
      rows('cities', 'select=id,slug,name,country_code'),
      rows('experiences', 'status=eq.approved&select=slug,id,city_slug,updated_at,gallery'),
    ]);
    const byCity = new Map(cities.map(city => [city.slug, city]));
    const allowedCity = slug => byCity.has(slug) && (isWorld || (byCity.get(slug).country_code || 'mx').toLowerCase() === 'mx');
    const cityPath = slug => isWorld ? `/${(byCity.get(slug)?.country_code || 'mx').toLowerCase()}/${slug}` : `/${slug}`;
    const cityList = value => String(value || '').split(',').map(slug => slug.trim().toLowerCase()).filter(Boolean);
    const belongs = value => !value || value === 'all' || cityList(value).some(allowedCity);
    const urls = new Map();
    const add = (path, images = [], modified) => {
      const date = modified && !Number.isNaN(Date.parse(modified)) ? new Date(modified).toISOString() : null;
      urls.set(origin + path, { images: imagesXml(images), date });
    };
    ['/', '/mapa', '/eventos', '/revista', '/about', '/privacy', '/terms'].forEach(path => add(path));
    const categories = ['restaurantes', 'cafe', 'salud', 'belleza', 'fitness', 'compras', 'tech', 'ocio', 'hoteles', 'educacion'];
    for (const city of cities.filter(city => allowedCity(city.slug))) {
      add(cityPath(city.slug));
      categories.forEach(category => add(`${cityPath(city.slug)}/${category}`));
      add(`/revista/${city.slug}`);
    }
    for (const business of businesses) {
      const city = business.city_slug || 'tepic';
      if (!allowedCity(city)) continue;
      const slug = String(business.slug || business.id || '').replace(new RegExp(`^${city}-`), '');
      if (!slug) continue;
      const path = `${cityPath(city)}/${slug}`;
      const photos = asArray(business.photos);
      add(path, [business.logo_url, ...photos], business.updated_at);
      if (['restaurantes', 'cafe'].includes(business.category)) add(`${path}/menu`, [], business.updated_at);
    }
    for (const event of events.filter(event => belongs(event.city_slug))) {
      if (event.slug || event.id) add(`/evento/${event.slug || event.id}`, [event.img_url || event.img], event.updated_at);
    }
    for (const experience of experiences.filter(experience => belongs(experience.city_slug))) {
      const city = cityList(experience.city_slug).find(allowedCity) || (byCity.has('tepic') ? 'tepic' : cities.find(city => allowedCity(city.slug))?.slug);
      if (city && (experience.slug || experience.id)) add(`/revista/${city}/${experience.slug || experience.id}`, asArray(experience.gallery), experience.updated_at);
    }
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${[...urls].map(([url, entry]) => `<url><loc>${esc(url)}</loc>${entry.images}${entry.date ? `<lastmod>${entry.date}</lastmod>` : ''}</url>`).join('\n')}
</urlset>`;
    return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
  } catch (error) {
    console.error('Sitemap error:', error);
    // Do not replace a valid sitemap with an empty successful response during an outage.
    return new Response('Sitemap temporarily unavailable', { status: 503, headers: { 'Retry-After': '300', 'Cache-Control': 'no-store' } });
  }
}
export const config = { runtime: 'edge' };
