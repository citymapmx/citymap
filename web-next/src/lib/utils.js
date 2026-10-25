import React from 'react';
export function getEventStatus(ev) {
  if (ev.status === "cancelled") return { lbl: "Cancelado", color: "#D94F3D", bg: "#FEE2E2" };
  if (ev.status === "sold_out") return { lbl: "Agotado", color: "#D97706", bg: "#FEF3C7" };
  if (ev.status === "pending" || !ev.active) return { lbl: "Pendiente", color: "#6B7280", bg: "#F3F4F6" };
  const now = new Date();
  const today = getLocalIsoDate(now);
  if (!ev.date) return { lbl: "Próximamente", color: "#3B82F6", bg: "#EFF6FF" };
  const endDateStr = ev.end_date || ev.date;
  const evDT = ev.time ? new Date(`${endDateStr}T${ev.time}`) : new Date(`${endDateStr}T23:59`);
  if ((now - evDT) > 86400000) return { lbl: "Finalizado", color: "#9CA3AF", bg: "#F3F4F6" };
  if (ev.date === today && (!ev.end_date || ev.end_date === ev.date)) return { lbl: "Hoy", color: "#16A34A", bg: "#DCFCE7" };
  if (ev.date <= today && endDateStr >= today) return { lbl: "Activo", color: "#16A34A", bg: "#DCFCE7" };
  return { lbl: "Próximamente", color: "#3B82F6", bg: "#EFF6FF" };
 
}

export function getKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 9999;
  const p = 0.017453292519943295;
  const c = Math.cos;
  const a = 0.5 - c((lat2 - lat1) * p) / 2 + c(lat1 * p) * c(lat2 * p) * (1 - c((lon2 - lon1) * p)) / 2;
  return 12742 * Math.asin(Math.sqrt(a));
}

export const METRO_ZONES = {};

export const updateMetroZones = (citiesList) => {
  if (!citiesList || !Array.isArray(citiesList)) return;
  Object.keys(METRO_ZONES).forEach(k => delete METRO_ZONES[k]);
  citiesList.forEach(c => {
    let metro = c.metro_zone;
    if (c.state && c.state.includes(";")) {
      metro = c.state.split(";")[1];
    }
    
    if (metro) {
      if (!METRO_ZONES[c.slug]) METRO_ZONES[c.slug] = [c.slug, metro];
      else if (!METRO_ZONES[c.slug].includes(metro)) METRO_ZONES[c.slug].push(metro);
      
      if (!METRO_ZONES[metro]) METRO_ZONES[metro] = [metro];
      if (!METRO_ZONES[metro].includes(c.slug)) METRO_ZONES[metro].push(c.slug);
    }
  });
};

export function isNear(item, userCoords, activeCity, maxKm = 20) {
  if (!item) return false;
  
  // Siempre incluir negocios que pertenezcan explícitamente a la ciudad seleccionada o su zona metropolitana
  const allowedCities = ["all"];
  if (METRO_ZONES[activeCity]) allowedCities.push(...METRO_ZONES[activeCity]);
  else allowedCities.push(activeCity);

  if (item.city_slug && item.city_slug.split(",").some(c => allowedCities.includes(c))) return true;
  
  // Si no pertenece a la ciudad seleccionada, pero está muy cerca (ej. municipio conurbado), incluirlo
  if (userCoords && userCoords.lat && userCoords.lng && item.lat && item.lng) {
    const dist = getKm(userCoords.lat, userCoords.lng, parseFloat(item.lat), parseFloat(item.lng));
    return dist <= maxKm;
  }
  
  return false;
}

export function getLocalIsoDate(d = new Date()) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, '0') + "-" + String(d.getDate()).padStart(2, '0');
}

export const CAT_EMOJI = { restaurantes: "🍽️", cafe: "☕", salud: "🏥", belleza: "💅", fitness: "💪", compras: "🛍️", tech: "💻", ocio: "🎭", hoteles: "🏨", educacion: "📚" };

