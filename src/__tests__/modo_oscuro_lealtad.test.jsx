// Modo oscuro de LEALTAD (14 Nov 2026, lote 4).
//
// Bug reportado por Jonathan (con captura): en la ficha del cliente
// (LoyaltyMemberDetail) TODAS las tarjetas eran blancas fijas
// (`T.surface || '#fff'`, y T.surface NO existe en main) mientras el
// texto era del tema (casi blanco en oscuro): el «1» de Sellos
// obtenidos, el «0» de Recompensas, «Progreso de tarjeta», la fecha de
// Última visita, el email y «Sello #1» del historial quedaban
// invisibles (1.1:1 / 2.56:1). La corrección es `T.surface || T.card`
// (#232326 en oscuro, #FFFFFF en claro; con la `surface` que añade el
// coordinador queda idéntico).
//
// Además: el botón «− Quitar último sello» usaba #DC2626 sobre oscuro
// (3.25:1) → T.red (#F07060, 5.37:1); «¡Premio listo para canjear!»
// usaba #15803D sobre oscuro (3.12:1) → #4ADE80 (8.99:1); la caja de
// la URL del QR en el diseñador usaba T.surface || T.border (4.07:1)
// → T.surface || T.card (6.12:1); la etiqueta «Premio Alcanzado» de
// ScanView usaba #D97706 a 12 px (2.86:1) → #FBBF24 en oscuro
// (9.39:1); el asistente (LoyaltyWizard) y la hoja de confirmación
// (LoyaltyConfirmSheet) eran blancos fijos y ahora usan el tema en
// oscuro. El modo claro queda pixel a pixel igual en todos.
//
// Patrón de render estático como reservaciones_modo_oscuro.test.jsx:
// renderToStaticMarkup + getT(dark) directo (estos componentes reciben
// T por prop, no leen el store).
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('../lib/supabase.js', () => ({
  sb: {
    get: vi.fn(async () => []),
    post: vi.fn(async () => []),
    patch: vi.fn(async () => []),
    del: vi.fn(async () => []),
    delWhere: vi.fn(async () => []),
    getUser: vi.fn(async () => null),
  },
}));

