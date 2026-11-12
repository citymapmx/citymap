import { Buffer } from 'node:buffer';
import fs from 'node:fs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Canal y sonido propios (src/lib/pushAlertChannel.js) ───────────────────

const channelMocks = vi.hoisted(() => ({
  isNative: true,
  createChannel: vi.fn(async () => {}),
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: () => channelMocks.isNative },
}));
vi.mock('@capacitor/push-notifications', () => ({
  PushNotifications: { createChannel: channelMocks.createChannel },
}));

import {
  PUSH_ALERT_CHANNEL_DESCRIPTION,
  PUSH_ALERT_CHANNEL_ID,
  PUSH_ALERT_CHANNEL_NAME,
  PUSH_ALERT_SOUND_FILE,
  PUSH_ALERT_SOUND_NAME,
  ensurePushAlertChannel,
  pushAlertChannel,
} from '../lib/pushAlertChannel.js';

describe('sonido propio: canal de avisos', () => {
  it('el canal es nuevo, con nombre, sonido propio, importancia alta y vibración', () => {
    expect(PUSH_ALERT_CHANNEL_ID).toBe('citymap_alerts');
    expect(PUSH_ALERT_CHANNEL_NAME).toBe('Avisos de CityMap');
    expect(PUSH_ALERT_CHANNEL_DESCRIPTION).toContain('eventos');
    expect(pushAlertChannel()).toEqual({
      id: 'citymap_alerts',
      name: 'Avisos de CityMap',
      description: PUSH_ALERT_CHANNEL_DESCRIPTION,
      sound: 'citymap_alert.mp3',
      importance: 4,
      vibration: true,
    });
  });
  it('el archivo de sonido vive en res/raw y el nombre FCM es el recurso sin extensión', () => {
    expect(PUSH_ALERT_SOUND_FILE).toBe('citymap_alert.mp3');
    expect(PUSH_ALERT_SOUND_NAME).toBe('citymap_alert');
  });
});

describe('sonido propio: ensurePushAlertChannel', () => {
  beforeEach(() => {
    channelMocks.isNative = true;
    channelMocks.createChannel.mockClear();
  });
  it('en la app crea el canal con el sonido propio', async () => {
    await expect(ensurePushAlertChannel()).resolves.toBe(true);
    expect(channelMocks.createChannel).toHaveBeenCalledTimes(1);
    expect(channelMocks.createChannel).toHaveBeenCalledWith(pushAlertChannel());
  });
  it('en web no toca el plugin', async () => {
    channelMocks.isNative = false;
    await expect(ensurePushAlertChannel()).resolves.toBe(false);
    expect(channelMocks.createChannel).not.toHaveBeenCalled();
  });
  it('si crear el canal falla, no lanza (el registro de push sigue)', async () => {
    channelMocks.createChannel.mockRejectedValueOnce(new Error('no channel'));
    await expect(ensurePushAlertChannel()).resolves.toBe(false);
  });
});

// ── El envío FCM pide canal y sonido propios ───────────────────────────────

const sendMocks = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('firebase-admin/app', () => ({
  getApps: () => [{}],
  initializeApp: vi.fn(),
  cert: vi.fn(),
}));
vi.mock('firebase-admin/messaging', () => ({
  getMessaging: () => ({ sendEachForMulticast: sendMocks.send }),
}));
import handler from '../../api/send-notification.js';

async function invoke(body) {
  const res = {
    statusCode: 200,
    setHeader: vi.fn(),
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
  };
  await handler({
    method: 'POST',
    headers: {},
    body: { secret: 'server-secret', title: 'Prueba', body: 'Mensaje', ...body },
  }, res);
  return res;
}

