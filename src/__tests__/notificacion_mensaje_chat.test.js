import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
// send-notification.js importa firebase-admin: se simula como en push_delivery.
const mocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('firebase-admin/app', () => ({ getApps: () => [{}], initializeApp: vi.fn(), cert: vi.fn() }));
vi.mock('firebase-admin/messaging', () => ({ getMessaging: () => ({ sendEachForMulticast: mocks.send }) }));
import {
  buildChatMessage,
  chatRecipients,
  CHAT_MESSAGE_DEDUP_MINUTES,
  CHAT_MESSAGE_PREVIEW_MAX,
  isDuplicateChatNotification,
  notifyChatMessage,
  truncateChatPreview,
} from '../lib/chatNotifications.js';

const POSADA = {
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Posada 2026',
  slug: 'zapopan-posada-2026-x7k9',
  city_slug: 'zapopan',
  user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  img_url: 'https://cdn.example.com/posada.jpg',
};
const HOST_ID = POSADA.user_id;
const SENDER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const OTHER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const MESSAGE_ID = '22222222-2222-4222-8222-222222222222';
const MESSAGE = {
  id: MESSAGE_ID,
  guest_name: 'Darío',
  user_id: SENDER_ID,
  body: 'Si iré que llevo !',
  created_at: new Date().toISOString(),
};
const DEEP_LINK = '/evento/zapopan/posada-2026-x7k9';
const ABSOLUTE_LINK = `https://citymap.mx${DEEP_LINK}`;

describe('aviso chat: adelanto del mensaje', () => {
  it('recorta a 120 caracteres con … y colapsa saltos y espacios', () => {
    expect(CHAT_MESSAGE_PREVIEW_MAX).toBe(120);
    expect(truncateChatPreview('Hola')).toBe('Hola');
    expect(truncateChatPreview('  Hola\nmundo  \n\n ¿qué tal? ')).toBe('Hola mundo ¿qué tal?');
    const long = 'x'.repeat(200);
    expect(truncateChatPreview(long)).toBe(`${'x'.repeat(120)}…`);
    expect(truncateChatPreview('')).toBe('');
    expect(truncateChatPreview(null)).toBe('');
  });
});

describe('aviso chat: payload del aviso', () => {
  it('lleva nombre, título del evento y adelanto, con enlace al evento', () => {
    expect(buildChatMessage({ authorName: 'Darío', eventTitle: 'Posada 2026', messageBody: 'Si iré que llevo !', event: POSADA })).toEqual({
      title: 'Darío en Posada 2026',
      body: 'Si iré que llevo !',
      deepLink: DEEP_LINK,
      imageUrl: 'https://cdn.example.com/posada.jpg',
    });
  });
  it('un mensaje largo se recorta en el cuerpo', () => {
    const msg = buildChatMessage({ authorName: 'Darío', eventTitle: 'Posada 2026', messageBody: 'a'.repeat(200), event: POSADA });
    expect(msg.body).toBe(`${'a'.repeat(120)}…`);
    expect(msg.title).toBe('Darío en Posada 2026');
  });
  it('sin imagen del evento no lleva imageUrl (el aviso se manda igual)', () => {
    const msg = buildChatMessage({ authorName: 'Darío', eventTitle: 'Posada 2026', messageBody: 'Hola', event: { ...POSADA, img_url: null, img: null } });
    expect(msg).not.toHaveProperty('imageUrl');
  });
  it('sin autor, título, cuerpo o evento no hay aviso', () => {
    expect(buildChatMessage({ authorName: '', eventTitle: 'Posada 2026', messageBody: 'Hola', event: POSADA })).toBeNull();
    expect(buildChatMessage({ authorName: 'Darío', eventTitle: '', messageBody: 'Hola', event: POSADA })).toBeNull();
    expect(buildChatMessage({ authorName: 'Darío', eventTitle: 'Posada 2026', messageBody: '   ', event: POSADA })).toBeNull();
    expect(buildChatMessage({ authorName: 'Darío', eventTitle: 'Posada 2026', messageBody: 'Hola', event: null })).toBeNull();
  });
});

