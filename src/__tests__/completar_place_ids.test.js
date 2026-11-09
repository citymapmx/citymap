import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeName, namesMatch, haversineMeters, streetFromAddress,
  buildPlaceSearchQuery, acceptPlaceCandidate,
} from '../lib/placeIdMatch.js';

describe('placeIdMatch: verificación de candidatos de Google', () => {
  it('normaliza acentos, mayúsculas y puntuación', () => {
    expect(normalizeName('Café San Pedro, Tepic')).toBe('cafe san pedro tepic');
    expect(normalizeName('  Taco   Fish & La Paz ')).toBe('taco fish la paz');
  });

  it('namesMatch: contiene, primeras 2 palabras o nada', () => {
    expect(namesMatch('Taco Fish La Paz', 'Taco Fish')).toBe(true);
    expect(namesMatch('Taco Fish', 'Taco Fish La Paz')).toBe(true);
    expect(namesMatch('Café San Pedro', 'Cafe San Pedro Tlaquepaque')).toBe(true);
    expect(namesMatch('El Rey de las Crepas', 'Rey de las Crepas')).toBe(true);
    expect(namesMatch('Taco Fish La Paz', 'Taco Bell')).toBe(false);
    expect(namesMatch('Taco Fish La Paz', 'Starbucks Andares')).toBe(false);
    expect(namesMatch('', 'Algo')).toBe(false);
  });

  it('haversineMeters: 0 en el mismo punto, ~111 km por grado', () => {
    expect(haversineMeters(21.5, -104.9, 21.5, -104.9)).toBe(0);
    expect(haversineMeters(0, 0, 0, 1)).toBeGreaterThan(111000);
    expect(haversineMeters(0, 0, 0, 1)).toBeLessThan(111300);
  });

  it('streetFromAddress: la calle antes de la primera coma', () => {
    expect(streetFromAddress('Rey Nayar 31, Lázaro Cárdenas, Tepic')).toBe('rey nayar 31');
    expect(streetFromAddress('')).toBe('');
  });

  it('buildPlaceSearchQuery: nombre + dirección + ciudad', () => {
    expect(buildPlaceSearchQuery({ name: 'Taco Fish', address: 'Av. X 1' }, 'Guadalajara')).toBe('Taco Fish, Av. X 1, Guadalajara');
    expect(buildPlaceSearchQuery({ name: 'Solo Nombre', address: '' }, '')).toBe('Solo Nombre');
  });

  const biz = (overrides) => ({
    name: 'Taco Fish La Paz', address: 'Av. Vallarta 123, Guadalajara', lat: 20.65, lng: -103.35, ...overrides,
  });
  const place = (overrides) => ({
    id: 'ChIJ-taco', displayName: { text: 'Taco Fish La Paz' },
    formattedAddress: 'Av. Vallarta 123, Guadalajara, Jal.',
    location: { latitude: 20.6505, longitude: -103.3502 }, ...overrides,
  });

  it('acepta nombre igual y lugar a menos de 500 m', () => {
    const r = acceptPlaceCandidate(biz(), place());
    expect(r.accepted).toBe(true);
    expect(r.distanceMeters).toBeLessThan(500);
  });

  it('rechaza cuando el nombre no coincide', () => {
    expect(acceptPlaceCandidate(biz(), place({ displayName: { text: 'Starbucks Andares' } })).reason).toBe('nombre-no-coincide');
  });

  it('rechaza cuando el lugar está a más de 500 m', () => {
    const r = acceptPlaceCandidate(biz(), place({ location: { latitude: 20.67, longitude: -103.35 } }));
    expect(r.accepted).toBe(false);
    expect(r.reason).toBe('distancia');
    expect(r.distanceMeters).toBeGreaterThan(500);
  });

  it('sin candidatos no acepta nada', () => {
    expect(acceptPlaceCandidate(biz(), null).reason).toBe('sin-candidatos');
    expect(acceptPlaceCandidate(biz(), {}).reason).toBe('sin-candidatos');
  });

  it('sin coordenadas usa la calle de la dirección', () => {
    const noCoords = biz({ lat: null, lng: null });
    expect(acceptPlaceCandidate(noCoords, place({ location: undefined })).accepted).toBe(true);
    expect(acceptPlaceCandidate(noCoords, place({ location: undefined, formattedAddress: 'Otra Calle 999, Guadalajara' })).reason).toBe('direccion-no-coincide');
    expect(acceptPlaceCandidate(biz({ lat: null, lng: null, address: '' }), place({ location: undefined })).reason).toBe('sin-datos-para-verificar');
  });

  it('acepta con acentos y nombre extendido', () => {
    const r = acceptPlaceCandidate(
      biz({ name: 'Café San Pedro', lat: 20.7, lng: -103.4 }),
      place({ displayName: { text: 'Cafe San Pedro Tlaquepaque' }, location: { latitude: 20.7001, longitude: -103.4001 } }),
    );
    expect(r.accepted).toBe(true);
  });
});

