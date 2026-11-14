import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getT } from '../lib/constants.js';

// Auditoría de modo oscuro en MODALES Y HOJAS (lote 6, 14 nov 2026).
//
// Casi todo el lote ya era `T.*` o isla clara fija legible, pero la
// revisión sistemática encontró 8 textos con contraste < 4.5:1 SOLO en
// modo oscuro (todos con el mismo patrón: color fijo pensado para fondo
// claro, sobre fondo oscuro del tema). Cada corrección es un ternario
// `dark ? <variante oscura> : <color original>`: el modo claro queda
// pixel a pixel igual y el oscuro pasa a ≥ 4.5:1.
//
// Contrastes medidos (WCAG, texto sobre su fondo en oscuro):
//   insignia de pestaña (EventDetailModal)  #FFFFFF/#F4F4F5  1.10:1 → #18181B 16.12:1
//   «Eliminar evento» (EventDetailModal)    #D94F3D/#232326  3.83:1 → T.red #F07060 5.37:1
//   WhatsApp (CreateEventModal)             #FFFFFF/#25D366  1.98:1 → #18181B 8.93:1
//   «¿Ingresar manual?» (CreateEventModal)  #1A7A5E/#232326  2.98:1 → #4ADE80 8.99:1
//   «Ocultar» (CreateEventModal)            #D94F3D/#232326  3.83:1 → T.red #F07060 5.37:1
//   aviso plan gratuito (AddBizModal)       #92400E/#1C1C1E  2.40:1 → #FBBF24 10.19:1
//   día abierto (AddBizModal)               #FFFFFF/#2997FF  3.02:1 → #000000 6.96:1
//   error IA (SurpriseModal)                #EF4444/#232326  4.16:1 → #F87171 5.67:1
//   email soporte (Terms)                   #1877F2/#232326  3.70:1 → #60A5FA 6.16:1
//
// NO se tocaron las islas fijas legibles en ambos modos (ClaimModal:
// hoja blanca + texto oscuro; GalleryModals: visor negro + blanco;
// tarjeta Apple Music roja + blanco; overlay de subida de foto), ni
// los fallos que existen IGUAL en claro y en oscuro (insignias
// «Próximamente» #3B82F6 y «Abierto» #10B981 con texto blanco,
// confirmación verde #22c55e en claro, ✕ roja #FF3B30): cambiarlos
// habría alterado el modo claro, que debe quedar idéntico.

const { MOCK_UI } = vi.hoisted(() => ({ MOCK_UI: { dark: false } }));
vi.mock('../store/useUIStore.js', () => ({
  useUIStore: (sel) => {
    const s = { dark: MOCK_UI.dark, lang: 'es', toast$: () => {} };
    return typeof sel === 'function' ? sel(s) : s;
  },
}));

