import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { buildApnsJwt, buildApnsPayload, getApnsConfig, isInvalidApnsToken, sendApnsTokens } from '../lib/apns.js';

function makeKeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
  return { pem: privateKey.export({ type: 'pkcs8', format: 'pem' }), publicKey };
}

function decodePart(part) {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

describe('APNs direct send (iOS tokens)', () => {
  beforeEach(() => {
    vi.stubEnv('APNS_KEY_ID', 'TESTKEYID1');
    vi.stubEnv('APNS_TEAM_ID', 'TESTTEAM01');
  });
  afterEach(() => { vi.unstubAllEnvs(); });

  it('getApnsConfig returns null without the .p8 key vars', () => {
    vi.stubEnv('APNS_KEY', '');
    expect(getApnsConfig()).toBeNull();
    vi.stubEnv('APNS_KEY', '-----BEGIN PRIVATE KEY-----\nabc\n-----END PRIVATE KEY-----');
    expect(getApnsConfig()).not.toBeNull();
  });

  it('getApnsConfig defaults to production host and mx.citymap.app topic', () => {
    const { pem } = makeKeyPair();
    vi.stubEnv('APNS_KEY', pem);
    const config = getApnsConfig();
    expect(config.host).toBe('api.push.apple.com');
    expect(config.topic).toBe('mx.citymap.app');
    expect(config.production).toBe(true);
  });

  it('getApnsConfig uses the sandbox host in sandbox env and unescapes literal newlines', () => {
    const { pem } = makeKeyPair();
    vi.stubEnv('APNS_KEY', pem.replace(/\n/g, '\\n'));
    vi.stubEnv('APNS_ENV', 'sandbox');
    const config = getApnsConfig();
    expect(config.host).toBe('api.sandbox.push.apple.com');
    expect(config.key).toContain('\n');
    expect(config.key).not.toContain('\\n');
  });

  it('buildApnsJwt signs an ES256 token verifiable with the public key', () => {
    const { pem, publicKey } = makeKeyPair();
    const jwt = buildApnsJwt({ key: pem, keyId: 'TESTKEYID1', teamId: 'TESTTEAM01', nowSeconds: 1700000000 });
    const [header, payload, signature] = jwt.split('.');
    expect(decodePart(header)).toEqual({ alg: 'ES256', kid: 'TESTKEYID1', typ: 'JWT' });
    expect(decodePart(payload)).toEqual({ iss: 'TESTTEAM01', iat: 1700000000 });
    const ok = crypto.verify('sha256', Buffer.from(`${header}.${payload}`), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(signature, 'base64url'));
    expect(ok).toBe(true);
  });

  it('buildApnsPayload carries the alert and the deep link outside aps', () => {
    const payload = buildApnsPayload({ title: 'T', body: 'B', deepLink: 'https://citymap.mx/evento/x' });
    expect(payload).toEqual({ aps: { alert: { title: 'T', body: 'B' }, sound: 'default' }, deepLink: 'https://citymap.mx/evento/x' });
    expect(buildApnsPayload({ title: 'T', body: 'B' })).not.toHaveProperty('deepLink');
  });

  it('isInvalidApnsToken only treats 410 and BadDeviceToken/Unregistered as invalid', () => {
    expect(isInvalidApnsToken({ status: 410, reason: 'Unregistered' })).toBe(true);
    expect(isInvalidApnsToken({ status: 400, reason: 'BadDeviceToken' })).toBe(true);
    expect(isInvalidApnsToken({ status: 400, reason: 'Unregistered' })).toBe(true);
    expect(isInvalidApnsToken({ status: 400, reason: 'BadPayload' })).toBe(false);
    expect(isInvalidApnsToken({ status: 429, reason: 'TooManyRequests' })).toBe(false);
    expect(isInvalidApnsToken({ status: 500, reason: 'InternalServerError' })).toBe(false);
    expect(isInvalidApnsToken({ status: 200, reason: '' })).toBe(false);
  });

  it('sendApnsTokens counts successes and passes host, topic, jwt and payload', async () => {
    const { pem } = makeKeyPair();
    const config = { key: pem, keyId: 'TESTKEYID1', teamId: 'TESTTEAM01', topic: 'mx.citymap.app', host: 'api.push.apple.com' };
    const seen = [];
    const requestFn = vi.fn(async (args) => { seen.push(args); return { status: 200, reason: '' }; });
    const result = await sendApnsTokens({ tokens: ['ios-a', 'ios-b'], title: 'T', body: 'B', deepLink: 'https://citymap.mx/x', config, requestFn });
    expect(result).toEqual({ successCount: 2, failureCount: 0, invalidTokens: [] });
    expect(seen).toHaveLength(2);
    expect(seen[0].host).toBe('api.push.apple.com');
    expect(seen[0].topic).toBe('mx.citymap.app');
    expect(typeof seen[0].jwt).toBe('string');
    expect(seen[0].jwt.split('.')).toHaveLength(3);
    expect(seen[0].payload.aps.alert).toEqual({ title: 'T', body: 'B' });
    expect(seen.map((s) => s.token).sort()).toEqual(['ios-a', 'ios-b']);
  });

  it('sendApnsTokens marks 410 and BadDeviceToken as invalid, other failures not', async () => {
    const { pem } = makeKeyPair();
    const config = { key: pem, keyId: 'TESTKEYID1', teamId: 'TESTTEAM01', topic: 'mx.citymap.app', host: 'api.push.apple.com' };
    const requestFn = vi.fn(async ({ token }) => {
      if (token === 'gone') return { status: 410, reason: 'Unregistered' };
      if (token === 'bad') return { status: 400, reason: 'BadDeviceToken' };
      return { status: 500, reason: 'InternalServerError' };
    });
    const result = await sendApnsTokens({ tokens: ['gone', 'bad', 'flaky'], title: 'T', body: 'B', config, requestFn });
    expect(result.successCount).toBe(0);
    expect(result.failureCount).toBe(3);
    expect(result.invalidTokens.sort()).toEqual(['bad', 'gone']);
  });

  it('sendApnsTokens counts a thrown request as a failure, not an invalid token', async () => {
    const { pem } = makeKeyPair();
    const config = { key: pem, keyId: 'TESTKEYID1', teamId: 'TESTTEAM01', topic: 'mx.citymap.app', host: 'api.push.apple.com' };
    const result = await sendApnsTokens({ tokens: ['ios-a'], title: 'T', body: 'B', config, requestFn: async () => { throw new Error('network down'); } });
    expect(result).toEqual({ successCount: 0, failureCount: 1, invalidTokens: [] });
  });
});