// ── Handler: ?action=completar-place-ids ──────────────────────────────

const makeRes = () => {
  const res = {
    statusCode: null, body: null, headers: {},
    setHeader(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(o) { this.body = o; return this; },
    end() { return this; },
  };
  return res;
};

const ADMIN_USER = { id: 'admin-id', email: 'admin@cityguide.com', email_confirmed_at: '2025-01-01T00:00:00Z', app_metadata: { isAdmin: true } };
const PLAIN_USER = { id: 'user-id', email: 'alguien@example.com', email_confirmed_at: '2025-01-01T00:00:00Z', app_metadata: {} };

const BIZ_LIST = [
  { id: 'b1', name: 'Taco Fish La Paz', address: 'Av. Vallarta 123, Guadalajara', lat: 20.65, lng: -103.35, city_slug: 'guadalajara', social_links: { instagram: '@tacofish' } },
  { id: 'b2', name: 'Café San Pedro', address: 'Calle Real 10, Tlaquepaque', lat: 20.7, lng: -103.4, city_slug: 'tlaquepaque', social_links: {} },
  { id: 'b3', name: 'Ya Tiene ID', address: 'Calle 1', lat: 21.5, lng: -104.9, city_slug: 'tepic', social_links: { google_place_id: 'ChIJ-ya' } },
  { id: 'b4', name: 'Sin Coords Café', address: 'Calle Falsa 123, Tepic', lat: null, lng: null, city_slug: 'tepic', social_links: {} },
];
const CITIES = [
  { slug: 'guadalajara', name: 'Guadalajara', country_code: 'mx' },
  { slug: 'tlaquepaque', name: 'Tlaquepaque', country_code: 'mx' },
  { slug: 'tepic', name: 'Tepic', country_code: 'mx' },
];

let handler;
let authUser = ADMIN_USER;
beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('CRON_SECRET', 'test-cron-secret');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://dpkjxhjkzdlkvyotoeai.supabase.co');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  vi.stubEnv('GOOGLE_PLACES_API_KEY', 'test-google-key');
  authUser = ADMIN_USER;
  vi.stubGlobal('fetch', vi.fn(async (url, options) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) {
      return authUser ? { ok: true, json: async () => authUser } : { ok: false, json: async () => ({}) };
    }
    if (u.includes('places.googleapis.com/v1/places:searchText')) {
      const body = JSON.parse(options.body);
      const q = body.textQuery || '';
      if (q.includes('Taco Fish')) {
        return { ok: true, json: async () => ({ places: [{ id: 'ChIJ-taco', displayName: { text: 'Taco Fish La Paz' }, formattedAddress: 'Av. Vallarta 123, Guadalajara, Jal.', location: { latitude: 20.6505, longitude: -103.3502 } }] }) };
      }
      if (q.includes('Café San Pedro')) {
        return { ok: true, json: async () => ({ places: [{ id: 'ChIJ-other', displayName: { text: 'Starbucks Andares' }, formattedAddress: 'Av. Andares 1, Zapopan', location: { latitude: 20.7, longitude: -103.4 } }] }) };
      }
      if (q.includes('Sin Coords')) {
        return { ok: true, json: async () => ({ places: [{ id: 'ChIJ-sincoords', displayName: { text: 'Sin Coords Café' }, formattedAddress: 'Calle Falsa 123, Tepic, Nay.', location: { latitude: 21.5, longitude: -104.9 } }] }) };
      }
      return { ok: true, json: async () => ({ places: [] }) };
    }
    if (u.includes('/rest/v1/cities')) {
      return { ok: true, json: async () => CITIES };
    }
    if (u.includes('/rest/v1/businesses')) {
      if (options?.method === 'PATCH') {
        const body = JSON.parse(options.body);
        const id = u.match(/id=eq\.([^&]+)/)?.[1];
        const prev = BIZ_LIST.find((b) => b.id === id);
        return { ok: true, json: async () => [{ id, social_links: { ...(prev?.social_links || {}), ...body.social_links } }] };
      }
      if (u.includes('select=social_links')) {
        const id = u.match(/id=eq\.([^&]+)/)?.[1];
        const row = BIZ_LIST.find((b) => b.id === id);
        return { ok: true, json: async () => [{ social_links: row?.social_links || {} }] };
      }
      return { ok: true, json: async () => BIZ_LIST };
    }
    throw new Error(`unexpected fetch ${u}`);
  }));
  handler = (await import('../../api/actualizar-calificaciones-google.js')).default;
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

