import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const makeRes = () => {
  const res = {
    statusCode: null,
    body: null,
    headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
    end() { return this; },
  };
  return res;
};
const req = ({ auth = false, dry = false } = {}) => ({
  method: 'GET',
  query: dry ? { dry: '1' } : {},
  headers: auth ? { authorization: 'Bearer test-cron-secret' } : {},
  body: {},
});

let handler;
beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('CRON_SECRET', 'test-cron-secret');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://dpkjxhjkzdlkvyotoeai.supabase.co');
  vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-google-key');
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (String(url).includes('/rest/v1/businesses')) {
      return {
        ok: true,
        json: async () => ([
          { id: 'b1', social_links: { google_place_id: 'ChIJ111' } },
          { id: 'b2', social_links: {} },
          { id: 'b3', social_links: { google_place_id: 'ChIJ222' } },
        ]),
      };
    }
    if (String(url).includes('places.googleapis.com')) {
      return { ok: true, json: async () => ({ rating: 4.8, userRatingCount: 8824 }) };
    }
    if (String(url).includes('/rest/v1/google_ratings_cache')) {
      return { ok: true, json: async () => ([]) };
    }
    throw new Error(`unexpected fetch ${url}`);
  }));
  handler = (await import('../../api/actualizar-calificaciones-google.js')).default;
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('actualizar-calificaciones-google', () => {
  it('devuelve 401 sin el secreto del cron y no llama a nada', async () => {
    const res = makeRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('dry=1 lista lo que refrescaría sin llamar a Google ni escribir', async () => {
    const res = makeRes();
    await handler(req({ auth: true, dry: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.dry).toBe(true);
    expect(res.body.checked).toBe(3);
    expect(res.body.withPlaceId).toBe(2);
    expect(fetch.mock.calls.some(([u]) => String(u).includes('places.googleapis.com'))).toBe(false);
  });

  it('refresca y guarda solo rating + conteo, con vencimiento a 30 días', async () => {
    const res = makeRes();
    await handler(req({ auth: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.updated).toBe(2);
    const upsert = fetch.mock.calls.find(([u, o]) => String(u).includes('/rest/v1/google_ratings_cache') && o?.method === 'POST');
    expect(upsert).toBeTruthy();
    const rows = JSON.parse(upsert[1].body);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ business_id: 'b1', place_id: 'ChIJ111', rating: 4.8, review_count: 8824 });
    expect(new Date(rows[0].expires_at) - new Date(rows[0].fetched_at)).toBe(30 * 24 * 60 * 60 * 1000);
    // La llamada a Google pide solo los dos campos (nada de textos de reseñas).
    const placesCall = fetch.mock.calls.find(([u]) => String(u).includes('places.googleapis.com'));
    expect(placesCall[1].headers['X-Goog-FieldMask']).toBe('rating,userRatingCount');
  });

  it('sin llave de Google devuelve 500 sin llamar a Places', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '');
    const res = makeRes();
    await handler(req({ auth: true }), res);
    expect(res.statusCode).toBe(500);
    expect(fetch.mock.calls.some(([u]) => String(u).includes('places.googleapis.com'))).toBe(false);
  });
});
