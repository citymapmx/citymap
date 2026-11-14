import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// send-notification.js importa firebase-admin: se simula como en push_delivery.
const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('firebase-admin/app', () => ({ getApps: () => [{}], initializeApp: vi.fn(), cert: vi.fn() }));
vi.mock('firebase-admin/messaging', () => ({ getMessaging: () => ({ sendEachForMulticast: mocks.send }) }));
import {
  BOOKING_NOTIFICATION_DEDUP_MINUTES,
  BOOKING_NOTIFICATION_FRESH_MINUTES,
  BOOKING_NOTIFICATION_TYPE,
  bookingRecipients,
  buildBookingMessage,
  formatBookingDate,
  formatBookingTime12h,
  isDuplicateBookingNotification,
  normalizePhoneDigits,
  notifyBooking,
} from '../lib/bookingNotifications.js';

const OWNER_ID = '431c8b4a-83e3-4ca3-ac85-7c0d8730da3b';
const JONATHAN_ID = 'b414890a-6ed8-4c9b-8c28-f4874051671a';
const ADMIN_PROFILE_ID = '40509477-86fe-48d1-865b-849b9e9d6f77';
const ADMIN_EMAIL_ID = '37f14a2b-71bb-4baa-afc4-869bc14a442d';
const CLIENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BIZ_ID = 'dc66830f-b566-4ed8-bdb8-b09d3f566f59';
const RESERVATION_ID = '9c8f2766-ca61-4f6a-b333-87ae2230b45b';

const BIZ = {
  id: BIZ_ID,
  name: 'Eduardo Barber',
  slug: 'tepic-eduardo-barber',
  owner_id: OWNER_ID,
  user_id: null,
  logo_url: 'https://cdn.example.com/kava.jpg',
  banner_url: null,
  photos: [],
};

const freshReservation = (overrides = {}) => ({
  id: RESERVATION_ID,
  biz_id: BIZ_ID,
  date: '2026-11-13',
  time: '18:00',
  client_name: 'Ana',
  client_phone: '3223792428',
  service: 'Corte',
  status: 'pending',
  user_id: null,
  created_at: new Date().toISOString(),
  ...overrides,
});

const DEEP_LINK = '/manage/tepic-eduardo-barber';
const ABSOLUTE_LINK = `https://citymap.mx${DEEP_LINK}`;

describe('aviso reserva: formato de fecha y hora', () => {
  it('la fecha se lee "vie 13 nov 2026"', () => {
    expect(formatBookingDate('2026-11-13')).toBe('vie 13 nov 2026');
  });
  it('la hora pasa a 12 h ("6:00 p. m.")', () => {
    expect(formatBookingTime12h('18:00')).toBe('6:00 p. m.');
    expect(formatBookingTime12h('09:30')).toBe('9:30 a. m.');
    expect(formatBookingTime12h('12:00')).toBe('12:00 p. m.');
  });
  it('el teléfono se normaliza a solo dígitos', () => {
    expect(normalizePhoneDigits('322 379 2428')).toBe('3223792428');
    expect(normalizePhoneDigits('+52 (322) 379-2428')).toBe('523223792428');
  });
});

describe('aviso reserva: payload del aviso', () => {
  it('lleva cliente, negocio, fecha, hora y servicio, con enlace a /manage', () => {
    expect(buildBookingMessage({ reservation: freshReservation(), business: BIZ })).toEqual({
      title: 'Nueva reservación pendiente',
      body: 'Ana ha solicitado una reserva en Eduardo Barber para el vie 13 nov 2026 a las 6:00 p. m. (Corte).',
      deepLink: DEEP_LINK,
      imageUrl: 'https://cdn.example.com/kava.jpg',
    });
  });
  it('sin imagen del negocio no lleva imageUrl (el aviso se manda igual)', () => {
    const msg = buildBookingMessage({ reservation: freshReservation(), business: { ...BIZ, logo_url: null } });
    expect(msg).not.toHaveProperty('imageUrl');
  });
  it('sin cliente, negocio, fecha, hora o negocio no hay aviso', () => {
    expect(buildBookingMessage({ reservation: { ...freshReservation(), client_name: '' }, business: BIZ })).toBeNull();
    expect(buildBookingMessage({ reservation: freshReservation(), business: { ...BIZ, name: '' } })).toBeNull();
    expect(buildBookingMessage({ reservation: { ...freshReservation(), date: '' }, business: BIZ })).toBeNull();
    expect(buildBookingMessage({ reservation: { ...freshReservation(), time: '' }, business: BIZ })).toBeNull();
    expect(buildBookingMessage({ reservation: freshReservation(), business: null })).toBeNull();
  });
});