export function isOpenNow(b, tz, now) {
  const sch = b.schedule;
  if (!sch || typeof sch !== "object" || Object.keys(sch).length === 0) return !!b.open;
  if (sch.type === "always_open") return true;
  
  try {
    const d = now || (typeof window !== "undefined" && window.APP_NOW) || new Date();
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz || (typeof window !== "undefined" && window.CITY_TZ) || "America/Mexico_City",
      weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(d);
    const get = type => fmt.find(p => p.type === type)?.value || "";
    const h = parseInt(get("hour"));
    const min = parseInt(get("minute"));
    const dayMap = { Sun: "dom", Mon: "lun", Tue: "mar", Wed: "mie", Thu: "jue", Fri: "vie", Sat: "sab" };
    // Previous day map for overnight shifts
    const prevDayMap = { Sun: "sab", Mon: "dom", Tue: "lun", Wed: "mar", Thu: "mie", Fri: "jue", Sat: "vie" };
    const weekday = get("weekday");
    const txt = sch[dayMap[weekday] || ""];
    
    const toMin = s => {
      const m = s.trim().match(/(\d{1,2})(?:\s*:\s*(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
      if (!m) return null;
      let hh = parseInt(m[1]);
      const mm = parseInt(m[2] || 0);
      const p = (m[3] || "").replace(/\./g, "").toLowerCase();
      if (p === "pm" && hh !== 12) hh += 12;
      if (p === "am" && hh === 12) hh = 0;
      return hh * 60 + mm;
    };
    
    const cur = (h === 24 ? 0 : h) * 60 + min;
    
    // Check today's schedule
    if (txt && !/cerrado/i.test(txt)) {
      const shifts = txt.split(/\n|,|\by\b/i).map(s => s.trim()).filter(Boolean);
      for (const shift of shifts) {
          const segs = shift.split(/\s*[-–]\s*|\s+a\s+/i).map(s => s.trim());
        if (segs.length < 2) continue;
        const open = toMin(segs[0]);
        const close = toMin(segs[1]);
        if (open === null || close === null) continue;
        
        const isOpenInShift = close <= open ? (cur >= open || cur < close) : (cur >= open && cur < close);
        if (isOpenInShift) return true;
      }
    }
    
    // Check previous day's schedule for overnight shifts (e.g. 10:30 PM - 3:00 AM)
    // Only relevant if current time is before 8 AM (i.e., we could be in a late-night shift from yesterday)
    if (cur < 8 * 60) {
      const prevTxt = sch[prevDayMap[weekday] || ""];
      if (prevTxt && !/cerrado/i.test(prevTxt)) {
        const shifts = prevTxt.split(/\n|,|\by\b/i).map(s => s.trim()).filter(Boolean);
        for (const shift of shifts) {
          const segs = shift.split(/\s*[-–]\s*|\s+a\s+/i).map(s => s.trim());
          if (segs.length < 2) continue;
          const open = toMin(segs[0]);
          const close = toMin(segs[1]);
          if (open === null || close === null) continue;
          // Only consider overnight shifts where close < open (crosses midnight)
          if (close < open && cur < close) return true;
        }
      }
    }
    
    return false;
  } catch { return !!b.open; }
}

// Returns minutes remaining until close for the current shift, or Infinity if always open, or -1 if closed
export function getMinutesToClose(b, tz, now) {
  const sch = b.schedule;
  if (!sch || typeof sch !== "object" || Object.keys(sch).length === 0) return Infinity;
  if (sch.type === "always_open") return Infinity;

  try {
    const d = now || (typeof window !== "undefined" && window.APP_NOW) || new Date();
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz || (typeof window !== "undefined" && window.CITY_TZ) || "America/Mexico_City",
      weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(d);
    const get = type => fmt.find(p => p.type === type)?.value || "";
    const h = parseInt(get("hour"));
    const min = parseInt(get("minute"));
    const dayMap = { Sun: "dom", Mon: "lun", Tue: "mar", Wed: "mie", Thu: "jue", Fri: "vie", Sat: "sab" };
    const prevDayMap = { Sun: "sab", Mon: "dom", Tue: "lun", Wed: "mar", Thu: "mie", Fri: "jue", Sat: "vie" };
    const weekday = get("weekday");
    const txt = sch[dayMap[weekday] || ""];

    const toMin = s => {
      const m = s.trim().match(/(\d{1,2})(?:\s*:\s*(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
      if (!m) return null;
      let hh = parseInt(m[1]);
      const mm = parseInt(m[2] || 0);
      const p = (m[3] || "").replace(/\./g, "").toLowerCase();
      if (p === "pm" && hh !== 12) hh += 12;
      if (p === "am" && hh === 12) hh = 0;
      return hh * 60 + mm;
    };

    const cur = (h === 24 ? 0 : h) * 60 + min;

    // Check today's shifts
    if (txt && !/cerrado/i.test(txt)) {
      const shifts = txt.split(/\n|,|\by\b/i).map(s => s.trim()).filter(Boolean);
      for (const shift of shifts) {
          const segs = shift.split(/\s*[-–]\s*|\s+a\s+/i).map(s => s.trim());
        if (segs.length < 2) continue;
        const open = toMin(segs[0]);
        const close = toMin(segs[1]);
        if (open === null || close === null) continue;
        const isOpenInShift = close <= open ? (cur >= open || cur < close) : (cur >= open && cur < close);
        if (isOpenInShift) {
          // minutes until close; handle overnight
          return close <= open && cur >= open ? (24 * 60 - cur + close) : (close - cur);
        }
      }
    }

    // Check previous day's overnight shifts
    if (cur < 8 * 60) {
      const prevTxt = sch[prevDayMap[weekday] || ""];
      if (prevTxt && !/cerrado/i.test(prevTxt)) {
        const shifts = prevTxt.split(/\n|,|\by\b/i).map(s => s.trim()).filter(Boolean);
        for (const shift of shifts) {
          const segs = shift.split(/\s*[-–]\s*|\s+a\s+/i).map(s => s.trim());
          if (segs.length < 2) continue;
          const open = toMin(segs[0]);
          const close = toMin(segs[1]);
          if (open === null || close === null) continue;
          if (close < open && cur < close) {
            return close - cur;
          }
        }
      }
    }

    return -1;
  } catch { return Infinity; }
}

export function getScheduleStatus(b, isOpen, short = false) {
  let suffix = "";
  if (b.schedule?.type === "appointment") suffix = " · Previa Cita";
  if (b.schedule?.type === "delivery") suffix = " · Solo para llevar";
  
  const deliverySuffix = short ? "" : (b.schedule?.type === "delivery" ? React.createElement('span', { key: 's', style: { color: '#F59E0B' } }, suffix) : suffix);

  if (b.schedule?.type === "always_open") return { text: ["Abierto 24/7", deliverySuffix], color: "#16A34A", dot: "dot-o", bg: "rgba(22, 163, 74, 0.1)" };
  
  if (isOpen) return { text: ["Abierto", deliverySuffix], color: "#16A34A", dot: "dot-o", bg: "rgba(22, 163, 74, 0.1)" };
  
  return { text: ["Cerrado", deliverySuffix], color: "#DC2626", dot: "dot-c", bg: "rgba(220, 38, 38, 0.1)" };
}

export function getSmartScheduleInfo(b, tz, now) {
  const sch = b.schedule;
  if (!sch || typeof sch !== "object" || Object.keys(sch).length === 0) return { text: b.open ? "Abierto ahora" : "Cerrado", color: b.open ? "#16A34A" : "#DC2626" };
  let suffix = "";
  if (sch.type === "appointment") suffix = " · Previa Cita";
  if (sch.type === "delivery") suffix = " · Solo para llevar";
  
  const deliverySuffix = sch.type === "delivery" ? React.createElement('span', { key: 's', style: { color: '#F59E0B' } }, suffix) : suffix;
  
  if (sch.type === "always_open") return { text: ["Abierto 24/7", deliverySuffix], color: "#16A34A" };
  
  try {
    const d = now || (typeof window !== "undefined" && window.APP_NOW) || new Date();
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz || (typeof window !== "undefined" && window.CITY_TZ) || "America/Mexico_City",
      weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(d);
    const get = type => fmt.find(p => p.type === type)?.value || "";
    const h = parseInt(get("hour"));
    const min = parseInt(get("minute"));
    const dayMap = { Sun: "dom", Mon: "lun", Tue: "mar", Wed: "mie", Thu: "jue", Fri: "vie", Sat: "sab" };
    const cur = (h === 24 ? 0 : h) * 60 + min;
    const daysOrder = ["dom", "lun", "mar", "mie", "jue", "vie", "sab"];
    const currentDayIdx = daysOrder.indexOf(dayMap[get("weekday")] || "dom");

    const toMin = s => {
      const m = s.trim().match(/(\d{1,2})(?:\s*:\s*(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
      if (!m) return null;
      let hh = parseInt(m[1]);
      const mm = parseInt(m[2] || 0);
      const p = (m[3] || "").replace(/\./g, "").toLowerCase();
      if (p === "pm" && hh !== 12) hh += 12;
      if (p === "am" && hh === 12) hh = 0;
      return hh * 60 + mm;
    };

    let isCurrentlyOpen = false;
    let minUntilClose = Infinity;
    let minUntilOpen = Infinity;

    // Check today's schedule for current status
    const txt = sch[daysOrder[currentDayIdx]];
    if (txt && !/cerrado/i.test(txt)) {
      const shifts = txt.split(/\n|,|\by\b/i).map(s => s.trim()).filter(Boolean);
      for (const shift of shifts) {
          const segs = shift.split(/\s*[-–]\s*|\s+a\s+/i).map(s => s.trim());
        if (segs.length < 2) continue;
        const open = toMin(segs[0]);
        const close = toMin(segs[1]);
        if (open === null || close === null) continue;
        
        let shiftEnd = close;
        if (close <= open) shiftEnd += 1440; 
        
        let curCheck = cur;
        if (close <= open && cur < (shiftEnd - 1440)) curCheck += 1440;
        
        if (curCheck >= open && curCheck < shiftEnd) {
           isCurrentlyOpen = true;
           let m = shiftEnd - curCheck;
           if (m < minUntilClose) minUntilClose = m;
        } else {
           let m = open - cur;
           if (m < 0) m += 1440; 
           if (m < minUntilOpen) minUntilOpen = m;
        }
      }
    }

    // Check previous day's overnight shifts
    if (!isCurrentlyOpen && cur < 8 * 60) {
      const prevDayIdx = (currentDayIdx - 1 + 7) % 7;
      const prevTxt = sch[daysOrder[prevDayIdx]];
      if (prevTxt && !/cerrado/i.test(prevTxt)) {
        const shifts = prevTxt.split(/\n|,|\by\b/i).map(s => s.trim()).filter(Boolean);
        for (const shift of shifts) {
          const segs = shift.split(/\s*[-–]\s*|\s+a\s+/i).map(s => s.trim());
          if (segs.length < 2) continue;
          const open = toMin(segs[0]);
          const close = toMin(segs[1]);
          if (open === null || close === null) continue;
          
          if (close < open && cur < close) {
             isCurrentlyOpen = true;
             let m = close - cur;
             if (m < minUntilClose) minUntilClose = m;
          }
        }
      }
    }

    if (isCurrentlyOpen) {
      if (minUntilClose <= 60) return { text: [`Cierra pronto (${minUntilClose}m)`, deliverySuffix], color: "#F59E0B" };
      return { text: ["Abierto ahora", deliverySuffix], color: "#16A34A" };
    } else {
      if (minUntilOpen <= 60) return { text: [`Abre pronto (${minUntilOpen}m)`, deliverySuffix], color: "#F59E0B" };
      
      // Find next open time
      let nextOpenStr = null;
      for (let i = 0; i < 7; i++) {
        const checkIdx = (currentDayIdx + i) % 7;
        const dayTxt = sch[daysOrder[checkIdx]];
        if (dayTxt && !/cerrado/i.test(dayTxt)) {
          const shifts2 = dayTxt.split(/\n|,|\by\b/i).map(s => s.trim()).filter(Boolean);
          for (const shift2 of shifts2) {
            const segs2 = shift2.split(/\s*[-–]\s*|\s+a\s+/i).map(s => s.trim());
            if (segs2.length < 2) continue;
            const open2 = toMin(segs2[0]);
            if (open2 !== null) {
              if (i === 0 && open2 <= cur) continue;
              
              const h12 = Math.floor(open2 / 60) % 12 || 12;
              const mStr = (open2 % 60).toString().padStart(2, '0');
              const ampm = Math.floor(open2 / 60) >= 12 ? 'pm' : 'am';
              const timeStr = `${h12}:${mStr}${ampm}`;
              const prepStr = h12 === 1 ? "la" : "las";
              
              if (i === 0) nextOpenStr = `abre hoy a ${prepStr} ${timeStr}`;
              else if (i === 1) nextOpenStr = `abre mañana a ${prepStr} ${timeStr}`;
              else {
                const dayNames = {dom:"el domingo", lun:"el lunes", mar:"el martes", mie:"el miércoles", jue:"el jueves", vie:"el viernes", sab:"el sábado"};
                nextOpenStr = `abre ${dayNames[daysOrder[checkIdx]]} a ${prepStr} ${timeStr}`;
              }
              break;
            }
          }
        }
        if (nextOpenStr) break;
      }
      if (nextOpenStr) return { text: [`Cerrado, ${nextOpenStr}`, deliverySuffix], color: "#DC2626" };
      
      return { text: ["Cerrado", deliverySuffix], color: "#DC2626" };
    }
  } catch { return { text: [(b.open ? "Abierto ahora" : "Cerrado"), deliverySuffix], color: b.open ? "#16A34A" : "#DC2626" }; }
}

export function createSlug(name) {
  if (!name) return "";
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export function getIdFromSlug(slugString) {
  if (!slugString) return null;
  const parts = slugString.split('_');
  return parts.length > 1 ? parts[parts.length - 1] : slugString;
}

export function cleanCityPrefix(slug, citySlug) {
  if (!slug || !citySlug) return slug;
  const prefix = citySlug + "-";
  return slug.startsWith(prefix) ? slug.substring(prefix.length) : slug;
}

// Parses menu_pdf_url which can be a legacy PDF string or a JSON array of image URLs
export function parseMenuUrls(val) {
  if (!val) return [];
  if (typeof val === "string" && val.startsWith("[")) {
    try {
      return JSON.parse(val);
    } catch(e) {
      return [];
    }
  }
  return [val];
}
export function getThumbUrl(url, w = 400, h = null, fit = "cover") {
  if (!url || typeof url !== "string") return url;
  
  // Bucketing de anchos para estandarizar cache y ahorrar transformaciones
  const bucketWidth = (width) => {
    if (!width) return 400;
    if (width <= 200) return 200;
    if (width <= 400) return 400;
    if (width <= 800) return 800;
    if (width <= 1600) return 1600;
    return 2400;
  };
  
  const targetW = bucketWidth(w);
  const aspect = (w && h) ? (h / w) : null;
  const targetH = aspect ? Math.round(targetW * aspect) : null;

  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    // Limpiamos transformaciones viejas para que no se acumulen
    let cleanUrl = url;
    const vMatch = url.match(/\/upload\/(?:[a-zA-Z0-9_,]+\/)*(v\d+\/.*)/);
    if (vMatch && vMatch[1]) {
       const base = url.split("/upload/")[0];
       cleanUrl = base + "/upload/" + vMatch[1];
    }
    
    let transform = targetH ? `c_fill,w_${targetW},h_${targetH},q_auto:eco,f_auto` : `c_limit,w_${targetW},q_auto:eco,f_auto`;
    if (fit === "contain" && targetH) {
       transform = `c_pad,w_${targetW},h_${targetH},q_auto:eco,f_auto`;
    }
    return cleanUrl.replace("/upload/", `/upload/${transform}/`);
  }
  
  if (url.includes("supabase.co") && url.includes("/object/public/")) {
    // TEMPORAL: Bypassing Bunny.net porque se acabaron los créditos
    const bunnyUrl = null; // import.meta.env.VITE_BUNNY_CDN_URL;
    if (bunnyUrl) {
      // Usar BunnyCDN si está configurado
      const pathParts = url.split('/public/');
      if (pathParts.length > 1) {
        const path = pathParts[1];
        let bunnyQuery = `?width=${targetW}&quality=75`; // Optimizado para velocidad
        if (targetH) {
          bunnyQuery += `&aspect_ratio=${w}:${h}`;
          if (fit === "cover") bunnyQuery += "&crop=true";
        }
        return `${bunnyUrl.replace(/\/$/, "")}/${path}${bunnyQuery}`;
      }
    }
    
    // Fallback a Supabase Render API
    const joinChar = url.includes("?") ? "&" : "?";
    let renderQuery = `width=${targetW}&quality=75&format=webp`; // Bajamos calidad a 75 para cargar más rápido
    if (targetH) renderQuery += `&height=${targetH}&resize=${fit}`;
    return url.replace("/object/public/", "/render/image/public/") + joinChar + renderQuery;
  }
  
  return url;
}

export const getCategoryDescription = (categoryId, categoryLabel, cityLabel) => {
  const city = (cityLabel || "tu ciudad").split(',')[0].trim();
  const label = categoryLabel ? categoryLabel.toLowerCase().trim() : (categoryId || "").toLowerCase().trim();
  const id = (categoryId || "").toLowerCase().trim();
  
  if (['restaurantes', 'restaurante'].includes(id)) {
    return `Deléitate con los mejores restaurantes en ${city}. Encuentra desde joyas locales hasta alta cocina con menús, horarios y reseñas.`;
  }
  if (['cafeterias', 'cafeterías', 'cafe', 'café', 'cafe-postres'].includes(id)) {
    return `Disfruta del mejor café de especialidad y repostería en ${city}. Espacios acogedores con buena vibra, ideales para platicar, leer o trabajar.`;
  }
  if (['antros y bares', 'antros-y-bares', 'bares', 'antros', 'vida-nocturna'].includes(id)) {
    return `Enciende tu noche con los mejores bares, cantinas y antros en ${city}. Descubre el mejor ambiente, coctelería y música para salir con amigos.`;
  }
  if (['foodies', 'gastronomia', 'gourmet'].includes(id)) {
    return `Descubre las experiencias gastronómicas más auténticas y virales de ${city}. Rincones únicos, propuestas de autor y sabores recomendados por la comunidad.`;
  }
  if (['unidad deportiva', 'unidad-deportiva', 'deportes', 'canchas'].includes(id)) {
    return `Mantente activo en las mejores unidades deportivas y canchas de ${city}. Espacios al aire libre e instalaciones para entrenar, jugar y convivir en familia.`;
  }
  if (['fitness', 'gimnasios', 'gimnasio', 'gym', 'padel', 'pádel'].includes(id)) {
    return `Supera tus metas en los mejores gimnasios, estudios de pádel, yoga y fitness en ${city}. Entrena con la mejor motivación y equipamiento de primera.`;
  }
  if (['hospedaje', 'hoteles', 'hotel', 'alojamiento'].includes(id)) {
    return `Encuentra la estancia perfecta en ${city}. Desde hoteles boutique con encanto hasta estancias confortables con todas las comodidades y excelentes ubicaciones.`;
  }
  if (['lugares', 'puntos-de-interes', 'puntos de interés', 'turismo', 'parques'].includes(id)) {
    return `Explora los rincones más emblemáticos, plazas históricas y atractivos naturales de ${city}. Guías, rutas y vistas imperdibles para disfrutar tu día.`;
  }
  if (['ocio', 'entretenimiento', 'diversion'].includes(id)) {
    return `Rompe la rutina con el mejor entretenimiento en ${city}. Cines, boliches, teatros y actividades llenas de diversión para toda la familia.`;
  }
  if (['snacks', 'postres', 'antojitos'].includes(id)) {
    return `Date un gusto con los antojitos, postres y snacks más ricos de ${city}. Nieves, botanas, crepas y delicias irresistibles para consentirte.`;
  }
  if (['servicios', 'servicios profesionales'].includes(id)) {
    return `Conecta con profesionales y servicios de confianza en ${city}. Soluciones expertas para tu hogar, vehículo, salud financiera y proyectos personales.`;
  }
  if (['playa', 'costa', 'playas'].includes(id)) {
    return `Siente la brisa marina en las playas más hermosas de la región. Clubes de playa, atardeceres dorados y gastronomía fresca frente al mar.`;
  }
  if (['salud', 'medicos', 'clinicas'].includes(id)) {
    return `Cuida tu bienestar con médicos especialistas, clínicas y centros de salud de confianza en ${city}. Atención profesional y horarios verificados.`;
  }
  if (['compras', 'tiendas', 'moda'].includes(id)) {
    return `Vete de compras por ${city}. Descubre plazas comerciales, boutiques locales y tiendas exclusivas para encontrar exactamente lo que buscas.`;
  }
  if (['hogar', 'muebles', 'decoracion'].includes(id)) {
    return `Transforma tus espacios con las mejores tiendas de muebles, decoración y artículos para el hogar en ${city}.`;
  }
  if (['tech', 'tecnologia', 'tecnología'].includes(id)) {
    return `Actualízate con las mejores tiendas de tecnología en ${city}. Dispositivos, accesorios y expertos en reparaciones a tu alcance.`;
  }
  if (['belleza', 'spas', 'barberias', 'salones'].includes(id)) {
    return `Consiéntete en los mejores salones, spas y barberías de ${city}. Descubre lugares increíbles para relajarte y cuidar tu estilo e imagen.`;
  }
  if (['educacion', 'educación', 'escuelas'].includes(id)) {
    return `Impulsa tu futuro y talento en las mejores escuelas y academias de ${city}. Instituciones ideales para tu aprendizaje y desarrollo.`;
  }
  if (['eventos', 'planes'].includes(id)) {
    return `Vive la ciudad al máximo con los mejores eventos en ${city}. Conciertos, obras de teatro, festivales y espectáculos para disfrutar en grande.`;
  }
  
  return `Descubre los mejores lugares de ${label} en ${city}. Encuentra ubicaciones, horarios, fotos y reseñas verificadas de la comunidad.`;
};

export function cleanShortAddress(addr) {
  if (!addr) return "";
  const parts = addr.split(",").map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0];
    const second = parts[1].replace(/^(?:C\.?P\.?\s*)?\d{5}\s*/i, "").trim();
    if (second && !/^(?:Nay\.?|Nayarit|Jal\.?|Jalisco|CDMX|México|Mexico)$/i.test(second)) {
      return `${first}, ${second}`;
    }
    return first;
  }
  return parts[0] || addr;
}

export function haptic(pattern = "light") {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    if (pattern === "light") {
      navigator.vibrate(10); // Very subtle tap
    } else if (pattern === "medium") {
      navigator.vibrate(30);
    } else if (pattern === "heavy") {
      navigator.vibrate([40, 30, 40]);
    } else if (Array.isArray(pattern)) {
      navigator.vibrate(pattern);
    } else {
      navigator.vibrate(pattern);
    }
  }
}

export function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1) // insertion, deletion
        );
      }
      if (i > 1 && j > 1 && b[i - 1] === a[j - 2] && b[i - 2] === a[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + 1);
      }
    }
  }
  return matrix[b.length][a.length];
}

