import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// send-notification.js importa firebase-admin: se simula como en push_delivery.
const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('firebase-admin/app', () => ({ getApps: () => [{}], initializeApp: vi.fn(), cert: vi.fn() }));
vi.mock('firebase-admin/messaging', () => ({ getMessaging: () => ({ sendEachForMulticast: mocks.send }) }));
import {
  REMINDER_CLOSINGS,
  buildReminderMessage,
  buildReminderPlan,
  countReminderPairs,
  formatReminderTime,
  isDuplicateReminder,
  reminderClosingFor,
  selectTodayReminders,
  todayInMexicoCity,
  toTitleCaseIfUpper,
  usersToRemind,
  venueWithArticle,
} from '../lib/recordatoriosEventos.js';

const TODAY = todayInMexicoCity();
const CALAMARO = {
  id: '29c3ca70-8a4c-4426-a5a6-c42ad28f64ff',
  title: 'ANDRÉS CALAMARO',
  slug: 'guadalajara-andres-calamaro',
  city_slug: 'guadalajara',
  date: TODAY,
  end_date: null,
  time: '21:00',
  venue_name: 'Teatro Diana',
  status: 'approved',
  event_category: 'Concierto',
};
const USER_A = 'user-a-id';
const USER_B = 'user-b-id';

describe('recordatorios: hora en formato 12 h', () => {
  it('21:00 es "9:00 p. m." y 09:00 es "9:00 a. m."', () => {
    expect(formatReminderTime('21:00')).toBe('9:00 p. m.');
    expect(formatReminderTime('09:00')).toBe('9:00 a. m.');
    expect(formatReminderTime('12:00')).toBe('12:00 p. m.');
    expect(formatReminderTime('00:15')).toBe('12:15 a. m.');
    expect(formatReminderTime('20:00')).toBe('8:00 p. m.');
  });
  it('sin hora o con hora inválida devuelve null', () => {
    expect(formatReminderTime(null)).toBeNull();
    expect(formatReminderTime('')).toBeNull();
    expect(formatReminderTime('25:00')).toBeNull();
  });
});

describe('recordatorios: título y cuerpo nuevo (hora + recinto + cierre)', () => {
  it('el título todo en mayúsculas pasa a formato título', () => {
    expect(toTitleCaseIfUpper('ANDRÉS CALAMARO')).toBe('Andrés Calamaro');
    expect(toTitleCaseIfUpper('Katseye')).toBe('Katseye');
    expect(toTitleCaseIfUpper('')).toBe('');
  });
  it('el mensaje de Calamaro es exacto: hora + recinto + cierre, sin repetir el título', () => {
    const msg = buildReminderMessage(CALAMARO);
    expect(msg).toEqual({
      title: 'Andrés Calamaro',
      body: 'Hoy a las 9:00 p. m. en el Teatro Diana. ¡Ya casi!',
      deepLink: '/evento/guadalajara/andres-calamaro',
    });
  });
  it('sin recinto no se inventa ninguno: solo hora y cierre (sin punto doble tras "p. m.")', () => {
    const msg = buildReminderMessage({ ...CALAMARO, venue_name: '' });
    expect(msg.body).toBe('Hoy a las 9:00 p. m. ¡Ya casi!');
    expect(buildReminderMessage({ ...CALAMARO, venue_name: '   ' }).body).toBe('Hoy a las 9:00 p. m. ¡Ya casi!');
    expect(buildReminderMessage({ ...CALAMARO, venue_name: null }).body).toBe('Hoy a las 9:00 p. m. ¡Ya casi!');
  });
  it('sin hora, el mensaje no lleva "a las …"', () => {
    expect(buildReminderMessage({ ...CALAMARO, time: null }).body).toBe('Hoy en el Teatro Diana. ¡Ya casi!');
    expect(buildReminderMessage({ ...CALAMARO, time: null, venue_name: '' }).body).toBe('Hoy. ¡Ya casi!');
  });
  it('el recinto lleva "el" salvo que ya traiga artículo', () => {
    expect(venueWithArticle('Teatro Diana')).toBe('el Teatro Diana');
    expect(venueWithArticle('PALCCO')).toBe('el PALCCO');
    expect(venueWithArticle('El Parián de Tlaquepaque')).toBe('El Parián de Tlaquepaque');
    expect(venueWithArticle('La Concha Acústica')).toBe('La Concha Acústica');
    expect(venueWithArticle('')).toBe('');
    expect(venueWithArticle(null)).toBe('');
    expect(venueWithArticle('  Teatro Diana  ')).toBe('el Teatro Diana');
  });
  it('sin título o sin fecha no hay mensaje', () => {
    expect(buildReminderMessage({ ...CALAMARO, title: '' })).toBeNull();
    expect(buildReminderMessage({ ...CALAMARO, date: null })).toBeNull();
  });
});