describe('aviso reserva: destinatarios', () => {
  it('dueño + admins, sin repetidos y sin quien reservó', () => {
    expect(bookingRecipients({ ownerId: OWNER_ID, adminIds: [JONATHAN_ID, ADMIN_PROFILE_ID, JONATHAN_ID], callerId: CLIENT_ID }).sort())
      .toEqual([OWNER_ID, JONATHAN_ID, ADMIN_PROFILE_ID].sort());
  });
  it('si el dueño reserva en su propio negocio no se avisa a sí mismo', () => {
    expect(bookingRecipients({ ownerId: OWNER_ID, adminIds: [JONATHAN_ID], callerId: OWNER_ID }))
      .toEqual([JONATHAN_ID]);
  });
  it('sin dueño ni admins no hay a quién avisar', () => {
    expect(bookingRecipients({ ownerId: null, adminIds: [], callerId: null })).toEqual([]);
  });
});

describe('aviso reserva: anti-duplicados', () => {
  const recent = [{
    user_id: OWNER_ID, type: BOOKING_NOTIFICATION_TYPE, deep_link: ABSOLUTE_LINK,
    body: 'Ana ha solicitado una reserva en Eduardo Barber para el vie 13 nov 2026 a las 6:00 p. m. (Corte).',
    created_at: new Date().toISOString(),
  }];
  const since = new Date(Date.now() - BOOKING_NOTIFICATION_DEDUP_MINUTES * 60000).toISOString();
  it('el mismo aviso en los últimos 30 minutos ya se mandó', () => {
    expect(isDuplicateBookingNotification(recent, OWNER_ID, ABSOLUTE_LINK, recent[0].body, since)).toBe(true);
    expect(isDuplicateBookingNotification(recent, JONATHAN_ID, ABSOLUTE_LINK, recent[0].body, since)).toBe(false);
  });
  it('otro cuerpo, otro enlace u otro tipo no es duplicado', () => {
    expect(isDuplicateBookingNotification(recent, OWNER_ID, ABSOLUTE_LINK, 'Otro cuerpo', since)).toBe(false);
    expect(isDuplicateBookingNotification(recent, OWNER_ID, '/manage/otro', recent[0].body, since)).toBe(false);
    expect(isDuplicateBookingNotification([{ ...recent[0], type: 'chat' }], OWNER_ID, ABSOLUTE_LINK, recent[0].body, since)).toBe(false);
  });
  it('un aviso viejo (fuera de la ventana) no bloquea el reenvío', () => {
    const old = [{ ...recent[0], created_at: new Date(Date.now() - 60 * 60000).toISOString() }];
    expect(isDuplicateBookingNotification(old, OWNER_ID, ABSOLUTE_LINK, recent[0].body, since)).toBe(false);
  });
});

