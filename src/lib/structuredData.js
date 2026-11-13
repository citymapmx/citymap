// Datos estructurados (JSON-LD) compartidos entre el HTML para bots
// (api/og.js, Edge) y el cliente (src/hooks/useAppSEO.js, tras renderizar).
// Módulo puro, sin imports: lo pueden importar ambos lados.
//
// Reglas:
// - Nunca se inventa un dato: si un campo no existe en base, se omite.
// - Los horarios se convierten fielmente de 12 h a 24 h (igual que
//   isOpenNow en utils.js: "12:30 a.m." son las 00:30, aunque el dato de
//   origen parezca un error de captura; eso se corrige en el panel, no aquí).
// - Los precios de eventos se leen de la base (price / price_type) y el
//   enlace de boletos de `website` (URL plana o JSON de booking_config con
//   externalLinks, igual que hace useDataStore al cargar los eventos).

// Días de la semana en formato schema.org (códigos de 2 letras).
const SCHEMA_DAY = {
  lun: "Mo", lunes: "Mo",
  mar: "Tu", martes: "Tu",
  mie: "We", "miércoles": "We", miercoles: "We",
  jue: "Th", jueves: "Th",
  vie: "Fr", viernes: "Fr",
  sab: "Sa", "sábado": "Sa", sabado: "Sa",
  dom: "Su", domingo: "Su",
};
const WEEK_ORDER = ["lun", "mar", "mie", "jue", "vie", "sab", "dom"];

// "12:30 a.m." -> "00:30"; "01:00 p.m." -> "13:00"; "22:00" -> "22:00".
// Null si no se puede interpretar (nunca se emite basura).
export function parseTimeTo24(value) {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i)
    || s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  let hh = parseInt(m[1], 10);
  const mm = parseInt(m[2] || "0", 10);
  const ap = (m[3] || "").toLowerCase(); // "a" o "p" (el grupo es [ap])
  if (ap === "p" && hh !== 12) hh += 12;
  if (ap === "a" && hh === 12) hh = 0;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// Horario de un negocio (columna `schedule`: { lun: "08:45 a.m. - 11:00
// p.m.", ... }) a openingHours en formato válido de schema.org:
// ["Mo 08:45-23:00", ...]. Se saltan los días cerrados, las claves
// desconocidas y los valores que no se pueden interpretar.
export function scheduleToOpeningHours(schedule) {
  if (!schedule || typeof schedule !== "object") return [];
  const out = [];
  for (const key of WEEK_ORDER) {
    const code = SCHEMA_DAY[key];
    const val = schedule[key];
    if (typeof val !== "string" || !val.trim() || /cerrado/i.test(val)) continue;
    // Igual que isOpenNow (utils.js): varios turnos se separan por coma,
    // salto de línea o " y ".
    const shifts = val.split(/\n|,|\by\b/i).map((s) => s.trim()).filter(Boolean);
    for (const shift of shifts) {
      const segs = shift.split(/\s*[-–—]\s*|\s+a\s+/i).map((s) => s.trim());
      if (segs.length < 2) continue;
      const open = parseTimeTo24(segs[0]);
      const close = parseTimeTo24(segs[1]);
      if (!open || !close) continue;
      out.push(`${code} ${open}-${close}`);
    }
  }
  return out;
}

// Desplazamiento UTC de una zona IANA en una fecha ("-06:00"), calculado
// con Intl (sirve en Node y en el Edge). Null si no se puede calcular.
export function tzOffsetString(timeZone, dateStr) {
  try {
    const d = new Date(`${dateStr}T12:00:00Z`);
    if (Number.isNaN(d.getTime())) return null;
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone, timeZoneName: "longOffset", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(d);
    const name = parts.find((p) => p.type === "timeZoneName")?.value || "";
    const m = name.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
    if (!m) return null;
    return `${m[1]}${String(m[2]).padStart(2, "0")}:${m[3] || "00"}`;
  } catch {
    return null;
  }
}