describe('aviso chat: destinatarios', () => {
  it('anfitrión + autores del chat, sin repetidos y sin el remitente', () => {
    expect(chatRecipients({ hostId: HOST_ID, messageUserIds: [SENDER_ID, OTHER_ID, OTHER_ID, null], senderId: SENDER_ID }).sort())
      .toEqual([HOST_ID, OTHER_ID].sort());
  });
  it('si el remitente es el anfitrión, solo van los demás autores', () => {
    expect(chatRecipients({ hostId: SENDER_ID, messageUserIds: [SENDER_ID, OTHER_ID], senderId: SENDER_ID })).toEqual([OTHER_ID]);
  });
  it('sin anfitrión ni autores no hay a quién avisar', () => {
    expect(chatRecipients({ hostId: null, messageUserIds: [SENDER_ID], senderId: SENDER_ID })).toEqual([]);
    expect(chatRecipients({ hostId: null, messageUserIds: [], senderId: SENDER_ID })).toEqual([]);
  });
});

describe('aviso chat: anti-duplicados', () => {
  const recent = [{
    user_id: HOST_ID, type: 'chat', deep_link: ABSOLUTE_LINK, body: 'Si iré que llevo !', created_at: new Date().toISOString(),
  }];
  it('el mismo aviso en los últimos 5 minutos ya se mandó', () => {
    const since = new Date(Date.now() - CHAT_MESSAGE_DEDUP_MINUTES * 60000).toISOString();
    expect(isDuplicateChatNotification(recent, HOST_ID, ABSOLUTE_LINK, 'Si iré que llevo !', since)).toBe(true);
    expect(isDuplicateChatNotification(recent, OTHER_ID, ABSOLUTE_LINK, 'Si iré que llevo !', since)).toBe(false);
  });
  it('otro cuerpo, otro enlace u otro tipo no es duplicado', () => {
    const since = new Date(Date.now() - CHAT_MESSAGE_DEDUP_MINUTES * 60000).toISOString();
    expect(isDuplicateChatNotification(recent, HOST_ID, ABSOLUTE_LINK, 'Otro mensaje', since)).toBe(false);
    expect(isDuplicateChatNotification(recent, HOST_ID, '/evento/zapopan/otra', 'Si iré que llevo !', since)).toBe(false);
    expect(isDuplicateChatNotification([{ ...recent[0], type: 'reminder' }], HOST_ID, ABSOLUTE_LINK, 'Si iré que llevo !', since)).toBe(false);
  });
  it('un aviso viejo (fuera de la ventana) no bloquea el reenvío', () => {
    const old = [{ ...recent[0], created_at: new Date(Date.now() - 10 * 60000).toISOString() }];
    const since = new Date(Date.now() - CHAT_MESSAGE_DEDUP_MINUTES * 60000).toISOString();
    expect(isDuplicateChatNotification(old, HOST_ID, ABSOLUTE_LINK, 'Si iré que llevo !', since)).toBe(false);
  });
});

describe('aviso chat: disparo desde el cliente', () => {
  it('manda chatMensaje con eventId y messageId y el JWT del remitente', async () => {
    const calls = [];
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      calls.push({ url: String(url), body: JSON.parse(opts?.body || '{}'), auth: opts?.headers?.Authorization });
      return { ok: true };
    }));
    await expect(notifyChatMessage({ eventId: POSADA.id, messageId: MESSAGE_ID, token: 'jwt-del-remitente' })).resolves.toBe(true);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('https://citymap.mx/api/send-notification');
    expect(calls[0].body).toEqual({ chatMensaje: true, eventId: POSADA.id, messageId: MESSAGE_ID });
    expect(calls[0].auth).toBe('Bearer jwt-del-remitente');
    vi.unstubAllGlobals();
  });
  it('sin token no dispara nada y nunca lanza', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    await expect(notifyChatMessage({ eventId: POSADA.id, messageId: MESSAGE_ID, token: null })).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
  it('si el fetch falla devuelve false sin lanzar', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('red caída'); }));
    await expect(notifyChatMessage({ eventId: POSADA.id, messageId: MESSAGE_ID, token: 'jwt' })).resolves.toBe(false);
    vi.unstubAllGlobals();
  });
});

