/* global process */
import http2 from 'node:http2';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';

// Envío directo a APNs para los tokens iOS.
//
// Los tokens que devuelve el plugin de Capacitor en iOS son APNs crudos
// (hex de 64), no tokens FCM: FCM los rechaza con
// messaging/invalid-registration-token y la limpieza de send-notification
// los borraba de push_tokens en el primer intento. Por eso los tokens con
// platform 'ios' se mandan por aquí y NUNCA pasan por FCM.
//
// La llave .p8 NO está en el repo: se lee de variables de entorno de
// Vercel (APNS_KEY con el contenido .p8, APNS_KEY_ID, APNS_TEAM_ID).
// Sin ellas el envío iOS se salta con un aviso en el log y los tokens se
// conservan; nunca se borra un token iOS por falta de configuración.

const APNS_PRODUCTION_HOST = 'api.push.apple.com';
const APNS_SANDBOX_HOST = 'api.sandbox.push.apple.com';
const DEFAULT_TOPIC = 'mx.citymap.app';
const APNS_REQUEST_TIMEOUT_MS = 10000;
const APNS_MAX_CONCURRENCY = 10;
const APNS_JWT_TTL_SECONDS = 50 * 60;

function normalizePemKey(raw) {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // En Vercel la variable puede venir con los saltos escapados ("\\n").
  return trimmed.replace(/\\n/g, '\n');
}

export function getApnsConfig(env = process.env) {
  const key = normalizePemKey(env.APNS_KEY);
  const keyId = typeof env.APNS_KEY_ID === 'string' ? env.APNS_KEY_ID.trim() : '';
  const teamId = typeof env.APNS_TEAM_ID === 'string' ? env.APNS_TEAM_ID.trim() : '';
  if (!key || !keyId || !teamId) return null;
  const topic = typeof env.APNS_TOPIC === 'string' && env.APNS_TOPIC.trim() ? env.APNS_TOPIC.trim() : DEFAULT_TOPIC;
  const production = String(env.APNS_ENV || 'production').toLowerCase() !== 'sandbox';
  return { key, keyId, teamId, topic, host: production ? APNS_PRODUCTION_HOST : APNS_SANDBOX_HOST, production };
}

function base64url(input) {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// JWT de proveedor APNs (ES256, firmado con la .p8). Válido hasta 60 min.
export function buildApnsJwt({ key, keyId, teamId, nowSeconds = Math.floor(Date.now() / 1000) }) {
  const header = base64url(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ iss: teamId, iat: nowSeconds }));
  const data = `${header}.${payload}`;
  const signature = crypto.sign('sha256', Buffer.from(data), { key, dsaEncoding: 'ieee-p1363' });
  return `${data}.${base64url(signature)}`;
}

let cachedJwt = null;
function getApnsJwt(config) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (cachedJwt && cachedJwt.expiresAt > nowSeconds + 60) return cachedJwt.token;
  const token = buildApnsJwt({ ...config, nowSeconds });
  cachedJwt = { token, expiresAt: nowSeconds + APNS_JWT_TTL_SECONDS };
  return token;
}

export function buildApnsPayload({ title, body, deepLink }) {
  const payload = { aps: { alert: { title, body }, sound: 'default' } };
  if (deepLink) payload.deepLink = deepLink;
  return payload;
}

function apnsRequest({ host, token, jwt, topic, payload, timeoutMs = APNS_REQUEST_TIMEOUT_MS }) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (result) => { if (!settled) { settled = true; resolve(result); } };
    let client;
    try {
      client = http2.connect(`https://${host}`);
    } catch (err) {
      done({ status: 0, reason: String(err?.message || err) });
      return;
    }
    const timer = setTimeout(() => {
      try { client.destroy(); } catch { /* noop */ }
      done({ status: 0, reason: 'Timeout' });
    }, timeoutMs);
    client.on('error', () => {
      clearTimeout(timer);
      done({ status: 0, reason: 'Connection error' });
    });
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${token}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': topic,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
    });
    let status = 0;
    let data = '';
    req.on('response', (headers) => { status = headers[':status'] || 0; });
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      clearTimeout(timer);
      try { client.close(); } catch { /* noop */ }
      let reason = '';
      try { reason = JSON.parse(data || '{}')?.reason || ''; } catch { /* noop */ }
      done({ status, reason });
    });
    req.on('error', () => {
      clearTimeout(timer);
      try { client.close(); } catch { /* noop */ }
      done({ status: status || 0, reason: 'Request error' });
    });
    req.end(JSON.stringify(payload));
  });
}

// 410 o BadDeviceToken/Unregistered: el token ya no existe y se puede
// borrar. Cualquier otro fallo (429, 500, red, timeout) NO invalida el
// token: el dispositivo puede volver a registrarse y el token se conserva.
export function isInvalidApnsToken({ status, reason }) {
  if (status === 410) return true;
  return status === 400 && (reason === 'BadDeviceToken' || reason === 'Unregistered');
}

export async function sendApnsTokens({ tokens, title, body, deepLink, config, requestFn = apnsRequest }) {
  const result = { successCount: 0, failureCount: 0, invalidTokens: [] };
  if (!tokens?.length) return result;
  const jwt = getApnsJwt(config);
  const payload = buildApnsPayload({ title, body, deepLink });
  for (let i = 0; i < tokens.length; i += APNS_MAX_CONCURRENCY) {
    const chunk = tokens.slice(i, i + APNS_MAX_CONCURRENCY);
    const outcomes = await Promise.all(chunk.map(async (token) => {
      try {
        const res = await requestFn({ host: config.host, token, jwt, topic: config.topic, payload });
        return { token, ...res };
      } catch (err) {
        return { token, status: 0, reason: String(err?.message || err) };
      }
    }));
    for (const outcome of outcomes) {
      if (outcome.status === 200) {
        result.successCount += 1;
      } else {
        result.failureCount += 1;
        if (isInvalidApnsToken(outcome)) result.invalidTokens.push(outcome.token);
      }
    }
  }
  return result;
}
