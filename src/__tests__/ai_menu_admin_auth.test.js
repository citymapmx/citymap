import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import handler from '../../api/ai-menu.js';
import { POST } from '../../web-next/src/app/api/ai-menu/route.js';

const ADMIN_USER = { id: 'admin-1', email: 'admin@cityguide.com', email_confirmed_at: '2025-01-01T00:00:00Z', app_metadata: { isAdmin: true } };
const ALLOWLISTED_USER = { id: 'admin-2', email: 'admin@example.test', email_confirmed_at: '2025-01-01T00:00:00Z', app_metadata: {} };
const NORMAL_USER = { id: 'user-1', email: 'person@example.test', email_confirmed_at: '2025-01-01T00:00:00Z', app_metadata: {} };

let webhookCalls;
let webhookResponse;

const endpoints = [
  ['Vercel', async (headers, body) => {
    const res = { statusCode: 200, setHeader: vi.fn(), status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; } };
    await handler({ method: 'POST', headers, body }, res);
    return { status: res.statusCode, body: res.data };
  }],
  ['Next.js', async (headers, body) => {
    const response = await POST(new Request('https://example.test/api/ai-menu', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
    }));
    return { status: response.status, body: await response.json() };
  }],
];

describe.each(endpoints)('%s ai-menu authorization', (_name, invoke) => {
  beforeEach(() => {
    vi.stubEnv('GEMINI_API_KEY', 'test-gemini-key');
    vi.stubEnv('ADMIN_SECRET', 'test-server-secret');
    vi.stubEnv('ADMIN_EMAILS', 'admin@example.test');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://auth.example.test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
    vi.stubEnv('MAKE_WEBHOOK_URL', 'https://make.test/webhook');
    vi.stubEnv('MAKE_WEBHOOK_SECRET', 'test-make-secret');
    webhookCalls = [];
    webhookResponse = { ok: true, json: async () => ({ description: 'Tour guiado por el centro.' }) };
    vi.stubGlobal('fetch', vi.fn(async (url, opts) => {
      const u = String(url);
      if (u.includes('/auth/v1/user')) {
        const token = opts?.headers?.Authorization;
        if (token === 'Bearer admin-jwt') return { ok: true, json: async () => ADMIN_USER };
        if (token === 'Bearer allowlisted-jwt') return { ok: true, json: async () => ALLOWLISTED_USER };
        if (token === 'Bearer user-jwt') return { ok: true, json: async () => NORMAL_USER };
        return { ok: false, json: async () => ({}) };
      }
      if (u === 'https://make.test/webhook') {
        webhookCalls.push({ body: JSON.parse(opts?.body || '{}'), auth: opts?.headers?.Authorization });
        return webhookResponse;
      }
      throw new Error(`unexpected fetch ${url}`);
    }));
    vi.clearAllMocks();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('rejects requests without credentials', async () => {
    expect((await invoke({}, {})).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('rejects the old admin secret as a Bearer token', async () => {
    // El secreto compartido vivía en el bundle del cliente; ni siquiera el
    // valor correcto autoriza ya: se verifica contra Auth y no es un JWT.
    expect((await invoke({ authorization: 'Bearer test-server-secret' }, {})).status).toBe(401);
  });

  it('rejects a normal user JWT with 403', async () => {
    expect((await invoke({ authorization: 'Bearer user-jwt' }, {})).status).toBe(403);
  });

  it('accepts an admin JWT (it reaches validation, 400 without an image)', async () => {
    expect((await invoke({ authorization: 'Bearer admin-jwt' }, {})).status).toBe(400);
  });

  it('accepts a verified allowlisted email as admin', async () => {
    expect((await invoke({ authorization: 'Bearer allowlisted-jwt' }, {})).status).toBe(400);
  });

  it('generar-descripcion: proxies the Make webhook from the server', async () => {
    const result = await invoke(
      { authorization: 'Bearer admin-jwt' },
      { action: 'generar-descripcion', title: 'Tour centro', planType: 'experiencia' },
    );
    expect(result.status).toBe(200);
    expect(result.body.description).toBe('Tour guiado por el centro.');
    expect(webhookCalls).toHaveLength(1);
    expect(webhookCalls[0].body).toEqual({ title: 'Tour centro', planType: 'experiencia' });
    expect(webhookCalls[0].auth).toBe('Bearer test-make-secret');
  });

  it('generar-descripcion: rejects a non-admin JWT', async () => {
    const result = await invoke(
      { authorization: 'Bearer user-jwt' },
      { action: 'generar-descripcion', title: 'Tour centro' },
    );
    expect(result.status).toBe(403);
    expect(webhookCalls).toHaveLength(0);
  });

  it('generar-descripcion: returns 502 when the webhook fails', async () => {
    webhookResponse = { ok: false, status: 500, json: async () => ({}) };
    const result = await invoke(
      { authorization: 'Bearer admin-jwt' },
      { action: 'generar-descripcion', title: 'Tour centro' },
    );
    expect(result.status).toBe(502);
  });

  it('generar-descripcion: fails closed without MAKE_WEBHOOK_URL', async () => {
    vi.stubEnv('MAKE_WEBHOOK_URL', '');
    const result = await invoke(
      { authorization: 'Bearer admin-jwt' },
      { action: 'generar-descripcion', title: 'Tour centro' },
    );
    expect(result.status).toBe(500);
    expect(webhookCalls).toHaveLength(0);
  });
});
