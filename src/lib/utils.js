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

export function isNear(item, userCoords, activeCity, maxKm = 40) {
  if (!item) return false;
  
  // Siempre incluir negocios que pertenezcan explícitamente a la ciudad seleccionada
  if (item.city_slug === activeCity) return true;
  
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
    const txt = sch[dayMap[get("weekday")] || ""];
    if (!txt) return false;
    if (/cerrado/i.test(txt)) return false;
    
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
    
    const shifts = txt.split(/\n|,|\by\b/i).map(s => s.trim()).filter(Boolean);
    for (const shift of shifts) {
      const segs = shift.split(/\s*[–\-]\s*|\s+a\s+/i).map(s => s.trim());
      if (segs.length < 2) continue;
      const open = toMin(segs[0]);
      const close = toMin(segs[1]);
      if (open === null || close === null) continue;
      
      const isOpenInShift = close <= open ? (cur >= open || cur < close) : (cur >= open && cur < close);
      if (isOpenInShift) return true;
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
    const txt = sch[dayMap[get("weekday")] || ""];
    if (!txt || /cerrado/i.test(txt)) return -1;

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
    const shifts = txt.split(/\n|,|\by\b/i).map(s => s.trim()).filter(Boolean);
    for (const shift of shifts) {
      const segs = shift.split(/\s*[–\-]\s*|\s+a\s+/i).map(s => s.trim());
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
    const txt = sch[dayMap[get("weekday")] || ""];
    
    if (!txt || /cerrado/i.test(txt)) return { text: ["Cerrado", deliverySuffix], color: "#DC2626" };
    
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
    const shifts = txt.split(/\n|,|\by\b/i).map(s => s.trim()).filter(Boolean);
    
    let isCurrentlyOpen = false;
    let minUntilClose = Infinity;
    let minUntilOpen = Infinity;
    
    for (const shift of shifts) {
      const segs = shift.split(/\s*[–\-]\s*|\s+a\s+/i).map(s => s.trim());
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
    
    if (isCurrentlyOpen) {
      if (minUntilClose <= 60) return { text: [`Cierra pronto (${minUntilClose}m)`, deliverySuffix], color: "#F59E0B" };
      return { text: ["Abierto ahora", deliverySuffix], color: "#16A34A" };
    } else {
      if (minUntilOpen <= 60) return { text: [`Abre pronto (${minUntilOpen}m)`, deliverySuffix], color: "#F59E0B" };
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

  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    // Ya no usamos h_ para forzar el recorte, dejamos que scale mantenga el ratio original
    // y delegamos a CSS (object-fit: cover) el recorte. Usamos c_limit.
    // Tambien cambiamos q_auto:best a q_auto y agregamos f_auto
    return url.replace("/upload/", `/upload/c_limit,w_${targetW},q_auto,f_auto/`);
  }
  
  if (url.includes("supabase.co") && url.includes("/object/public/")) {
    const bunnyUrl = import.meta.env.VITE_BUNNY_CDN_URL;
    if (bunnyUrl) {
      // Usar BunnyCDN si está configurado en las variables de entorno
      const pathParts = url.split('/public/');
      if (pathParts.length > 1) {
        const path = pathParts[1];
        // Delegamos el recorte a CSS (object-fit) para no aplastar la imagen
        let bunnyQuery = `?width=${targetW}`;
        return `${bunnyUrl.replace(/\/$/, "")}/${path}${bunnyQuery}`;
      }
    }
    // Fallback: usar Supabase Render API directo si no hay BunnyCDN
    const joinChar = url.includes("?") ? "&" : "?";
    return url.replace("/object/public/", "/render/image/public/") + `${joinChar}width=${targetW}&quality=80&format=webp`;
  }
  return url;
}

export const getCategoryDescription = (categoryId, categoryLabel, cityLabel) => {
  const city = (cityLabel || "tu ciudad").split(',')[0];
  const label = categoryLabel ? categoryLabel.toLowerCase() : categoryId;
  const id = categoryId.toLowerCase();
  
  if (id === 'salud') return `Encuentra la mejor atención médica en ${city}. Especialistas, clínicas y hospitales de confianza con servicios y horarios verificados.`;
  if (id === 'educacion') return `Impulsa tu futuro en las mejores escuelas y academias de ${city}. Encuentra la institución ideal para tu desarrollo y aprendizaje.`;
  if (id === 'eventos') return `Vive la ciudad al máximo con los mejores eventos en ${city}. Encuentra conciertos, obras de teatro, festivales y mucho más.`;
  if (id === 'restaurantes') return `Deléitate con los mejores restaurantes en ${city}. Encuentra desde joyas locales hasta alta cocina con menús, horarios y reseñas.`;
  if (id === 'cafe') return `Disfruta del mejor café y repostería en ${city}. Explora cafeterías acogedoras perfectas para trabajar, estudiar o charlar.`;
  if (id === 'hoteles') return `Planea tu estancia perfecta en los mejores hoteles de ${city}. Desde opciones boutique hasta estancias de lujo con todas las comodidades.`;
  if (id === 'bares') return `Vive la vida nocturna en los mejores bares y antros de ${city}. Descubre dónde salir por unas copas o a bailar con amigos.`;
  if (id === 'belleza') return `Consiéntete en los mejores salones, spas y barberías de ${city}. Descubre lugares increíbles para relajarte y cuidar tu imagen.`;
  if (id === 'fitness' || id === 'gimnasios') return `Actívate en los mejores gimnasios, estudios de yoga y centros deportivos en ${city}. Encuentra la disciplina perfecta para tu rutina.`;
  if (id === 'compras' || id === 'tiendas') return `Vete de shopping por ${city}. Descubre desde plazas comerciales hasta boutiques locales para encontrar exactamente lo que buscas.`;
  if (id === 'tech' || id === 'tecnologia' || id === 'tecnología') return `Actualízate con las mejores tiendas de tecnología en ${city}. Encuentra desde el último smartphone hasta expertos en reparaciones.`;
  if (id === 'ocio' || id === 'entretenimiento') return `Rompe la rutina con el mejor entretenimiento en ${city}. Descubre cines, boliches, parques y actividades divertidas para toda la familia.`;
  
  let features = "ubicaciones, horarios, detalles y reseñas";
  if (['comida'].includes(id)) {
    features = "ubicaciones, menús, horarios y reseñas";
  } else if (['poi', 'puntos-de-interes', 'turismo'].includes(id)) {
    features = "ubicaciones, cómo llegar, horarios y reseñas";
  }
  
  return `Descubre lo mejor de ${label} en ${city}. Encuentra ${features} de la comunidad.`;
};

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
