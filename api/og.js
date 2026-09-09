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
  "educacion":    { title: "Escuelas y Educación en {city} — Colegios, Cursos y Más", desc: "Escuelas, universidades, academias y cursos en {city}. Encuentra opciones educativas con horarios e información de contacto.", label: "Educación" }
};

async function getReviews(bizId) {
  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/reviews?biz_id=eq.${bizId}&select=rating,text,comment,user_name,created_at&order=created_at.desc&limit=3`,
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
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/cities?slug=eq.${citySlug}&select=country_code,bg_image`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    if (!r.ok) return { country_code: "mx", bg_image: null };
    const d = await r.json();
    return {
      country_code: d?.[0]?.country_code || "mx",
      bg_image: d?.[0]?.bg_image || null
    };
  } catch {
    return { country_code: "mx", bg_image: null };
  }
}

async function getBiz(id, city) {
  try {
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
      r = await fetch(
        `${SUPABASE_URL}/rest/v1/businesses?name=ilike.*${searchName}*&select=id,slug,name,tagline,description,address,rating,review_count,category,photos,city_slug,schedule,lat,lng`,
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
    
    if (!isUUID && id.includes('_')) {
      const parts = id.split('_');
      const possibleId = parts.pop();
      if (/^\d+$/.test(possibleId) || /^[0-9a-f]{8}-/.test(possibleId)) {
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

async function getExp(id, city) {
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    
    if (isUUID) {
      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/experiences?id=eq.${id}&select=id,title,description,gallery,city_slug,activity_type`,
        { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
      );
      if (!r.ok) return null;
      const d = await r.json();
      return d?.[0] || null;
    }
    
    let r = await fetch(
      `${SUPABASE_URL}/rest/v1/experiences?slug=ilike.*${encodeURIComponent(id)}*&select=id,title,description,gallery,city_slug,activity_type&limit=1`,
      { headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` } }
    );
    if (r.ok) {
      let d = await r.json();
      if (d?.[0]) return d[0];
    }
    
    const searchName = id.replace(/-/g, '%25');
    r = await fetch(
      `${SUPABASE_URL}/rest/v1/experiences?title=ilike.*${searchName}*&select=id,title,description,gallery,city_slug,activity_type&limit=1`,
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
  const city = searchParams.get("city");
  const ua = req.headers.get("user-agent") || "";

  const host = req.headers.get("host") || "";
  const isWorld = host.endsWith("citymap.world");
  const BASE_URL = isWorld ? "https://citymap.world" : "https://citymap.mx";
  const SITE_NAME = isWorld ? "CityMap" : "CityMap México";
  
  // Dynamic country extraction to set appropriate locales and paths
  const targetCitySlug = city || "";
  const { country_code: countryCode, bg_image: cityBgImage } = await getCityData(targetCitySlug);
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
    const title = `${SITE_NAME} — Descubre tu ciudad`;
    const desc = "Explora negocios locales, lugares de interés y eventos exclusivos. Encuentra lo mejor cerca de ti en un solo lugar.";
    const img = `${BASE_URL}/og-image.png`;

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
</head>
<body>
<h1>${esc(title)}</h1>
<img src="${esc(img)}" alt="${esc(title)}" style="max-width: 100%; height: auto;" />
<p>${esc(desc)}</p>
<a href="${BASE_URL}">Abrir ${esc(SITE_NAME)}</a>
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

  // Real user (not a bot) → redirect to SPA with deep-link param
  if (!isBot(ua)) {
    let loc = BASE_URL;
    const isMenu = searchParams.get("menu") === "true";
    if (id) {
       if (isMenu && city) loc = `${BASE_URL}${cityPath}/${id}/menu`;
       else loc += `?lugar=${id}`;
    }
    else if (evId) loc += `?evento=${evId}`;
    else if (expId) loc = `${BASE_URL}/experiencias/${city || 'todas'}/${expId}`;
    else if (vista) loc += `?vista=${vista}`;
    else if (city) loc = `${BASE_URL}${cityPath}`;
    
    return new Response(null, {
      status: 302,
      headers: { Location: loc },
    });
  }

  // --- RESPUESTA PARA CIUDAD ---
  if (city && !id && !evId && !expId) {
    const cityName = city.charAt(0).toUpperCase() + city.slice(1).replace("-", " ");
    const title = `${SITE_NAME} ${cityName} — La guía de tu ciudad`;
    const desc = `Encuentra los mejores restaurantes, servicios y eventos en ${cityName}. Explora lugares increíbles cerca de ti.`;
    const img = cityBgImage || `${BASE_URL}/og-image.png`;
    
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
</head>
<body>
<h1>${esc(title)}</h1>
<img src="${esc(img)}" alt="${esc(title)}" style="max-width: 100%; height: auto;" />
<p>${esc(desc)}</p>
<a href="${BASE_URL}${cityPath}">Abrir ${esc(SITE_NAME)} en ${esc(cityName)}</a>
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
    let title = SITE_NAME;
    let desc = "Descubre tu ciudad.";
    const img = `${BASE_URL}/og-image.png`;

    if (vista === "eventos") {
      title = `Cartelera de Eventos — ${SITE_NAME}`;
      desc = "Descubre los mejores eventos, conciertos y actividades en tu ciudad.";
    } else if (vista === "mapa") {
      title = `Mapa Interactivo de Negocios — ${SITE_NAME}`;
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
<meta property="og:url" content="${BASE_URL}/?vista=${esc(vista)}"/>
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
</head>
<body>
<h1>${esc(title)}</h1>
<img src="${esc(img)}" alt="${esc(title)}" style="max-width: 100%; height: auto;" />
<p>${esc(desc)}</p>
<a href="${BASE_URL}/?vista=${esc(vista)}">Abrir en ${esc(SITE_NAME)}</a>
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

  let name = "", desc = "", img = "", url = "", category = "", fullDesc = "", linkHref = "", canonicalUrl = "", cityNameFormat = "";
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
</head>
<body>
<h1>${esc(catInfo.label)} en ${esc(cityName)}</h1>
<img src="${esc(img)}" alt="${esc(catInfo.label)} en ${esc(cityName)}" style="max-width: 100%; height: auto;" />
<p>${esc(desc)}</p>
<a href="${canonicalUrl}">Ver ${esc(catInfo.label)} en ${esc(SITE_NAME)}</a>
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

    const biz = await getBiz(id, city);
    if (!biz) {
      return new Response(null, { status: 302, headers: { Location: BASE_URL } });
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
    canonicalUrl = bizCity ? `${BASE_URL}${specificCityPath}/${esc(bizSlug)}` : BASE_URL;
    url = canonicalUrl;
    linkHref = canonicalUrl;
  } else if (evId) {
    const ev = await getEv(evId, city);
    if (!ev) {
      return new Response(null, { status: 302, headers: { Location: BASE_URL } });
    }
    evData = ev;
    name = esc(ev.title);
    desc = esc(ev.description?.slice(0, 160) || `Evento en ${SITE_NAME}`);
    img = esc(ev.img_url || ev.img || `${BASE_URL}/og-image.png`);
    category = esc(ev.event_category || "");
    let dStr = "";
    if (ev.date) {
      try { dStr = `📅 ${new Date(ev.date).toLocaleDateString("es-MX")}`; } catch(e) {}
    }
    fullDesc = [desc, dStr, ev.venue_name ? esc(`📍 ${ev.venue_name}`) : ""].filter(Boolean).join(" — ");
    canonicalUrl = `${BASE_URL}/evento/${esc(evId)}`;
    url = canonicalUrl;
    linkHref = canonicalUrl;
  } else if (expId) {
    const exp = await getExp(expId, city);
    if (!exp) {
      return new Response(null, { status: 302, headers: { Location: BASE_URL } });
    }
    expData = exp;
    name = esc(exp.title);
    desc = esc(exp.description?.slice(0, 160) || `Experiencia en ${SITE_NAME}`);
    const gallery = Array.isArray(exp.gallery) ? exp.gallery : [];
    img = esc(gallery[0] || `${BASE_URL}/og-image.png`);
    category = esc(exp.activity_type || "Experiencia");
    
    fullDesc = desc;
    canonicalUrl = `${BASE_URL}/experiencias/${esc(city || 'todas')}/${esc(expId)}`;
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
      "description": bizData.description || bizData.tagline || "",
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
      const dayMap = { lun: "Monday", mar: "Tuesday", mie: "Wednesday", jue: "Thursday", vie: "Friday", sab: "Saturday", dom: "Sunday" };
      const hours = [];
      for (const [key, val] of Object.entries(bizData.schedule)) {
        if (key === "type" || !val || /cerrado/i.test(val)) continue;
        if (dayMap[key]) hours.push(`${dayMap[key]} ${val}`);
      }
      if (hours.length > 0) schema.openingHours = hours;
    }
    const bizReviews = await getReviews(bizData.id);
    if (bizReviews.length > 0) {
      schema.review = bizReviews.map(r => ({
        "@type": "Review",
        "reviewRating": {
          "@type": "Rating",
          "ratingValue": String(r.rating || 5),
          "bestRating": "5"
        },
        "author": { "@type": "Person", "name": esc(r.user_name || `Usuario ${SITE_NAME}`) },
        "reviewBody": esc(r.text || r.comment || ""),
        "datePublished": r.created_at ? r.created_at.split("T")[0] : undefined
      }));
    }
    jsonLd = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  } else if (evData) {
    const schema = {
      "@context": "https://schema.org",
      "@type": "Event",
      "name": evData.title,
      "url": canonicalUrl,
      "description": evData.description || "",
    };
    if (evData.date) schema.startDate = evData.date;
    if (evData.img_url || evData.img) schema.image = evData.img_url || evData.img;
    if (evData.venue_name) schema.location = { "@type": "Place", "name": evData.venue_name };
    jsonLd = `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
  } else if (expData) {
    const schema = [
      {
        "@context": "https://schema.org",
        "@type": "TouristAttraction",
        "name": expData.title,
        "url": canonicalUrl,
        "description": expData.description || "",
        "image": (Array.isArray(expData.gallery) && expData.gallery[0]) ? [expData.gallery[0]] : []
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Inicio", "item": BASE_URL },
          { "@type": "ListItem", "position": 2, "name": "Experiencias", "item": `${BASE_URL}/experiencias/${city || ''}` },
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
    // Si hay galería en la experiencia, incluirlas
    if (expData.gallery && Array.isArray(expData.gallery)) {
      expData.gallery.forEach(urlImg => {
        if (urlImg && urlImg !== img) {
          bodyContent += `<img src="${esc(urlImg)}" alt="Foto de la experiencia ${name}" style="max-width: 100%; height: auto; margin-top: 10px;" />`;
        }
      });
    }

    if (expData.activity_type) bodyContent += `<p><strong>Categoría:</strong> ${esc(expData.activity_type)}</p>`;
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
<meta property="og:image:type" content="image/jpeg"/>
<meta property="og:image:width" content="1200"/>
<meta property="og:image:height" content="630"/>
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
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}

export const config = { runtime: "edge" };