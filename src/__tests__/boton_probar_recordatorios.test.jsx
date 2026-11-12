import fs from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// AdminPanel importa useGMaps (window.google) y useUIStore (localStorage);
// en Node no existen: se ponen con vi.hoisted para que corran ANTES de los
// imports (que vitest eleva por encima del cuerpo del archivo).
vi.hoisted(() => {
  if (typeof globalThis.window === "undefined") {
    globalThis.window = { location: { hostname: "citymap.mx", pathname: "/" }, confirm: () => true };
  }
  if (typeof globalThis.localStorage === "undefined") {
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  }
});

import { callRecordatorios, groupReminderPlan, reminderTimeFromBody } from '../components/AdminPanel.jsx';
import { sb } from '../lib/supabase.js';

const SRC = fs.readFileSync(new URL('../components/AdminPanel.jsx', import.meta.url), 'utf8');

const PLAN = [
  { eventId: 'ev-calamaro', userId: 'u1', title: 'Andrés Calamaro', body: 'Hoy es el concierto de Andrés Calamaro a las 9:00 p. m., no te lo pierdas', deepLink: '/evento/guadalajara/andres-calamaro' },
  { eventId: 'ev-calamaro', userId: 'u2', title: 'Andrés Calamaro', body: 'Hoy es el concierto de Andrés Calamaro a las 9:00 p. m., no te lo pierdas', deepLink: '/evento/guadalajara/andres-calamaro' },
  { eventId: 'ev-otro', userId: 'u1', title: 'Show Sin Hora', body: 'Hoy es el concierto de Show Sin Hora, no te lo pierdas', deepLink: '/evento/x/show' },
];

describe('botón Probar recordatorios: hora en 12 h desde el mensaje', () => {
  it('saca "9:00 p. m." del cuerpo del aviso', () => {
    expect(reminderTimeFromBody('Hoy es el concierto de Andrés Calamaro a las 9:00 p. m., no te lo pierdas')).toBe('9:00 p. m.');
  });
  it('sin "a las" devuelve null', () => {
    expect(reminderTimeFromBody('Hoy es el concierto de Show Sin Hora, no te lo pierdas')).toBeNull();
    expect(reminderTimeFromBody('')).toBeNull();
    expect(reminderTimeFromBody(null)).toBeNull();
  });
});

describe('botón Probar recordatorios: agrupar el plan por evento', () => {
  it('agrupa por evento con título, hora y número de usuarios', () => {
    const groups = groupReminderPlan(PLAN);
    expect(groups).toHaveLength(2);
    const calamaro = groups.find((g) => g.eventId === 'ev-calamaro');
    expect(calamaro.title).toBe('Andrés Calamaro');
    expect(calamaro.time).toBe('9:00 p. m.');
    expect(calamaro.users).toBe(2);
    const otro = groups.find((g) => g.eventId === 'ev-otro');
    expect(otro.users).toBe(1);
    expect(otro.time).toBeNull();
  });
  it('plan vacío o nulo no rompe', () => {
    expect(groupReminderPlan([])).toEqual([]);
    expect(groupReminderPlan(null)).toEqual([]);
  });
});

describe('botón Probar recordatorios: llamada al endpoint', () => {
  beforeEach(() => {
    sb._token = 'tok-test';
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    sb._token = null;
  });

  it('el simulacro llama con {recordatorios:true, dry:true} y el JWT de sesión', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, dry: true, today: '2026-11-11', events: 1, reminders: 2, plan: PLAN, sent: [], failed: [], skipped: 0 }) });
    const data = await callRecordatorios(true);
    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe('https://citymap.mx/api/send-notification');
    expect(opts.method).toBe('POST');
    expect(opts.headers.Authorization).toBe('Bearer tok-test');
    expect(JSON.parse(opts.body)).toEqual({ recordatorios: true, dry: true });
    expect(data.reminders).toBe(2);
  });

  it('el envío real llama sin dry', async () => {
    fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true, dry: false, today: '2026-11-11', events: 1, reminders: 2, sent: [{ eventId: 'ev-calamaro', userId: 'u1' }], failed: [], skipped: 0 }) });
    const data = await callRecordatorios(false);
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body).toEqual({ recordatorios: true });
    expect('dry' in body).toBe(false);
    expect(data.sent).toHaveLength(1);
  });

  it('si el servidor responde error, se muestra el mensaje del servidor', async () => {
    fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Unauthorized' }) });
    await expect(callRecordatorios(true)).rejects.toThrow('Unauthorized');
  });

  it('si el fetch falla, rechaza', async () => {
    fetch.mockRejectedValue(new Error('Network error'));
    await expect(callRecordatorios(true)).rejects.toThrow('Network error');
  });
});

describe('botón Probar recordatorios: interfaz en AdminPanel', () => {
  it('hay botón "Probar recordatorios" y bloque "Recordatorios de eventos"', () => {
    expect(SRC).toContain('Recordatorios de eventos');
    expect(SRC).toContain('Probar recordatorios');
    expect(SRC).toContain('handleTestReminders');
  });
  it('"Enviar ahora" solo aparece si el simulacro trae 1 o más recordatorios', () => {
    expect(SRC).toContain('Enviar ahora');
    expect(SRC).toMatch(/remPlan\.reminders > 0 && !remSent/);
    // Sin simulacro previo no hay botón: el envío real solo vive dentro del bloque del plan.
    expect(SRC).toMatch(/\{remPlan && \(/);
  });
  it('muestra el plan (fecha, eventos, recordatorios, omitidos, lista por evento) y el resultado del envío', () => {
    expect(SRC).toContain('remPlan.today');
    expect(SRC).toContain('remPlan.events');
    expect(SRC).toContain('remPlan.reminders');
    expect(SRC).toContain('remPlan.skipped');
    expect(SRC).toContain('groupReminderPlan(remPlan.plan)');
    expect(SRC).toContain('remSent.sent');
    expect(SRC).toContain('remSent.failed');
  });
  it('hay estado de carga y mensaje de error visible', () => {
    expect(SRC).toContain('Calculando...');
    expect(SRC).toContain('remError');
    expect(SRC).toContain('setRemError');
  });
  it('el enviador manual de pushes existente no se toca', () => {
    expect(SRC).toContain('Enviar Notificación Masiva');
    expect(SRC).toContain('Enviar prueba a mi cuenta');
    expect(SRC).toContain('handleSend');
  });
});
