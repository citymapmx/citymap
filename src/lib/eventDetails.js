export function getEventPrice(event) {
  if (['gratis', 'free'].includes(event.price_type)) return { text: 'Entrada gratuita', free: true };
  if (event.price === null || event.price === undefined || typeof event.price === 'boolean') return null;
  const raw = String(event.price).trim();
  if (!raw || !/\d/.test(raw)) return null;
  const value = raw.replace(/^desde\s*/i, '').trim();
  if (!value || !/\d/.test(value) || /^-\d/.test(value)) return null;
  if (/^(?:[$€£]\s*)?0+(?:[.,]0+)?(?:\s*(?:MXN|USD|EUR))?$/i.test(value)) return { text: 'Entrada gratuita', free: true };
  const range = value.match(/^([$€£]?\s*\d[\d.,]*(?:\s*(?:MXN|USD|EUR))?)\s*(?:[-–—]|\ba\b)\s*[$€£]?\s*\d/i);
  const amount = range ? range[1].trim() : value;
  const formatted = /^\d[\d.,]*$/.test(amount) ? `$${amount}` : amount;
  const from = Boolean(range) || /^desde\b/i.test(raw) || ['desde', 'from', 'range'].includes(event.price_type);
  return { text: `${from ? 'Desde' : 'Entrada:'} ${formatted}`, free: false };
}

