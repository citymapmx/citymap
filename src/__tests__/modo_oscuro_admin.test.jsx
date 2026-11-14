import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getT } from '../lib/constants.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// 14 nov 2026 — lote 5 modo oscuro: panel del dueño + panel admin.
//
// Contexto: el panel admin vive sobre una cáscara clara fija (#F7F8F6) con
// tarjetas blancas fijas; varias secciones usaban T.* del tema, así que en
// modo oscuro el texto claro (#F4F4F5 / #A1A1AA) caía sobre fondo claro
// (1,03:1 / 2,41:1, ilegible). La corrección fuerza paleta clara local (LT)
// dentro de la cáscara: LT === T en claro y en /admin (T sin .dark), así que
// el claro queda pixel a pixel igual. En la tienda (fondo T.bg) los botones
// con fondo T.green llevaban texto blanco: en oscuro T.green es #F4F4F5,
// blanco sobre casi-blanco (1,1:1); ahora usan el patrón del repo
// `T.dark ? '#18181B' : '#FFFFFF'` (ya usado en AdminPanel PushTab).
//
// Contrastes medidos (WCAG): #F4F4F5/#FFFFFF 1,10:1 · #A1A1AA/#FFFFFF 2,56:1 ·
// #A1A1AA/#F7F8F6 2,41:1 · #F4F4F5/#F7F8F6 1,03:1 · #18181B/#F4F4F5 16,12:1 ·
// #0F1A14/#FFFFFF 17,82:1 · #5A6872/#FFFFFF 5,74:1 · #6B7280/#FFFFFF 4,83:1 ·
// #DC2626/#FEF2F2 4,34:1 · #18181B/#FFD700 12,63:1 · #18181B/#CD7F32 5,63:1.

vi.mock('../lib/supabase.js', () => ({
  sb: { get: vi.fn(async () => []), post: vi.fn(), patch: vi.fn(), del: vi.fn(), delWhere: vi.fn() },
}));

const { MOCK_CTX } = vi.hoisted(() => ({
  MOCK_CTX: {
    dark: false,
    darkT: { text: '#F4F4F5', sub: '#A1A1AA', bg: '#18181B', white: '#232326', border: '#3F3F46', green: '#F4F4F5', greenL: '#232326', red: '#F07060', iconBg: '#2D2D31', dark: true },
    lightT: { text: '#0F1A14', sub: '#6B7280', bg: '#FFFFFF', white: '#FFFFFF', border: '#E5E7EB', green: '#000000', greenL: '#F3F4F6', red: '#DC2626', iconBg: '#F1F5F9', dark: false },
  },
}));
vi.mock('../context/AppContext', () => ({
  useAppContext: () => ({ T: MOCK_CTX.dark ? MOCK_CTX.darkT : MOCK_CTX.lightT }),
}));

import AdminWelcomeTab from '../components/admin/AdminWelcomeTab.jsx';
import AdminActivityTab from '../components/admin/AdminActivityTab.jsx';
import AdminDashboardTab from '../components/admin/AdminDashboardTab.jsx';
import StoreProductsTab from '../components/store/StoreProductsTab.jsx';
import StoreOptionsTab from '../components/store/StoreOptionsTab.jsx';
import StoreMonetizationTab from '../components/store/StoreMonetizationTab.jsx';
import GamificationWidget from '../components/admin/GamificationWidget.jsx';