// ── Modo aviso de chat en api/send-notification.js (con fetch simulado) ───

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
const SENDER_USER = { id: SENDER_ID, email: 'dario@example.com', email_confirmed_at: '2025-01-01T00:00:00Z', app_metadata: {} };

let handler;
let sendCalls;
let mockEvents;
let mockMessage;
let mockChatRows;
let mockDupNotifs;
let authUser;

const req = ({ jwt = false, body = {} } = {}) => ({
  method: 'POST',
  query: {},
  headers: jwt ? { authorization: 'Bearer test-jwt' } : {},
  body: { chatMensaje: true, eventId: POSADA.id, messageId: MESSAGE_ID, ...body },
});

beforeEach(async () => {
  vi.resetModules();
  vi.stubEnv('CRON_SECRET', 'test-cron-secret');
  vi.stubEnv('ADMIN_SECRET', 'test-admin-secret');
  vi.stubEnv('ADMIN_EMAILS', 'admin@cityguide.com');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://dpkjxhjkzdlkvyotoeai.supabase.co');
  mockEvents = [POSADA];
  mockMessage = [MESSAGE];
  mockChatRows = [{ user_id: SENDER_ID }, { user_id: OTHER_ID }, { user_id: null }];
  mockDupNotifs = [];
  authUser = SENDER_USER;
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
    // OJO: 'event_id=eq.' contiene 'id=eq.' como subcadena; la consulta de
    // autores del chat se distingue por select=user_id.
    if (u.includes('/rest/v1/event_messages') && u.includes('select=user_id')) return { ok: true, json: async () => mockChatRows };
    if (u.includes('/rest/v1/event_messages')) return { ok: true, json: async () => mockMessage };
    if (u.includes('/rest/v1/notifications')) return { ok: true, json: async () => mockDupNotifs };
    if (u.includes('/rest/v1/push_tokens')) return { ok: true, json: async () => [] };
    throw new Error(`unexpected fetch ${url}`);
  }));
  handler = (await import('../../api/send-notification.js')).default;
});