import Terms from '../components/Terms.jsx';
import ScheduleModal from '../components/modals/ScheduleModal.jsx';
import ClaimModal from '../components/ClaimModal.jsx';
import OnboardingModal from '../components/modals/OnboardingModal.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// --- Contraste WCAG 2.1 (misma fórmula que la auditoría) ---
const lum = (hex) => {
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i + 1, i + 3), 16) / 255);
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// Mezcla un rgba() sobre un fondo opaco (la insignia activa es un
// blanco translúcido sobre la pestaña activa).
const blend = (rgba, over) => {
  const [r, g, b, a] = rgba.match(/[\d.]+/g).map(Number);
  const [or, og, ob] = [0, 2, 4].map((i) => parseInt(over.slice(i + 1, i + 3), 16));
  const mix = (fg, bg) => Math.round(a * fg + (1 - a) * bg);
  return `#${[mix(r, or), mix(g, og), mix(b, ob)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

afterEach(() => { MOCK_UI.dark = false; });

describe('modo oscuro (modales): cada texto corregido pasa de <4.5:1 a ≥4.5:1', () => {
  it.each([
    // [etiqueta, textoAntes, fondoOscuro, textoDespués]
    ['insignia de pestaña inactiva', '#FFFFFF', '#F4F4F5', '#18181B'],
    ['insignia de pestaña activa', '#FFFFFF', blend('rgba(0,0,0,0.18)', '#F4F4F5'), '#18181B'],
    ['eliminar evento / ocultar', '#D94F3D', '#232326', '#F07060'],
    ['botón WhatsApp', '#FFFFFF', '#25D366', '#18181B'],
    ['¿Ingresar manual?', '#1A7A5E', '#232326', '#4ADE80'],
    ['aviso plan gratuito', '#92400E', '#1C1C1E', '#FBBF24'],
    ['día abierto', '#FFFFFF', '#2997FF', '#000000'],
    ['error IA', '#EF4444', '#232326', '#F87171'],
    ['email de soporte', '#1877F2', '#232326', '#60A5FA'],
  ])('%s: antes <4.5:1 y después ≥4.5:1', (_label, before, bg, after) => {
    expect(contrast(before, bg)).toBeLessThan(4.5);
    expect(contrast(after, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('la insignia activa en claro sigue igual (blanco sobre negro, 7:1)', () => {
    // Rama clara sin tocar: rgba blanco 0.35 sobre pestaña negra #000000.
    expect(contrast('#FFFFFF', blend('rgba(255,255,255,0.35)', '#000000'))).toBeGreaterThanOrEqual(4.5);
  });

  it('la insignia activa vieja en oscuro también fallaba (blanco sobre blanco translúcido)', () => {
    // Fondo viejo: rgba(255,255,255,0.35) sobre la pestaña activa #F4F4F5.
    expect(contrast('#FFFFFF', blend('rgba(255,255,255,0.35)', '#F4F4F5'))).toBeLessThan(4.5);
    // Fondo nuevo: rgba(0,0,0,0.18) sobre #F4F4F5, con texto oscuro.
    expect(contrast('#18181B', blend('rgba(0,0,0,0.18)', '#F4F4F5'))).toBeGreaterThanOrEqual(4.5);
  });
});

describe('las correcciones son ternarios por modo (el claro conserva el color original)', () => {
  it('EventDetailModal: insignia con texto oscuro y fondo oscuro en activo', () => {
    const src = read('../components/modals/EventDetailModal.jsx');
    expect(src).toContain("background: active ? (dark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.35)') : T.green, color: dark ? '#18181B' : '#FFFFFF'");
    expect(src).not.toContain("background: active ? 'rgba(255,255,255,0.35)' : T.green, color: '#FFFFFF'");
  });

  it('EventDetailModal: «Eliminar evento» usa T.red en oscuro', () => {
    const src = read('../components/modals/EventDetailModal.jsx');
    expect(src).toContain("color: dark ? T.red : '#D94F3D'");
    expect(src).toContain('color={dark ? T.red : \'#D94F3D\'}');
  });

  it('CreateEventModal: WhatsApp, «¿Ingresar manual?» y «Ocultar» con variante oscura', () => {
    const src = read('../components/modals/CreateEventModal.jsx');
    expect(src).toContain('background: "#25D366"');
    expect(src).toContain('color: dark ? "#18181B" : "#FFFFFF"');
    expect(src).toContain('color: dark ? "#4ADE80" : "#1A7A5E"');
    expect(src).toContain('color: dark ? T.red : "#D94F3D"');
    // Los botones T.green ya usaban el patrón correcto y no se tocaron.
    expect(src).toContain('color: dark ? "#18181B" : "#FFFFFF"');
  });

  it('AddBizModal: aviso dorado y día abierto con variante oscura', () => {
    const src = read('../components/AddBizModal.jsx');
    expect(src).toContain("color: dark ? '#FBBF24' : '#92400E'");
    expect(src).toContain("color: open ? (dark ? '#000000' : '#FFFFFF') : T.sub");
    expect(src).not.toContain("color: open ? '#FFFFFF' : T.sub");
  });

  it('SurpriseModal: el error de IA usa rojo claro en oscuro', () => {
    const src = read('../components/SurpriseModal.jsx');
    expect(src).toContain("color: dark ? '#F87171' : '#EF4444'");
  });

  it('Terms: el email usa azul claro en oscuro (T.dark, porque recibe T por props)', () => {
    const src = read('../components/Terms.jsx');
    expect(src).toContain('color: T.dark ? "#60A5FA" : "#1877F2"');
  });
});

describe('render estático: Terms, ScheduleModal, ClaimModal y OnboardingModal', () => {
  it('Terms: en oscuro el email es #60A5FA sobre tarjeta oscura; en claro sigue #1877F2', () => {
    const darkHtml = renderToStaticMarkup(React.createElement(Terms, { T: getT(true), onBack: () => {} }));
    expect(darkHtml).toContain('color:#60A5FA');
    expect(darkHtml).not.toContain('color:#1877F2');
    expect(darkHtml).toContain('background:#232326');
    const lightHtml = renderToStaticMarkup(React.createElement(Terms, { T: getT(false), onBack: () => {} }));
    expect(lightHtml).toContain('color:#1877F2');
    expect(lightHtml).not.toContain('color:#60A5FA');
    expect(lightHtml).toContain('background:#FFFFFF');
  });

  it('ScheduleModal: hoja y textos usan el tema en ambos modos; «Cerrado» usa T.red', () => {
    const selected = { schedule: { lun: '9:00 - 18:00', mar: 'Cerrado' } };
    MOCK_UI.dark = true;
    const darkHtml = renderToStaticMarkup(
      React.createElement(ScheduleModal, { selected, showSchedule: true, setShowSchedule: () => {} }),
    );
    expect(darkHtml).toContain('background:#232326');
    expect(darkHtml).toContain('color:#F4F4F5');
    expect(darkHtml).toContain('color:#F07060');
    expect(darkHtml).toContain('Cerrado');
    MOCK_UI.dark = false;
    const lightHtml = renderToStaticMarkup(
      React.createElement(ScheduleModal, { selected, showSchedule: true, setShowSchedule: () => {} }),
    );
    expect(lightHtml).toContain('background:#FFFFFF');
    expect(lightHtml).toContain('color:#0F1A14');
    expect(lightHtml).toContain('color:#DC2626');
  });

  it('ClaimModal: isla clara fija intencional — idéntica en oscuro y en claro, y legible', () => {
    const props = { biz: { name: 'Café Prueba' }, user: { email: 'a@b.c' }, onClaim: () => {}, onClose: () => {} };
    MOCK_UI.dark = true;
    const darkHtml = renderToStaticMarkup(React.createElement(ClaimModal, props));
    MOCK_UI.dark = false;
    const lightHtml = renderToStaticMarkup(React.createElement(ClaimModal, props));
    expect(darkHtml).toBe(lightHtml);
    expect(darkHtml).toContain('background:#fff');
    expect(darkHtml).toContain('color:#0F1A14');
    expect(darkHtml).toContain('color:#5A6872');
    // Contrastes de la isla: 17.82:1 y 5.74:1 sobre blanco.
    expect(contrast('#0F1A14', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#5A6872', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
  });

  it('OnboardingModal: fondo y textos usan T.bg/T.text; el botón de gradiente no cambia entre modos', () => {
    MOCK_UI.dark = true;
    const darkHtml = renderToStaticMarkup(
      React.createElement(OnboardingModal, { T: getT(true), onComplete: () => {} }),
    );
    expect(darkHtml).toContain('background:#18181B');
    expect(darkHtml).toContain('color:#F4F4F5');
    MOCK_UI.dark = false;
    const lightHtml = renderToStaticMarkup(
      React.createElement(OnboardingModal, { T: getT(false), onComplete: () => {} }),
    );
    expect(lightHtml).toContain('background:#FFFFFF');
    expect(lightHtml).toContain('color:#0F1A14');
    expect(darkHtml).toContain('linear-gradient(90deg, #60A5FA, #8B5CF6)');
    expect(lightHtml).toContain('linear-gradient(90deg, #60A5FA, #8B5CF6)');
  });
});

describe('archivos verificados sin cambios: todo el texto usa el tema', () => {
  it('ScheduleModal, ItineraryModal, FavoriteCollectionModal, NotificationSettings, Privacy y CheckConfirmacion no tienen ningún color hex fijo', () => {
    for (const p of [
      '../components/modals/ScheduleModal.jsx',
      '../components/modals/ItineraryModal.jsx',
      '../components/FavoriteCollectionModal.jsx',
      '../components/NotificationSettings.jsx',
      '../Privacy.jsx',
      '../components/CheckConfirmacion.jsx',
    ]) {
      expect(read(p)).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    }
  });

  it('EventReminderPrompt: sin colores de texto fijos (solo #0003 en la sombra)', () => {
    const src = read('../components/EventReminderPrompt.jsx');
    expect(src).not.toMatch(/color:\s*['"]#/);
    expect(src).toContain('background: T.white');
  });

  it('ItinerarySettingsModal: solo el overlay de subida (blanco sobre negro translúcido) y la barra de progreso verde, sin texto', () => {
    const src = read('../components/modals/ItinerarySettingsModal.jsx');
    expect(src).toContain('color: "#fff"');
    expect(src).toContain('background: "rgba(0,0,0,0.5)"');
    expect(src).toContain('background: "#22c55e"');
    expect(src).not.toMatch(/color:\s*['"]#([0-9A-Fa-f]{6})['"]/);
  });

  it('SearchPlacesModal: la confirmación verde es legible en oscuro (6.27:1) y el resto es T.*', () => {
    const src = read('../components/modals/SearchPlacesModal.jsx');
    expect(src).toContain('color: "#22c55e"');
    expect(contrast('#22c55e', '#2A2A2E')).toBeGreaterThanOrEqual(4.5);
    expect(src).toContain('const panelBg = dark ? "rgba(255,255,255,0.05)" : "#f7f7f7"');
  });

  it('GalleryModals: visor negro fijo con blanco encima (isla, 21:1)', () => {
    const src = read('../components/GalleryModals.jsx');
    expect(src).toContain('background: "#000000"');
    expect(src).toContain('color: "#fff"');
    expect(contrast('#FFFFFF', '#000000')).toBeGreaterThanOrEqual(4.5);
  });

  it('PushPrompt: tarjeta, título y botón ya tenían variante oscura', () => {
    const src = read('../components/PushPrompt.jsx');
    expect(src).toContain("background: dark ? '#1E293B' : '#FFFFFF'");
    expect(src).toContain("color: dark ? '#F8FAFC' : '#0F172A'");
    expect(src).toContain("color: dark ? '#94A3B8' : '#475569'");
    expect(contrast('#94A3B8', '#1E293B')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#F8FAFC', '#1E293B')).toBeGreaterThanOrEqual(4.5);
  });

  it('PlanPaymentModal: superficie, tinta y acento ya tenían variante oscura', () => {
    const src = read('../components/PlanPaymentModal.jsx');
    expect(src).toContain("const accent = dark ? '#70ADFF' : '#0066CC'");
    expect(src).toContain("const surface = dark ? '#202023' : '#FFFFFF'");
    expect(src).toContain("const ink = dark ? '#F5F5F7' : '#1D1D1F'");
    expect(src).toContain('color: dark ? "#101827" : "#fff"');
    expect(contrast('#101827', '#70ADFF')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#FFFFFF', '#0066CC')).toBeGreaterThanOrEqual(4.5);
  });

  it('SurpriseModal: el resto del modal usa dBg/dText/dSub/dCard (alias de T)', () => {
    const src = read('../components/SurpriseModal.jsx');
    expect(src).toContain('const dBg    = T.bg');
    expect(src).toContain('const dText  = T.text');
    expect(src).toContain('const dCard  = dark ? T.card');
  });
});