describe('recordatorios: cierres rotando (determinista por evento)', () => {
  it('los 4 cierres son los acordados, en orden', () => {
    expect(REMINDER_CLOSINGS).toEqual(['¡Nos vemos ahí!', '¡Hoy es el día!', '¡Ya casi!', 'No te lo pierdas']);
  });
  it('el mismo evento siempre recibe el mismo cierre', () => {
    expect(reminderClosingFor(CALAMARO)).toBe('¡Ya casi!');
    expect(reminderClosingFor({ ...CALAMARO })).toBe('¡Ya casi!');
    expect(reminderClosingFor({ id: 'evento-0' })).toBe('No te lo pierdas');
  });
  it('distintos eventos varían y los 4 cierres se usan', () => {
    const closings = ['evento-0', 'evento-1', 'evento-2', 'evento-3'].map((id) => reminderClosingFor({ id }));
    expect(closings).toEqual(['No te lo pierdas', '¡Nos vemos ahí!', '¡Hoy es el día!', '¡Ya casi!']);
    expect(new Set(closings).size).toBe(4);
  });
  it('sin id usa el título; sin nada, un cierre válido y estable', () => {
    expect(REMINDER_CLOSINGS).toContain(reminderClosingFor({ title: 'Algo' }));
    expect(REMINDER_CLOSINGS).toContain(reminderClosingFor({}));
    expect(reminderClosingFor({ title: 'Algo' })).toBe(reminderClosingFor({ title: 'Algo' }));
  });
});

describe('recordatorios: imagen del evento en el aviso', () => {
  const POSTER = 'https://cdn.example.com/poster.jpg';
  it('el mensaje lleva imageUrl cuando el evento tiene img_url', () => {
    expect(buildReminderMessage({ ...CALAMARO, img_url: POSTER }).imageUrl).toBe(POSTER);
  });
  it('usa img como respaldo cuando no hay img_url, e img_url manda sobre img', () => {
    expect(buildReminderMessage({ ...CALAMARO, img: POSTER }).imageUrl).toBe(POSTER);
    expect(buildReminderMessage({ ...CALAMARO, img_url: POSTER, img: 'https://cdn.example.com/otra.jpg' }).imageUrl).toBe(POSTER);
  });
  it('sin imagen no lleva la clave imageUrl (el aviso se manda igual)', () => {
    expect(buildReminderMessage(CALAMARO)).not.toHaveProperty('imageUrl');
  });
  it('una imagen no HTTPS no se pasa (el aviso se manda sin imagen)', () => {
    expect(buildReminderMessage({ ...CALAMARO, img_url: 'http://cdn.example.com/x.jpg' })).not.toHaveProperty('imageUrl');
    expect(buildReminderMessage({ ...CALAMARO, img_url: '/img/poster.jpg' })).not.toHaveProperty('imageUrl');
  });
  it('el plan trae la imagen del evento', () => {
    const plan = buildReminderPlan({
      events: [{ ...CALAMARO, img_url: POSTER }],
      favorites: [{ user_id: USER_A, event_id: CALAMARO.id }],
      existingNotifs: [],
      todayISO: TODAY,
    });
    expect(plan).toHaveLength(1);
    expect(plan[0].imageUrl).toBe(POSTER);
  });
});

