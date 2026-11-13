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
const ADMIN_USER = { id: 'admin-id', email: 'admin@cityguide.com', email_confirmed_at: '2025-01-01T00:00:00Z', app_metadata: { isAdmin: true } };
const PLAIN_USER = { id: 'user-id', email: 'alguien@example.com', email_confirmed_at: '2025-01-01T00:00:00Z', app_metadata: {} };
const DEFAULT_BIZ = [
  { id: 'b1', name: 'Taco Fish', plan: 'premium', social_links: { google_place_id: 'ChIJ111' } },
  { id: 'b2', name: 'Sin Place ID', plan: 'free', social_links: {} },
  { id: 'b3', name: 'Café San Pedro', plan: 'destacado', social_links: { google_place_id: 'ChIJ222' } },
];
let mockBiz = DEFAULT_BIZ;
let authUser = ADMIN_USER;

const req = ({ auth = false, jwt = false, dry = false, query = {} } = {}) => ({
  method: 'GET',
  query: { ...(dry ? { dry: '1' } : {}), ...query },
  headers: auth ? { authorization: 'Bearer test-cron-secret' } : jwt ? { authorization: 'Bearer test-jwt' } : {},
  body: {},
});

let handler;
beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('CRON_SECRET', 'test-cron-secret');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://dpkjxhjkzdlkvyotoeai.supabase.co');
  vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-google-key');
  mockBiz = DEFAULT_BIZ;
  authUser = ADMIN_USER;
  vi.stubGlobal('fetch', vi.fn(async (url) => {
    if (String(url).includes('/auth/v1/user')) {
      return authUser ? { ok: true, json: async () => authUser } : { ok: false, json: async () => ({}) };
    }
    if (String(url).includes('/rest/v1/businesses')) {
      return {
        ok: true,
        json: async () => mockBiz,
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

describe('refresco con JWT de admin', () => {
  it('un admin refresca sin el secreto del cron', async () => {
    const res = makeRes();
    await handler(req({ jwt: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.updated).toBe(2);
  });

  it('403 con JWT de usuario no admin', async () => {
    authUser = PLAIN_USER;
    const res = makeRes();
    await handler(req({ jwt: true }), res);
    expect(res.statusCode).toBe(403);
  });

  it('401 si Supabase no reconoce el JWT', async () => {
    authUser = null;
    const res = makeRes();
    await handler(req({ jwt: true }), res);
    expect(res.statusCode).toBe(401);
  });

  it('salta los place_id basura sin llamar a Google y recorta los espacios', async () => {
    mockBiz = [
      { id: 'g1', name: 'Cerro Falso', plan: 'premium', social_links: { google_place_id: 'Ei5DZXJybyBkZSBTYW4gSnVhbiwgNjM3ODI=' } },
      { id: 'g2', name: 'En Blanco', plan: 'premium', social_links: { google_place_id: '   ' } },
      { id: 'g3', name: 'Plaza Con Espacio', plan: 'premium', social_links: { google_place_id: ' ChIJ333 ' } },
      { id: 'g4', name: 'Válido', plan: 'destacado', social_links: { google_place_id: 'ChIJ444' } },
    ];
    const res = makeRes();
    await handler(req({ auth: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.withPlaceId).toBe(3); // el blanco no cuenta
    expect(res.body.updated).toBe(2);
    expect(res.body.failed).toHaveLength(1);
    expect(res.body.failed[0]).toMatchObject({ business_id: 'g1', name: 'Cerro Falso' });
    expect(res.body.failed[0].error).toMatch(/inválido/);
    const placesCalls = fetch.mock.calls.filter(([u]) => String(u).includes('places.googleapis.com'));
    expect(placesCalls).toHaveLength(2);
    expect(placesCalls.some(([u]) => String(u).includes('ChIJ333'))).toBe(true);
    expect(placesCalls.some(([u]) => String(u).includes('Ei5D'))).toBe(false);
    // El upsert no lleva el nombre (la tabla no tiene esa columna).
    const upsert = fetch.mock.calls.find(([u, o]) => String(u).includes('/rest/v1/google_ratings_cache') && o?.method === 'POST');
    const rows = JSON.parse(upsert[1].body);
    expect(rows.every((r) => !('name' in r))).toBe(true);
    // El reporte sí lleva los nombres.
    expect(res.body.updatedItems.map((u) => u.name)).toEqual(['Plaza Con Espacio', 'Válido']);
  });

  it('offset+limit procesan por tandas con remaining', async () => {
    const res = makeRes();
    await handler(req({ auth: true, query: { limit: '1', offset: '1' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.offset).toBe(1);
    expect(res.body.remaining).toBe(0);
    expect(res.body.updated).toBe(1);
    const upsert = fetch.mock.calls.find(([u, o]) => String(u).includes('/rest/v1/google_ratings_cache') && o?.method === 'POST');
    const rows = JSON.parse(upsert[1].body);
    expect(rows).toHaveLength(1);
    expect(rows[0].business_id).toBe('b3');
  });

  it('salta los negocios gratuitos con Place ID sin llamar a Google', async () => {
    mockBiz = [
      { id: 'f1', name: 'Gratis', plan: 'free', social_links: { google_place_id: 'ChIJ999' } },
      { id: 'p1', name: 'De Pago', plan: 'premium', social_links: { google_place_id: 'ChIJ111' } },
    ];
    const res = makeRes();
    await handler(req({ auth: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.checked).toBe(2);
    expect(res.body.withPlaceId).toBe(1);
    expect(res.body.skippedFree).toBe(1);
    expect(res.body.remaining).toBe(0);
    expect(res.body.processed).toBe(1);
    expect(res.body.updated).toBe(1);
    const placesCalls = fetch.mock.calls.filter(([u]) => String(u).includes('places.googleapis.com'));
    expect(placesCalls).toHaveLength(1);
    expect(String(placesCalls[0][0])).toContain('ChIJ111');
    expect(placesCalls.some(([u]) => String(u).includes('ChIJ999'))).toBe(false);
  });

  it('plan null se trata como gratuito y se salta', async () => {
    mockBiz = [
      { id: 'n1', name: 'Sin Plan', plan: null, social_links: { google_place_id: 'ChIJ999' } },
      { id: 'p1', name: 'De Pago', plan: 'destacado', social_links: { google_place_id: 'ChIJ111' } },
    ];
    const res = makeRes();
    await handler(req({ auth: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.withPlaceId).toBe(1);
    expect(res.body.skippedFree).toBe(1);
    expect(res.body.updated).toBe(1);
    const placesCalls = fetch.mock.calls.filter(([u]) => String(u).includes('places.googleapis.com'));
    expect(placesCalls).toHaveLength(1);
  });

  it('dry=1 lista solo ids de pago en wouldRefresh y reporta skippedFree', async () => {
    mockBiz = [
      { id: 'f1', name: 'Gratis', plan: 'free', social_links: { google_place_id: 'ChIJ999' } },
      { id: 'p1', name: 'De Pago', plan: 'premium', social_links: { google_place_id: 'ChIJ111' } },
    ];
    const res = makeRes();
    await handler(req({ auth: true, dry: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.wouldRefresh).toEqual(['p1']);
    expect(res.body.skippedFree).toBe(1);
    expect(res.body.withPlaceId).toBe(1);
    expect(res.body.remaining).toBe(0);
    expect(fetch.mock.calls.some(([u]) => String(u).includes('places.googleapis.com'))).toBe(false);
  });
});
