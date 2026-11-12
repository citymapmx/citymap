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
// capturas de Jonathan: plan premium, aprobado.
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

describe('Cuenta: encabezado propuesta C (botones redondos grandes, nombre centrado)', () => {
  it('el nombre y el correo quedan centrados y alineados al avatar', () => {
    const html = renderAccount();
    expect(html).toContain('Jonathan Arana');
    expect(html).toContain('jgarana18@gmail.com');
    // El nombre va centrado (text-align:center en su div).
    expect(html).toContain('Jonathan Arana');
    const namePos = html.indexOf('Jonathan Arana');
    const nameDiv = html.lastIndexOf('<div', namePos);
    expect(html.slice(nameDiv, namePos)).toContain('text-align:center');
    // El correo también va centrado.
    const mailPos = html.indexOf('jgarana18@gmail.com');
    const mailDiv = html.lastIndexOf('<div', mailPos);
    expect(html.slice(mailDiv, mailPos)).toContain('text-align:center');
    // El avatar (iniciales, sin foto) sigue en el encabezado, antes del nombre.
    expect(html).toContain('JO');
    expect(html.indexOf('JO')).toBeLessThan(namePos);
  });

  it('en la fila del avatar hay dos botones redondos grandes: editar a la izquierda y tema a la derecha', () => {
    const html = renderAccount();
    // Botón de editar: abre el modal de edición, 56 px, redondo.
    expect(html).toContain('aria-label="Editar perfil"');
    const editPos = html.indexOf('aria-label="Editar perfil"');
    const editBtn = html.lastIndexOf('<button', editPos);
    const editTagEnd = html.indexOf('>', editPos);
    const editStyle = html.slice(editBtn, editTagEnd);
    expect(editStyle).toContain('width:56px');
    expect(editStyle).toContain('height:56px');
    expect(editStyle).toContain('border-radius:50%');
    // Botón de tema: mismo ThemeToggle (modo claro → «Cambiar a modo oscuro»), 56 px, redondo.
    expect(html).toContain('aria-label="Cambiar a modo oscuro"');
    const themePos = html.indexOf('aria-label="Cambiar a modo oscuro"');
    const themeBtn = html.lastIndexOf('<button', themePos);
    const themeTagEnd = html.indexOf('>', themePos);
    const themeStyle = html.slice(themeBtn, themeTagEnd);
    expect(themeStyle).toContain('width:56px');
    expect(themeStyle).toContain('min-height:56px');
    expect(themeStyle).toContain('border-radius:50%');
    expect(themeStyle).toContain('aria-pressed="false"');
    // Editar a la izquierda, tema a la derecha, ambos en el encabezado
    // (antes del nombre).
    expect(editPos).toBeLessThan(themePos);
    expect(editPos).toBeLessThan(html.indexOf('Jonathan Arana'));
    expect(themePos).toBeLessThan(html.indexOf('Jonathan Arana'));
  });

  it('el botón de editar abre el modal y el de tema cambia el tema (cableado)', () => {
    const src = read('../components/AccountView.jsx');
    // El botón redondo de editar llama startEditProfile (el mismo modal).
    expect(src).toContain('onClick={startEditProfile}');
    // El botón de tema es el ThemeToggle de siempre, en grande y redondo.
    expect(src).toContain('<ThemeToggle size={56} round />');
    const toggleSrc = read('../components/ui/ThemeToggle.jsx');
    expect(toggleSrc).toContain('setDark(!dark)');
    expect(toggleSrc).toContain('size = 44');
    expect(toggleSrc).toContain("round ? '50%' : 12");
  });

  it('la opción de horario automático sigue en el encabezado, bajo el botón de tema', () => {
    const html = renderAccount();
    // En el estado por defecto el modo es automático: se lee «Automático».
    expect(html).toContain('Automático');
    const autoPos = html.indexOf('Automático');
    // Está en el encabezado, junto al botón de tema (antes del nombre).
    expect(autoPos).toBeLessThan(html.indexOf('Jonathan Arana'));
    // Y el código la puede volver a activar (setThemeMode('auto')).
    const src = read('../components/AccountView.jsx');
    expect(src).toContain("setThemeMode('auto')");
  });

  it('«Mi actividad» vuelve arriba, recortada a solo Mis Favoritos y Notificaciones', () => {
    const html = renderAccount();
    const cuentaPos = html.indexOf('>Mi actividad<');
    const negocioPos = html.indexOf('Mi Negocio (Carrito La Paz Tostadas de Atún)');
    expect(cuentaPos).toBeGreaterThan(0);
    expect(negocioPos).toBeGreaterThan(0);
    expect(cuentaPos).toBeLessThan(negocioPos);
    // Solo esos dos elementos en el grupo «Mi actividad».
    const cuentaHtml = html.slice(cuentaPos, negocioPos);
    expect(cuentaHtml).toContain('Mis Favoritos');
    expect(cuentaHtml).toContain('Notificaciones');
    expect(cuentaHtml).not.toContain('Modo oscuro');
    expect(cuentaHtml).not.toContain('Editar perfil');
    expect(cuentaHtml).not.toContain('toggle_dark');
    // En el código, el grupo «Mi actividad» se define antes que «Mi Negocio».
    const src = read('../components/AccountView.jsx');
    const cuentaSrc = src.indexOf('title: t("cuenta_mi_actividad", "Mi actividad")');
    const negocioSrc = src.indexOf('t("mi_negocio", "Mi Negocio")');
    expect(cuentaSrc).toBeGreaterThan(0);
    expect(negocioSrc).toBeGreaterThan(0);
    expect(cuentaSrc).toBeLessThan(negocioSrc);
  });

  it('con admin, «Notificaciones de Admin» sigue en «Mi actividad»', () => {
    const html = renderAccount({ isAdmin: true });
    const cuentaPos = html.indexOf('>Mi actividad<');
    const negocioPos = html.indexOf('Mi Negocio (Carrito La Paz Tostadas de Atún)');
    const cuentaHtml = html.slice(cuentaPos, negocioPos);
    expect(cuentaHtml).toContain('Notificaciones de Admin');
  });

  it('los elementos de «Mi Negocio» quedan tal cual', () => {
    const html = renderAccount();
    for (const label of ['Reservaciones', 'Estadísticas', 'Tarjetas de Lealtad (Wallet)', 'Compartir mi negocio', 'Editar menú o catálogo', 'Editar negocio', 'Ver planes']) {
      expect(html).toContain(label);
    }
  });
});
