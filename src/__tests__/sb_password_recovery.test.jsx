import { describe, expect, it, vi, beforeEach } from 'vitest';
import { sb } from '../lib/supabase.js';

// Helpers reales de Supabase con fetch mockeado: aquí sí se prueba el
// cableado HTTP (método, URL y cuerpo), no solo que el código los mencione.
describe('sb.resetPasswordForEmail (real)', () => {
  beforeEach(() => {
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    vi.stubGlobal('fetch', vi.fn());
  });

  it('manda POST a /recover con el email y el enlace de vuelta', async () => {
    globalThis.fetch.mockResolvedValue({ ok: true, text: async () => '{}' });
    await sb.resetPasswordForEmail('a@b.c', 'https://citymap.mx/login?recovery=1');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('/auth/v1/recover');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({
      email: 'a@b.c',
      redirect_to: 'https://citymap.mx/login?recovery=1',
    });
  });

  it('si Supabase responde error, lanza', async () => {
    globalThis.fetch.mockResolvedValue({ ok: false, text: async () => JSON.stringify({ error: 'rate limited' }) });
    await expect(sb.resetPasswordForEmail('a@b.c', 'https://citymap.mx/login?recovery=1')).rejects.toThrow();
  });
});

describe('sb.updateUser (real, el que usa la recuperación)', () => {
  beforeEach(() => {
    globalThis.localStorage = {
      getItem: (k) => (k === 'cg_t' ? 'tok123' : null),
      setItem: () => {}, removeItem: () => {},
    };
    vi.stubGlobal('fetch', vi.fn());
  });

  it('manda PUT a /user con la contraseña nueva y el token de la sesión', async () => {
    globalThis.fetch.mockResolvedValue({ ok: true, text: async () => JSON.stringify({ id: 'u1' }) });
    await sb.updateUser({ password: 'Nueva1234' });
    const [url, opts] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('/auth/v1/user');
    expect(opts.method).toBe('PUT');
    expect(opts.headers.Authorization).toBe('Bearer tok123');
    expect(JSON.parse(opts.body)).toEqual({ password: 'Nueva1234' });
  });

  it('sin sesión lanza antes de llamar a la red', async () => {
    globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    sb._token = null;
    await expect(sb.updateUser({ password: 'Nueva1234' })).rejects.toThrow('No hay sesión activa');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
