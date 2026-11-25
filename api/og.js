import { seoSite, normalizeCitySlug, legacyCitySlug, isWorldCitySlug, cityDisplayName, cityPageTitle, cityPageDescription, homePageTitle, homePageDescription } from '../src/lib/seoRoutes.js';
import { currencyForCountryCode } from '../src/lib/domain.js';
import { tourSchemaNodes } from '../src/lib/tourSchema.js';
import { eventUrl, resolveEventSlug } from '../src/lib/eventUrls.js';
import { CITY_TZ } from '../src/lib/constants.js';
import {
  scheduleToOpeningHours, eventStartDate, eventEndDate, eventStatusUrl,
  eventOffer, breadcrumbList, faqPage, businessDescriptionFallback,
  softwareApplicationSchema,
} from '../src/lib/structuredData.js';
const SUPABASE_URL  = "https://dpkjxhjkzdlkvyotoeai.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE";

const BOTS = ["googlebot","bingbot","facebookexternalhit","twitterbot","linkedinbot","whatsapp","telegrambot","applebot","discordbot","slackbot","pinterest","vkshare","w3c_validator","curl","python-requests"];

function isBot(ua = "") {
  const l = ua.toLowerCase();
  return BOTS.some(b => l.includes(b));
}

function esc(s = "") {
  return String(s).replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

const CAT_SEO = {
  "restaurantes": { title: "Los Mejores Restaurantes en {city} — Horarios y Reseñas", desc: "Encuentra los mejores restaurantes en {city}. Consulta menús, horarios, ubicaciones y reseñas de clientes. ¡Descubre dónde comer hoy!", label: "Restaurantes" },
  "cafe":         { title: "Las Mejores Cafeterías en {city} — Menús y Horarios", desc: "Descubre las mejores cafeterías en {city}. Coffee shops, postres, ambiente y horarios actualizados. Tu próximo café favorito te espera.", label: "Cafeterías" },
  "salud":        { title: "Salud y Bienestar en {city} — Clínicas, Doctores y Más", desc: "Encuentra clínicas, consultorios médicos, farmacias y centros de bienestar en {city}. Horarios, direcciones y reseñas.", label: "Salud y Bienestar" },
  "belleza":      { title: "Las Mejores Estéticas y Spas en {city} — Belleza y Cuidado Personal", desc: "Salones de belleza, barberías, spas y estéticas en {city}. Reserva tu cita, consulta precios y encuentra el lugar perfecto para ti.", label: "Belleza y Estética" },
  "fitness":      { title: "Los Mejores Gimnasios en {city} — Fitness y Entrenamiento", desc: "Gimnasios, crossfit, yoga y centros deportivos en {city}. Horarios, precios y promociones para ponerte en forma.", label: "Gimnasios y Fitness" },
  "compras":      { title: "Las Mejores Tiendas en {city} — Compras y Comercios", desc: "Tiendas, boutiques y comercios en {city}. Encuentra las mejores opciones para tus compras con horarios y ubicaciones exactas.", label: "Tiendas y Compras" },
  "tech":         { title: "Tecnología y Servicios Digitales en {city} — Tiendas y Reparación", desc: "Tiendas de tecnología, reparación de celulares, cómputo y servicios digitales en {city}. Encuentra lo que necesitas.", label: "Tecnología" },
  "ocio":         { title: "Entretenimiento y Ocio en {city} — Bares, Antros y Diversión", desc: "Los mejores bares, antros, centros de entretenimiento y diversión en {city}. Horarios, eventos especiales y reseñas.", label: "Entretenimiento y Ocio" },
  "hoteles":      { title: "Los Mejores Hoteles en {city} — Hospedaje y Alojamiento", desc: "Hoteles, posadas, Airbnb y hospedaje en {city}. Compara opciones, consulta precios y reserva tu estancia ideal.", label: "Hoteles y Hospedaje" },
  "educacion":    { title: "Escuelas y Educación en {city} — Colegios, Cursos y Más", desc: "Escuelas, universidades, academias y cursos en {city}. Encuentra opciones educativas con horarios e información de contacto.", label: "Educación" },
  "antros-y-bares": { title: "Los Mejores Antros y Bares en {city} — Vida Nocturna", desc: "Descubre los mejores antros y bares en {city}. Ambiente, horarios y reseñas para tu próxima salida nocturna.", label: "Antros y Bares" },
  "servicios":    { title: "Servicios en {city} — Profesionales y Negocios Locales", desc: "Encuentra servicios profesionales y negocios locales en {city}. Horarios, direcciones y reseñas de clientes.", label: "Servicios" },
  "mascotas":     { title: "Servicios para Mascotas en {city} — Veterinarias y Estéticas", desc: "Veterinarias, estéticas caninas y servicios para mascotas en {city}. Horarios, direcciones y reseñas.", label: "Mascotas" }
};

// 404 real para bots: lo que ya no existe (negocio/evento/artículo borrado)
// no debe devolver la home con 200 — Google lo lee como "soft 404" y no
// lo saca del índice. El middleware ya pasa los 404 de og con noindex.
function notFoundHtml(title = "Página no encontrada") {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 — ${esc(title)} | CityMap</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:20vh 24px"><h1>404</h1><p>${esc(title)}</p><p><a href="/">Ir al inicio</a></p></body></html>`;
}

function notFoundResponse(title) {
  return new Response(notFoundHtml(title), {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" },
  });
}

// Página de categoría para bots: mismo marcado para las categorías
// de CAT_SEO y para las subcategorías /:ciudad/c/:subcategoria.
function renderCategoryPage({ title, desc, label, cityName, canonicalUrl, img, listing, siteName, locale, schemaJson = "" }) {
  return `<!doctype html>
<html lang="es" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${canonicalUrl}"/>

<!-- Open Graph -->
<meta property="og:type" content="website"/>
<meta property="og:url" content="${canonicalUrl}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${esc(img)}"/>
<meta property="og:site_name" content="${esc(siteName)}"/>
<meta property="og:locale" content="${esc(locale)}"/>

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(img)}"/>
${schemaJson}
</head>
<body>
<h1>${esc(label)} en ${esc(cityName)}</h1>
<img src="${esc(img)}" alt="${esc(label)} en ${esc(cityName)}" style="max-width: 100%; height: auto;" />
<p>${esc(desc)}</p>
${listing}
<a href="${canonicalUrl}">Ver ${esc(label)} en ${esc(siteName)}</a>
</body>
</html>`;
}

// ¿Existe este valor como businesses.category en alguna ciudad?
// Distingue una subcategoría real (p. ej. "unidad deportiva") de un slug inventado.
async function isRealCategory(value) {
  try {
    const query = new URLSearchParams({ select: 'category', category: `eq.${value}`, limit: '1' });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/businesses?${query}`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
    });
    if (!response.ok) return false;
    const rows = await response.json();
    return Array.isArray(rows) && rows.length > 0;
  } catch { return false; }
}

async function getReviews(bizId) {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/reviews?biz_id=eq.${bizId}&select=stars,text,user_name,created_at&order=created_at.desc&limit=3`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    if (!r.ok) return [];
    return await r.json();
  } catch {
    return [];
  }
}

async function getCityData(citySlug) {
  if (!citySlug) return { country_code: "mx", bg_image: null };
  try {
    // Se busca por la forma canónica y por la vieja: antes del SQL de la
    // Fase 3 la base aún tiene el slug con mayúsculas/tildes, y después
    // solo el normalizado. Así la URL nueva funciona en ambos casos.
    const normalized = normalizeCitySlug(citySlug);
    const variants = [...new Set([citySlug, normalized, legacyCitySlug(normalized)].filter(Boolean))];
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/cities?slug=in.(${variants.join(',')})&select=country_code,bg_image,name,state`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    if (!r.ok) return { country_code: "mx", bg_image: null };
    const d = await r.json();
    return {
      country_code: d?.[0]?.country_code || "mx",
      bg_image: d?.[0]?.bg_image || null,
      name: d?.[0]?.name || null,
      state: d?.[0]?.state || null,
      exists: Boolean(d?.[0])
    };
  } catch {
    return { country_code: "mx", bg_image: null };
  }
}

function photoList(value) {
  if (Array.isArray(value)) return value;
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed : []; } catch { return []; }
}

async function getListing(city, category, origin, cityPath) {
  try {
    // La ciudad se busca por la forma canónica y por la vieja (igual que
    // getCityData): antes del SQL de la Fase 3 los negocios aún guardan
    // el slug viejo en city_slug.
    const cityVariants = [...new Set([city, legacyCitySlug(city)].filter(Boolean))];
    const query = new URLSearchParams({ city_slug: `in.(${cityVariants.join(',')})`, status: 'eq.approved',
      select: 'id,slug,name,description,logo_url,photos', order: 'name.asc', limit: '24' });
    if (category) {
      // La base guarda la categoría con espacios y a veces con mayúscula
      // ("antros y bares", "Servicios") mientras la ruta usa guiones en
      // minúscula ("antros-y-bares", "servicios"): se consultan las variantes.
      const spaced = category.replace(/-/g, ' ');
      const variants = [...new Set([
        category,
        spaced,
        spaced.charAt(0).toUpperCase() + spaced.slice(1),
      ])];
      query.set('category', `in.(${variants.join(',')})`);
    }
    const response = await fetch(`${SUPABASE_URL}/rest/v1/businesses?${query}`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
    });
    if (!response.ok) return '';
    const rows = await response.json();
    if (!Array.isArray(rows)) return '';
    return `<section><h2>${category ? 'Lugares para descubrir' : 'Lugares en esta ciudad'}</h2><ul>${rows.map(business => {
      const slug = String(business.slug || business.id).replace(new RegExp(`^${city}-`), '');
      const photo = photoList(business.photos)[0];
      const image = (typeof photo === 'string' ? photo : photo?.url) || business.logo_url;
      return `<li><article><h3><a href="${esc(origin + cityPath + '/' + slug)}">${esc(business.name)}</a></h3>${/^https?:\/\//i.test(image || '') ? `<img src="${esc(image)}" alt="${esc(business.name)} en ${esc(city.replace(/-/g, ' '))}" loading="lazy" style="max-width:100%;height:auto" />` : ''}${business.description ? `<p>${esc(business.description.slice(0, 300))}</p>` : ''}</article></li>`;
    }).join('')}</ul></section>`;
  } catch { return ''; }
}

// Slug para la URL del artículo de un tour en la Revista, igual que
// tourCardUrl (src/lib/tours.js): /revista/:ciudad/:slug-del-titulo.
// Se duplica aquí para no meter React (vía utils.js) en el Edge.
function tourSlug(title) {
  return String(title || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// Lista de tours para la página /tours: misma consulta que la SPA
// (ToursView): experiences con activity_type Tour, aprobados y activos.
async function getToursListing(origin) {
  try {
    const query = new URLSearchParams({ select: 'id,title,city_slug,price,duration,gallery,booking_config', activity_type: 'eq.Tour', status: 'eq.approved', active: 'eq.true', order: 'created_at.desc', limit: '24' });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/experiences?${query}`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
    });
    if (!response.ok) return '';
    const rows = await response.json();
    if (!Array.isArray(rows) || !rows.length) return '';
    // La lista es la misma que ve el usuario en /tours (la SPA no filtra
    // por dominio): tours mexicanos y del resto del mundo mezclados, con
    // la moneda de cada ciudad (USD fuera de México, MXN en México).
    if (!rows.length) return '';
    return `<section><h2>Tours destacados</h2><ul>${rows.map(tour => {
      const cityName = String(tour.city_slug || '').replace(/-/g, ' ');
      const url = `${origin}/revista/${tour.city_slug || ''}/${tourSlug(tour.title)}`;
      const price = Number(tour.price);
      const currency = isWorldCitySlug(String(tour.city_slug || '').split(',')[0]) ? 'USD' : 'MXN';
      const priceText = Number.isFinite(price) && price > 0
        ? `desde $${Math.round(price).toLocaleString('es-MX')} ${currency}`
        : (tour.price === 0 || tour.price === '0' ? 'Gratis' : '');
      let duration = String(tour?.duration || '').trim();
      if (!duration && Array.isArray(tour?.booking_config?.quick_facts)) {
        for (const fact of tour.booking_config.quick_facts) {
          const m = String(fact || '').match(/⏱️?\s*Tiempo:\s*(.+)$/i);
          if (m && m[1].trim()) { duration = m[1].trim(); break; }
        }
      }
      const photo = photoList(tour.gallery)[0];
      const image = (typeof photo === 'string' ? photo : photo?.url) || '';
      return `<li><article><h3><a href="${esc(url)}">${esc(tour.title)}</a></h3>${/^https?:\/\//i.test(image) ? `<img src="${esc(image)}" alt="${esc(tour.title)}" loading="lazy" style="max-width:100%;height:auto" />` : ''}${cityName ? `<p>${esc(cityName)}</p>` : ''}${priceText ? `<p>${esc(priceText)}</p>` : ''}${duration ? `<p>⏱ ${esc(duration)}</p>` : ''}</article></li>`;
    }).join('')}</ul></section>`;
  } catch { return ''; }
}

// Negocios de ejemplo para la página /negocios ("Ya están en CityMap"):
// negocios aprobados con enlace a su página pública.
async function getNegociosExamples(origin) {
  try {
    const query = new URLSearchParams({ select: 'id,slug,name,city_slug', status: 'eq.approved', order: 'name.asc', limit: '8' });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/businesses?${query}`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
    });
    if (!response.ok) return '';
    const rows = await response.json();
    if (!Array.isArray(rows)) return '';
    // /negocios es de México: solo negocios mexicanos como ejemplo.
    const withCity = rows.filter(b => b.city_slug && !isWorldCitySlug(b.city_slug) && (b.slug || b.id));
    if (!withCity.length) return '';
    return `<section><h2>Ya están en CityMap</h2><ul>${withCity.map(business => {
      const slug = String(business.slug || business.id).replace(new RegExp(`^${business.city_slug}-`), '');
      return `<li><a href="${esc(origin + '/' + business.city_slug + '/' + slug)}">${esc(business.name)}</a></li>`;
    }).join('')}</ul></section>`;
  } catch { return ''; }
}