describe('sonido propio: payload FCM', () => {
  beforeEach(() => {
    vi.stubEnv('ADMIN_SECRET', 'server-secret');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://db.test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server');
    vi.stubGlobal('fetch', vi.fn());
    sendMocks.send.mockReset();
  });

  it('el aviso Android pide el canal nuevo y el sonido propio, no el de defecto', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => [{ token: 'device' }] });
    sendMocks.send.mockResolvedValue({ successCount: 1, failureCount: 0, responses: [{ success: true }] });
    const result = await invoke({});
    expect(result.statusCode).toBe(200);
    expect(sendMocks.send.mock.calls[0][0].android).toEqual({
      notification: { channelId: 'citymap_alerts', sound: 'citymap_alert' },
    });
  });
  it('el webpush no lleva canal ni sonido (en el navegador manda el sistema)', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => [{ token: 'device' }] });
    sendMocks.send.mockResolvedValue({ successCount: 1, failureCount: 0, responses: [{ success: true }] });
    await invoke({});
    const payload = sendMocks.send.mock.calls[0][0];
    expect(payload.webpush.notification).not.toHaveProperty('sound');
    expect(payload.webpush).not.toHaveProperty('channelId');
  });
});

// ── Cableado en la app y en el repo (fuente) ────────────────────────────────

describe('sonido propio: cableado (fuente)', () => {
  it('el hook de push crea el canal propio en cada arranque de la app', () => {
    const hook = fs.readFileSync(new URL('../hooks/usePushNotifications.js', import.meta.url), 'utf8');
    expect(hook).toContain("import { ensurePushAlertChannel } from '../lib/pushAlertChannel.js';");
    expect(hook).toContain('ensurePushAlertChannel();');
  });
  it('el endpoint ya no pide el sonido por defecto', () => {
    const api = fs.readFileSync(new URL('../../api/send-notification.js', import.meta.url), 'utf8');
    expect(api).not.toContain("sound: 'default'");
    expect(api).toContain('channelId: PUSH_ALERT_CHANNEL_ID');
    expect(api).toContain('sound: PUSH_ALERT_SOUND_NAME');
    expect(api).toContain("from '../src/lib/pushAlertChannel.js'");
  });
  it('Gradle decodifica el sonido en el build', () => {
    const gradle = fs.readFileSync(new URL('../../android/app/build.gradle', import.meta.url), 'utf8');
    expect(gradle).toContain("tasks.register('decodeCitymapAlertSound')");
    expect(gradle).toContain('citymap_alert.mp3.b64');
    expect(gradle).toContain("preBuild.dependsOn 'decodeCitymapAlertSound'");
  });
  it('el .mp3 decodificado no se versiona (se genera en el build)', () => {
    const gitignore = fs.readFileSync(new URL('../../.gitignore', import.meta.url), 'utf8');
    expect(gitignore).toContain('android/app/src/main/res/raw/citymap_alert.mp3');
  });
  it('el .b64 versionado decodifica al pop ganador E (0.23 s, 1500→2200 Hz) en MP3 válido', () => {
    const b64 = fs.readFileSync(
      new URL('../../android/app/src/main/res/raw/citymap_alert.mp3.b64', import.meta.url),
      'utf8',
    );
    expect(b64.trim()).toMatch(/^[A-Za-z0-9+/=\s]+$/);
    const bytes = Buffer.from(b64, 'base64');
    // El ganador E es un pop cortito (0.23 s): ~2.3 KB, muy lejos del tono largo anterior.
    expect(bytes.length).toBeGreaterThan(2000);
    expect(bytes.length).toBeLessThan(4000);
    expect(bytes.subarray(0, 3).toString('latin1')).toBe('ID3');
    // Sincronía de trama MPEG (0xFF 0xFB) en los primeros 512 bytes tras la cabecera.
    let hasFrameSync = false;
    for (let i = 0; i < Math.min(bytes.length - 1, 512); i += 1) {
      if (bytes[i] === 0xff && (bytes[i + 1] & 0xe0) === 0xe0) { hasFrameSync = true; break; }
    }
    expect(hasFrameSync).toBe(true);
  });
});