describe('recordatorios: selección de eventos y plan', () => {
  it('solo entran los de hoy y aprobados; los multi-fecha no se repiten', () => {
    const multi = { ...CALAMARO, id: 'multi', date: '2026-11-10', end_date: TODAY };
    const pending = { ...CALAMARO, id: 'pend', status: 'pending' };
    expect(selectTodayReminders([CALAMARO, multi, pending], TODAY)).toEqual([CALAMARO]);
  });
  it('usuarios únicos que guardaron el evento', () => {
    const favs = [
      { user_id: USER_A, event_id: CALAMARO.id },
      { user_id: USER_A, event_id: CALAMARO.id },
      { user_id: USER_B, event_id: CALAMARO.id },
      { user_id: USER_A, event_id: 'otro-evento' },
    ];
    expect(usersToRemind(favs, CALAMARO.id).sort()).toEqual([USER_A, USER_B]);
  });
  it('el plan avisa a cada usuario que guardó; sin duplicados el mismo día', () => {
    const favs = [
      { user_id: USER_A, event_id: CALAMARO.id },
      { user_id: USER_B, event_id: CALAMARO.id },
    ];
    const plan = buildReminderPlan({ events: [CALAMARO], favorites: favs, existingNotifs: [], todayISO: TODAY });
    expect(plan).toHaveLength(2);
    expect(plan[0].title).toBe('Andrés Calamaro');
    expect(plan[0].body).toBe('Hoy a las 9:00 p. m. en el Teatro Diana. ¡Ya casi!');
    expect(countReminderPairs([CALAMARO], favs, TODAY)).toBe(2);
  });
  it('con un aviso igual sin leer de hoy, ese usuario no recibe otro', () => {
    const favs = [
      { user_id: USER_A, event_id: CALAMARO.id },
      { user_id: USER_B, event_id: CALAMARO.id },
    ];
    const existing = [{
      user_id: USER_A,
      type: 'reminder',
      deep_link: '/evento/guadalajara/andres-calamaro',
      read: false,
      created_at: new Date().toISOString(),
    }];
    expect(isDuplicateReminder(existing, USER_A, '/evento/guadalajara/andres-calamaro', TODAY)).toBe(true);
    expect(isDuplicateReminder(existing, USER_B, '/evento/guadalajara/andres-calamaro', TODAY)).toBe(false);
    const plan = buildReminderPlan({ events: [CALAMARO], favorites: favs, existingNotifs: existing, todayISO: TODAY });
    expect(plan).toHaveLength(1);
    expect(plan[0].userId).toBe(USER_B);
    expect(countReminderPairs([CALAMARO], favs, TODAY) - plan.length).toBe(1);
  });
  it('un aviso ya leído no bloquea un reenvío manual', () => {
    const existing = [{
      user_id: USER_A,
      type: 'reminder',
      deep_link: '/evento/guadalajara/andres-calamaro',
      read: true,
      created_at: new Date().toISOString(),
    }];
    expect(isDuplicateReminder(existing, USER_A, '/evento/guadalajara/andres-calamaro', TODAY)).toBe(false);
  });
});

// ── Modo recordatorios en api/send-notification.js (con fetch simulado) ───

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

let handler;
let sendCalls;
let mockEvents;
let mockFavs;
let mockNotifs;
let authUser;

const req = ({ method = 'GET', auth = false, jwt = false, dry = false, reminders = false, remindersQuery = false, body = {} } = {}) => ({
  method,
  query: { ...(dry ? { dry: '1' } : {}), ...(remindersQuery ? { recordatorios: '1' } : {}) },
  headers: auth ? { authorization: 'Bearer test-cron-secret' } : jwt ? { authorization: 'Bearer test-jwt' } : {},
  body: { ...body, ...(reminders ? { recordatorios: true } : {}) },
});

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('CRON_SECRET', 'test-cron-secret');
  vi.stubEnv('ADMIN_SECRET', 'test-admin-secret');
  vi.stubEnv('ADMIN_EMAILS', 'admin@cityguide.com');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://dpkjxhjkzdlkvyotoeai.supabase.co');
  mockEvents = [CALAMARO];
  mockFavs = [{ user_id: USER_A, event_id: CALAMARO.id }];
  mockNotifs = [];
  authUser = ADMIN_USER;
  sendCalls = [];
  vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
    const u = String(url);
    if (u.includes('/auth/v1/user')) {
      return authUser ? { ok: true, json: async () => authUser } : { ok: false, json: async () => ({}) };
    }
    if (u.includes('/api/send-notification')) {
      sendCalls.push({ url: u, body: JSON.parse(opts?.body || '{}') });
      return { ok: true, json: async () => ({ successCount: 1 }) };
    }
    if (u.includes('/rest/v1/events')) return { ok: true, json: async () => mockEvents };
    if (u.includes('/rest/v1/event_favorites')) return { ok: true, json: async () => mockFavs };
    if (u.includes('/rest/v1/notifications')) return { ok: true, json: async () => mockNotifs };
    if (u.includes('/rest/v1/push_tokens')) return { ok: true, json: async () => [] };
    throw new Error(`unexpected fetch ${url}`);
  }));
  handler = (await import('../../api/send-notification.js')).default;
});