const lum = (hex) => {
  const c = hex.replace('#', '');
  const f = (v) => { const x = parseInt(v, 16) / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
  return 0.2126 * f(c.slice(0, 2)) + 0.7152 * f(c.slice(2, 4)) + 0.0722 * f(c.slice(4, 6));
};
const ratio = (a, b) => {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

afterEach(() => { MOCK_CTX.dark = false; });

const BIZ_ACT = { id: 'b1', name: 'Taquería X', status: 'approved', city_slug: 'guadalajara', category: 'Tacos', plan: 'free' };
const PROD = { id: 'p1', name: 'Taco', price: 50, image_url: null, is_available: true, store_product_options: [] };
const CAT = { id: 'c1', name: 'Tacos', store_products: [PROD] };
const noop = () => {};

describe('contraste: los pares que se arreglaron cumplen WCAG', () => {
  it('texto oscuro sobre claro y viceversa ≥ 4.5:1; el rojo fijo sobre #FEF2F2 ≥ 4.3:1', () => {
    expect(ratio('#0F1A14', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#5A6872', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#6B7280', '#FFFFFF')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#18181B', '#F4F4F5')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#DC2626', '#FEF2F2')).toBeGreaterThanOrEqual(4.3);
    // Texto oscuro sobre los colores de nivel (oro/bronce): antes era
    // blanco sobre oro (1,40:1) y sobre plata (1,82:1).
    expect(ratio('#18181B', '#FFD700')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#18181B', '#CD7F32')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#18181B', '#C0C0C0')).toBeGreaterThanOrEqual(4.5);
    // Texto del tema oscuro sobre tarjeta oscura (sin cambios).
    expect(ratio('#F4F4F5', '#232326')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#A1A1AA', '#232326')).toBeGreaterThanOrEqual(4.5);
  });

  it('los pares rotos de antes quedan documentados como < 3:1', () => {
    expect(ratio('#F4F4F5', '#FFFFFF')).toBeLessThan(3);
    expect(ratio('#A1A1AA', '#FFFFFF')).toBeLessThan(3);
    expect(ratio('#F4F4F5', '#F7F8F6')).toBeLessThan(3);
    expect(ratio('#FFFFFF', '#FFD700')).toBeLessThan(3);
  });
});

describe('AdminWelcomeTab: saludo y accesos legibles en oscuro, iguales en claro', () => {
  it('en oscuro el h2/p y las tarjetas usan paleta clara fija (sin texto claro sobre claro)', () => {
    const html = renderToStaticMarkup(React.createElement(AdminWelcomeTab, { setTab: noop, T: getT(true) }));
    expect(html).toContain('color:#0F1A14');
    expect(html).toContain('color:#5A6872');
    expect(html).toContain('background:#FFFFFF');
    expect(html).not.toContain('color:#F4F4F5');
    expect(html).not.toContain('color:#A1A1AA');
    expect(html).not.toContain('background:#18181B');
  });

  it('en claro se ve exacto como antes', () => {
    const html = renderToStaticMarkup(React.createElement(AdminWelcomeTab, { setTab: noop, T: getT(false) }));
    expect(html).toContain('color:#0F1A14');
    expect(html).toContain('color:#6B7280');
    expect(html).toContain('background:#FFFFFF');
  });
});

describe('AdminActivityTab: filas y encabezado legibles en oscuro, iguales en claro', () => {
  const renderActivity = (dark) => renderToStaticMarkup(
    React.createElement(AdminActivityTab, { data: { biz: [BIZ_ACT], analytics: [] }, sb: {}, onToast: noop, load: noop, T: getT(dark) })
  );

  it('en oscuro no queda texto del tema claro sobre la cáscara clara', () => {
    const html = renderActivity(true);
    expect(html).toContain('color:#0F1A14');
    expect(html).toContain('color:#5A6872');
    expect(html).not.toContain('color:#F4F4F5');
    expect(html).not.toContain('color:#A1A1AA');
    expect(html).not.toContain('background:#18181B');
    // La fila es blanca y la etiqueta "vistas" usa el sub claro fijo.
    expect(html).toContain('background:#FFFFFF');
  });

  it('en claro se ve exacto como antes', () => {
    const html = renderActivity(false);
    expect(html).toContain('color:#0F1A14');
    expect(html).toContain('color:#6B7280');
    expect(html).toContain('background:#FFFFFF');
  });
});

describe('AdminDashboardTab: las MetricCard quedan blancas en oscuro como el resto del tab', () => {
  const renderDash = (dark) => renderToStaticMarkup(
    React.createElement(AdminDashboardTab, { data: { biz: [], events: [], analytics: [], cities: [{ slug: 'gdl', name: 'Guadalajara' }] }, dashCityFilter: 'all', setDashCityFilter: noop, T: getT(dark), onToast: noop, cloudListAllFiles: noop, cloudDeleteBatch: noop, sb: {} })
  );

  it('en oscuro las tarjetas de métricas son blancas con texto oscuro (sin islas oscuras)', () => {
    const html = renderDash(true);
    expect(html).toContain('background:#FFFFFF');
    expect(html).toContain('color:#0F1A14');
    expect(html).not.toContain('background:#232326');
    expect(html).not.toContain('color:#F4F4F5');
  });

  it('en claro se ve exacto como antes', () => {
    const html = renderDash(false);
    expect(html).toContain('background:#FFFFFF');
    expect(html).toContain('color:#6B7280');
    expect(html).toContain('color:#0F1A14');
  });
});

describe('AdminPanel: Pendientes y Push usan paleta clara fija en oscuro', () => {
  it('la sección Pendientes ya no usa T.* (reclamos, negocios y eventos)', () => {
    const src = read('../components/AdminPanel.jsx');
    const pend = src.slice(src.indexOf('─ PENDIENTES ─'), src.indexOf('─ MULTIMEDIA ─'));
    expect(pend).not.toMatch(/(?<![A-Za-z])T\./);
    expect(pend).toContain('background: LT.white');
    expect(pend).toContain('color: LT.text');
    expect(pend).toContain('color: LT.sub');
  });

  it('PushTab usa LT y los botones de envío conservan T.green + guard T.dark', () => {
    const src = read('../components/AdminPanel.jsx');
    const push = src.slice(src.indexOf('function PushTab'));
    expect(push).toContain('const LT = T.dark ?');
    expect(push).not.toMatch(/(?<![A-Za-z])T\.text/);
    expect(push).not.toMatch(/(?<![A-Za-z])T\.sub/);
    expect(push).not.toMatch(/(?<![A-Za-z])T\.white/);
    const sends = push.match(/background: T\.green, color: T\.dark \? "#18181B" : "#FFFFFF"/g) || [];
    expect(sends.length).toBe(2);
  });

  it('las MetricCard del panel (detalle de analíticas) usan paleta clara local', () => {
    const src = read('../components/AdminPanel.jsx');
    const card = src.slice(0, src.indexOf('function AdminPanel'));
    expect(card).toContain('const LT = T.dark ?');
    expect(card).toContain('background: LT.white');
  });
});

describe('tienda: botones sobre T.green llevan texto oscuro en oscuro', () => {
  const renderProds = (dark) => renderToStaticMarkup(
    React.createElement(StoreProductsTab, { business: { id: 'b1' }, currentCat: CAT, loadData: noop, isCatalog: false, activeProd: null, setActiveProd: noop, view: 'prods', setView: noop, inpH: {}, T: getT(dark) })
  );

  it('StoreProductsTab: «Agregar Nuevo Producto» y «Guardar producto» legibles en oscuro', () => {
    const html = renderProds(true);
    expect(html).toContain('background:#F4F4F5;color:#18181B');
    expect(html).not.toContain('background:#F4F4F5;color:#fff');
    // Knob blanco con borde visible sobre la pista clara.
    expect(html).toContain('border:1px solid #3F3F46');
    // Papelera sobre pastilla fija con rojo oscuro (4,34:1).
    expect(html).toContain('color:#DC2626');
  });

  it('StoreProductsTab: en claro el botón sigue negro con texto blanco', () => {
    const html = renderProds(false);
    expect(html).toContain('background:#000000;color:#FFFFFF');
    expect(html).toContain('border:none');
  });

  it('StoreOptionsTab: «Agregar Opción» legible en oscuro, igual en claro', () => {
    const renderOpts = (dark) => renderToStaticMarkup(
      React.createElement(StoreOptionsTab, { currentProd: { id: 'p1', name: 'Taco', store_product_options: [] }, loadData: noop, view: 'opts', setView: noop, inpH: {}, T: getT(dark) })
    );
    expect(renderOpts(true)).toContain('background:#F4F4F5;color:#18181B');
    expect(renderOpts(false)).toContain('background:#000000;color:#FFFFFF');
    const src = read('../components/store/StoreOptionsTab.jsx');
    // Las 4 tarjetas de tipo de modificador: texto oscuro sobre T.text en oscuro.
    expect((src.match(/\(T\.dark \? "#18181B" : "#FFFFFF"\) : T\.text/g) || []).length).toBe(4);
    expect(src).not.toContain("? '#fff' : T.text");
  });

  it('StoreMonetizationTab: «Guardar Cambios» legible en oscuro, igual en claro', () => {
    const renderMl = (dark) => renderToStaticMarkup(
      React.createElement(StoreMonetizationTab, { business: { id: 'b1', mercado_libre_url: '', affiliate_products: [] }, T: getT(dark), inpH: {}, profile: { is_admin: true } })
    );
    expect(renderMl(true)).toContain('background:#F4F4F5;color:#18181B');
    expect(renderMl(false)).toContain('background:#000000;color:#FFFFFF');
  });

  it('StoreCategoriesTab: botón OK de renombrar usa el patrón T.dark', () => {
    const src = read('../components/store/StoreCategoriesTab.jsx');
    expect(src).toContain("color: T.dark ? '#18181B' : '#FFFFFF'");
    expect(src).not.toContain("background: T.green, color: '#fff'");
  });
});

describe('GamificationWidget: insignia de nivel legible en ambos modos', () => {
  it('en oscuro el nivel Oro lleva texto oscuro sobre dorado (antes blanco, 1,40:1)', () => {
    MOCK_CTX.dark = true;
    const html = renderToStaticMarkup(React.createElement(GamificationWidget, { ownerView: { rating: 4.8, reviews_count: 120 } }));
    expect(html).toContain('background:#FFD700');
    expect(html).toContain('color:#18181B');
    expect(html).not.toContain('color:#fff');
    MOCK_CTX.dark = false;
  });

  it('en oscuro «Nuevo» usa fondo del tema (antes #f1f5f9 fijo con texto claro, 1,00:1)', () => {
    MOCK_CTX.dark = true;
    const html = renderToStaticMarkup(React.createElement(GamificationWidget, { ownerView: { rating: 0, reviews_count: 0 } }));
    expect(html).toContain('background:#2D2D31');
    expect(html).not.toContain('background:#f1f5f9');
    MOCK_CTX.dark = false;
  });

  it('en claro «Nuevo» queda igual que antes (#F1F5F9)', () => {
    const html = renderToStaticMarkup(React.createElement(GamificationWidget, { ownerView: { rating: 0, reviews_count: 0 } }));
    expect(html).toContain('background:#F1F5F9');
  });
});

describe('verificados sin cambios: panel del dueño y resto del admin', () => {
  it('OwnerDashboardView y OwnerStatsView usan solo T.* (sin colores fijos que se rompan en oscuro)', () => {
    for (const f of ['../views/OwnerDashboardView.jsx', '../views/OwnerStatsView.jsx']) {
      const src = read(f);
      expect(src).not.toMatch(/#[0-9A-Fa-f]{6}/);
      expect(src).toContain('background: T.bg');
      expect(src).toContain('background: T.white');
    }
  });

  it('AdminNotifs usa T.* de forma consistente (tarjetas, texto y sub del tema)', () => {
    const src = read('../components/AdminNotifs.jsx');
    expect(src).toContain('background: T.white');
    expect(src).toContain('color: T.text');
    expect(src).toContain('color: T.sub');
  });

  it('AdminBizTab no usa T (isla clara fija con RichTextEditor) y AdminApp sigue con T fija clara', () => {
    expect(read('../components/admin/AdminBizTab.jsx')).not.toMatch(/(?<![A-Za-z])T\./);
    expect(read('../AdminApp.jsx')).toContain('bg: "#F8FAFC"');
  });

  it('StorePromotions (menú público) no se tocó: el encabezado sigue con T.text/T.sub', () => {
    const src = read('../components/store/StorePromotions.jsx');
    expect(src).toContain('color:T.text}}>Promociones');
    expect(src).toContain('color:T.sub');
  });

  it('StoreAdminPanel no tiene botones T.green con texto blanco fijo', () => {
    const src = read('../components/store/StoreAdminPanel.jsx');
    expect(src).not.toMatch(/background: T\.green[^}]*color: "#fff"/);
    // El banner de promoción es una isla clara fija intencional.
    expect(src).toContain("background:'#FFFBEB'");
  });
});
