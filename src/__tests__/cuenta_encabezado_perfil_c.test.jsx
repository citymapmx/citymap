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

describe('Cuenta: encabezado propuesta C (botones redondos de 44 px, nombre centrado)', () => {
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
    // El avatar (iniciales, sin foto) sigue en el encabezado, antes del nombre,
    // y sigue en 72 px.
    expect(html).toContain('JO');
    expect(html.indexOf('JO')).toBeLessThan(namePos);
    expect(html).toContain('width:72px');
    expect(html).toContain('height:72px');
  });

  it('en la fila del avatar hay dos botones redondos de 44 px: ajustes (engranaje) a la izquierda y tema a la derecha', () => {
    const html = renderAccount();
    // Botón de ajustes: abre la hoja de Ajustes, 44 px, redondo.
    expect(html).toContain('aria-label="Ajustes"');
    const editPos = html.indexOf('aria-label="Ajustes"');
    const editBtn = html.lastIndexOf('<button', editPos);
    const editTagEnd = html.indexOf('>', editPos);
    const editStyle = html.slice(editBtn, editTagEnd);
    expect(editStyle).toContain('width:44px');
    expect(editStyle).toContain('height:44px');
    expect(editStyle).toContain('border-radius:50%');
    // Botón de tema: mismo ThemeToggle (modo claro → «Cambiar a modo oscuro»), 44 px, redondo.
    expect(html).toContain('aria-label="Cambiar a modo oscuro"');
    const themePos = html.indexOf('aria-label="Cambiar a modo oscuro"');
    const themeBtn = html.lastIndexOf('<button', themePos);
    const themeTagEnd = html.indexOf('>', themePos);
    const themeStyle = html.slice(themeBtn, themeTagEnd);
    expect(themeStyle).toContain('width:44px');
    expect(themeStyle).toContain('min-height:44px');
    expect(themeStyle).toContain('border-radius:50%');
    expect(themeStyle).toContain('aria-pressed="false"');
    // Editar a la izquierda, tema a la derecha, ambos en el encabezado
    // (antes del nombre).
    expect(editPos).toBeLessThan(themePos);
    expect(editPos).toBeLessThan(html.indexOf('Jonathan Arana'));
    expect(themePos).toBeLessThan(html.indexOf('Jonathan Arana'));
  });

  it('el engranaje abre la hoja de Ajustes y desde ahí «Editar perfil» abre el modal (cableado)', () => {
    const src = read('../components/AccountView.jsx');
    // El botón redondo del engranaje abre la hoja de Ajustes.
    expect(src).toContain('onClick={() => setShowSettings(true)}');
    // La hoja tiene «Editar perfil» (abre el modal de siempre) y
    // «Eliminar mi cuenta» (abre la confirmación de siempre).
    expect(src).toContain('cuenta_ajustes');
    expect(src).toContain('setShowSettings(false); startEditProfile();');
    expect(src).toContain('setShowDeleteAccount(true)');
    // El botón de tema es el ThemeToggle de siempre, de 44 px y redondo.
    expect(src).toContain('<ThemeToggle size={44} round />');
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

  it('la sección SEGURIDAD ya no existe: «Cerrar sesión» vive en la hoja de Ajustes', () => {
    const html = renderAccount();
    // Ni el encabezado ni el botón salen sueltos en Mi Perfil: todo
    // lo de la cuenta vive dentro de la hoja de Ajustes (cerrada por
    // defecto), así que no sale en el HTML estático.
    expect(html).not.toContain('>Seguridad<');
    expect(html).not.toContain('Cerrar sesión');
    expect(html).not.toContain('Eliminar mi cuenta');
    // En el código, la hoja de Ajustes lleva «Cerrar sesión» con su
    // icono y cierra la hoja antes de cerrar la sesión; la clave
    // «cuenta_seguridad» ya no se usa en ningún lado.
    const src = read('../components/AccountView.jsx');
    const sheetPos = src.indexOf('HOJA DE AJUSTES');
    expect(sheetPos).toBeGreaterThan(-1);
    const sheetSrc = src.slice(sheetPos);
    expect(sheetSrc).toContain('cerrar_sesion');
    expect(sheetSrc).toContain('"log-out"');
    expect(sheetSrc).toContain('doSignOut()');
    expect(src).not.toContain('cuenta_seguridad');
    expect(src).toContain('setShowDeleteAccount(true)');
    // La hoja de Ajustes la abre el engranaje del encabezado.
    expect(html).toContain('aria-label="Ajustes"');
    expect(src).toContain('cuenta_ajustes');
  });

  it('el encabezado del perfil respeta el área segura: avatar y botones ya no quedan pegados arriba', () => {
    const html = renderAccount();
    // El padding superior del encabezado suma el inset de iOS a los 24 px de siempre.
    expect(html).toContain('calc(env(safe-area-inset-top, 0px) + 24px)');
    const src = read('../components/AccountView.jsx');
    expect(src).toContain("import { safeAreaTop } from '../lib/safeArea.js';");
    expect(src).toContain('padding: `${safeAreaTop(24)} 20px 24px`');
    // Avatar y botones siguen del mismo tamaño.
    expect(html).toContain('width:72px');
    expect(html).toContain('height:72px');
    expect(html).toContain('width:44px');
    expect(html).toContain('height:44px');
  });
});