describe('aviso reserva: disparo desde el cliente', () => {
  it('manda reserva con negocio, fecha, hora y teléfono, con JWT si hay sesión', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      calls.push({ url: String(url), body: JSON.parse(opts?.body || '{}'), auth: opts?.headers?.Authorization });
      return { ok: true };
    }));
    await expect(notifyBooking({ bizId: BIZ_ID, date: '2026-11-13', time: '18:00', clientPhone: '322 379 2428', token: 'jwt-del-cliente' })).resolves.toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://citymap.mx/api/send-notification');
    expect(calls[0].body).toEqual({ reserva: true, bizId: BIZ_ID, date: '2026-11-13', time: '18:00', clientPhone: '3223792428' });
    expect(calls[0].auth).toBe('Bearer jwt-del-cliente');
    vi.unstubAllGlobals();
  });
  it('un invitado sin sesión también dispara (sin Authorization) y pasa el id si el RPC lo devolvió', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      calls.push({ url: String(url), body: JSON.parse(opts?.body || '{}'), auth: opts?.headers?.Authorization });
      return { ok: true };
    }));
    await expect(notifyBooking({ reservationId: RESERVATION_ID, bizId: BIZ_ID, date: '2026-11-13', time: '18:00', clientPhone: '3223792428', token: null })).resolves.toBe(true);
    expect(calls[0].body).toEqual({ reserva: true, reservationId: RESERVATION_ID, bizId: BIZ_ID, date: '2026-11-13', time: '18:00', clientPhone: '3223792428' });
    expect(calls[0].auth).toBeUndefined();
    vi.unstubAllGlobals();
  });
  it('sin negocio, fecha, hora o teléfono no dispara nada', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(notifyBooking({ bizId: BIZ_ID, date: '2026-11-13', time: '18:00', clientPhone: '' })).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it('si el fetch falla devuelve false y queda en consola (nunca lanza)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('red caída'); }));
    await expect(notifyBooking({ bizId: BIZ_ID, date: '2026-11-13', time: '18:00', clientPhone: '3223792428' })).resolves.toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
    vi.unstubAllGlobals();
  });
  it('si el servidor responde con error devuelve false y lo registra en consola', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 401 })));
    await expect(notifyBooking({ bizId: BIZ_ID, date: '2026-11-13', time: '18:00', clientPhone: '3223792428' })).resolves.toBe(false);
    expect(warn).toHaveBeenCalledWith('[reserva] aviso de reservación no enviado', 401, BIZ_ID, '2026-11-13', '18:00');
    warn.mockRestore();
    vi.unstubAllGlobals();
  });
});

// ── Modo aviso de reserva en api/send-notification.js (con fetch simulado) ───

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

let handler;
let sendCalls;
let mockReservation;
let mockBiz;
let mockAdminProfiles;
let mockAuthUsers;
let mockDupNotifs;
let authUser;
let adminSecret;

const req = ({ jwt = false, body = {} } = {}) => ({
  method: 'POST',
  query: {},
  headers: jwt ? { authorization: 'Bearer test-jwt' } : {},
  body: { reserva: true, bizId: BIZ_ID, date: '2026-11-13', time: '18:00', clientPhone: '3223792428', ...body },
});

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('CRON_SECRET', 'test-cron-secret');
  vi.stubEnv('ADMIN_SECRET', 'test-admin-secret');
  vi.stubEnv('ADMIN_EMAILS', 'jgarana18@gmail.com, admin@cityguide.com');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://dpkjxhjkzdlkvyotoeai.supabase.co');
  mockReservation = [freshReservation()];
  mockBiz = [BIZ];
  mockAdminProfiles = [{ id: ADMIN_PROFILE_ID }];
  mockAuthUsers = [
    { id: JONATHAN_ID, email: 'jgarana18@gmail.com', app_metadata: {} },
    { id: ADMIN_EMAIL_ID, email: 'admin@cityguide.com', app_metadata: {} },
    { id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd', email: 'otro@example.com', app_metadata: { isAdmin: true } },
    { id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', email: 'normal@example.com', app_metadata: {} },
  ];
  mockDupNotifs = [];
  authUser = { id: CLIENT_ID, email: 'ana@example.com', email_confirmed_at: '2025-01-01T00:00:00Z', app_metadata: {} };
  adminSecret = 'test-admin-secret';
  sendCalls = [];
  vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
    const u = String(url);
    if (u.includes('/auth/v1/admin/users')) {
      const page = Number(new URL(u).searchParams.get('page') || '1');
      return { ok: true, json: async () => ({ users: page === 1 ? mockAuthUsers : [], next_page: null, total: mockAuthUsers.length }) };
    }
    if (u.includes('/auth/v1/user')) {
      return authUser ? { ok: true, json: async () => authUser } : { ok: false, json: async () => ({}) };
    }
    if (u.includes('/api/send-notification')) {
      sendCalls.push({ url: u, body: JSON.parse(opts?.body || '{}') });
      return { ok: true, json: async () => ({ successCount: 1 }) };
    }
    if (u.includes('/rest/v1/reservations')) return { ok: true, json: async () => mockReservation };
    if (u.includes('/rest/v1/businesses')) return { ok: true, json: async () => mockBiz };
    if (u.includes('/rest/v1/profiles')) return { ok: true, json: async () => mockAdminProfiles };
    if (u.includes('/rest/v1/notifications')) return { ok: true, json: async () => mockDupNotifs };
    throw new Error(`unexpected fetch ${url}`);
  }));
  handler = (await import('../../api/send-notification.js')).default;
});