import { getT } from '../lib/constants.js';
import LoyaltyMemberDetail from '../components/loyalty/LoyaltyMemberDetail.jsx';
import LoyaltyConfirmSheet from '../components/loyalty/LoyaltyConfirmSheet.jsx';
import LoyaltyWizard from '../components/loyalty/LoyaltyWizard.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Contraste WCAG (misma fórmula que usa el resto del lote): luminancia
// relativa sRGB y cociente (L1 + 0.05) / (L2 + 0.05).
const luminance = (hex) => {
  const c = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => {
    const v = parseInt(c.substr(i, 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const MEMBER = {
  id: 'm1', biz_id: 'b1', name: 'Jonathan Arana', email: 'jgarana18@gmail.com',
  stamps: 3, enrolled_at: '2026-11-10T19:20:00.000Z', last_stamp_at: '2026-11-14T16:04:00.000Z',
  whatsapp: '523223792428',
};
const CONFIG = { stamps_required: 5, reward_text: 'Un café gratis' };

const renderDetail = (dark, member = MEMBER) => renderToStaticMarkup(
  <LoyaltyMemberDetail
    member={member} config={CONFIG} business={{ name: 'Eduardo Barber' }}
    T={getT(dark)} isMobile={false} onClose={() => {}} onGiveStamp={async () => {}} onRemoveStamp={async () => {}}
  />
);

const WIZARD_CONFIG = {
  type: 'stamps|star', primary_color: '#C4841D', bg_color: '#1B1107',
  text_color: '#F5E6D3', reward_text: '2 Tostadas gratis', stamps_required: 5, logo_url: null,
};
const renderWizard = (dark, T) => renderToStaticMarkup(
  <LoyaltyWizard
    T={T}
    wizardStep={0} setWizardStep={() => {}} config={WIZARD_CONFIG} setConfig={() => {}}
    business={{ name: 'Carrito La Paz Tostadas de Atún' }} isMobile handleSave={() => {}} saving={false}
  />
);

describe('modo oscuro lealtad: el bug de la ficha del cliente', () => {
  it('en oscuro las tarjetas de la ficha NO son blancas: fondo #232326 y texto legible', () => {
    const html = renderDetail(true);
    expect(html).toContain('Sellos obtenidos');
    expect(html).toContain('Progreso de tarjeta');
    expect(html).toContain('Última visita');
    // cardStyle con T.surface || T.card: #232326 en oscuro.
    expect(html).toContain('background:#232326');
    expect(html).not.toContain('background:#fff');
    expect(html).not.toContain('background:#FFFFFF');
    // Texto del tema sobre esa tarjeta: #F4F4F5 y #A1A1AA.
    expect(html).toContain('color:#F4F4F5');
    expect(html).toContain('color:#A1A1AA');
  });

  it('en claro las tarjetas siguen blancas, pixel a pixel como antes', () => {
    const html = renderDetail(false);
    expect(html).toContain('background:#FFFFFF');
    expect(html).not.toContain('background:#232326');
    expect(html).toContain('color:#0F1A14');
  });

  it('«Quitar último sello» usa el rojo oscuro del tema en oscuro y #DC2626 en claro', () => {
    const dark = renderDetail(true);
    expect(dark).toContain('Quitar último sello');
    expect(dark).toContain('color:#F07060');
    expect(dark).not.toContain('color:#DC2626');
    const light = renderDetail(false);
    expect(light).toContain('color:#DC2626');
    expect(light).not.toContain('color:#F07060');
  });

  it('«¡Premio listo para canjear!» usa verde claro en oscuro y #15803D en claro', () => {
    const completed = { ...MEMBER, stamps: 5 };
    const dark = renderDetail(true, completed);
    expect(dark).toContain('¡Premio listo para canjear!');
    expect(dark).toContain('color:#4ADE80');
    const light = renderDetail(false, completed);
    expect(light).toContain('¡Premio listo para canjear!');
    expect(light).toContain('color:#15803D');
  });

  it('los pares texto/fondo que se arreglan pasan 4.5:1 (y el bug viejo no)', () => {
    // El bug: texto del tema sobre #fff fijo.
    expect(contrast('#F4F4F5', '#FFFFFF')).toBeLessThan(4.5);
    expect(contrast('#A1A1AA', '#FFFFFF')).toBeLessThan(4.5);
    // La corrección: texto del tema sobre T.card oscuro.
    expect(contrast('#F4F4F5', '#232326')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#A1A1AA', '#232326')).toBeGreaterThanOrEqual(4.5);
    // Rojo y verde de las acciones sobre la tarjeta oscura.
    expect(contrast('#F07060', '#232326')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#4ADE80', '#232326')).toBeGreaterThanOrEqual(4.5);
    // URL del QR: T.sub sobre T.card (antes sobre T.border, 4.07:1).
    expect(contrast('#A1A1AA', '#3F3F46')).toBeLessThan(4.5);
    expect(contrast('#A1A1AA', '#232326')).toBeGreaterThanOrEqual(4.5);
  });
});

describe('modo oscuro lealtad: hoja de confirmación', () => {
  const renderSheet = (T) => renderToStaticMarkup(
    <LoyaltyConfirmSheet
      T={T} title="¿Quitar el Sello #3?" message="El movimiento queda registrado en el historial."
      confirmLabel="Sí, quitar sello" onConfirm={() => {}} onCancel={() => {}}
    />
  );

  it('en oscuro la hoja es oscura con texto del tema; el confirmar sigue en #DC2626', () => {
    const html = renderSheet(getT(true));
    expect(html).toContain('background:#232326');
    expect(html).toContain('color:#F4F4F5');
    expect(html).toContain('color:#A1A1AA');
    expect(html).toContain('background:#DC2626');
    expect(html).not.toContain('background:#fff');
  });

  it('en claro y sin T se ve exacto como antes (compatibilidad con los tests viejos)', () => {
    const light = renderSheet(getT(false));
    // Con T, la hoja usa T.card: #FFFFFF en claro (mismo píxel que #fff).
    expect(light).toContain('background:#FFFFFF');
    expect(light).toContain('color:#0F172A');
    expect(light).toContain('color:#475569');
    const noT = renderSheet(undefined);
    expect(noT).toContain('background:#fff');
    expect(noT).toContain('¿Quitar el Sello #3?');
  });
});

describe('modo oscuro lealtad: asistente de creación', () => {
  it('en oscuro el asistente usa el tema (sin superficies blancas fijas)', () => {
    const html = renderWizard(true, getT(true));
    expect(html).toContain('Elige tus colores');
    expect(html).toContain('background:#18181B');
    expect(html).toContain('background:#232326');
    expect(html).not.toContain('background:#fff');
    // «Paso 1 de 3» en azul claro (el #3B82F6 quedaba a 4.26:1).
    expect(html).toContain('color:#60A5FA');
    expect(html).not.toContain('color:#3B82F6');
    // La vista previa NO se toca: sigue con los colores del negocio.
    expect(html).toContain('background:#1B1107');
    expect(contrast('#60A5FA', '#232326')).toBeGreaterThanOrEqual(4.5);
  });

  it('en claro y sin T se ve exacto como antes', () => {
    const light = renderWizard(false, getT(false));
    // Con T, la hoja usa T.card: #FFFFFF en claro (mismo píxel que #fff).
    expect(light).toContain('background:#FFFFFF');
    expect(light).toContain('background:#F4F7F9');
    expect(light).toContain('color:#3B82F6');
    expect(light).toContain('color:#0F172A');
    const noT = renderWizard(false, undefined);
    expect(noT).toContain('background:#fff');
    expect(noT).toContain('Elige tus colores');
  });
});

describe('modo oscuro lealtad: diseñador y escaneo (fuente)', () => {
  it('el diseñador usa T.surface || T.card en la caja de la URL (no T.border ni #fff)', () => {
    const src = read('../components/loyalty/LoyaltyDesigner.jsx');
    expect(src).toContain('T.surface || T.card');
    expect(src).not.toContain('T.surface || T.border');
    expect(src).not.toContain("T.surface || '#fff'");
    expect(src).not.toContain('T.surface || "#fff"');
    // El asistente y la hoja reciben el tema.
    expect(src).toContain('<LoyaltyWizard');
    expect(src).toContain('T={T}');
  });

  it('la ficha pasa el tema a la hoja de confirmación', () => {
    const src = read('../components/loyalty/LoyaltyMemberDetail.jsx');
    expect(src).toContain('T.surface || T.card');
    expect(src).not.toContain("T.surface || '#fff'");
    expect(src).toContain('<LoyaltyConfirmSheet');
    expect(src).toContain('T={T}');
  });

  it('ScanView: la etiqueta «Premio Alcanzado» usa ámbar claro en oscuro', () => {
    const src = read('../views/ScanView.jsx');
    expect(src).toContain('#FBBF24');
    expect(src).toContain('T?.surface || T?.card');
    expect(contrast('#FBBF24', '#232326')).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#D97706', '#FEF3C7')).toBeLessThan(4.5);
  });

  it('la tarjeta del negocio y el QR no se tocan: siguen con los colores del negocio', () => {
    // LoyaltyCardView: tarjeta con card.bg_color y botón Google Wallet de marca.
    const view = read('../views/LoyaltyCardView.jsx');
    expect(view).toContain('background: card.bg_color');
    expect(view).toContain('Añadir a Google Wallet');
    expect(view).toContain('background: "#fff", color: "#3c4043"');
    // LoyaltyCard: colores del negocio por diseño.
    expect(read('../components/loyalty/LoyaltyCard.jsx')).toContain("background: card.bg_color || '#1a1a1a'");
    // LoyaltyCardModal: QR blanco intencional y tarjeta del negocio.
    const modal = read('../views/LoyaltyCardModal.jsx');
    expect(modal).toContain('background: card.bg_color');
    expect(modal).toContain('bgColor="#ffffff"');
    // TrofeoLogro: píldora blanca con texto oscuro (isla clara legible).
    expect(read('../components/TrofeoLogro.jsx')).toContain("color: '#111', background: '#fff'");
    // WhatsApp: verde de marca.
    expect(read('../components/loyalty/LoyaltyWhatsAppButton.jsx')).toContain('"#25D366"');
  });
});