const req = ({ user = true, dry = false, body = {} } = {}) => ({
  method: 'POST',
  query: { action: 'completar-place-ids', ...(dry ? { dry: '1' } : {}) },
  headers: user ? { authorization: 'Bearer test-jwt' } : {},
  body,
});

describe('completar-place-ids: auth', () => {
  it('401 sin JWT y no llama a nada', async () => {
    const res = makeRes();
    await handler(req({ user: false }), res);
    expect(res.statusCode).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('403 con JWT de usuario no admin', async () => {
    authUser = PLAIN_USER;
    const res = makeRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(403);
  });

  it('401 si Supabase no reconoce el JWT', async () => {
    authUser = null;
    const res = makeRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(401);
  });
});

describe('completar-place-ids: corrida', () => {
  it('dry=1 lista los pendientes sin llamar a Google ni escribir', async () => {
    const res = makeRes();
    await handler(req({ dry: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.dry).toBe(true);
    expect(res.body.remaining).toBe(3);
    expect(res.body.wouldProcess).toHaveLength(3);
    expect(fetch.mock.calls.some(([u]) => String(u).includes('places.googleapis.com'))).toBe(false);
    expect(fetch.mock.calls.some(([, o]) => o?.method === 'PATCH')).toBe(false);
  });

  it('dry=1 respeta exclude_ids', async () => {
    const res = makeRes();
    await handler(req({ dry: true, body: { exclude_ids: ['b1'] } }), res);
    expect(res.body.wouldProcess.map((w) => w.business_id)).toEqual(['b2', 'b4']);
    expect(res.body.remaining).toBe(3);
  });

  it('llena solo los verificados, conserva social_links y reporta el resto', async () => {
    const res = makeRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.processed).toBe(3);
    expect(res.body.updated).toEqual([
      { business_id: 'b1', name: 'Taco Fish La Paz', place_id: 'ChIJ-taco' },
      { business_id: 'b4', name: 'Sin Coords Café', place_id: 'ChIJ-sincoords' },
    ]);
    expect(res.body.ambiguous).toHaveLength(1);
    expect(res.body.ambiguous[0]).toMatchObject({ business_id: 'b2', reason: 'nombre-no-coincide' });
    expect(res.body.failed).toEqual([]);
    expect(res.body.remaining).toBe(1);

    // La llamada a Google pide solo los 4 campos y limita a 1 candidato.
    const searchCall = fetch.mock.calls.find(([u]) => String(u).includes('places:searchText'));
    expect(searchCall[1].headers['X-Goog-FieldMask']).toBe('places.id,places.displayName,places.formattedAddress,places.location');
    expect(JSON.parse(searchCall[1].body).maxResultCount).toBe(1);
    expect(JSON.parse(searchCall[1].body).regionCode).toBe('MX');
    // El PATCH conserva los links existentes y guarda el place_id.
    const patch = fetch.mock.calls.find(([, o]) => o?.method === 'PATCH');
    expect(JSON.parse(patch[1].body).social_links).toEqual({ instagram: '@tacofish', google_place_id: 'ChIJ-taco' });
    // No hay PATCH para el ambiguo.
    expect(fetch.mock.calls.filter(([, o]) => o?.method === 'PATCH')).toHaveLength(2);
  });

  it('sin llave de Google devuelve 500 sin llamar a Places', async () => {
    vi.stubEnv('GOOGLE_PLACES_API_KEY', '');
    const res = makeRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(500);
    expect(fetch.mock.calls.some(([u]) => String(u).includes('places.googleapis.com'))).toBe(false);
  });
});