// Número de ciudades mexicanas con página en CityMap (para el texto de
// la landing en /negocios, que es de México). Si falla, se devuelve null
// y el texto no lleva cifra.
async function getCityCount() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/cities?select=slug&country_code=eq.mx&limit=100`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
    });
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) ? rows.length : null;
  } catch { return null; }
}

// Fecha local YYYY-MM-DD (misma idea que todayLocalStr en
// negociosStats.js): "próximo" se mide con el día del servidor, igual
// que la app mide "vigente" con el día del usuario.
function todayStr(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Criterio de "próximo" del sitemap (punto 2 de la fontanería SEO):
// fuera solo si end_date no vacío y < hoy, o end_date vacío y date <
// hoy. Los de varios días cuentan mientras su end_date no haya pasado.
function isUpcomingEvent(ev, today) {
  const end = String(ev?.end_date || "").trim();
  if (end) return end >= today;
  return String(ev?.date || "").trim() >= today;
}

// Pertenencia a ciudad, mismo criterio `belongs` del sitemap
// (api/sitemap.xml.js): alguno de los segmentos de city_slug partido
// por coma es esa ciudad (normalizado); 'all' o vacío vale para todas.
function eventBelongsToCity(citySlug, city) {
  const value = String(citySlug || "").trim();
  if (!value || value === "all") return true;
  const target = normalizeCitySlug(city);
  return value.split(",").map(s => normalizeCitySlug(s.trim())).filter(Boolean).includes(target);
}

// Pertenencia a un dominio (.mx o .world): alguno de los segmentos de
// city_slug está entre las ciudades de ese dominio; 'all' o vacío vale
// para todas (igual que `belongs` del sitemap).
function eventBelongsToDomain(citySlug, allowedCities) {
  const value = String(citySlug || "").trim();
  if (!value || value === "all") return true;
  return value.split(",").map(s => normalizeCitySlug(s.trim())).filter(Boolean).some(s => allowedCities.has(s));
}

// Fecha legible y determinista (zona UTC: la fecha guardada es
// YYYY-MM-DD sin hora, así no baila un día según la zona del edge).
function eventDateText(date) {
  if (!date) return "";
  try {
    return new Date(`${String(date).slice(0, 10)}T12:00:00Z`).toLocaleDateString("es-MX", { timeZone: "UTC", weekday: "long", year: "numeric", month: "long", day: "numeric" });
  } catch { return String(date).slice(0, 10); }
}

// Ciudades de un dominio (la tabla cities es la fuente de verdad, igual
// que en el sitemap): en .mx solo México, en .world solo fuera de
// México. Si falla, se devuelve [] y la home queda como antes.
async function getDomainCities(isWorld) {
  try {
    const query = new URLSearchParams({ select: 'slug,name,country_code', order: 'name.asc', limit: '100' });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/cities?${query}`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
    });
    if (!response.ok) return [];
    const rows = await response.json();
    if (!Array.isArray(rows)) return [];
    return rows.filter(c => {
      const cc = String(c.country_code || 'mx').toLowerCase();
      return isWorld ? cc !== 'mx' : cc === 'mx';
    });
  } catch { return []; }
}

// Enlaces a las páginas de ciudad para la home.
function cityLinksHtml(cities, origin, isWorld) {
  if (!cities.length) return '';
  return `<nav aria-label="Ciudades"><h2>Ciudades</h2><ul>${cities.map(c => {
    const slug = normalizeCitySlug(c.slug);
    const path = isWorld ? `/${String(c.country_code || 'mx').toLowerCase()}/${slug}` : `/${slug}`;
    const name = c.name || slug.replace(/-/g, ' ');
    return `<li><a href="${esc(origin + path)}">${esc(name)}</a></li>`;
  }).join('')}</ul></nav>`;
}

