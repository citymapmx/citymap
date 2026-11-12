import React from 'react';
import { describe, expect, it, vi, beforeAll, afterAll } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router-dom';
import AccountView from '../components/AccountView.jsx';
import { AppContext } from '../context/AppContext.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

const T = {
  text: '#111', sub: '#666', bg: '#fff', white: '#fff', border: '#eee',
  green: '#000', greenL: '#EDE9FE', red: '#DC2626', dark: false,
};

// Carrito La Paz Tostadas de Atún (Tepic), el negocio real de las
// capturas de Jonathan: plan premium, aprobado, así la sección
// «Mi Negocio» muestra los 4 elementos de la captura.
const CARRITO = {
  id: 'biz-carrito',
  name: 'Carrito La Paz Tostadas de Atún',
  status: 'approved',
  plan: 'premium',
  city_slug: 'tepic',
  slug: 'tepic-carrito-la-paz-tostadas-de-atun',
  category: 'restaurantes',
};

const USER = {
  id: 'user-jonathan',
  email: 'jgarana18@gmail.com',
  user_metadata: { name: 'Jonathan Arana', avatar_url: null },
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
          myBizList={[CARRITO]}
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
  // AccountView lee navigator.userAgent y window.MSStream al renderizar
  // (detección de iOS): en Node no existen, se simulan.
  vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 14)' });
  vi.stubGlobal('window', { MSStream: undefined });
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('Cuenta: «Mi Negocio» primero y «Cuenta» después', () => {
  it('el encabezado del usuario queda arriba y «Mi Negocio» sale antes que «Cuenta»', () => {
    const html = renderAccount();
    // Encabezado con nombre y correo (sigue arriba de todo).
    expect(html).toContain('Jonathan Arana');
    expect(html).toContain('jgarana18@gmail.com');
    const headerPos = html.indexOf('Jonathan Arana');
    const negocioPos = html.indexOf('Mi Negocio (Carrito La Paz Tostadas de Atún)');
    const cuentaPos = html.indexOf('>Cuenta<');
    expect(negocioPos).toBeGreaterThan(0);
    expect(cuentaPos).toBeGreaterThan(0);
    expect(headerPos).toBeLessThan(negocioPos);
    expect(negocioPos).toBeLessThan(cuentaPos);
  });

  it('los 8 elementos de la captura siguen presentes, con sus etiquetas exactas', () => {
    const html = renderAccount();
    // Sección «Mi Negocio» (los 4 de la captura).
    for (const label of ['Reservaciones', 'Estadísticas', 'Tarjetas de Lealtad (Wallet)', 'Compartir mi negocio']) {
      expect(html).toContain(label);
    }
    // Sección «Cuenta» (los 4 de la captura).
    for (const label of ['Modo oscuro', 'Mis Favoritos', 'Editar perfil', 'Notificaciones']) {
      expect(html).toContain(label);
    }
    // Y los elementos propios del plan premium tampoco se pierden.
    expect(html).toContain('Editar menú o catálogo');
    expect(html).toContain('Editar negocio');
    expect(html).toContain('Ver planes');
  });

  it('en el código, el grupo «Mi Negocio» se define antes que el grupo «Cuenta»', () => {
    const src = read('../components/AccountView.jsx');
    const negocioPos = src.indexOf('t("mi_negocio", "Mi Negocio")');
    const cuentaPos = src.indexOf('title: t("cuenta", "Cuenta")');
    expect(negocioPos).toBeGreaterThan(0);
    expect(cuentaPos).toBeGreaterThan(0);
    expect(negocioPos).toBeLessThan(cuentaPos);
  });
});