export function normalizeEventLink(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const raw = value.trim();
  if (/^[a-z][a-z\d+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.') && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function getEventLinks(event) {
  const booking = event.booking_config;
  const configured = booking?.enabled && booking.type === 'external' && Array.isArray(booking.externalLinks) ? booking.externalLinks : [];
  const links = configured.map(link => ({ ...link, url: normalizeEventLink(link.url) })).filter(link => link.url);
  if (!links.length) {
    const url = normalizeEventLink(event.website);
    if (url) links.push({ platform: 'otro', url });
  }
  return links.filter((link, index) => links.findIndex(other => other.url === link.url) === index);
}

// Solo el monto del precio ("$600"), sin el prefijo "Entrada:" / "Desde".
// Null si es gratis o no hay precio.
export function getEventPriceAmount(event) {
  const price = getEventPrice(event);
  if (!price || price.free) return null;
  return price.text.replace(/^(Entrada:|Desde)\s*/i, '') || null;
}

// Filtro por precio de la página de Eventos: 'todos' | 'gratis' | 'pago'.
// Sin precio publicado no es ni gratis ni de pago.
export function matchesPriceFilter(event, filter) {
  if (!filter || filter === 'todos') return true;
  const price = getEventPrice(event);
  if (filter === 'gratis') return Boolean(price?.free);
  if (filter === 'pago') return Boolean((price && !price.free) || event.price_type === 'paid');
  return true;
}

// Reproductor de música del evento: solo conciertos (la categoría dice si
// hay artista). El título del evento suele ser el artista, pero muchas
// veces es el nombre de la gira ("Ricardo Arjona — ¿Qué haría si pudiera?
// Tour", "ZZ Top – The Elevation Tour"): iTunes no encuentra nada con el
// título completo, así que la búsqueda usa solo el artista — lo que va
// antes del primer guion o de los dos puntos ("Artista — Gira",
// "Artista: Temporada"). También se quita un " en <lugar>" final
// ("Alfredo Olivas en Tepic" → "Alfredo Olivas") porque eso deja sin
// resultados la búsqueda.
export function getEventMusicQuery(event) {
  if (!event || !event.title || !String(event.title).trim()) return null;
  const category = String(event.event_category || event.category || '').trim().toLowerCase();
  if (!category.startsWith('concierto')) return null;
  let title = String(event.title).trim();
  const dash = title.split(/\s+[—–-]\s+/);
  if (dash.length > 1) title = dash[0].trim();
  const colon = title.split(/\s*:\s*/);
  if (colon.length > 1) title = colon[0].trim();
  title = title.replace(/\s+en\s+[^,;|]+$/i, '').trim();
  return title || String(event.title).trim();
}

// Segunda consulta para el reproductor: el título completo (sin el
// " en <lugar>" final) por si la del artista no devuelve nada — p. ej.
// un título donde el artista va después del guion. Null cuando coincide
// con la consulta principal.
export function getEventMusicFallbackQuery(event) {
  if (!event || !event.title || !String(event.title).trim()) return null;
  const category = String(event.event_category || event.category || '').trim().toLowerCase();
  if (!category.startsWith('concierto')) return null;
  const full = String(event.title).trim().replace(/\s+en\s+[^,;|]+$/i, '').trim();
  const primary = getEventMusicQuery(event);
  return full && full !== primary ? full : null;
}

// Una consulta a iTunes con tiempo límite: sin él, una conexión colgada
// dejaba el reproductor sin aparecer para siempre en esa visita.
export async function fetchItunesTracks(query, { fetchFn = fetch, timeoutMs = 8000, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else if (signal) signal.addEventListener('abort', onAbort, { once: true });
  try {
    const r = await fetchFn(buildItunesSearchUrl(query, 5), { signal: controller.signal });
    if (!r.ok) throw new Error(`iTunes respondió ${r.status}`);
    const d = await r.json();
    return (d.results || []).filter((t) => t.previewUrl).map((t) => ({
      id: t.trackId,
      name: t.trackName,
      artist: t.artistName,
      artwork: t.artworkUrl100,
      preview: t.previewUrl,
      url: t.trackViewUrl,
    }));
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

// Carga las pistas del reproductor: prueba cada consulta en orden; ante un
// fallo de red o de la API reintenta una vez tras 1 s, y si una consulta no
// devuelve nada pasa a la siguiente. Sin caché: un fallo no queda guardado
// como "sin música", la próxima apertura vuelve a intentarlo.
export async function loadMusicTracks(queries, { fetchFn = fetch, timeoutMs = 8000, retryDelayMs = 1000, sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), signal } = {}) {
  for (const query of (queries || []).filter(Boolean)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const tracks = await fetchItunesTracks(query, { fetchFn, timeoutMs, signal });
        if (tracks.length > 0) return tracks;
        break; // sin resultados: no reintentar la misma consulta
      } catch {
        if (attempt === 0) await sleepFn(retryDelayMs);
      }
    }
  }
  return [];
}

// Búsqueda de canciones en iTunes (gratis, sin clave): adelantos de 30 s.
export function buildItunesSearchUrl(query, limit = 5) {
  return `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=${limit}`;
}

// Valor numérico para ordenar por precio: gratis = 0, con precio = monto,
// sin precio publicado = al final.
export function priceSortValue(event) {
  const price = getEventPrice(event);
  if (!price) return Number.POSITIVE_INFINITY;
  if (price.free) return 0;
  const amount = getEventPriceAmount(event);
  const num = parseFloat(String(amount || '').replace(/[^0-9,.]/g, '').replace(/,/g, ''));
  return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY;
}

// Divide un texto en frases: corta después de . ! ? cuando sigue una
// mayúscula (o el final), para no partir abreviaturas como "p. m.".
function splitSentences(text) {
  const out = [];
  let start = 0;
  const re = /[.!?…]+(?=\s+(?:[A-ZÁÉÍÓÚÑ0-9¡¿"“'([])|$)/g;
  let m;
  while ((m = re.exec(text))) {
    const end = m.index + m[0].length;
    out.push(text.slice(start, end).trim());
    start = end;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out.filter(Boolean);
}

// Parte la descripción de un evento en párrafos cortos (máximo 2 frases
// por párrafo) para que no se lea como un muro de texto. Si la primera
// frase es una exclamación corta, se devuelve aparte como frase destacada.
export function splitDescription(value) {
  const text = String(value || '').trim();
  if (!text) return { lead: null, paragraphs: [] };
  const paragraphs = [];
  for (const block of text.split(/\n+/)) {
    const sentences = splitSentences(block.trim());
    for (let i = 0; i < sentences.length; i += 2) {
      paragraphs.push(sentences.slice(i, i + 2).join(' '));
    }
  }
  let lead = null;
  if (paragraphs.length > 0) {
    const first = splitSentences(paragraphs[0])[0] || '';
    if (/[!?]$/.test(first) && first.length <= 90) {
      lead = first;
      const rest = paragraphs[0].slice(first.length).trim();
      if (rest) paragraphs[0] = rest;
      else paragraphs.shift();
    }
  }
  return { lead, paragraphs };
}