describe('recordatorios: modo recordatorios en api/send-notification.js', () => {
  it('sin secreto del cron ni JWT de admin devuelve 401', async () => {
    const res = makeRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(401);
  });
  it('dry run: calcula el plan de Calamaro sin mandar nada', async () => {
    const res = makeRes();
    await handler(req({ auth: true, dry: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.dry).toBe(true);
    expect(res.body.events).toBe(1);
    expect(res.body.reminders).toBe(1);
    expect(res.body.plan[0].body).toBe('Hoy a las 9:00 p. m. en el Teatro Diana. ¡Ya casi!');
    expect(res.body.plan[0].deepLink).toBe('/evento/guadalajara/andres-calamaro');
    expect(sendCalls).toHaveLength(0);
  });
  it('ejecución real: manda el aviso por send-notification con type reminder', async () => {
    const res = makeRes();
    await handler(req({ method: 'POST', auth: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.sent).toHaveLength(1);
    expect(res.body.sent[0].userId).toBe(USER_A);
    expect(sendCalls).toHaveLength(1);
    expect(sendCalls[0].body).toMatchObject({
      title: 'Andrés Calamaro',
      body: 'Hoy a las 9:00 p. m. en el Teatro Diana. ¡Ya casi!',
      type: 'reminder',
      user_id: USER_A,
      deepLink: '/evento/guadalajara/andres-calamaro',
      secret: 'test-admin-secret',
    });
  });
  it('ejecución real: el POST interno incluye imageUrl con el póster del evento', async () => {
    mockEvents = [{ ...CALAMARO, img_url: 'https://cdn.example.com/poster.jpg' }];
    const res = makeRes();
    await handler(req({ method: 'POST', auth: true }), res);
    expect(res.statusCode).toBe(200);
    expect(sendCalls).toHaveLength(1);
    expect(sendCalls[0].body.imageUrl).toBe('https://cdn.example.com/poster.jpg');
  });
  it('ejecución real: sin imagen del evento el POST no lleva imageUrl', async () => {
    const res = makeRes();
    await handler(req({ method: 'POST', auth: true }), res);
    expect(res.statusCode).toBe(200);
    expect(sendCalls).toHaveLength(1);
    expect(sendCalls[0].body).not.toHaveProperty('imageUrl');
  });
  it('dry run: el plan muestra la imagen del evento', async () => {
    mockEvents = [{ ...CALAMARO, img_url: 'https://cdn.example.com/poster.jpg' }];
    const res = makeRes();
    await handler(req({ auth: true, dry: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.plan[0].imageUrl).toBe('https://cdn.example.com/poster.jpg');
  });
  it('con el aviso de hoy ya enviado, no vuelve a mandar', async () => {
    mockNotifs = [{
      user_id: USER_A,
      type: 'reminder',
      deep_link: '/evento/guadalajara/andres-calamaro',
      read: false,
      created_at: new Date().toISOString(),
    }];
    const res = makeRes();
    await handler(req({ method: 'POST', auth: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.reminders).toBe(0);
    expect(res.body.skipped).toBe(1);
    expect(sendCalls).toHaveLength(0);
  });
  it('sin eventos hoy no manda nada', async () => {
    mockEvents = [];
    const res = makeRes();
    await handler(req({ auth: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.events).toBe(0);
    expect(res.body.reminders).toBe(0);
    expect(sendCalls).toHaveLength(0);
  });
  it('un JWT de administrador también autoriza el disparo manual (con bandera)', async () => {
    const res = makeRes();
    await handler(req({ method: 'POST', jwt: true, dry: true, reminders: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.reminders).toBe(1);
  });
  it('el cron real llama con GET y solo el secreto: entra en modo recordatorios', async () => {
    const res = makeRes();
    await handler(req({ method: 'GET', auth: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.sent).toHaveLength(1);
    expect(sendCalls).toHaveLength(1);
  });
  it('disparo manual con ADMIN_SECRET + bandera (sin secreto del cron)', async () => {
    const res = makeRes();
    await handler(req({ method: 'POST', dry: true, body: { secret: 'test-admin-secret', recordatorios: true } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.dry).toBe(true);
    expect(res.body.reminders).toBe(1);
  });
  it('disparo manual con JWT de admin + bandera en query', async () => {
    const res = makeRes();
    await handler(req({ method: 'POST', jwt: true, dry: true, remindersQuery: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.reminders).toBe(1);
  });
  it('sin bandera, el JWT de admin NO entra en modo recordatorios', async () => {
    const res = makeRes();
    await handler(req({ method: 'POST', jwt: true }), res);
    expect(res.statusCode).toBe(400);
    expect(sendCalls).toHaveLength(0);
  });
  it('GET sin autenticación devuelve 401 (la autenticación va antes que el método)', async () => {
    const res = makeRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(401);
  });
  it('GET con JWT de admin pero sin bandera devuelve 405 (el envío normal es POST)', async () => {
    const res = makeRes();
    await handler(req({ method: 'GET', jwt: true }), res);
    expect(res.statusCode).toBe(405);
  });
  it('el envío normal sigue igual sin la bandera', async () => {
    const res = makeRes();
    await handler(req({ method: 'POST', body: { secret: 'test-admin-secret', title: 'Hola', body: 'Mundo' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.successCount).toBe(0);
    expect(res.body.message).toContain('No hay tokens registrados');
    expect(mocks.send).not.toHaveBeenCalled();
  });
});

// ── Cableado en la app y en el repo (fuente) ────────────────────────────────

describe('recordatorios: cableado (fuente)', () => {
  it('App.jsx sincroniza los guardados con event_favorites y hace backfill al entrar', () => {
    const src = fs.readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');
    expect(src).toContain("sb.upsert('event_favorites'");
    expect(src).toContain("sb.delWhere2('event_favorites'");
    expect(src).toContain("sb.get('event_favorites'");
    expect(src).toContain('await loadSavedEvents(u.id);');
    expect(src).toContain('await loadSavedEvents(uid);');
  });
  it('vercel.json tiene el cron diario de recordatorios en send-notification a las 15:00 UTC', () => {
    const raw = fs.readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8');
    const json = JSON.parse(raw);
    expect(json.crons).toContainEqual({ path: '/api/send-notification', schedule: '0 15 * * *' });
  });
  it('el despliegue queda en 11 funciones serverless (Hobby): sin api/recordatorios-eventos.js ni api/ai-night.js', () => {
    const apiDir = new URL('../../api', import.meta.url);
    const files = fs.readdirSync(apiDir).filter((f) => f.endsWith('.js'));
    expect(fs.existsSync(new URL('../../api/recordatorios-eventos.js', import.meta.url))).toBe(false);
    expect(fs.existsSync(new URL('../../api/ai-night.js', import.meta.url))).toBe(false);
    const edge = files.filter((f) => /runtime:\s*['"]edge['"]/.test(fs.readFileSync(new URL(`../../api/${f}`, import.meta.url), 'utf8')));
    expect(edge).toHaveLength(3);
    expect(files.length - edge.length).toBe(11);
  });
  it('la migración crea event_favorites con RLS propia y cierra push_tokens', () => {
    const sql = fs.readFileSync(new URL('../../supabase/migrations/20261112012000_add_event_favorites.sql', import.meta.url), 'utf8');
    expect(sql).toContain('create table if not exists public.event_favorites');
    expect(sql).toContain('primary key (user_id, event_id)');
    expect(sql).toContain('auth.uid() = user_id');
    expect(sql).toContain('push_tokens');
  });
});