// Inicio de un evento en ISO 8601 con hora ("2026-11-13T21:00:00-06:00").
// Sin hora en base, solo la fecha ("2026-11-13"). Sin fecha, undefined.
export function eventStartDate(event, timeZone) {
  const date = String(event?.date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;
  const time = parseTimeTo24(event?.time);
  if (!time) return date;
  const offset = timeZone ? tzOffsetString(timeZone, date) : null;
  return `${date}T${time}:00${offset || ""}`;
}

// Fin de un evento: end_date + end_time; si no hay end_date, el inicio.
// Si end_date es el mismo día y no hay end_time, se usa la hora de inicio.
export function eventEndDate(event, timeZone) {
  const start = eventStartDate(event, timeZone);
  const endDate = String(event?.end_date || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) return start;
  const date = String(event?.date || "").trim();
  const endTime = parseTimeTo24(event?.end_time)
    || (endDate === date ? parseTimeTo24(event?.time) : null);
  if (!endTime) return endDate;
  const offset = timeZone ? tzOffsetString(timeZone, endDate) : null;
  return `${endDate}T${endTime}:00${offset || ""}`;
}

// Estado del evento como URL de schema.org (la base solo tiene
// 'approved' hoy, pero se mapean los demás por si aparecen).
export function eventStatusUrl(status) {
  const s = String(status || "").toLowerCase().trim();
  if (s === "cancelled" || s === "cancelado") return "https://schema.org/EventCancelled";
  if (s === "postponed" || s === "pospuesto") return "https://schema.org/EventPostponed";
  if (s === "rescheduled" || s === "reprogramado") return "https://schema.org/EventRescheduled";
  return "https://schema.org/EventScheduled";
}

function normalizeHttpUrl(value) {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return ["http:", "https:"].includes(url.protocol) && url.hostname.includes(".")
      && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

// Enlace de boletos de un evento: primer externalLink de booking_config
// (ya poblado en el cliente) o, en la base, el campo `website`, que puede
// ser una URL plana o el JSON de booking_config con externalLinks.
export function parseEventTicketUrl(event) {
  const links = event?.booking_config?.externalLinks;
  if (Array.isArray(links)) {
    for (const link of links) {
      const url = normalizeHttpUrl(link?.url);
      if (url) return url;
    }
  }
  const website = event?.website;
  if (typeof website === "string" && website.trim().startsWith("{")) {
    try {
      const parsed = JSON.parse(website);
      const parsedLinks = parsed?.externalLinks;
      if (Array.isArray(parsedLinks)) {
        for (const link of parsedLinks) {
          const url = normalizeHttpUrl(link?.url);
          if (url) return url;
        }
      }
    } catch {
      // No es JSON válido: cae al tratamiento de URL plana.
    }
  }
  if (typeof website === "string") return normalizeHttpUrl(website);
  return null;
}

// Precio mínimo publicado de un evento, en MXN salvo que el texto diga
// USD o EUR. "850" -> 850; "$2,320 MXN" -> 2320; "500 - 1200" -> 500
// (el mínimo del rango). Gratis (price_type) -> 0. Sin precio publicado
// -> null (no se inventa).
export function parseEventOfferPrice(event) {
  const type = String(event?.price_type || "").toLowerCase().trim();
  if (type === "gratis" || type === "free") return { price: 0, priceCurrency: "MXN" };
  const raw = event?.price;
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "number") {
    if (!Number.isFinite(raw) || raw < 0) return null;
    return { price: raw, priceCurrency: "MXN" };
  }
  const s = String(raw).trim();
  if (!s || !/\d/.test(s)) return null;
  const currency = /USD/i.test(s) ? "USD" : /EUR/i.test(s) ? "EUR" : "MXN";
  if (/^(?:[$€£]\s*)?0+(?:[.,]0+)?(?:\s*(?:MXN|USD|EUR))?$/i.test(s)) {
    return { price: 0, priceCurrency: currency };
  }
  const nums = [...s.matchAll(/(\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)/g)]
    .map((m) => parseFloat(m[1].replace(/,/g, "")))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!nums.length) return null;
  return { price: Math.min(...nums), priceCurrency: currency };
}

// Oferta de un evento para schema.org, o null si no hay precio publicado.
// La disponibilidad solo se afirma para eventos que no han terminado
// (nunca se inventa "agotado" para un evento pasado).
export function eventOffer(event, today = new Date().toISOString().slice(0, 10)) {
  const parsed = parseEventOfferPrice(event);
  if (!parsed) return null;
  const offer = { "@type": "Offer", price: parsed.price, priceCurrency: parsed.priceCurrency };
  const lastDay = String(event?.end_date || event?.date || "");
  if (/^\d{4}-\d{2}-\d{2}$/.test(lastDay) && lastDay >= today) {
    offer.availability = "https://schema.org/InStock";
  }
  const url = parseEventTicketUrl(event);
  if (url) offer.url = url;
  return offer;
}

// Migas de pan: [{ name, item }] -> nodo BreadcrumbList.
export function breadcrumbList(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: (items || []).map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  };
}

// Preguntas frecuentes: [{ q, a }] -> nodo FAQPage.
export function faqPage(items) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: (items || []).map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

// Descripción de reserva para un negocio sin descripción ni tagline en
// base: solo datos reales (nombre y ciudad), sin inventar nada del negocio.
export function businessDescriptionFallback(name, cityName) {
  const n = String(name || "").trim() || "Este negocio";
  const c = String(cityName || "").trim();
  return c
    ? `${n} en ${c}: horarios y reseñas en CityMap México.`
    : `${n}: horarios y reseñas en CityMap México.`;
}
