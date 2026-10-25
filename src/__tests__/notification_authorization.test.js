import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  initializeApp: vi.fn(),
  cert: vi.fn(),
}));
vi.mock('firebase-admin/messaging', () => ({ getMessaging: vi.fn() }));

import handler from '../../api/send-notification.js';
import { POST } from '../../web-next/src/app/api/send-notification/route.js';
import { getMessaging } from 'firebase-admin/messaging';

const user = { id: 'user-1', email: 'person@example.test', email_confirmed_at: '2026-10-01T00:00:00Z' };

const endpoints = [
  ['Vercel', async (headers, body) => {
    const res = { statusCode: 200, setHeader: vi.fn(), status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; } };
    await handler({ method: 'POST', headers, body }, res);
    return { status: res.statusCode, body: res.data };
  }],
  ['Next.js', async (headers, body) => {
    const response = await POST(new Request('https://example.test/api/send-notification', {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
    }));
    return { status: response.status, body: await response.json() };
  }],
];

// Omit message fields: authorized requests reach validation (400), never delivery.
describe.each(endpoints)('%s notification authorization', (_name, invoke) => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_SECRET', 'test-server-secret');
    vi.stubEnv('ADMIN_EMAILS', 'admin@example.test');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://auth.example.test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => user }));
    vi.clearAllMocks();
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it.each([undefined, { isAdmin: true }, { isAdmin: 'true', role: 'admin' }])('rejects normal users with editable metadata %j', async metadata => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ...user, user_metadata: metadata }) });
    const result = await invoke({ authorization: 'Bearer test-token' }, {});
    expect(result.status).toBe(401);
    expect(getMessaging).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('https://auth.example.test/auth/v1/user', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) }));
  });

  it('accepts a strict boolean admin flag managed by the server', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ...user, app_metadata: { isAdmin: true } }) });
    expect((await invoke({ authorization: 'Bearer test-token' }, {})).status).toBe(400);
  });

  it('rejects a string instead of a boolean managed flag', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ...user, app_metadata: { isAdmin: 'true' } }) });
    expect((await invoke({ authorization: 'Bearer test-token' }, {})).status).toBe(401);
  });

  it('accepts a verified allowlisted email ignoring case and whitespace', async () => {
    vi.stubEnv('ADMIN_EMAILS', ' , ADMIN@example.test , ');
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ...user, email: 'Admin@example.test' }) });
    expect((await invoke({ authorization: 'Bearer test-token' }, {})).status).toBe(400);
  });

  it('rejects an unverified allowlisted email', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ...user, email: 'admin@example.test', email_confirmed_at: null }) });
    expect((await invoke({ authorization: 'Bearer test-token' }, {})).status).toBe(401);
  });

  it('rejects a failed token verification even with admin metadata', async () => {
    fetch.mockResolvedValue({ ok: false, json: async () => ({ ...user, app_metadata: { isAdmin: true } }) });
    expect((await invoke({ authorization: 'Bearer invalid-token' }, {})).status).toBe(401);
  });

  it('fails closed when the authentication service is unavailable', async () => {
    fetch.mockRejectedValue(new Error('Unavailable'));
    expect((await invoke({ authorization: 'Bearer test-token' }, {})).status).toBe(401);
  });

  it('rejects requests without credentials or with a wrong secret', async () => {
    expect((await invoke({}, {})).status).toBe(401);
    expect((await invoke({}, { secret: 'wrong' })).status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('preserves the existing server secret authentication path', async () => {
    expect((await invoke({}, { secret: 'test-server-secret' })).status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  afterEach(() => { expect(getMessaging).not.toHaveBeenCalled(); });
});