describe('aviso chat: modo aviso de chat en api/send-notification.js', () => {
  it('sin JWT devuelve 401 (un invitado sin sesión no puede disparar avisos)', async () => {
    const res = makeRes();
    await handler(req(), res);
    expect(res.statusCode).toBe(401);
    expect(sendCalls).toHaveLength(0);
  });
  it('avisa al anfitrión y a los demás autores, no al remitente', async () => {
    const res = makeRes();
    await handler(req({ jwt: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.sent.map((s) => s.userId).sort()).toEqual([HOST_ID, OTHER_ID].sort());
    expect(res.body.failed).toHaveLength(0);
    expect(res.body.skipped).toBe(0);
    expect(sendCalls).toHaveLength(2);
    for (const call of sendCalls) {
      expect(call.body).toMatchObject({
        title: 'Darío en Posada 2026',
        body: 'Si iré que llevo !',
        type: 'chat',
        deepLink: DEEP_LINK,
        imageUrl: 'https://cdn.example.com/posada.jpg',
        secret: 'test-admin-secret',
      });
    }
  });
  it('si el remitente es el anfitrión, solo van los demás autores', async () => {
    mockEvents = [{ ...POSADA, user_id: SENDER_ID }];
    mockMessage = [{ ...MESSAGE, guest_name: 'Jonathan Arana' }];
    mockChatRows = [{ user_id: SENDER_ID }, { user_id: OTHER_ID }];
    const res = makeRes();
    await handler(req({ jwt: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.sent.map((s) => s.userId)).toEqual([OTHER_ID]);
    expect(sendCalls).toHaveLength(1);
    expect(sendCalls[0].body.title).toBe('Jonathan Arana en Posada 2026');
  });
  it('sin otros participantes no manda nada', async () => {
    mockEvents = [{ ...POSADA, user_id: SENDER_ID }];
    mockChatRows = [{ user_id: SENDER_ID }];
    const res = makeRes();
    await handler(req({ jwt: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.sent).toHaveLength(0);
    expect(res.body.skipped).toBe(0);
    expect(sendCalls).toHaveLength(0);
  });
  it('un usuario que no escribió ese mensaje no puede disparar avisos (403)', async () => {
    mockMessage = [];
    const res = makeRes();
    await handler(req({ jwt: true }), res);
    expect(res.statusCode).toBe(403);
    expect(sendCalls).toHaveLength(0);
  });
  it('el mismo aviso en los últimos 5 minutos se omite para ese participante', async () => {
    mockDupNotifs = [{
      user_id: HOST_ID, type: 'chat', deep_link: ABSOLUTE_LINK, body: 'Si iré que llevo !', created_at: new Date().toISOString(),
    }];
    const res = makeRes();
    await handler(req({ jwt: true }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body.sent.map((s) => s.userId)).toEqual([OTHER_ID]);
    expect(res.body.skipped).toBe(1);
    expect(sendCalls).toHaveLength(1);
  });
  it('sin eventId o messageId devuelve 400', async () => {
    const res = makeRes();
    await handler(req({ jwt: true, body: { eventId: '', messageId: MESSAGE_ID } }), res);
    expect(res.statusCode).toBe(400);
    expect(sendCalls).toHaveLength(0);
  });
  it('con ids que no son UUID devuelve 400', async () => {
    const res = makeRes();
    await handler(req({ jwt: true, body: { eventId: "'; DROP TABLE events; --", messageId: MESSAGE_ID } }), res);
    expect(res.statusCode).toBe(400);
    expect(sendCalls).toHaveLength(0);
  });
  it('evento inexistente devuelve 404', async () => {
    mockEvents = [];
    const res = makeRes();
    await handler(req({ jwt: true }), res);
    expect(res.statusCode).toBe(404);
    expect(sendCalls).toHaveLength(0);
  });
  it('un JWT inválido no autoriza aunque el mensaje exista', async () => {
    authUser = null;
    const res = makeRes();
    await handler(req({ jwt: true }), res);
    expect(res.statusCode).toBe(401);
    expect(sendCalls).toHaveLength(0);
  });
});

// ── Cableado (fuente) ───────────────────────────────────────────────────────

describe('aviso chat: cableado (fuente)', () => {
  it('PrivateEventChat dispara el aviso tras enviar, solo con sesión', () => {
    const src = fs.readFileSync(new URL('../components/detail/PrivateEventChat.jsx', import.meta.url), 'utf8');
    expect(src).toContain("import { notifyChatMessage } from '../../lib/chatNotifications.js';");
    expect(src).toContain('notifyChatMessage({ eventId: event.id, messageId: row.id, token: sb._token })');
    expect(src).toContain('if (user?.id && sb._token)');
    expect(src).toContain('const rows = await sb.post(\'event_messages\'');
  });
  it('send-notification.js despacha el modo chat antes del 401 de no autorizado', () => {
    const src = fs.readFileSync(new URL('../../api/send-notification.js', import.meta.url), 'utf8');
    expect(src).toContain('reqBody.chatMensaje === true');
    expect(src).toContain('return runChatMessage(req, res, verifiedUserId);');
    // Dentro del handler (no en todo el archivo: runChatMessage, definido
    // antes, también tiene su propio 401), el despacho va antes del 401.
    const handlerSrc = src.slice(src.indexOf('export default async function handler'));
    expect(handlerSrc.indexOf('return runChatMessage(req, res, verifiedUserId);')).toBeLessThan(handlerSrc.indexOf("return res.status(401).json({ error: 'Unauthorized' })"));
  });
  it('sin función nueva: el aviso vive en send-notification.js', () => {
    const apiDir = new URL('../../api', import.meta.url);
    const files = fs.readdirSync(apiDir).filter((f) => f.endsWith('.js'));
    const edge = files.filter((f) => /runtime:\s*['"]edge['"]/.test(fs.readFileSync(new URL(`../../api/${f}`, import.meta.url), 'utf8')));
    expect(files.length - edge.length).toBe(11);
  });
});