// Listado de eventos próximos para bots: home (city null: todas las
// ciudades del dominio, vía allowedCities) y páginas de ciudad /
// /eventos/:ciudad (city con el slug de esa ciudad). Misma consulta
// PostgREST que getEv/getListing (status approved, orden por fecha);
// la pertenencia a la ciudad y el filtro de "próximo" se hacen en JS
// porque city_slug es multi-valor (segmentos por coma) y end_date
// puede venir vacío. Los privados no se listan (igual que el sitemap).
async function getEventsListing(city, origin, allowedCities = null) {
  try {
    const query = new URLSearchParams({ status: 'eq.approved', select: 'id,slug,title,date,end_date,venue_name,city_slug,visibility', order: 'date.asc', limit: '500' });
    const response = await fetch(`${SUPABASE_URL}/rest/v1/events?${query}`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
    });
    if (!response.ok) return '';
    const rows = await response.json();
    if (!Array.isArray(rows)) return '';
    const today = todayStr();
    const upcoming = rows.filter(ev => {
      if (ev.visibility === 'private') return false;
      if (!isUpcomingEvent(ev, today)) return false;
      if (city) return eventBelongsToCity(ev.city_slug, city);
      if (allowedCities) return eventBelongsToDomain(ev.city_slug, allowedCities);
      return true;
    }).slice(0, 24);
    if (!upcoming.length) return '';
    return `<section><h2>Próximos eventos</h2><ul>${upcoming.map(ev => {
      const url = eventUrl(ev, origin);
      const dateText = eventDateText(ev.date);
      return `<li><article><h3><a href="${esc(url)}">${esc(ev.title)}</a></h3>${dateText ? `<p>📅 ${esc(dateText)}</p>` : ''}${ev.venue_name ? `<p>📍 ${esc(ev.venue_name)}</p>` : ''}</article></li>`;
    }).join('')}</ul></section>`;
  } catch { return ''; }
}

// Preguntas frecuentes de /negocios: una sola fuente para el HTML de la
// landing y para el JSON-LD FAQPage (las respuestas son las de la landing
// en BusinessLanding.jsx / i18n). faq5 lleva el número de ciudades en vivo.
function negociosFaqItems(faq5) {
  return [
    { q: "¿Cuánto cuesta empezar?", a: "Nada. Crear tu perfil y publicar tu negocio es gratis. Solo pagas si quieres Presencia, Ventas o Fideliza." },
    { q: "¿Necesito pagar para aparecer en CityMap?", a: "No. Con el plan gratuito tu negocio ya tiene su página pública, con teléfono, dirección, horarios y portada." },
    { q: "¿CityMap cobra comisión por mis ventas?", a: "No. Los pedidos te llegan por WhatsApp y el pago es directo entre tu cliente y tú." },
    { q: "¿Puedo probar los planes de pago gratis?", a: "Sí. Los planes de pago (Presencia, Ventas y Fideliza) tienen 7 días de prueba gratis, en mensual y en anual, sin compromiso." },
    { q: "¿En qué ciudades está CityMap?", a: faq5 },
    { q: "¿Qué necesito para registrar mi negocio?", a: "Solo tu información básica: nombre, fotos, horarios y un teléfono o WhatsApp para que te contacten." },
  ];
}

// Contenido estático de la landing /negocios para bots (copia real de
// BusinessLanding.jsx / i18n: beneficios, cómo funciona, planes con
// precios MXN y preguntas frecuentes). faq5 lleva el número de ciudades
// en vivo, que se resuelve en la rama de vista.
function negociosBody(faq5) {
  const faqHtml = `<section><h2>Preguntas frecuentes</h2><dl>`
    + negociosFaqItems(faq5).map(({ q, a }) => `<dt>${esc(q)}</dt><dd>${esc(a)}</dd>`).join("")
    + `</dl></section>`;
  return `<section><h2>Por qué CityMap</h2><p>Lo que gana tu negocio</p><ul>`
    + `<li><h3>Te encuentran en el mapa</h3><p>Tu negocio aparece con su pin en el mapa de tu ciudad, junto a los lugares, restaurantes y eventos que la gente ya busca. Con Ventas, tu logotipo se ve directo en el mapa.</p></li>`
    + `<li><h3>Te encuentran en Google</h3><p>Tu página queda indexada y aparece en las búsquedas de Google. Con Presencia, tu posicionamiento mejora; con Ventas, hasta tu menú interactivo aparece en Google.</p></li>`
    + `<li><h3>Pedidos por WhatsApp, sin comisiones</h3><p>Tus clientes ven tu menú, arman su pedido y te lo mandan por WhatsApp. CityMap no cobra comisión por tus ventas: el pago es directo entre tu cliente y tú.</p></li>`
    + `<li><h3>Un menú digital que vende solo</h3><p>Con Ventas, tu menú es interactivo: fotos, precios, opciones y carrito. Tus clientes piden desde el celular sin llamarte. Con Presencia, tienes tu menú en QR para ponerlo en las mesas del local.</p></li>`
    + `<li><h3>Tus eventos y promociones llegan a la gente</h3><p>Con Fideliza, publicas tus eventos y reservas, lanzas cupones y creas tarjetas de lealtad para que tus clientes regresen.</p></li>`
    + `<li><h3>Sabes qué está funcionando</h3><p>Desde tu panel ves tus visitas y tus pedidos, y con Fideliza tienes estadísticas avanzadas y soporte prioritario.</p></li>`
    + `</ul></section>`
    + `<section><h2>Cómo funciona</h2><ol>`
    + `<li><h3>Crea tu perfil gratis</h3><p>Te registras y publicas tu negocio en minutos: nombre, fotos, horarios y contacto.</p></li>`
    + `<li><h3>Completa tu información</h3><p>Sube tu portada, tu galería y tu menú. Entre más completo, más te encuentran.</p></li>`
    + `<li><h3>Te encuentran y te escriben</h3><p>Tu negocio aparece en el mapa, en el buscador, en la guía de tu ciudad y en Google. Los clientes te escriben directo por WhatsApp.</p></li>`
    + `</ol></section>`
    + `<section><h2>Planes</h2><p>Precios por negocio. Pago mensual o anual (el anual sale 17% menos).</p><ul>`
    + `<li><h3>Gratuito</h3><p>$0 MXN / mes</p><p>Tu negocio en el mapa y en el buscador, con foto, dirección, teléfono y horarios.</p></li>`
    + `<li><h3>Presencia</h3><p>$99 MXN / mes o $990 MXN / año</p><p>Ideal para negocios que quieren destacar, mostrar sus productos y facilitar el contacto con nuevos clientes.</p><p>Pruébalo 7 días gratis.</p></li>`
    + `<li><h3>Ventas</h3><p>$199 MXN / mes o $1,990 MXN / año</p><p>Convierte tu menú digital en una herramienta de ventas. Facilita que tus clientes seleccionen productos y realicen pedidos directamente por WhatsApp.</p><p>Pruébalo 7 días gratis.</p></li>`
    + `<li><h3>Fideliza</h3><p>$299 MXN / mes o $2,990 MXN / año</p><p>Todas las herramientas para vender, administrar clientes y conseguir que regresen.</p><p>Pruébalo 7 días gratis.</p></li>`
    + `</ul></section>`
    + faqHtml
    + `<section><h2>Tu negocio ya lo buscan. Que lo encuentren.</h2><p>Crear perfil gratis en CityMap.</p></section>`;
}

