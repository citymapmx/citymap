// Código ISO de la moneda del evento (columna `currency` de events):
// por defecto MXN cuando falta (filas viejas o fetches sin la columna).
// Solo se acepta un código de 3 letras; cualquier otro valor se ignora
// para no pintar basura en el precio.
export function eventCurrencyCode(event) {
  const code = String(event?.currency || '').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : 'MXN';
}

export function getEventPrice(event) {
  if (['gratis', 'free'].includes(event.price_type)) return { text: 'Entrada gratuita', free: true };
  if (event.price === null || event.price === undefined || typeof event.price === 'boolean') return null;
  const raw = String(event.price).trim();
  if (!raw || !/\d/.test(raw)) return null;
  const value = raw.replace(/^desde\s*/i, '').trim();
  if (!value || !/\d/.test(value) || /^-\d/.test(value)) return null;
  if (/^(?:[$€£]\s*)?0+(?:[.,]0+)?(?:\s*[A-Z]{3})?$/i.test(value)) return { text: 'Entrada gratuita', free: true };
  const range = value.match(/^([$€£]?\s*\d[\d.,]*(?:\s*[A-Z]{3})?)\s*(?:[-–—]|\ba\b)\s*[$€£]?\s*\d/i);
  const amount = range ? range[1].trim() : value;
  const formatted = /^\d[\d.,]*$/.test(amount) ? `$${amount}` : amount;
  // La moneda va tras el monto (misma convención que los tours, PR #408):
  // «Boletos desde: $65.00 EUR». Sin duplicar cuando el precio guardado
  // ya trae el código («$65 EUR») o un símbolo propio (€, £).
  const hasCurrency = /(?:^|\s)[A-Z]{3}$/.test(formatted) || /[€£]/.test(formatted);
  const withCurrency = hasCurrency ? formatted : `${formatted} ${eventCurrencyCode(event)}`;
  const from = Boolean(range) || /^desde\b/i.test(raw) || ['desde', 'from', 'range'].includes(event.price_type);
  return { text: `${from ? 'Desde' : 'Entrada:'} ${withCurrency}`, free: false };
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

// `booking_config` NO es columna de `events`: se deriva de `website`.
// `website` puede ser el JSON de booking_config que guarda el admin
// (con `externalLinks`) o una URL plana. Una sola fuente de verdad: la
// usa el store al poblar la lista y `getEventLinks` al leer cualquier
// fila cruda (carga directa, deep-link, caché vieja), para que el botón
// de boletos no dependa de por dónde se entró a la ficha.
// Devuelve también el website ya limpio: cuando `website` era el JSON
// de booking_config, queda en null para que la ficha no lo muestre
// como si fuera un enlace.
export function deriveEventBooking(event) {
  const website = event?.website;
  const existing = event?.booking_config;
  if (existing && typeof existing === 'object') return { booking_config: existing, website };
  if (!website || typeof website !== 'string') return { booking_config: null, website };
  if (website.startsWith('{')) {
    try {
      const parsed = JSON.parse(website);
      if (parsed && typeof parsed === 'object') return { booking_config: parsed, website: null };
    } catch { /* JSON roto: sin enlaces y website se queda como estaba */ }
    return { booking_config: null, website };
  }
  return { booking_config: { enabled: true, type: 'external', externalLinks: [{ platform: 'otro', url: website, label: 'Sitio Web / Boletos' }] }, website };
}

export function getEventLinks(event) {
  // Sin booking_config (fila cruda de carga directa o caché vieja), se
  // deriva de `website` aquí mismo: el botón no depende de la ruta.
  const booking = event?.booking_config || deriveEventBooking(event).booking_config;
  const configured = booking?.enabled && booking.type === 'external' && Array.isArray(booking.externalLinks) ? booking.externalLinks : [];
  const links = configured.map(link => ({ ...link, url: normalizeEventLink(link.url) })).filter(link => link.url);
  if (!links.length) {
    const url = normalizeEventLink(event?.website);
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

// Opción C (nov 2026): el servidor busca y cachea las pistas, para que
// la app ya no dependa de iTunes directo (esa búsqueda falla a veces
// dentro del WebView de iOS y la tarjeta se escondía en silencio).
// Vive consolidado en /api/tiktok-resolve (límite de funciones de Vercel
// 12/12: no es un archivo nuevo) como rama `?action=apple-music`.
export function buildServerMusicUrl(query, limit = 5) {
  return `/api/tiktok-resolve?action=apple-music&term=${encodeURIComponent(query)}&limit=${limit}`;
}

// Una consulta al endpoint propio con tiempo límite. Devuelve las pistas
// ya normalizadas ({ id, name, artist, artwork, preview, url }) o lanza
// si el servidor falla — el que llama cae entonces al iTunes directo.
export async function fetchServerTracks(query, { fetchFn = fetch, timeoutMs, signal } = {}) {
  const effectiveTimeout = timeoutMs ?? 12000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), effectiveTimeout);
  const onAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else if (signal) signal.addEventListener('abort', onAbort, { once: true });
  try {
    const r = await fetchFn(buildServerMusicUrl(query, 5), { signal: controller.signal });
    if (!r.ok) throw new Error(`El endpoint propio respondió ${r.status}`);
    const d = await r.json();
    const tracks = Array.isArray(d.tracks) ? d.tracks : [];
    return tracks.filter((t) => t && t.preview).map((t) => ({
      id: t.id,
      name: t.name,
      artist: t.artist,
      artwork: t.artwork,
      preview: t.preview,
      url: t.url,
    }));
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener('abort', onAbort);
  }
}

// Una consulta a iTunes con tiempo límite: sin él, una conexión colgada
// dejaba el reproductor sin aparecer para siempre en esa visita. El límite
// es de 12 s: con red móvil lenta, 8 s se quedaban cortos.
export async function fetchItunesTracks(query, { fetchFn = fetch, timeoutMs = 12000, signal } = {}) {
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

// Caché en memoria de las pistas por artista (solo éxitos): si el artista
// ya cargó una vez en la sesión, el reproductor aparece aunque la red falle
// en esa visita. Un fallo nunca queda guardado, así que la próxima apertura
// vuelve a intentarlo.
const musicTracksCache = new Map();

export function clearMusicTracksCache() {
  musicTracksCache.clear();
}

function musicCacheKey(query) {
  return String(query).trim().toLowerCase();
}

// Carga las pistas del reproductor: prueba cada consulta en orden.
// Intento 1: el endpoint propio (opción C, con caché en servidor).
// Intento 2, tras 1 s: el iTunes directo, que es a la vez el reintento
// ante un fallo del servidor y ante 0 resultados (la API de Apple a
// veces devuelve 0 resultados de forma transitoria). Espera hasta 12 s
// por intento. Sin botón de reintentar visible: todo pasa en silencio.
export async function loadMusicTracks(queries, { fetchFn = fetch, timeoutMs = 12000, retryDelayMs = 1000, sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), signal } = {}) {
  for (const query of (queries || []).filter(Boolean)) {
    const key = musicCacheKey(query);
    const cached = musicTracksCache.get(key);
    if (cached && cached.length > 0) return cached;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const tracks = attempt === 0
          ? await fetchServerTracks(query, { fetchFn, timeoutMs, signal })
          : await fetchItunesTracks(query, { fetchFn, timeoutMs, signal });
        if (tracks.length > 0) {
          musicTracksCache.set(key, tracks);
          return tracks;
        }
        // Sin resultados: reintentar la misma consulta una vez; si vuelve
        // vacío, pasar a la siguiente consulta.
        if (attempt === 0) await sleepFn(retryDelayMs);
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