describe('aviso reserva: modo aviso de reserva en api/send-notification.js', () => {
  it('un invitado (sin JWT) avisa al dueño y a los admins', async () => {
    const res = makeRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.sent.map((s) => s.userId).sort()).toEqual(
      [OWNER_ID, JONATHAN_ID, ADMIN_PROFILE_ID, ADMIN_EMAIL_ID, 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'].sort(),
    );
    expect(res.body.failed).toHaveLength(0);
    expect(res.body.skipped).toBe(0);
    expect(sendCalls).toHaveLength(5);
    for (const call of sendCalls) {
      expect(call.body).toMatchObject({
        title: 'Nueva reservación pendiente',
        body: 'Ana ha solicitado una reserva en Eduardo Barber para el vie 13 nov 2026 a las 6:00 p. m. (Corte).',
        type: 'booking',
        deepLink: DEEP_LINK,
        imageUrl: 'https://cdn.example.com/kava.jpg',
        secret: 'test-admin-secret',
      });
    }
  });
  it('con sesión y reservationId busca por id y verifica que sea quien reservó', async () => {
    mockReservation = [freshReservation({ user_id: CLIENT_ID })];
    const res = makeRes();
    await handler(req({ jwt: true, body: { reservationId: RESERVATION_ID } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.sent.map((s) => s.userId)).toContain(OWNER_ID);
    expect(sendCalls).toHaveLength(5);
  });
  it('si el dueño reserva en su propio negocio no se avisa a sí mismo', async () => {
    mockReservation = [freshReservation({ user_id: OWNER_ID })];
    authUser = { id: OWNER_ID, email: 'bryan@example.com', email_confirmed_at: '2025-01-01T00:00:00Z', app_metadata: {} };
    const res = makeRes();
    await handler(req({ jwt: true, body: { reservationId: RESERVATION_ID } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.sent.map((s) => s.userId)).not.toContain(OWNER_ID);
    expect(res.body.sent.map((s) => s.userId)).toContain(JONATHAN_ID);
  });
  it('un usuario que no hizo la reserva no puede disparar avisos (403)', async () => {
    mockReservation = [freshReservation({ user_id: CLIENT_ID })];
    authUser = { id: 'ffffffff-ffff-4fff-8fff-ffffffffffff', email: 'otro@example.com', email_confirmed_at: '2025-01-01T00:00:00Z', app_metadata: {} };
    const res = makeRes();
    await handler(req({ jwt: true, body: { reservationId: RESERVATION_ID } }), res);
    expect(res.statusCode).toBe(403);
    expect(sendCalls).toHaveLength(0);
  });
  it('un invitado con el teléfono equivocado no avisa (404: no hay reserva con ese teléfono)', async () => {
    const res = makeRes();
    await handler(req({ body: { clientPhone: '3110000000' } }), res);
    expect(res.statusCode).toBe(404);
    expect(sendCalls).toHaveLength(0);
  });
  it('una reserva vieja no avisa (fuera de la ventana de 30 min)', async () => {
    mockReservation = [freshReservation({ created_at: new Date(Date.now() - 60 * 60000).toISOString() })];
    const res = makeRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(400);
    expect(sendCalls).toHaveLength(0);
  });
  it('una reserva cancelada no avisa', async () => {
    mockReservation = [freshReservation({ status: 'cancelled' })];
    const res = makeRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(400);
    expect(sendCalls).toHaveLength(0);
  });
  it('reserva inexistente devuelve 404', async () => {
    mockReservation = [];
    const res = makeRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(404);
    expect(sendCalls).toHaveLength(0);
  });
  it('el mismo aviso en los últimos 30 minutos se omite para ese destinatario', async () => {
    mockDupNotifs = [{
      user_id: OWNER_ID, type: BOOKING_NOTIFICATION_TYPE, deep_link: ABSOLUTE_LINK,
      body: 'Ana ha solicitado una reserva en Eduardo Barber para el vie 13 nov 2026 a las 6:00 p. m. (Corte).',
      created_at: new Date().toISOString(),
    }];
    const res = makeRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.sent.map((s) => s.userId)).not.toContain(OWNER_ID);
    expect(res.body.skipped).toBe(1);
    expect(sendCalls).toHaveLength(4);
  });
  it('sin bizId, fecha, hora o teléfono devuelve 400', async () => {
    const res = makeRes();
    await handler(req({ body: { bizId: '', date: '2026-11-13', time: '18:00', clientPhone: '3223792428' } }), res);
    expect(res.statusCode).toBe(400);
    expect(sendCalls).toHaveLength(0);
  });
  it('si la resolución de admins falla, el aviso al dueño sale igual', async () => {
    mockAdminProfiles = [];
    mockAuthUsers = [];
    const res = makeRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.sent.map((s) => s.userId)).toEqual([OWNER_ID]);
    expect(sendCalls).toHaveLength(1);
  });
});

// ── Cableado (fuente) ───────────────────────────────────────────────────────

describe('aviso reserva: cableado (fuente)', () => {
  it('BookingModal dispara el aviso con notifyBooking tras secure_reserve (ya no sb.notify)', () => {
    const src = fs.readFileSync(new URL('../components/BookingModal.jsx', import.meta.url), 'utf8');
    expect(src).toContain("import { notifyBooking } from \"../lib/bookingNotifications.js\";");
    expect(src).toContain('await notifyBooking({');
    expect(src).toContain('reservationId:');
    expect(src).not.toContain('sb.notify(');
  });
  it('send-notification.js despacha el modo reserva antes del 401 de no autorizado', () => {
    const src = fs.readFileSync(new URL('../../api/send-notification.js', import.meta.url), 'utf8');
    expect(src).toContain('reqBody.reserva === true');
    expect(src).toContain('return runBookingNotification(req, res, verifiedUserId);');
    const handlerSrc = src.slice(src.indexOf('export default async function handler'));
    expect(handlerSrc.indexOf('return runBookingNotification(req, res, verifiedUserId);')).toBeLessThan(handlerSrc.indexOf("return res.status(401).json({ error: 'Unauthorized' })"));
  });
  it('sin función nueva: el aviso vive en send-notification.js', () => {
    const apiDir = new URL('../../api', import.meta.url);
    const files = fs.readdirSync(apiDir).filter((f) => f.endsWith('.js'));
    const edge = files.filter((f) => /runtime:\s*['"]edge['"]/.test(fs.readFileSync(new URL(`../../api/${f}`, import.meta.url), 'utf8')));
    expect(files.length - edge.length).toBe(11);
  });
  it('runBookingNotification verifica la reserva en la base y resuelve admins', () => {
    const src = fs.readFileSync(new URL('../../api/send-notification.js', import.meta.url), 'utf8');
    expect(src).toContain('rest/v1/reservations?select=id,biz_id,date,time,client_name,client_phone,service,status,user_id,created_at');
    expect(src).toContain('resolveAdminUserIds');
    expect(src).toContain('auth/v1/admin/users');
    expect(src).toContain('role=eq.admin');
  });
});