async function getBiz(id, city) {
  try {
    const RESERVED_SLUGS = new Set([
      'planes', 'explorar', 'eventos', 'mapa', 'revista', 'experiencias', 'mis-planes',
      'cuenta', 'favoritos', 'explorer', 'about', 'privacy', 'terms', 'admin',
      'lealtad', 'wallet', 'scan', 'precios'
    ]);
    if (!id || RESERVED_SLUGS.has(id.toLowerCase())) return null;

    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let q = isUUID ? `id=eq.${id}` : `slug=in.(${id},${city ? `${city}-${id}` : id})`;
    
    if (!isUUID && id.includes('_')) {
      const parts = id.split('_');
      const possibleId = parts.pop();
      if (/^\d+$/.test(possibleId)) {
        q = `id=eq.${possibleId}`;
      }
    }

    let r = await fetch(
      `${SUPABASE_URL}/rest/v1/businesses?${q}&select=id,slug,name,tagline,description,address,rating,review_count,category,photos,city_slug,schedule,lat,lng`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    if (!r.ok) return null;
    let d = await r.json();
    if (!d?.[0] && !isUUID && !q.startsWith("id=")) {
      const searchName = id.split("-").join("%25");
      const cityFilter = (city && !RESERVED_SLUGS.has(city.toLowerCase())) ? `&city_slug=eq.${encodeURIComponent(city)}` : "";
      r = await fetch(
        `${SUPABASE_URL}/rest/v1/businesses?name=ilike.*${searchName}*${cityFilter}&select=id,slug,name,tagline,description,address,rating,review_count,category,photos,city_slug,schedule,lat,lng`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
      );
      if (r.ok) d = await r.json();
    }
    return d?.[0] || null;
  } catch {
    return null;
  }
}

async function getEv(id, city) {
  // Slugs viejos con errata (p. ej. el de Eslabón): se corrigen al slug
  // actual antes de buscar, igual que en la app.
  id = resolveEventSlug(id);
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let q = isUUID ? `id=eq.${id}` : `slug=in.(${id},${city ? `${city}-${id}` : id})`;
    
    if (!isUUID && id.includes('_')) {
      const parts = id.split('_');
      const possibleId = parts.pop();
      if (/^\d+$/.test(possibleId) || /^[0-9a-f]{8}-/.test(possibleId)) {
        q = `id=eq.${possibleId}`;
      }
    }

    let r = await fetch(
      `${SUPABASE_URL}/rest/v1/events?${q}&select=id,slug,title,description,date,time,end_date,end_time,price,price_type,website,status,venue_name,venue_address,lat,lng,img_url,img,event_category,city_slug`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    if (!r.ok) return null;
    let d = await r.json();
    if (!d?.[0] && !isUUID && !q.startsWith("id=")) {
      const searchName = id.split("-").join("%25");
      r = await fetch(
        `${SUPABASE_URL}/rest/v1/events?title=ilike.*${searchName}*&select=id,slug,title,description,date,time,end_date,end_time,price,price_type,website,status,venue_name,venue_address,lat,lng,img_url,img,event_category,city_slug`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
      );
      if (r.ok) d = await r.json();
    }
    return d?.[0] || null;
  } catch {
    return null;
  }
}

async function getExp(id, city) {
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    if (isUUID) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/experiences?id=eq.${id}&select=id,slug,title,description,gallery,city_slug,activity_type,price,duration,booking_config`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
      );
      if (!r.ok) return null;
      const d = await r.json();
      return d?.[0] || null;
    }
    
    let r = await fetch(
      `${SUPABASE_URL}/rest/v1/experiences?slug=ilike.*${encodeURIComponent(id)}*&select=id,slug,title,description,gallery,city_slug,activity_type,price,duration,booking_config&limit=1`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    if (r.ok) {
      let d = await r.json();
      if (d?.[0]) return d[0];
    }
    
    const searchName = id.replace(/-/g, '%25');
    r = await fetch(
      `${SUPABASE_URL}/rest/v1/experiences?title=ilike.*${searchName}*&select=id,slug,title,description,gallery,city_slug,activity_type,price,duration,booking_config&limit=1`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    if (r.ok) {
      let d = await r.json();
      return d?.[0] || null;
    }
    return null;
  } catch {
    return null;
  }
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("b");
  const evId = searchParams.get("ev");
  const expId = searchParams.get("exp");
  const vista = searchParams.get("vista");
  // La ciudad siempre en forma canónica (minúsculas sin tildes): así el
  // canonical, el og:url y las consultas usan el slug nuevo aunque la
  // URL que llegó traiga la forma vieja.
  const cityParam = searchParams.get("city");
  const city = cityParam ? normalizeCitySlug(cityParam) : cityParam;
  const ua = req.headers.get("user-agent") || "";

  const { isWorld, origin: BASE_URL } = seoSite(new URL(req.url).hostname);
  const SITE_NAME = isWorld ? "CityMap" : "CityMap México";
  
  // Dynamic country extraction to set appropriate locales and paths
  const targetCitySlug = city || "";
  const { country_code: countryCode, bg_image: cityBgImage, exists: cityExists, name: cityDbName, state: cityState } = await getCityData(targetCitySlug);
  if (city && cityExists === false && !id && !evId && !expId && !vista) {
    return new Response('<!doctype html><html lang="es"><title>Ciudad no encontrada | CityMap</title><h1>Ciudad no encontrada</h1></html>', {
      status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex' }
    });
  }
  const cityPath = isWorld && targetCitySlug ? `/${countryCode}/${targetCitySlug}` : `/${targetCitySlug}`;
  
  // Set locale based on target country
  let locale = "es_MX";
  if (isWorld) {
    if (countryCode === "es") locale = "es_ES";
    else if (countryCode === "fr") locale = "fr_FR";
    else if (countryCode === "gb") locale = "en_GB";
    else if (countryCode === "ca") locale = "en_CA";
    else if (countryCode === "us") locale = "en_US";
    else locale = "es";
  }

  // No ID and no other parameters -> Serve Home page HTML to bots
  if (!id && !evId && !expId && !vista && !city) {
    const title = homePageTitle();
    const desc = homePageDescription(isWorld);
    const img = `${BASE_URL}/og-image.png`;
    // Mismo grafo WebSite + Organization que index.html, pero con las
    // URLs del host que sirve la página (en .world no apunta a .mx).
    // La app va en el mismo grafo (SoftwareApplication, una sola fuente
    // de verdad en src/lib/structuredData.js).
    const homeSchema = `<script type="application/ld+json">${JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "WebSite", "name": "CityMap", "url": `${BASE_URL}/`, "description": desc, "inLanguage": "es" },
        { "@type": "Organization", "name": "CityMap", "url": `${BASE_URL}/`, "logo": `${BASE_URL}/citymap.mx.png` },
        softwareApplicationSchema(BASE_URL),
      ],
    })}</script>`;

    const homeCities = await getDomainCities(isWorld);
    const homeEvents = await getEventsListing(null, BASE_URL, new Set(homeCities.map(c => normalizeCitySlug(c.slug))));
    const homeCityLinks = cityLinksHtml(homeCities, BASE_URL, isWorld);
    const html = `<!doctype html>
<html lang="es" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${BASE_URL}"/>

