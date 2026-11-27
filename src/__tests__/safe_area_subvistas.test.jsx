import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { getT } from '../lib/constants.js';
import { safeAreaTop } from '../lib/safeArea.js';
import Terms from '../components/Terms.jsx';
import About from '../components/About.jsx';
import Privacy from '../Privacy.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const T = getT(false);

// ── Safe-area superior en sub-vistas (14 nov 2026) ──────────────────────────
// En iPhone las sub-vistas a pantalla completa mostraban su encabezado pegado
// arriba: el título/flecha chocaba con la hora y la barra de estado porque el
// header principal (que sí tiene safe-area desde la #337) no se muestra en
// esas rutas. Reportado en 6 capturas (Diseño de mi menú, Tarjetas de
// Lealtad, Estadísticas, Reservaciones, Mis Favoritos, Notificaciones) y
// ampliado a drawer, selector de ciudad, Para Negocios y mapa ampliado.
// El arreglo es sistémico: safeAreaTop(base) en src/lib/safeArea.js y cada
// encabezado usa su padding original como base, así en web
// (env(safe-area-inset-top) = 0) nada se mueve: calc(0px + base) = base.

describe('safeAreaTop', () => {
  it('devuelve el calc con env() y la base', () => {
    expect(safeAreaTop(16)).toBe('calc(env(safe-area-inset-top, 0px) + 16px)');
    expect(safeAreaTop(14)).toBe('calc(env(safe-area-inset-top, 0px) + 14px)');
    expect(safeAreaTop(24)).toBe('calc(env(safe-area-inset-top, 0px) + 24px)');
    expect(safeAreaTop(12)).toBe('calc(env(safe-area-inset-top, 0px) + 12px)');
    expect(safeAreaTop(20)).toBe('calc(env(safe-area-inset-top, 0px) + 20px)');
  });

  it('en web (env = 0) el padding queda igual que el original', () => {
    // calc(0px + base) = base: la base es el padding que ya tenía el encabezado.
    for (const base of [12, 14, 16, 20, 24]) {
      expect(safeAreaTop(base)).toContain('env(safe-area-inset-top, 0px)');
      expect(safeAreaTop(base)).toContain(`+ ${base}px)`);
    }
  });
});

describe('encabezados de sub-vista usan safeAreaTop con su base original', () => {
  const SITES = [
    ['../views/OwnerStatsView.jsx', 16, 'Estadísticas'],
    ['../views/OwnerDashboardView.jsx', 16, 'Reservaciones'],
    ['../views/FavsView.jsx', 16, 'Mis Favoritos'],
    ['../components/UserNotifs.jsx', 16, 'Notificaciones'],
    ['../components/loyalty/LoyaltyDesigner.jsx', 14, 'Tarjetas de Lealtad'],
    ['../components/store/MenuStyleDesigner.jsx', 14, 'Diseño de mi menú'],
    ['../views/ItinerariesList.jsx', 16, 'Mis Planes'],
    ['../views/ItineraryDetail.jsx', 16, 'Detalle de plan'],
    ['../components/AdminNotifs.jsx', 16, 'Notificaciones del admin'],
    ['../components/Terms.jsx', 16, 'Términos de Uso'],
    ['../components/About.jsx', 12, 'Acerca de'],
    ['../components/store/StoreAdminPanel.jsx', 16, 'Gestor de Menú/Catálogo'],
    ['../Privacy.jsx', 20, 'Aviso de Privacidad'],
    ['../components/SideMenu.jsx', 24, 'Drawer lateral'],
    ['../components/CountryPickerDropdown.jsx', 24, 'Selector de ciudad'],
    ['../components/BusinessLanding.jsx', 12, 'Para Negocios'],
  ];

  it.each(SITES)('%s usa safeAreaTop(%s) (%s)', (file, base) => {
    const src = read(file);
    expect(src).toContain('import { safeAreaTop } from');
    expect(src).toContain(`safeAreaTop(${base})`);
  });

  it('son 16 sitios con el mismo helper (si se agrega otra sub-vista, agregarla aquí)', () => {
    expect(SITES).toHaveLength(16);
  });
});

describe('el safe-area llega al HTML servido', () => {
  it('Términos: el header lleva el calc con env()', () => {
    const html = renderToStaticMarkup(<Terms T={T} onBack={() => {}} />);
    expect(html).toContain('calc(env(safe-area-inset-top, 0px) + 16px)');
  });

  it('Acerca de: el header lleva el calc con env()', () => {
    const html = renderToStaticMarkup(<About T={T} onBack={() => {}} />);
    expect(html).toContain('calc(env(safe-area-inset-top, 0px) + 12px)');
  });

  it('Aviso de Privacidad: el contenedor lleva el calc con env()', () => {
    const html = renderToStaticMarkup(<Privacy T={T} onBack={() => {}} />);
    expect(html).toContain('calc(env(safe-area-inset-top, 0px) + 20px)');
  });
});

describe('mapa ampliado', () => {
  it('App.jsx oculta el header principal (hamburguesa + globo) cuando el mapa está ampliado', () => {
    const src = read('../App.jsx');
    expect(src).toContain('!location.pathname.endsWith("/menu") && !mapFullScreen');
  });

  it('MapView baja el botón minimizar con el safe-area solo en fullscreen', () => {
    const src = read('../views/MapView.jsx');
    expect(src).toContain("import { safeAreaTop } from");
    expect(src).toContain('top: mapFullScreen ? safeAreaTop(16) : 16');
  });

  it('el selector de ciudad conserva el safe-area de su variante de bienvenida', () => {
    const src = read('../components/CountryPickerDropdown.jsx');
    expect(src).toContain('calc(env(safe-area-inset-top, 0px) + clamp(32px, 6dvh, 56px))');
  });
});
