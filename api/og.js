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

async function getBiz(id, city) {
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let q = isUUID ? `id=eq.${id}` : `slug=in.(${id},${city ? `${city}-${id}` : id})`;
    
    // If it's not a UUID, check if there's a numeric ID at the end of the slug (e.g. "mi-negocio_123")
    if (!isUUID && id.includes('_')) {
      const parts = id.split('_');
      const possibleId = parts.pop();
      if (/^\d+$/.test(possibleId)) {
        q = `id=eq.${possibleId}`;
      }
    }

    let r = await fetch(
      `${SUPABASE_URL}/rest/v1/businesses?${q}&select=id,slug,name,tagline,description,address,rating,review_count,category,photos,city_slug`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    if (!r.ok) return null;
    let d = await r.json();
    if (!d?.[0] && !isUUID && !q.startsWith("id=")) {
      const searchName = id.split("-").join("%25");
      r = await fetch(
        `${SUPABASE_URL}/rest/v1/businesses?name=ilike.*${searchName}*&select=id,slug,name,tagline,description,address,rating,review_count,category,photos,city_slug`,
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
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    let q = isUUID ? `id=eq.${id}` : `slug=in.(${id},${city ? `${city}-${id}` : id})`;
    
    // If it's not a UUID, check if there's a numeric ID at the end of the slug (e.g. "mi-evento_123")
    if (!isUUID && id.includes('_')) {
      const parts = id.split('_');
      const possibleId = parts.pop();
      if (/^\d+$/.test(possibleId) || /^[0-9a-f]{8}-/.test(possibleId)) {
        // Also support uuid after underscore just in case
        q = `id=eq.${possibleId}`;
      }
    }

    let r = await fetch(
      `${SUPABASE_URL}/rest/v1/events?${q}&select=id,title,description,date,venue_name,img_url,img,event_category,city_slug`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    if (!r.ok) return null;
    let d = await r.json();
    if (!d?.[0] && !isUUID && !q.startsWith("id=")) {
      const searchName = id.split("-").join("%25");
      r = await fetch(
        `${SUPABASE_URL}/rest/v1/events?title=ilike.*${searchName}*&select=id,slug,title,description,date,venue_name,img_url,img,event_category,city_slug`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
      );
      if (r.ok) d = await r.json();
    }
    return d?.[0] || null;
  } catch {
    return null;
  }
}

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("b");
  const evId = searchParams.get("ev");
  const vista = searchParams.get("vista");
    const city = searchParams.get("city");
  const ua = req.headers.get("user-agent") || "";

  // No ID → redirect to home
  if (!id && !evId && !vista && !city) {
    return new Response(null, {
      status: 302,
      headers: { Location: "https://citymap.mx" },
    });
  }

  // Real user (not a bot) → redirect to SPA with deep-link param
  if (!isBot(ua)) {
    let loc = "https://citymap.mx";
    if (id) loc += `?lugar=${id}`;
    else if (evId) loc += `?evento=${evId}`;
    else if (vista) loc += `?vista=${vista}`;
    else if (city) loc += `/${city}`;
    
    return new Response(null, {
      status: 302,
      headers: { Location: loc },
    });
  }

  // --- RESPUESTA PARA CIUDAD ---
  if (city && !id && !evId) {
    const cityName = city.charAt(0).toUpperCase() + city.slice(1).replace("-", " ");
    const title = `CityMap ${cityName} — La guía de tu ciudad`;
    const desc = `Encuentra los mejores restaurantes, servicios y eventos en ${cityName}. Explora lugares increíbles cerca de ti.`;
    const img = "https://citymap.mx/og-image.jpg";
    
    const html = `<!doctype html>
<html lang="es" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>
<link rel="canonical" href="https://citymap.mx/${esc(city)}"/>

<!-- Open Graph -->
<meta property="og:type" content="website"/>
<meta property="og:url" content="https://citymap.mx/${esc(city)}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${esc(img)}"/>
<meta property="og:site_name" content="CityMap México"/>
<meta property="og:locale" content="es_MX"/>

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(img)}"/>
</head>
<body>
<h1>${esc(title)}</h1>
<p>${esc(desc)}</p>
<a href="https://citymap.mx/${esc(city)}">Abrir CityMap en ${esc(cityName)}</a>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  // --- RESPUESTA PARA TABS ---
  if (vista) {
    let title = "CityMap México";
    let desc = "Descubre tu ciudad.";
    const img = "https://citymap.mx/og-image.png";

    if (vista === "eventos") {
      title = "Cartelera de Eventos — CityMap México";
      desc = "Descubre los mejores eventos, conciertos y actividades en tu ciudad.";
    } else if (vista === "mapa") {
      title = "Mapa Interactivo de Negocios — CityMap México";
      desc = "Explora todos los negocios y lugares de interés cercanos a ti en nuestro mapa interactivo.";
    }

    const html = `<!doctype html>
<html lang="es" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}"/>

<!-- Open Graph -->
<meta property="og:type" content="website"/>
<meta property="og:url" content="https://citymap.mx/?vista=${esc(vista)}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(desc)}"/>
<meta property="og:image" content="${esc(img)}"/>
<meta property="og:site_name" content="CityMap México"/>
<meta property="og:locale" content="es_MX"/>

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${esc(title)}"/>
<meta name="twitter:description" content="${esc(desc)}"/>
<meta name="twitter:image" content="${esc(img)}"/>
</head>
<body>
<h1>${esc(title)}</h1>
<p>${esc(desc)}</p>
<a href="https://citymap.mx/?vista=${esc(vista)}">Abrir en CityMap México</a>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  }

  let name = "", desc = "", img = "", url = "", category = "", fullDesc = "", linkHref = "", canonicalUrl = "";

  if (id) {
    const biz = await getBiz(id, city);
    if (!biz) {
      return new Response(null, { status: 302, headers: { Location: "https://citymap.mx" } });
    }
    name = esc(biz.name);
    desc = esc(biz.tagline || biz.description?.slice(0, 160) || `Descubre ${biz.name} en CityMap México`);
    const rawImg = biz.photos?.[0]?.url || "";
    img = esc(rawImg || "https://citymap.mx/og-image.png");
    category = esc(biz.category || "");
    const stars = biz.rating ? `⭐ ${biz.rating} · ` : "";
    const reviewInfo = biz.review_count ? `${biz.review_count} reseñas` : "";
    fullDesc = [desc, stars + reviewInfo, biz.address ? esc(`📍 ${biz.address}`) : ""].filter(Boolean).join(" — ");
    // Use the pretty SEO URL as canonical
    const bizCity = biz.city_slug || city || "";
    let bizSlug = biz.slug || biz.id;
    if (bizCity && bizSlug.startsWith(`${bizCity}-`)) {
      bizSlug = bizSlug.substring(bizCity.length + 1);
    }
    canonicalUrl = bizCity ? `https://citymap.mx/${esc(bizCity)}/${esc(bizSlug)}` : `https://citymap.mx`;
    url = canonicalUrl;
    linkHref = canonicalUrl;
  } else if (evId) {
    const ev = await getEv(evId, city);
    if (!ev) {
      return new Response(null, { status: 302, headers: { Location: "https://citymap.mx" } });
    }
    name = esc(ev.title);
    desc = esc(ev.description?.slice(0, 160) || `Evento en CityMap México`);
    img = esc(ev.img_url || ev.img || "https://citymap.mx/og-image.png");
    category = esc(ev.event_category || "");
    // Try to format date
    let dStr = "";
    if (ev.date) {
      try { dStr = `📅 ${new Date(ev.date).toLocaleDateString("es-MX")}`; } catch(e) {}
    }
    fullDesc = [desc, dStr, ev.venue_name ? esc(`📍 ${ev.venue_name}`) : ""].filter(Boolean).join(" — ");
    // Use the pretty event URL as canonical
    canonicalUrl = `https://citymap.mx/evento/${esc(evId)}`;
    url = canonicalUrl;
    linkHref = canonicalUrl;
  }

  const html = `<!doctype html>
<html lang="es" prefix="og: https://ogp.me/ns#">
<head>
<meta charset="UTF-8"/>
<title>${name} — CityMap México</title>
<meta name="description" content="${fullDesc}"/>
<link rel="canonical" href="${canonicalUrl}"/>

<!-- Open Graph -->
<meta property="og:type" content="website"/>
<meta property="og:url" content="${url}"/>
<meta property="og:title" content="${name}"/>
<meta property="og:description" content="${fullDesc}"/>
<meta property="og:image" content="${img}"/>
<meta property="og:image:url" content="${img}"/>
<meta property="og:image:secure_url" content="${img}"/>
<meta property="og:image:type" content="image/jpeg"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
<meta property="og:site_name" content="CityMap México"/>
<meta property="og:locale" content="es_MX"/>

<!-- Twitter Card -->
<meta name="twitter:card" content="summary_large_image"/>
<meta name="twitter:title" content="${name}"/>
<meta name="twitter:description" content="${fullDesc}"/>
<meta name="twitter:image" content="${img}"/>
</head>
<body>
<h1>${name}</h1>
<p>${fullDesc}</p>
${category ? `<p>Categoría: ${category}</p>` : ""}
<a href="${linkHref}">Ver en CityMap México</a>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

export const config = { runtime: "edge" };