<!-- Open Graph -->
<meta property="og:type" content="website"/>
<meta property="og:url" content="${BASE_URL}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${esc(img)}"/>
<meta property="og:site_name" content="${esc(SITE_NAME)}"/>
<meta property="og:locale" content="${esc(locale)}"/>

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(img)}"/>
${homeSchema}
</head>
<body>
<h1>${esc(title)}</h1>
<img src="${esc(img)}" alt="${esc(title)}" style="max-width: 100%; height: auto;" />
<p>${esc(desc)}</p>
${homeEvents}
${homeCityLinks}
<a href="${BASE_URL}">Abrir ${esc(SITE_NAME)}</a>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  }

  // Real user (not a bot) → redirect to SPA with deep-link param
  // _bot=1 allows middleware to call og.js internally without triggering this redirect
  const forcedBot = searchParams.get("_bot") === "1";
  if (!isBot(ua) && !forcedBot) {
    let loc = BASE_URL;
    const isMenu = searchParams.get("menu") === "true";
    if (id) {
       if (isMenu && city) loc = `${BASE_URL}${cityPath}/${id}/menu`;
       else loc += `?lugar=${id}`;
    }
    else if (evId) loc += `?evento=${evId}`;
    else if (expId) loc = `${BASE_URL}/revista/${city || 'todas'}/${expId}`;
    else if (vista === "eventos" || vista === "explorar") loc = city ? `${BASE_URL}/eventos/${city}` : `${BASE_URL}/eventos`;
    else if (vista === "mapa") loc = city ? `${BASE_URL}/mapa/${city}` : `${BASE_URL}/mapa`;
    else if (vista === "mis-planes" || vista === "experiencias" || vista === "revista") loc = city ? `${BASE_URL}/revista/${city}` : `${BASE_URL}/revista`;
    else if (vista) loc += `?vista=${vista}`;
    else if (city) loc = `${BASE_URL}${cityPath}`;
    
    return new Response(null, {
      status: 302,
      headers: { Location: loc },
    });
  }

  // --- RESPUESTA PARA CIUDAD ---
  if (city && !id && !evId && !expId && !vista) {
    // Nombre de exhibición (p. ej. «Guadalajara, Jalisco», «Tepic,
    // Nayarit», «Madrid»): el mismo que ve el usuario en la SPA
    // (useGeolocation). Si la base no trae el nombre, el slug con
    // guiones como espacios. El título y la descripción son los del
    // módulo único (seoRoutes.js): los mismos que ve el usuario.
    const cityName = cityDisplayName(cityDbName || (city.charAt(0).toUpperCase() + city.slice(1).replace(/-/g, " ")), cityState);
    const title = cityPageTitle(cityName);
    const desc = cityPageDescription(cityName);
    const img = cityBgImage || `${BASE_URL}/og-image.png`;
    const listing = await getListing(city, null, BASE_URL, cityPath);
    const eventsListing = await getEventsListing(city, BASE_URL);
    const categoryLinks = `<nav aria-label="Categorías"><ul>${Object.entries(CAT_SEO).map(([slug, info]) => `<li><a href="${esc(BASE_URL + cityPath + '/' + slug)}">${esc(info.label)}</a></li>`).join('')}</ul></nav>`;
    const citySchema = `<script type="application/ld+json">${JSON.stringify(breadcrumbList([
      { name: "Inicio", item: BASE_URL },
      { name: cityName, item: `${BASE_URL}${cityPath}` },
    ]))}</script>`;
    
    const html = `<!doctype html>
<html lang="es" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${BASE_URL}${cityPath}"/>

<!-- Open Graph -->
<meta property="og:type" content="website"/>
<meta property="og:url" content="${BASE_URL}${cityPath}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${esc(img)}"/>
<meta property="og:site_name" content="${esc(SITE_NAME)}"/>
<meta property="og:locale" content="${esc(locale)}"/>

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(img)}"/>
${citySchema}
</head>
<body>
<h1>${esc(title)}</h1>
<img src="${esc(img)}" alt="${esc(title)}" style="max-width: 100%; height: auto;" />
<p>${esc(desc)}</p>
${listing}
${eventsListing}
${categoryLinks}
<a href="${BASE_URL}${cityPath}">Abrir ${esc(SITE_NAME)} en ${esc(cityName)}</a>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  }

  // --- RESPUESTA PARA TABS Y SECCIONES ---
  if (vista) {
    let title = SITE_NAME;
    let desc = "Descubre tu ciudad.";
    let img = cityBgImage || `${BASE_URL}/og-image.png`;
    const cityName = city ? (city.charAt(0).toUpperCase() + city.slice(1).replace(/-/g, " ")) : "";
    // Sin caso propio, la canónica es la ruta de la vista (/about, /cuenta…):
    // nunca una URL con ?vista=, que Google no debe indexar.
    let canonicalUrl = `${BASE_URL}/${esc(vista)}`;
    let schemaJson = "";
    // Contenido extra del cuerpo para las vistas con lista o landing
    // propia; robotsMeta solo se usa en /login (página de acceso: noindex).
    let bodyExtra = "";
    let robotsMeta = "";

    if (vista === "eventos" || vista === "explorar") {
      canonicalUrl = city ? `${BASE_URL}/eventos/${city}` : `${BASE_URL}/eventos`;
      if (city) {
        title = `Cartelera de Eventos en ${cityName} — Conciertos y Festivales | ${SITE_NAME}`;
        desc = `Consulta la cartelera de eventos en ${cityName}. Conciertos, obras de teatro, festivales y actividades imperdibles para salir hoy en ${cityName}.`;
        bodyExtra = await getEventsListing(city, BASE_URL);
      } else {
        title = `Cartelera de Eventos — ${SITE_NAME}`;
        desc = `Descubre los mejores eventos, conciertos y actividades en tu ciudad con ${SITE_NAME}.`;
      }
    } else if (vista === "mapa") {
      canonicalUrl = city ? `${BASE_URL}/mapa/${city}` : `${BASE_URL}/mapa`;
      if (city) {
        title = `Mapa Interactivo de ${cityName} — Restaurantes, Cafés y Lugares | ${SITE_NAME}`;
        desc = `Explora el mapa interactivo de ${cityName}. Encuentra los mejores lugares, restaurantes y eventos cercanos a ti en tiempo real.`;
      } else {
        title = `Mapa Interactivo de Negocios — ${SITE_NAME}`;
        desc = "Explora todos los negocios y lugares de interés cercanos a ti en nuestro mapa interactivo.";
      }
    } else if (vista === "revista" || vista === "experiencias" || vista === "mis-planes") {
      canonicalUrl = city ? `${BASE_URL}/revista/${city}` : `${BASE_URL}/revista`;
      if (city) {
        title = `Revista CityMap ${cityName} — Historias, Recomendaciones y Notas Locales`;
        desc = `Descubre las mejores historias, notas locales, recomendaciones y guías de ${cityName} en la Revista CityMap. Qué hacer y lugares imperdibles.`;
      } else {
        title = `Revista CityMap — Historias, Guías y Recomendaciones Locales`;
        desc = `Descubre historias, reportajes, notas locales y las mejores recomendaciones de tu ciudad en la Revista CityMap.`;
      }
    } else if (vista === "favoritos") {
      title = `Mis Favoritos — ${SITE_NAME}`;
      desc = `Guarda y organiza tus lugares y planes favoritos en ${SITE_NAME}.`;
      canonicalUrl = `${BASE_URL}/favoritos`;
    } else if (vista === "cuenta") {
      title = `Mi Cuenta — ${SITE_NAME}`;
      desc = `Gestiona tu perfil, reseñas y membresías en ${SITE_NAME}.`;
      canonicalUrl = `${BASE_URL}/cuenta`;
    } else if (vista === "tours") {
      canonicalUrl = `${BASE_URL}/tours`;
      title = `Tours en Tokio, Kioto, París, Madrid, Nueva York, Guadalajara y más | ${SITE_NAME}`;
      desc = `Tours guiados y excursiones en Tokio, Kioto, París, Madrid, Nueva York, Guadalajara y más de 30 ciudades del mundo, con precio desde y reserva en línea. Encuentra tu próximo tour en ${SITE_NAME}.`;
      bodyExtra = await getToursListing(BASE_URL);
    } else if (vista === "negocios") {
      canonicalUrl = `${BASE_URL}/negocios`;
      title = `Haz que más personas encuentren tu negocio. | ${SITE_NAME}`;
      desc = `CityMap ayuda a que más personas descubran negocios, lugares y servicios cuando buscan en internet. Las páginas de nuestra plataforma ya generan visitas desde Google, acercando a nuevos clientes a los negocios publicados.`;
      const cityCount = await getCityCount();
      const faq5 = cityCount
        ? `En ${cityCount} ciudades, entre ellas Guadalajara, Zapopan, Tlaquepaque, Tepic, Puerto Vallarta, Ciudad de México, Mérida, Monterrey, Cancún y Playa del Carmen.`
        : `En Guadalajara, Zapopan, Tlaquepaque, Tepic, Puerto Vallarta, Ciudad de México, Mérida, Monterrey, Cancún, Playa del Carmen y más ciudades.`;
      const faqItems = negociosFaqItems(faq5);
      schemaJson = `<script type="application/ld+json">${JSON.stringify(faqPage(faqItems))}</script>`;
      bodyExtra = negociosBody(faq5) + await getNegociosExamples(BASE_URL);
    } else if (vista === "login") {
      canonicalUrl = `${BASE_URL}/login`;
      title = `Iniciar sesión — ${SITE_NAME}`;
      desc = `Inicia sesión en ${SITE_NAME} con tu cuenta de Google para guardar favoritos, asistir a eventos y gestionar tu negocio.`;
      robotsMeta = `<meta name="robots" content="noindex"/>`;
    } else if (vista === "about") {
      // Soft 404 (nov 2026): sin caso propio, Googlebot recibía el HTML
      // genérico vacío ("CityMap México" / "Descubre tu ciudad.") con 200.
      // Títulos y descripción iguales a useAppSEO; el cuerpo lleva el
      // contenido real de src/components/About.jsx.
      canonicalUrl = `${BASE_URL}/about`;
      title = `Acerca de Nosotros — CityMap`;
      desc = `Conoce más sobre CityMap, la plataforma digital para descubrir restaurantes, cafés, eventos y los mejores negocios locales en tu ciudad.`;
      bodyExtra = `<p>Tu guía local inteligente para descubrir lo mejor de la ciudad, en un solo lugar.</p>
<h2>Misión</h2>
<p>Conectar a las personas con los mejores negocios y experiencias locales, impulsando la economía de nuestra ciudad a través de una plataforma accesible, moderna y fácil de usar para todos.</p>
<h2>Visión</h2>
<p>Ser la aplicación líder y el referente número uno para descubrir lugares increíbles, creando una comunidad fuerte donde los usuarios y negocios locales prosperen juntos.</p>
<h2>Nuestros valores</h2>
<h3>01. Comunidad Primero</h3>
<p>Existimos para servir a nuestra gente y fortalecer los lazos locales.</p>
<h3>02. Innovación Continua</h3>
<p>Buscamos siempre la mejor tecnología para brindar experiencias únicas.</p>
<h3>03. Transparencia</h3>
<p>Reseñas reales y tratos justos para todos nuestros comercios aliados.</p>
<h3>04. Calidad</h3>
<p>Nos aseguramos de que cada interacción en CityMap sea excepcional.</p>`;
    } else if (vista === "privacy") {
      // Mismo hueco que /about: contenido real de src/Privacy.jsx.
      canonicalUrl = `${BASE_URL}/privacy`;
      title = `Política de Privacidad — CityMap`;
      desc = `Consulta los términos de nuestra política de privacidad, la protección de tus datos personales y el uso de cookies en CityMap.`;
      bodyExtra = `<p><strong>Última actualización:</strong> 15 de noviembre de 2026</p>
<p><strong>Responsable:</strong> Jonathan Arana (CityMap). Contacto: <strong>citymap.mx@gmail.com</strong>.</p>
<p>En CityMap respetamos y protegemos tu privacidad. El presente Aviso de Privacidad describe qué información personal recopilamos cuando usas la app y el sitio web de CityMap, para qué la utilizamos y qué derechos tienes sobre ella.</p>
<h2>1. Información que recopilamos</h2>
<p>Al registrarte y utilizar CityMap, podemos recopilar la siguiente información: nombre y dirección de correo electrónico, número de teléfono (WhatsApp) solo si te registras a la tarjeta de lealtad de un negocio, ubicación precisa solo cuando usas el mapa o los lugares cercanos, fotos o videos y otro contenido que publiques, identificadores de tu cuenta y tu dispositivo, y datos de interacción con la app como favoritos, reservaciones y sellos de lealtad.</p>
<h2>2. Para qué usamos tu información</h2>
<p>La información recopilada se utiliza únicamente para el funcionamiento de la app: crear y administrar tu cuenta, mostrarte los lugares, negocios y eventos cercanos, permitirte usar favoritos, reservaciones y tarjetas de lealtad, enviarte notificaciones relacionadas con tu cuenta, y garantizar la seguridad y el correcto funcionamiento de la plataforma.</p>
<h2>3. Rastreo y publicidad</h2>
<p>CityMap no utiliza tus datos para rastrearte entre aplicaciones o sitios web de otras empresas.</p>
<p>CityMap no vende, alquila ni comercializa tu información personal con terceros, ni la comparte con fines publicitarios.</p>
<h2>4. Con quién compartimos tus datos</h2>
<p>Tu información solo se comparte con los proveedores tecnológicos necesarios para que CityMap funcione: Supabase (base de datos, autenticación y almacenamiento), Google y Apple (inicio de sesión), Firebase (notificaciones push) y Stripe (pagos de los planes de negocios).</p>
<h2>5. Cookies y almacenamiento local</h2>
<p>CityMap guarda en tu dispositivo la información necesaria para mantener tu sesión iniciada y recordar tus preferencias. CityMap no utiliza servicios de analítica de terceros que te identifiquen.</p>
<h2>6. Protección de la información</h2>
<p>Implementamos medidas técnicas y organizativas razonables para proteger la información personal contra pérdida, acceso no autorizado, alteración o divulgación indebida. Tu dirección de correo electrónico nunca será visible públicamente.</p>
<h2>7. Derechos del usuario</h2>
<p>En cualquier momento podrás acceder a la información personal asociada a tu cuenta, solicitar su corrección o actualización, solicitar la eliminación de tu cuenta y la información relacionada, y revocar el consentimiento otorgado para el tratamiento de tus datos. Para ejercer cualquiera de estos derechos, escríbenos a citymap.mx@gmail.com.</p>
<h2>8. Conservación de los datos</h2>
<p>La información será conservada mientras exista una cuenta activa o durante el tiempo necesario para cumplir obligaciones legales y de seguridad. Si solicitas la eliminación de tu cuenta, eliminaremos la información personal asociada a ella.</p>
<h2>9. Menores de edad</h2>
<p>CityMap está dirigida a personas de 13 años o más (clasificación 13+). No recopilamos intencionalmente datos personales de menores de 13 años. Si eres padre, madre o tutor y crees que un menor de 13 años nos proporcionó sus datos, escríbenos a citymap.mx@gmail.com para que los eliminemos.</p>
<h2>10. Cambios al presente Aviso de Privacidad</h2>
<p>CityMap podrá actualizar este Aviso de Privacidad en cualquier momento. Las modificaciones serán publicadas dentro de la plataforma y entrarán en vigor desde su fecha de publicación.</p>
<h2>11. Contacto</h2>
<p>Si tienes dudas, comentarios o deseas ejercer cualquiera de tus derechos relacionados con tus datos personales, puedes comunicarte con nosotros en: Correo electrónico: citymap.mx@gmail.com</p>
<p>Al utilizar CityMap, aceptas los términos establecidos en el presente Aviso de Privacidad.</p>`;
    } else if (vista === "terms") {
      // Mismo hueco que /about: contenido real de src/components/Terms.jsx.
      canonicalUrl = `${BASE_URL}/terms`;
      title = `Términos y Condiciones — CityMap`;
      desc = `Lee los términos y condiciones generales de uso que regulan la navegación y servicios de la plataforma CityMap.`;
      bodyExtra = `<p>Última actualización: 22 de junio de 2026</p>
<h2>1. Aceptación de los Términos</h2>
<p>Al acceder y utilizar la aplicación y sitio web de CityMap ("la Plataforma"), aceptas estar sujeto a estos Términos y Condiciones de Uso. Si no estás de acuerdo con alguna parte de estos términos, no podrás utilizar nuestros servicios.</p>
<h2>2. Descripción del Servicio</h2>
<p>CityMap es una guía digital que permite a los usuarios descubrir negocios, eventos y lugares de interés locales. Actuamos únicamente como un directorio informativo y no somos parte de las transacciones comerciales entre usuarios y los negocios listados.</p>
<h2>3. Responsabilidades del Usuario</h2>
<p>Te comprometes a utilizar CityMap de manera responsable y legal. Queda estrictamente prohibido: proporcionar información falsa al crear una cuenta o registrar un negocio; utilizar la plataforma para fines ilícitos, difamatorios o fraudulentos; intentar vulnerar la seguridad de la aplicación o extraer datos de forma automatizada (scraping).</p>
<h2>4. Registro de Negocios</h2>
<p>Los propietarios que registren su negocio en CityMap garantizan que tienen la autoridad legal para hacerlo y que la información proporcionada (horarios, fotos, ubicación) es precisa y veraz. CityMap se reserva el derecho de rechazar, modificar o eliminar listados que incumplan nuestras políticas de calidad o sean reportados como fraudulentos.</p>
<h2>5. Propiedad Intelectual</h2>
<p>El diseño, código, logotipos y marca de CityMap son propiedad exclusiva de sus creadores. El contenido subido por los negocios (logotipos, fotos, promociones) sigue siendo propiedad de sus respectivos dueños, otorgando a CityMap una licencia no exclusiva para mostrarlos en nuestra plataforma.</p>
<h2>6. Limitación de Responsabilidad</h2>
<p>CityMap se esfuerza por mantener la información actualizada, pero no garantizamos la exactitud de los horarios, precios o disponibilidad de los negocios listados. No nos hacemos responsables por malas experiencias, cancelaciones, cambios de ubicación o cualquier daño derivado de la interacción con los comercios o eventos promocionados en nuestra plataforma.</p>
<h2>7. Cambios a los Términos</h2>
<p>Nos reservamos el derecho de modificar estos Términos de Uso en cualquier momento. Los cambios sustanciales serán notificados a través de la aplicación. Tu uso continuo de CityMap después de dichas modificaciones constituye tu aceptación de los nuevos términos.</p>
<h2>8. Contacto</h2>
<p>Si tienes dudas sobre estos Términos y Condiciones, por favor contáctanos a través del correo electrónico: soporte@citymap.mx.</p>`;
    }

    const html = `<!doctype html>
<html lang="es" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="${canonicalUrl}"/>

<!-- Open Graph -->
<meta property="og:type" content="website"/>
<meta property="og:url" content="${canonicalUrl}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${esc(img)}"/>
<meta property="og:site_name" content="${esc(SITE_NAME)}"/>
<meta property="og:locale" content="${esc(locale)}"/>

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(img)}"/>
${robotsMeta}
${schemaJson}
</head>
<body>
<h1>${esc(title)}</h1>
<img src="${esc(img)}" alt="${esc(title)}" style="max-width: 100%; height: auto;" />
<p>${esc(desc)}</p>
${bodyExtra}
<a href="${canonicalUrl}">Abrir en ${esc(SITE_NAME)}</a>
</body>
</html>`;

    const vistaHeaders = {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
    };
    // /login se sirve con 200 pero no se indexa (también en la cabecera,
    // porque el middleware construye su propia respuesta y no la hereda).
    if (vista === "login") vistaHeaders["X-Robots-Tag"] = "noindex";
    return new Response(html, {
      status: 200,
      headers: vistaHeaders,
    });
  }

  let name = "", desc, img = "", url = "", category = "", fullDesc = "", linkHref = "", canonicalUrl = "", cityNameFormat = "", bizCityPath = "";
  let bizData = null, evData = null, expData = null;

  if (id) {
    if (CAT_SEO[id]) {
      const cityName = (city || "tu ciudad").charAt(0).toUpperCase() + (city || "tu ciudad").slice(1).replace("-", " ");
      const catInfo = CAT_SEO[id];
      const title = catInfo.title.replace(/\{city\}/g, cityName) + ` | ${SITE_NAME}`;
      const desc = catInfo.desc.replace(/\{city\}/g, cityName);
      
      const { country_code: cityCountry, bg_image: cityBgImage } = await getCityData(city);
      const specificCityPath = isWorld && city ? `/${cityCountry}/${city}` : `/${city || ""}`;
      const canonicalUrl = `${BASE_URL}${specificCityPath}/${esc(id)}`;
      const img = cityBgImage || `${BASE_URL}/og-image.png`;
      const listing = await getListing(city, id, BASE_URL, specificCityPath);
      const listingHtml = listing.includes("<article")
        ? listing
        : listing + `<p>Aún no hay lugares de esta categoría en ${esc(cityName)}.</p>`;
      const catSchema = `<script type="application/ld+json">${JSON.stringify(breadcrumbList([
        { name: "Inicio", item: BASE_URL },
        { name: cityName, item: `${BASE_URL}${specificCityPath}` },
        { name: catInfo.label, item: canonicalUrl },
      ]))}</script>`;
      
      const html = renderCategoryPage({ title, desc, label: catInfo.label, cityName, canonicalUrl, img, listing: listingHtml, siteName: SITE_NAME, locale, schemaJson: catSchema });

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      });
    }

    // /:ciudad/c/:subcategoria (p. ej. /guadalajara/c/unidad-deportiva):
    // la subcategoría es un valor real de businesses.category (con espacios).
    // Si existe, se sirve su página con la lista; si no, cae al flujo de
    // negocio y termina en 404 (no en la home con 200).
    if (searchParams.get("subcat") === "1") {
      const catValue = id.replace(/-/g, " ");
      const { country_code: cityCountry, bg_image: cityBgImage } = await getCityData(city);
      const specificCityPath = isWorld && city ? `/${cityCountry}/${city}` : `/${city || ""}`;
      const listing = await getListing(city, catValue, BASE_URL, specificCityPath);
      const real = listing.includes("<article") || (await isRealCategory(catValue));
      if (real) {
        const cityName = (city || "tu ciudad").charAt(0).toUpperCase() + (city || "tu ciudad").slice(1).replace("-", " ");
        const label = catValue.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        const title = `${label} en ${cityName} | ${SITE_NAME}`;
        const desc = `Descubre ${label} en ${cityName}. Horarios, ubicaciones y reseñas en ${SITE_NAME}.`;
        const canonicalUrl = `${BASE_URL}${specificCityPath}/c/${esc(id)}`;
        const img = cityBgImage || `${BASE_URL}/og-image.png`;
        const listingHtml = listing.includes("<article")
          ? listing
          : listing + `<p>Aún no hay lugares de esta categoría en ${esc(cityName)}.</p>`;
        const catSchema = `<script type="application/ld+json">${JSON.stringify(breadcrumbList([
          { name: "Inicio", item: BASE_URL },
          { name: cityName, item: `${BASE_URL}${specificCityPath}` },
          { name: label, item: canonicalUrl },
        ]))}</script>`;
        return new Response(renderCategoryPage({ title, desc, label, cityName, canonicalUrl, img, listing: listingHtml, siteName: SITE_NAME, locale, schemaJson: catSchema }), {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
          },
        });
      }
    }

    const biz = await getBiz(id, city);
    if (!biz) {
      return notFoundResponse("Negocio no encontrado");
    }
    bizData = biz;
    const isMenu = searchParams.get("menu") === "true";
    const bizCity = biz.city_slug || city || "";
    cityNameFormat = bizCity ? (bizCity.charAt(0).toUpperCase() + bizCity.slice(1).replace("-", " ")) : "";
    
    const isFood = biz.category === "restaurantes" || biz.category === "cafe";
    name = isMenu 
      ? `Menú de ${esc(biz.name)} en ${esc(cityNameFormat)} - Precios y Pedidos | ${SITE_NAME}` 
      : `${esc(biz.name)} en ${esc(cityNameFormat)}: ${isFood ? "Menú, " : ""}Horarios y Reseñas | ${SITE_NAME}`;
      
    desc = isMenu 
      ? `Descubre el menú completo de ${esc(biz.name)} en ${esc(cityNameFormat)}. Conoce sus platillos, precios y haz tu pedido fácilmente.` 
      : esc(biz.tagline || biz.description?.slice(0, 160) || `Descubre ${biz.name} en ${SITE_NAME}`);
      
    const rawImg = biz.photos?.[0]?.url || "";
    img = esc(rawImg || `${BASE_URL}/og-image.png`);
    category = esc(biz.category || "");
    const stars = biz.rating ? `⭐ ${biz.rating} · ` : "";
    const reviewInfo = biz.review_count ? `${biz.review_count} reseñas` : "";
    
    fullDesc = isMenu 
      ? desc 
      : [desc, stars + reviewInfo, biz.address ? esc(`📍 ${biz.address}`) : ""].filter(Boolean).join(" — ");
      
    let bizSlug = biz.slug || biz.id;
    if (bizCity && bizSlug.startsWith(`${bizCity}-`)) {
      bizSlug = bizSlug.substring(bizCity.length + 1);
    }
    
    const { country_code: bizCountry } = await getCityData(bizCity);
    const specificCityPath = isWorld ? `/${bizCountry}/${bizCity}` : `/${bizCity}`;
    bizCityPath = specificCityPath;
    canonicalUrl = bizCity ? `${BASE_URL}${specificCityPath}/${esc(bizSlug)}` : BASE_URL;
    url = canonicalUrl;
    linkHref = canonicalUrl;
  } else if (evId) {
    const ev = await getEv(evId, city);
    if (!ev) {
      return notFoundResponse("Evento no encontrado");
    }
    evData = ev;
    name = esc(ev.title);
    desc = esc(ev.description?.slice(0, 160) || `Evento en ${SITE_NAME}`);
    img = esc(ev.img_url || ev.img || `${BASE_URL}/og-image.png`);
    category = esc(ev.event_category || "");
    let dStr = "";
    if (ev.date) {
      try { dStr = `📅 ${new Date(ev.date).toLocaleDateString("es-MX")}`; } catch(e) { /* ignore */ }
    }
    fullDesc = [desc, dStr, ev.venue_name ? esc(`📍 ${ev.venue_name}`) : ""].filter(Boolean).join(" — ");
    canonicalUrl = esc(eventUrl(ev, BASE_URL));
    url = canonicalUrl;
    linkHref = canonicalUrl;
  } else if (expId) {
    const exp = await getExp(expId, city);
    if (!exp) {
      return notFoundResponse("Artículo no encontrado");
    }
    expData = exp;
    name = esc(exp.title);
    desc = esc(exp.description?.slice(0, 160) || `Artículo en Revista ${SITE_NAME}`);
    const gallery = Array.isArray(exp.gallery) ? exp.gallery : [];
    img = esc(gallery[0] || `${BASE_URL}/og-image.png`);
    category = esc(exp.activity_type || "Revista");
    
    fullDesc = desc;
    // Canónica del tour con el slug DE BASE (el mismo que emiten el
    // sitemap, ExperienceViewer y tourCardUrl): si se llegó por el slug
    // del título o por UUID, la canónica es la del slug de base (C4).
    canonicalUrl = `${BASE_URL}/revista/${esc(city || 'todas')}/${esc(exp.slug || expId)}`;
    url = canonicalUrl;
    linkHref = canonicalUrl;
  }

  // --- Build Schema.org JSON-LD ---
  let jsonLd = "";
  if (bizData) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": bizData.name,
      "url": canonicalUrl,
      // Si no hay descripción ni tagline en base, texto real con nombre y
      // ciudad (nunca vacío, nunca inventado).
      "description": bizData.description || bizData.tagline
        || businessDescriptionFallback(bizData.name, cityNameFormat),
    };
    if (bizData.photos?.[0]?.url) schema.image = bizData.photos[0].url;
    if (bizData.address) schema.address = { "@type": "PostalAddress", "streetAddress": bizData.address };
    if (bizData.rating) {
      schema.aggregateRating = {
        "@type": "AggregateRating",
        "ratingValue": bizData.rating,
        "reviewCount": bizData.review_count || 1,
        "bestRating": 5
      };
    }
    if (bizData.category) schema.additionalType = bizData.category;
    if (bizData.lat && bizData.lng) {
      schema.geo = { "@type": "GeoCoordinates", "latitude": parseFloat(bizData.lat), "longitude": parseFloat(bizData.lng) };
    }
    if (bizData.schedule && typeof bizData.schedule === 'object') {
      // Horario en formato válido de schema.org ("Mo 08:45-23:00"): el
      // formato anterior ("Monday 08:45 a.m. - 11:00 p.m.") no es válido.
      // Se convierte fielmente de 12 h a 24 h; si el dato de origen es
      // sospechoso (p. ej. apertura a las 12:30 a.m.), se refleja tal cual
      // y se corrige en el panel, no aquí.
      const hours = scheduleToOpeningHours(bizData.schedule);
      if (hours.length > 0) schema.openingHours = hours;
    }
    const bizReviews = await getReviews(bizData.id);
    if (bizReviews.length > 0) {
      schema.review = bizReviews.map(r => ({
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": String(r.stars || 5),
          "bestRating": "5"
        },
        "author": { "@type": "Person", "name": esc(r.user_name || `Usuario ${SITE_NAME}`) },
        "reviewBody": esc(r.text || ""),
        "datePublished": r.created_at ? r.created_at.split("T")[0] : undefined
      }));
    }
    const bizNodes = [schema];
    if (bizData.city_slug) {
      bizNodes.push(breadcrumbList([
        { name: "Inicio", item: BASE_URL },
        { name: cityNameFormat || bizData.city_slug, item: `${BASE_URL}${bizCityPath}` },
        { name: bizData.name, item: canonicalUrl },
      ]));
    }
    jsonLd = `<script type="application/ld+json">${JSON.stringify(bizNodes.length > 1 ? bizNodes : schema)}</script>`;
  } else if (evData) {
    const tz = CITY_TZ[String(evData.city_slug || "").split(",")[0]] || "America/Mexico_City";
    const schema = {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": evData.title,
      "url": canonicalUrl,
      "description": evData.description || "",
      "eventStatus": eventStatusUrl(evData.status),
      "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    };
    const start = eventStartDate(evData, tz);
    if (start) schema.startDate = start;
    const end = eventEndDate(evData, tz);
    if (end) schema.endDate = end;
    if (evData.img_url || evData.img) schema.image = evData.img_url || evData.img;
    if (evData.venue_name) {
      schema.location = { "@type": "Place", "name": evData.venue_name };
      if (evData.venue_address) {
        schema.location.address = { "@type": "PostalAddress", "streetAddress": evData.venue_address };
      }
      if (evData.lat && evData.lng) {
        schema.location.geo = { "@type": "GeoCoordinates", "latitude": parseFloat(evData.lat), "longitude": parseFloat(evData.lng) };
      }
    }
    // Oferta con el precio mínimo publicado en base (nunca inventado) y
    // el enlace real de boletos; sin precio publicado no hay offers.
    // performer/organizer no existen como columnas en la base: se omiten.
    const offer = eventOffer(evData);
    if (offer) schema.offers = offer;
    const evCity = String(evData.city_slug || "").split(",")[0];
    const evCityName = evCity
      ? evCity.charAt(0).toUpperCase() + evCity.slice(1).replace(/-/g, " ")
      : "";
    const evNodes = [schema];
    if (evCity) {
      // En .world la ciudad del evento lleva su prefijo de país
      // (/fr/paris), igual que en el resto de las migas de pan.
      const { country_code: evCityCountry } = await getCityData(evCity);
      const evCityPath = isWorld ? `/${evCityCountry}/${evCity}` : `/${evCity}`;
      evNodes.push(breadcrumbList([
        { name: "Inicio", item: BASE_URL },
        { name: evCityName, item: `${BASE_URL}${evCityPath}` },
        { name: evData.title, item: canonicalUrl },
      ]));
    }
    jsonLd = `<script type="application/ld+json">${JSON.stringify(evNodes)}</script>`;
  } else if (expData) {
    const expImage = (Array.isArray(expData.gallery) && expData.gallery[0]) ? expData.gallery[0] : null;
    // Moneda de la oferta según la ciudad del tour (USD fuera de México,
    // MXN en México — regla 19 Nov 2026).
    const { country_code: expCityCountry } = await getCityData(expData.city_slug);
    const expCurrency = currencyForCountryCode(expCityCountry);
    const tourNodes = tourSchemaNodes(expData, canonicalUrl, expImage, expCurrency);
    const schema = [
      // Tours: TouristTrip + oferta con precio en la moneda de la ciudad; resto: TouristAttraction
      ...(tourNodes.length > 0 ? tourNodes : [{
        "@context": "https://schema.org",
        "@type": "TouristAttraction",
        "name": expData.title,
        "url": canonicalUrl,
        "description": expData.description || "",
        "image": expImage ? [expImage] : []
      }]),
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": BASE_URL },
          { "@type": "ListItem", "position": 2, "name": "Revista", "item": `${BASE_URL}/revista/${city || ''}` },
          { "@type": "ListItem", "position": 3, "name": expData.title, "item": canonicalUrl }
        ]
      }
    ];
    jsonLd = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  }

  // --- Build rich body for crawlers ---
  let bodyContent = `<h1>${name}</h1>`;

  // Incluir siempre la imagen principal (og:image) para Google Image Search
  if (img && img !== `${BASE_URL}/og-image.png`) {
    bodyContent += `<img src="${img}" alt="${name}" style="max-width: 100%; height: auto;" />`;
  }

  if (bizData) {
    // Si hay más fotos en la galería del negocio, incluirlas
    if (bizData.photos && Array.isArray(bizData.photos)) {
      bizData.photos.forEach(p => {
        if (p.url && p.url !== img) {
          bodyContent += `<img src="${esc(p.url)}" alt="Foto de ${name}" style="max-width: 100%; height: auto; margin-top: 10px;" />`;
        }
      });
    }

    if (bizData.category) bodyContent += `<p><strong>Categoría:</strong> ${esc(bizData.category)}</p>`;
    if (bizData.address) bodyContent += `<p><strong>Dirección:</strong> ${esc(bizData.address)}</p>`;
    if (bizData.rating) bodyContent += `<p><strong>Calificación:</strong> ${bizData.rating}/5${bizData.review_count ? ` (${bizData.review_count} reseñas)` : ""}</p>`;
    if (bizData.description) bodyContent += `<p>${esc(bizData.description)}</p>`;
    if (bizData.city_slug) {
      const cityName = bizData.city_slug.charAt(0).toUpperCase() + bizData.city_slug.slice(1).replace("-", " ");
      bodyContent += `<p><strong>Ciudad:</strong> ${esc(cityName)}</p>`;
    }
    bodyContent += `<a href="${linkHref}">Ver ${name} en ${SITE_NAME}</a>`;
    const { country_code: cc } = await getCityData(bizData.city_slug);
    const cp = isWorld && bizData.city_slug ? `/${cc}/${bizData.city_slug}` : `/${bizData.city_slug || ""}`;
    bodyContent += `<nav><h2>Explorar más</h2><ul>`;
    bodyContent += `<li><a href="${BASE_URL}${cp}">Todos los negocios en ${esc(cityNameFormat || "tu ciudad")}</a></li>`;
    bodyContent += `<li><a href="${BASE_URL}">${SITE_NAME} — Inicio</a></li>`;
    bodyContent += `</ul></nav>`;
  } else if (evData) {
    if (evData.date) bodyContent += `<p><strong>Fecha:</strong> ${new Date(evData.date).toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>`;
    if (evData.venue_name) bodyContent += `<p><strong>Lugar:</strong> ${esc(evData.venue_name)}</p>`;
    if (evData.event_category) bodyContent += `<p><strong>Categoría:</strong> ${esc(evData.event_category)}</p>`;
    if (evData.description) bodyContent += `<p>${esc(evData.description)}</p>`;
    bodyContent += `<a href="${linkHref}">Ver evento en ${SITE_NAME}</a>`;
  } else if (expData) {
    // Moneda del precio según la ciudad del tour (USD fuera de México,
    // MXN en México — regla 19 Nov 2026).
    const { country_code: expBodyCountry } = await getCityData(expData.city_slug);
    const expBodyCurrency = currencyForCountryCode(expBodyCountry);
    // Si hay galería en la experiencia, incluirlas
    if (expData.gallery && Array.isArray(expData.gallery)) {
      expData.gallery.forEach(urlImg => {
        if (urlImg && urlImg !== img) {
          bodyContent += `<img src="${esc(urlImg)}" alt="Foto de la experiencia ${name}" style="max-width: 100%; height: auto; margin-top: 10px;" />`;
        }
      });
    }

    if (expData.activity_type) bodyContent += `<p><strong>Categoría:</strong> ${esc(expData.activity_type)}</p>`;
    if (expData.activity_type === 'Tour' && Number(expData.price) > 0) bodyContent += `<p><strong>Precio desde:</strong> $${Number(expData.price).toLocaleString('es-MX')} ${expBodyCurrency}</p>`;
    if (expData.activity_type === 'Tour' && expData.duration) bodyContent += `<p><strong>Duración:</strong> ${esc(expData.duration)}</p>`;
    if (expData.description) bodyContent += `<p>${esc(expData.description)}</p>`;
    bodyContent += `<a href="${linkHref}">Ver experiencia en ${SITE_NAME}</a>`;
  }

  const html = `<!doctype html>
<html lang="es" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${name.includes("CityMap") ? name : `${name} — ${SITE_NAME}`}</title>
<meta name="description" content="${fullDesc}"/>
<link rel="canonical" href="${canonicalUrl}"/>

<!-- Open Graph -->
<meta property="og:type" content="${evData ? "event" : "website"}"/>
<meta property="og:url" content="${url}"/>
<meta property="og:title" content="${name}"/>
<meta property="og:description" content="${fullDesc}"/>
<meta property="og:image" content="${img}"/>
<meta property="og:image:url" content="${img}"/>
<meta property="og:image:secure_url" content="${img}"/>

<meta property="og:site_name" content="${esc(SITE_NAME)}"/>
<meta property="og:locale" content="${esc(locale)}"/>

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${name}"/>
<meta name="twitter:description" content="${fullDesc}"/>
<meta name="twitter:image" content="${img}"/>

${jsonLd}
</head>
<body>
${bodyContent}
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
      "X-Robots-Tag": "index, follow, max-image-preview:large",
    },
  });
}

export const config = { runtime: "edge" };