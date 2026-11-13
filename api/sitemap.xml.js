import { seoSite, CATEGORY_SLUGS, normalizeCitySlug } from '../src/lib/seoRoutes.js';
import { eventUrl } from '../src/lib/eventUrls.js';
const SUPABASE_URL  = "https://dpkjxhjkzdlkvyotoeai.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE";


function esc(value = '') {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function asArray(value) {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}
function imagesXml(values, title) {
  const cleanTitle = typeof title === 'string' ? title.trim() : '';
  const titleXml = cleanTitle ? `<image:title>${esc(cleanTitle)}</image:title>` : '';
  return [...new Set(values.map(value => typeof value === 'string' ? value : value?.url).filter(value => /^https?:\/\//i.test(value || '')))]
    .slice(0, 10).map(url => `<image:image><image:loc>${esc(url)}</image:loc>${titleXml}</image:image>`).join('');
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
      rows('businesses', 'status=eq.approved&select=slug,id,city_slug,category,updated_at,logo_url,photos,name'),
      rows('events', 'status=eq.approved&select=slug,id,city_slug,updated_at,img_url,img,title'),
      rows('cities', 'select=id,slug,name,country_code,bg_image,created_at'),
      rows('experiences', 'status=eq.approved&select=slug,id,city_slug,updated_at,gallery,title'),
    ]);
    // byCity se indexa por el slug normalizado: antes del SQL de la
    // Fase 3 la base aún trae 'San-Pedro-Garza-García' y después
    // 'san-pedro-garza-garcia'. allowedCity y cityPath normalizan el
    // slug antes de buscar, así funcionan en ambos casos (también para
    // negocios con city_slug en mayúscula, p. ej. 'Zapopan').
    const byCity = new Map(cities.map(city => [normalizeCitySlug(city.slug), city]));
    // Split por dominio: citymap.mx lista solo México; citymap.world
    // lista solo las ciudades fuera de México (hoy 11). Ninguna URL
    // aparece en los dos sitemaps.
    const isMxCity = slug => byCity.has(slug) && (byCity.get(slug).country_code || 'mx').toLowerCase() === 'mx';
    const allowedCity = slug => {
      const norm = normalizeCitySlug(slug);
      return byCity.has(norm) && (isWorld ? !isMxCity(norm) : isMxCity(norm));
    };
    // El sitemap solo emite el slug normalizado, aunque la base aún
    // tenga la forma vieja.
    const cityPath = slug => {
      const norm = normalizeCitySlug(slug);
      return isWorld ? `/${(byCity.get(norm)?.country_code || 'mx').toLowerCase()}/${norm}` : `/${norm}`;
    };
    const cityList = value => String(value || '').split(',').map(slug => normalizeCitySlug(slug.trim())).filter(Boolean);
    const belongs = value => !value || value === 'all' || cityList(value).some(allowedCity);
    // lastmod real para ciudades y categorías, que no tienen updated_at
    // propio: la última actualización de su contenido (negocios, eventos
    // y experiencias de esa ciudad; para categorías, negocios de esa
    // ciudad y categoría). La ciudad usa además su created_at como
    // respaldo cuando no tiene contenido con fecha.
    const latest = (a, b) => {
      const tb = Date.parse(b || '');
      if (Number.isNaN(tb)) return a;
      const ta = Date.parse(a || '');
      return Number.isNaN(ta) || tb > ta ? b : a;
    };
    const cityMod = new Map();
    const catMod = new Map();
    const eventMod = new Map();
    const noteCity = (slug, date) => {
      if (!slug || slug === 'all') return;
      const key = normalizeCitySlug(slug);
      cityMod.set(key, latest(cityMod.get(key), date));
    };
    for (const business of businesses) {
      noteCity(business.city_slug, business.updated_at);
      const cat = String(business.category || '').toLowerCase().replace(/\s+/g, '-');
      if (business.city_slug && business.city_slug !== 'all' && cat && business.updated_at && !Number.isNaN(Date.parse(business.updated_at))) {
        const key = `${normalizeCitySlug(business.city_slug)}|${cat}`;
        catMod.set(key, latest(catMod.get(key), business.updated_at));
      }
    }
    for (const event of events) {
      for (const slug of cityList(event.city_slug)) {
        noteCity(slug, event.updated_at);
        eventMod.set(slug, latest(eventMod.get(slug), event.updated_at));
      }
    }
    for (const experience of experiences) {
      for (const slug of cityList(experience.city_slug)) noteCity(slug, experience.updated_at);
    }
    const urls = new Map();
    const add = (path, images = [], modified, title) => {
      const date = modified && !Number.isNaN(Date.parse(modified)) ? new Date(modified).toISOString() : null;
      urls.set(origin + path, { images: imagesXml(images, title), date });
    };
    // /tours y /negocios son de México: en .world redirigen a .mx y no
    // se listan en su sitemap.
    const staticPages = ['/', '/mapa', '/eventos', '/revista', '/about', '/privacy', '/terms'];
    if (!isWorld) staticPages.push('/tours', '/negocios');
    staticPages.forEach(path => add(path));
    const categories = CATEGORY_SLUGS;
    for (const city of cities.filter(city => allowedCity(city.slug))) {
      const norm = normalizeCitySlug(city.slug);
      add(cityPath(city.slug), city.bg_image ? [city.bg_image] : [], cityMod.get(norm) || city.created_at, city.name);
      categories.forEach(category => add(`${cityPath(city.slug)}/${category}`, [], catMod.get(`${norm}|${category}`)));
      add(`/eventos/${norm}`, [], eventMod.get(norm));
      add(`/revista/${norm}`);
    }
    for (const business of businesses) {
      const city = business.city_slug || 'tepic';
      if (!allowedCity(city)) continue;
      const slug = String(business.slug || business.id || '').replace(new RegExp(`^${city}-`), '');
      if (!slug) continue;
      const path = `${cityPath(city)}/${slug}`;
      const photos = asArray(business.photos);
      add(path, [business.logo_url, ...photos], business.updated_at, business.name);
      if (['restaurantes', 'cafe'].includes(business.category)) add(`${path}/menu`, [], business.updated_at);
    }
    for (const event of events.filter(event => belongs(event.city_slug) && event.visibility !== 'private')) {
      if (event.slug || event.id) add(eventUrl(event), [event.img_url || event.img], event.updated_at, event.title);
    }
    for (const experience of experiences.filter(experience => belongs(experience.city_slug))) {
      // La ciudad del artículo es la primera de sus ciudades que pertenece
      // a este dominio; si ninguna pertenece, se usa otra ciudad del
      // dominio (nunca una del otro: su URL saldría en el sitemap
      // equivocado).
      const city = cityList(experience.city_slug).find(allowedCity) || cities.find(c => allowedCity(c.slug))?.slug;
      if (city && (experience.slug || experience.id)) add(`/revista/${city}/${experience.slug || experience.id}`, asArray(experience.gallery), experience.updated_at, experience.title);
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
