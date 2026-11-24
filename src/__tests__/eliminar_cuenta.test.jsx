import React from 'react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router-dom';
import AccountView from '../components/AccountView.jsx';
import { AppContext } from '../context/AppContext.jsx';
import handler from '../../api/delete-account.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const USER_ID = 'b414890a-6ed8-4c9b-8c28-f4874051671a';
const USER = {
  id: USER_ID,
  email: 'jgarana18@gmail.com',
  user_metadata: { name: 'Jonathan Arana', avatar_url: null },
};
const T = {
  text: '#111', sub: '#666', bg: '#fff', white: '#fff', border: '#eee',
  green: '#000', greenL: '#EDE9FE', red: '#DC2626', dark: false,
};
const noop = () => {};
const fn = () => vi.fn();

function renderAccount(props = {}) {
  const ctx = {
    savedEventIds: [],
    setSelectedEvent: fn(),
    T, dark: false, navigate: fn(), setShowPlans: fn(),
    setShowAddBiz: fn(), setShowAuth: fn(), user: USER,
  };
  return renderToStaticMarkup(
    <MemoryRouter>
      <AppContext.Provider value={ctx}>
        <AccountView
          user={USER}
          profile={null}
          isAdmin={false}
          T={T}
          dark={false}
          favIds={[]}
          reviews={[]}
          wallet={[]}
          coupons={[]}
          claimedCoupons={{}}
          biz={[]}
          myBizList={[]}
          setShowAuth={fn()}
          setAuthMode={fn()}
          setEditBizId={fn()}
          setAddBizForm={fn()}
          setShowAddBiz={fn()}
          setOwnerView={fn()}
          setSelected={fn()}
          navigate={fn()}
          doSignOut={fn()}
          toast$={fn()}
          viewStyle={{}}
          setUser={fn()}
          authChecked
          setShowAdmin={fn()}
          setStoreAdminBiz={fn()}
          {...props}
        />
      </AppContext.Provider>
    </MemoryRouter>,
  );
}

