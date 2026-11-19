// Opción C del reproductor «Música del artista» (PR #361, nov 2026):
// el cliente pedía las canciones directo a iTunes y esa búsqueda falla
// a veces dentro del WebView de la app iOS, con lo que la tarjeta se
// escondía en silencio. Esta rama busca en iTunes DESDE EL SERVIDOR y
// cachea el resultado, así la app ya no depende de iTunes directo.
//
// CONSOLIDACIÓN — límite de funciones de Vercel (12/12): NO es un archivo
// nuevo. Vive dentro de tiktok-resolve.js (un proxy de búsqueda del
// servidor, GET sin auth, CORS abierto, 36 líneas) como rama por query
// param `?action=apple-music`, y se conserva el nombre del archivo y el
// comportamiento `?url=` de TikTok: los paquetes viejos de la app en
// caché siguen llamando a /api/tiktok-resolve y no deben romperse.
const APPLE_MUSIC_TTL_MS = 24 * 60 * 60 * 1000; // 24 h para artistas con pistas
const APPLE_MUSIC_EMPTY_TTL_MS = 60 * 60 * 1000; // 1 h para artistas sin pistas
const APPLE_MUSIC_CACHE = new Map();

export function clearAppleMusicCache() {
  APPLE_MUSIC_CACHE.clear();
}

function appleMusicCacheKey(term, limit) {
  return `${String(term).trim().toLowerCase()}|${limit}`;
}

function normalizeAppleMusicTracks(results) {
  return (results || []).filter((t) => t.previewUrl).map((t) => ({
    id: t.trackId,
    name: t.trackName,
    artist: t.artistName,
    artwork: t.artworkUrl100,
    preview: t.previewUrl,
    url: t.trackViewUrl,
  }));
}

async function fetchItunesFromServer(term, limit) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=${limit}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`iTunes respondió ${response.status}`);
    const data = await response.json();
    return normalizeAppleMusicTracks(data.results);
  } finally {
    clearTimeout(timer);
  }
}

async function handleAppleMusic(req, res) {
  const term = String(req.query?.term || '').trim();
  if (!term) return res.status(400).json({ error: 'Missing term parameter' });
  if (term.length > 120) return res.status(400).json({ error: 'Term too long' });
  const limit = Math.min(10, Math.max(1, parseInt(req.query?.limit, 10) || 5));
  const appleMusicUrl = `https://music.apple.com/mx/search?term=${encodeURIComponent(term)}`;

  const key = appleMusicCacheKey(term, limit);
  const cached = APPLE_MUSIC_CACHE.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    res.setHeader('Cache-Control', `public, s-maxage=${cached.tracks.length > 0 ? 86400 : 3600}, stale-while-revalidate=86400`);
    return res.status(200).json({ tracks: cached.tracks, appleMusicUrl, cached: true });
  }

  try {
    const tracks = await fetchItunesFromServer(term, limit);
    APPLE_MUSIC_CACHE.set(key, {
      tracks,
      expiresAt: Date.now() + (tracks.length > 0 ? APPLE_MUSIC_TTL_MS : APPLE_MUSIC_EMPTY_TTL_MS),
    });
    res.setHeader('Cache-Control', `public, s-maxage=${tracks.length > 0 ? 86400 : 3600}, stale-while-revalidate=86400`);
    return res.status(200).json({ tracks, appleMusicUrl, cached: false });
  } catch (error) {
    console.error('Apple Music endpoint error:', error);
    return res.status(502).json({ error: 'itunes_unavailable' });
  }
}

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Opción C del reproductor: búsqueda de canciones con caché en servidor.
  if (req.query?.action === 'apple-music') {
    return handleAppleMusic(req, res);
  }

  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  try {
    // Realizamos la petición para seguir las redirecciones de vm.tiktok.com o similares
    const response = await fetch(url, { 
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    // La URL final después de la redirección
    const finalUrl = response.url;
    
    // Extraer el ID del video
    const match = finalUrl.match(/video\/(\d+)/);
    if (match && match[1]) {
      return res.status(200).json({ videoId: match[1], finalUrl });
    }

    return res.status(400).json({ error: 'Could not extract ID from the redirected URL' });
  } catch (error) {
    console.error("TikTok resolve error:", error);
    return res.status(500).json({ error: 'Fetch failed' });
  }
}
