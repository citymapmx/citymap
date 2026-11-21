import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ send: vi.fn(), sendApns: vi.fn(), apnsConfig: null }));
vi.mock('firebase-admin/app', () => ({ getApps: () => [{}], initializeApp: vi.fn(), cert: vi.fn() }));
vi.mock('firebase-admin/messaging', () => ({ getMessaging: () => ({ sendEachForMulticast: mocks.send }) }));
vi.mock('../lib/apns.js', () => ({
  getApnsConfig: () => mocks.apnsConfig,
  sendApnsTokens: (...args) => mocks.sendApns(...args),
}));
import handler from '../../api/send-notification.js';

async function invoke(body) {
  const res = { statusCode: 200, setHeader: vi.fn(), status(code) { this.statusCode = code; return this; }, json(data) { this.data = data; return this; } };
  await handler({ method: 'POST', headers: { authorization: 'Bearer test-cron-secret' }, body: { title: 'Prueba', body: 'Mensaje', ...body } }, res);
  return res;
}

beforeEach(() => {
  vi.stubEnv('CRON_SECRET', 'test-cron-secret');
  vi.stubEnv('VITE_SUPABASE_URL', 'https://db.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server');
  vi.stubGlobal('fetch', vi.fn());
  mocks.send.mockReset();
  mocks.sendApns.mockReset();
  mocks.apnsConfig = { host: 'api.push.apple.com', topic: 'mx.citymap.app', key: 'k', keyId: 'kid', teamId: 'team' };
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('iOS tokens go to APNs, never to FCM', () => {
  it('splits tokens by platform: ios to APNs, android/web/no-platform to FCM', async () => {
    const rows = [
      { token: 'ios-1', user_id: 'u1', platform: 'ios' },
      { token: 'and-1', user_id: 'u1', platform: 'android' },
      { token: 'web-1', user_id: 'u2', platform: 'web' },
      { token: 'old-1', user_id: 'u2', platform: null },
    ];
    fetch.mockResolvedValue({ ok: true, json: async () => rows });
    mocks.send.mockResolvedValue({ successCount: 3, failureCount: 0, responses: [{ success: true }, { success: true }, { success: true }] });
    mocks.sendApns.mockResolvedValue({ successCount: 1, failureCount: 0, invalidTokens: [] });
    const result = await invoke({});
    expect(result.statusCode).toBe(200);
    expect(fetch.mock.calls[0][0]).toContain('select=token,user_id,platform');
    expect(mocks.send.mock.calls).toHaveLength(1);
    expect(mocks.send.mock.calls[0][0].tokens).toEqual(['and-1', 'web-1', 'old-1']);
    expect(mocks.sendApns.mock.calls).toHaveLength(1);
    expect(mocks.sendApns.mock.calls[0][0].tokens).toEqual(['ios-1']);
    expect(result.data.successCount).toBe(4);
    expect(result.data.apnsSuccessCount).toBe(1);
    expect(result.data.apnsSkipped).toBe(0);
  });

  it('never deletes an iOS token because of an FCM rejection', async () => {
    const rows = [
      { token: 'ios-1', user_id: 'u1', platform: 'ios' },
      { token: 'and-1', user_id: 'u1', platform: 'android' },
    ];
    fetch.mockResolvedValue({ ok: true, json: async () => rows });
    mocks.send.mockResolvedValue({ successCount: 0, failureCount: 1, responses: [{ success: false, error: { code: 'messaging/invalid-registration-token' } }] });
    mocks.sendApns.mockResolvedValue({ successCount: 1, failureCount: 0, invalidTokens: [] });
    const result = await invoke({});
    expect(result.data.invalidTokensCleaned).toBe(1);
    const deleteCall = fetch.mock.calls.find((c) => c[1]?.method === 'DELETE');
    expect(deleteCall).toBeDefined();
    expect(decodeURIComponent(deleteCall[0])).toContain('"and-1"');
    expect(decodeURIComponent(deleteCall[0])).not.toContain('ios-1');
  });

  it('skips iOS tokens when APNs is not configured and keeps them', async () => {
    mocks.apnsConfig = null;
    const rows = [
      { token: 'ios-1', user_id: 'u1', platform: 'ios' },
      { token: 'and-1', user_id: 'u1', platform: 'android' },
    ];
    fetch.mockResolvedValue({ ok: true, json: async () => rows });
    mocks.send.mockResolvedValue({ successCount: 1, failureCount: 0, responses: [{ success: true }] });
    const result = await invoke({});
    expect(result.statusCode).toBe(200);
    expect(result.data.successCount).toBe(1);
    expect(result.data.apnsSkipped).toBe(1);
    expect(result.data.apnsSuccessCount).toBe(0);
    expect(mocks.sendApns).not.toHaveBeenCalled();
    expect(fetch.mock.calls.some((c) => c[1]?.method === 'DELETE')).toBe(false);
  });

  it('deletes iOS tokens rejected by APNs as unregistered', async () => {
    const rows = [
      { token: 'ios-1', user_id: 'u1', platform: 'ios' },
      { token: 'and-1', user_id: 'u1', platform: 'android' },
    ];
    fetch.mockResolvedValue({ ok: true, json: async () => rows });
    mocks.send.mockResolvedValue({ successCount: 1, failureCount: 0, responses: [{ success: true }] });
    mocks.sendApns.mockResolvedValue({ successCount: 0, failureCount: 1, invalidTokens: ['ios-1'] });
    const result = await invoke({});
    expect(result.data.invalidTokensCleaned).toBe(1);
    const deleteCall = fetch.mock.calls.find((c) => c[1]?.method === 'DELETE');
    expect(deleteCall).toBeDefined();
    expect(decodeURIComponent(deleteCall[0])).toContain('"ios-1"');
  });
});