beforeAll(() => {
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 14)' });
  vi.stubGlobal('window', { MSStream: undefined });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

// ── Endpoint: api/delete-account.js ─────────────────────────────────────────
async function invoke({ headers = {}, body = {} } = {}) {
  const res = {
    statusCode: 200,
    setHeader: vi.fn(),
    status(code) { this.statusCode = code; return this; },
    json(data) { this.data = data; return this; },
    end() { return this; },
  };
  await handler({ method: 'POST', headers, body }, res);
  return res;
}

function routeFetch({ failOn = null, members = [{ id: 'member-1' }, { id: 'member-2' }] } = {}) {
  const calls = [];
  const impl = async (url, opts = {}) => {
    const method = opts.method || 'GET';
    calls.push([String(url), method, opts.body || null]);
    if (failOn && String(url).includes(failOn) && method === 'DELETE') {
      return { ok: false, status: 500, json: async () => ({}) };
    }
    if (String(url).includes('/auth/v1/user')) return { ok: true, json: async () => ({ id: USER_ID }) };
    if (String(url).includes('/auth/v1/admin/users/')) return { ok: true, json: async () => ({}) };
    if (String(url).includes('/rest/v1/loyalty_members?') && method === 'GET') {
      return { ok: true, json: async () => members };
    }
    return { ok: true, json: async () => [] };
  };
  impl.calls = calls;
  return impl;
}

describe('api/delete-account: autenticación y entorno', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://db.test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server');
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('401 sin token', async () => {
    const result = await invoke({ headers: {} });
    expect(result.statusCode).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('503 sin variables de entorno', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const result = await invoke({ headers: { authorization: 'Bearer abc' } });
    expect(result.statusCode).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('api/delete-account: limpieza antes que Auth', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://db.test');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'server');
    vi.stubGlobal('fetch', vi.fn());
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

  it('borra en orden y borra el usuario de Auth al final', async () => {
    const impl = routeFetch();
    fetch.mockImplementation(impl);
    const result = await invoke({ headers: { authorization: 'Bearer abc' } });
    expect(result.statusCode).toBe(200);
    expect(result.data).toEqual({ deleted: true });
    const seq = impl.calls
      .filter(([url]) => !url.includes('/auth/v1/user'))
      .map(([url, method]) => `${method} ${url.replace('https://db.test', '')}`);
    expect(seq).toEqual([
      `DELETE /rest/v1/favorites?user_id=eq.${USER_ID}`,
      `DELETE /rest/v1/event_favorites?user_id=eq.${USER_ID}`,
      `GET /rest/v1/loyalty_members?user_id=eq.${USER_ID}&select=id`,
      'DELETE /rest/v1/loyalty_stamp_events?member_id=in.(member-1,member-2)',
      `DELETE /rest/v1/loyalty_members?user_id=eq.${USER_ID}`,
      `DELETE /rest/v1/push_tokens?user_id=eq.${USER_ID}`,
      `DELETE /rest/v1/reservations?user_id=eq.${USER_ID}`,
      `DELETE /rest/v1/reviews?user_id=eq.${USER_ID}`,
      `DELETE /rest/v1/events?user_id=eq.${USER_ID}`,
      `DELETE /rest/v1/profiles?id=eq.${USER_ID}`,
      `PATCH /rest/v1/businesses?owner_id=eq.${USER_ID}`,
      `DELETE /auth/v1/admin/users/${USER_ID}`,
    ]);
  });

  it('un fallo de limpieza NO borra el usuario de Auth e indica el paso', async () => {
    const impl = routeFetch({ failOn: '/rest/v1/reviews' });
    fetch.mockImplementation(impl);
    const result = await invoke({ headers: { authorization: 'Bearer abc' } });
    expect(result.statusCode).toBe(500);
    expect(result.data.step).toBe('reviews');
    expect(impl.calls.some(([url]) => url.includes('/auth/v1/admin/users/'))).toBe(false);
    expect(impl.calls.some(([url]) => url.includes('/rest/v1/businesses'))).toBe(false);
  });

  it('los negocios NO se borran: solo quedan sin dueño (PATCH owner_id null)', async () => {
    const impl = routeFetch();
    fetch.mockImplementation(impl);
    await invoke({ headers: { authorization: 'Bearer abc' } });
    const bizCalls = impl.calls.filter(([url]) => url.includes('/rest/v1/businesses'));
    expect(bizCalls).toHaveLength(1);
    expect(bizCalls[0][1]).toBe('PATCH');
    expect(bizCalls[0][2]).toBe(JSON.stringify({ owner_id: null }));
  });

  it('sin membresías de lealtad no toca el historial de sellos', async () => {
    const impl = routeFetch({ members: [] });
    fetch.mockImplementation(impl);
    const result = await invoke({ headers: { authorization: 'Bearer abc' } });
    expect(result.statusCode).toBe(200);
    expect(impl.calls.some(([url]) => url.includes('loyalty_stamp_events'))).toBe(false);
    expect(impl.calls.some(([url, method]) => url.includes('loyalty_members') && method === 'DELETE')).toBe(true);
  });
});

// ── Cliente: botón y hoja en AccountView ────────────────────────────────────
describe('Mi Perfil: eliminar cuenta', () => {
  it('«Eliminar mi cuenta» vive en la hoja de Ajustes (engranaje), en rojo, y ya no suelta en Mi Perfil', () => {
    const html = renderAccount();
    // En Mi Perfil ya no sale suelta: solo se ve al abrir Ajustes.
    // (24 Nov 2026: «Cerrar sesión» también se mudó a la hoja, así
    // que tampoco sale suelta en Mi Perfil.)
    expect(html).not.toContain('Eliminar mi cuenta');
    expect(html).not.toContain('Cerrar sesión');
    // El engranaje está en el encabezado.
    expect(html).toContain('aria-label="Ajustes"');
    // En el código, la hoja de Ajustes lleva el botón en rojo y abre
    // la confirmación de siempre.
    const src = read('../components/AccountView.jsx');
    expect(src).toContain('cuenta_ajustes');
    const sheetPos = src.indexOf('HOJA DE AJUSTES');
    expect(sheetPos).toBeGreaterThan(-1);
    const sheetSrc = src.slice(sheetPos);
    expect(sheetSrc).toContain('cuenta_eliminar_cuenta');
    expect(sheetSrc).toContain('#D94F3D');
    expect(sheetSrc).toContain('setShowDeleteAccount(true)');
    // «Cerrar sesión» vive en la misma hoja.
    expect(sheetSrc).toContain('cerrar_sesion');
    expect(sheetSrc).toContain('doSignOut()');
  });

  it('la hoja de confirmación va con createPortal a document.body (la raíz de Mi Perfil lleva transform)', () => {
    const src = read('../components/AccountView.jsx');
    expect(src).toContain('cuenta_eliminar_cuenta_titulo');
    expect(src).toContain('cuenta_eliminar_cuenta_desc');
    expect(src).toContain("createPortal(");
    const sheetPos = src.indexOf('cuenta_eliminar_cuenta_titulo');
    expect(src.slice(sheetPos).indexOf('document.body')).toBeGreaterThan(-1);
    expect(src).toContain("'/api/delete-account'");
    expect(src).toContain('sb.signOut()');
  });

  it('las claves nuevas existen en español e inglés', () => {
    const es = read('../lib/i18n.js');
    const en = read('../lib/i18n-en.js');
    for (const key of [
      'cuenta_ajustes',
      'cuenta_eliminar_cuenta',
      'cuenta_eliminar_cuenta_titulo',
      'cuenta_eliminar_cuenta_desc',
      'cuenta_eliminar_cuenta_confirmar',
      'cuenta_eliminar_cuenta_eliminando',
      'cuenta_eliminada',
      'cuenta_no_eliminada',
    ]) {
      expect(es).toContain(`"${key}"`);
      expect(en).toContain(`"${key}"`);
    }
  });
});
