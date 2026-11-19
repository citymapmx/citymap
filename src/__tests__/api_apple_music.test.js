import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler, { clearAppleMusicCache } from '../../api/tiktok-resolve.js';

// Opción C del reproductor «Música del artista» (nov 2026): el servidor
// busca las canciones en iTunes y las cachea, para que la app ya no
// dependa de iTunes directo (esa búsqueda falla a veces dentro del
// WebView de iOS y la tarjeta se escondía en silencio). Vive consolidado
// en /api/tiktok-resolve (límite de funciones de Vercel 12/12: no es un
// archivo nuevo) como rama `?action=apple-music`.

const mockRes = () => {
  const res = { headers: {}, statusCode: null, body: null, ended: false };
  res.setHeader = (key, value) => { res.headers[key] = value; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  res.end = () => { res.ended = true; return res; };
  return res;
};

const req = (query, method = 'GET') => ({ method, query });
const itunesTrack = (id) => ({
  trackId: id,
  trackName: `Canción ${id}`,
  artistName: 'Beéle',
  artworkUrl100: 'https://x/100.jpg',
  previewUrl: `https://x/${id}.m4a`,
  trackViewUrl: `https://x/${id}`,
});

beforeEach(() => {
  clearAppleMusicCache();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ resultCount: 1, results: [itunesTrack(1)] }) })));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('endpoint propio de música (?action=apple-music)', () => {
  it('sin term devuelve 400', async () => {
    const res = mockRes();
    await handler(req({ action: 'apple-music' }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Missing term parameter' });
  });

  it('devuelve las pistas normalizadas con la URL de Apple Music y caché para el edge', async () => {
    const res = mockRes();
    await handler(req({ action: 'apple-music', term: 'Beéle' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.tracks).toEqual([
      { id: 1, name: 'Canción 1', artist: 'Beéle', artwork: 'https://x/100.jpg', preview: 'https://x/1.m4a', url: 'https://x/1' },
    ]);
    expect(res.body.appleMusicUrl).toBe('https://music.apple.com/mx/search?term=Be%C3%A9le');
    expect(res.body.cached).toBe(false);
    expect(res.headers['Cache-Control']).toContain('s-maxage=86400');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toContain('itunes.apple.com/search?term=Be%C3%A9le');
  });

  it('descarta las pistas sin adelanto', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ resultCount: 2, results: [itunesTrack(2), { ...itunesTrack(3), previewUrl: undefined }] }) });
    const res = mockRes();
    await handler(req({ action: 'apple-music', term: 'Sin adelanto' }), res);
    expect(res.body.tracks.map((t) => t.id)).toEqual([2]);
  });

  it('la segunda llamada con el mismo término no vuelve a pedir a iTunes (caché en memoria)', async () => {
    const res1 = mockRes();
    await handler(req({ action: 'apple-music', term: 'Cacheado' }), res1);
    const res2 = mockRes();
    await handler(req({ action: 'apple-music', term: 'cacheado' }), res2);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(res2.body.cached).toBe(true);
    expect(res2.body.tracks.map((t) => t.id)).toEqual([1]);
  });

  it('limita el limit a 10 y lo fija en 5 por defecto', async () => {
    await handler(req({ action: 'apple-music', term: 'LimiteAlto', limit: '99' }), mockRes());
    expect(String(fetch.mock.calls[0][0])).toContain('limit=10');
    await handler(req({ action: 'apple-music', term: 'LimiteDefecto' }), mockRes());
    expect(String(fetch.mock.calls[1][0])).toContain('limit=5');
  });

  it('si iTunes falla devuelve 502 para que el cliente caiga al directo', async () => {
    fetch.mockRejectedValueOnce(new Error('red caída'));
    const res = mockRes();
    await handler(req({ action: 'apple-music', term: 'Fallo' }), res);
    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: 'itunes_unavailable' });
  });

  it('si iTunes responde vacío, devuelve pistas vacías (el cliente reintenta en directo)', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ resultCount: 0, results: [] }) });
    const res = mockRes();
    await handler(req({ action: 'apple-music', term: 'Nadie' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.tracks).toEqual([]);
    expect(res.headers['Cache-Control']).toContain('s-maxage=3600');
  });
});

describe('la rama de TikTok sigue intacta', () => {
  it('resuelve un enlace de TikTok a su videoId como antes', async () => {
    fetch.mockResolvedValueOnce({ url: 'https://www.tiktok.com/@artista/video/1234567890' });
    const res = mockRes();
    await handler(req({ url: 'https://vm.tiktok.com/abc/' }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ videoId: '1234567890', finalUrl: 'https://www.tiktok.com/@artista/video/1234567890' });
  });

  it('sin url y sin action devuelve 400 como antes', async () => {
    const res = mockRes();
    await handler(req({}), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Missing url parameter' });
  });
});