export function fuzzyMatch(query, text) {
  if (!query || !text) return false;
  const qStr = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const tStr = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  if (tStr.includes(qStr)) return true;
  
  const qWords = qStr.split(/\s+/).filter(Boolean);
  const tWords = tStr.split(/\s+/).filter(Boolean);
  
  if (qWords.length === 0) return true;

  for (const qw of qWords) {
    let matchFound = false;
    const maxDist = qw.length <= 4 ? 1 : 2;
    
    for (const tw of tWords) {
      if (tw.includes(qw)) {
        matchFound = true; break;
      }
      if (Math.abs(tw.length - qw.length) <= maxDist) {
        if (levenshtein(qw, tw) <= maxDist) {
          matchFound = true; break;
        }
      }
    }
    if (!matchFound) return false;
  }
  
  return true;
}

export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const toRad = x => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export const isNew = (created_at) => {
  if (!created_at) return false;
  const d = new Date(created_at);
  const diffDays = (new Date() - d) / (1000 * 60 * 60 * 24);
  return diffDays <= 30;
};

export const getDailyScore = (idStr, dailySeed) => {
  let hash = 0;
  const str = String(idStr || "") + "-" + dailySeed;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return hash;
};

export function estimateTravelTime(km) {
  // Assume ~25 km/h average city speed
  const hours = km / 25;
  const minutes = Math.round(hours * 60);
  return minutes;
}

export function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

/** Returns true if we should show the location modal */
export function shouldShowLocationModal() {
  if (localStorage.getItem("cg_coords")) return false;
  const seen = localStorage.getItem("cg_loc_prompt_seen");
  if (seen) return false;
  if (!navigator.geolocation) return false;
  return true;
}

export const getCityFilterEq = (city) => {
  const zone = METRO_ZONES[city];
  return zone ? `city_slug=in.(${zone.join(',')})` : `city_slug=eq.${city}`;
};
