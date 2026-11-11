import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { TRANSLATIONS } from '../lib/i18n.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// La ruta /negocios debe estar registrada en TODAS las listas de rutas del
// sistema: si falta una sola, la página redirige a una supuesta ciudad
// "Negocios" (o la trata como slug de ciudad).
const NEGOCIOS_KEYS = [
  'negocios_eyebrow', 'negocios_h1', 'negocios_sub',
  'negocios_stat_negocios', 'negocios_stat_ciudades', 'negocios_stat_eventos', 'negocios_stat_tours',
  'negocios_beneficios_titulo', 'negocios_beneficios_sub',
  'negocios_ben_mapa_titulo', 'negocios_ben_mapa_texto',
  'negocios_ben_google_titulo', 'negocios_ben_google_texto',
  'negocios_ben_whatsapp_titulo', 'negocios_ben_whatsapp_texto',
  'negocios_ben_menu_titulo', 'negocios_ben_menu_texto',
  'negocios_ben_eventos_titulo', 'negocios_ben_eventos_texto',
  'negocios_ben_datos_titulo', 'negocios_ben_datos_texto',
  'negocios_como_titulo',
  'negocios_paso1_titulo', 'negocios_paso1_texto',
  'negocios_paso2_titulo', 'negocios_paso2_texto',
  'negocios_paso3_titulo', 'negocios_paso3_texto',
  'negocios_planes_titulo', 'negocios_planes_sub',
  'negocios_badge_popular', 'negocios_badge_mejor', 'negocios_prueba_gratis',
  'negocios_cta_probar', 'negocios_cta_premium',
  'negocios_plan_free_desc', 'negocios_plan_pro_desc', 'negocios_plan_elite_desc',
  'negocios_faq_titulo',
  'negocios_faq1_q', 'negocios_faq1_a',
  'negocios_faq2_q', 'negocios_faq2_a',
  'negocios_faq3_q', 'negocios_faq3_a',
  'negocios_faq4_q', 'negocios_faq4_a',
  'negocios_faq5_q', 'negocios_faq5_a',
  'negocios_faq6_q', 'negocios_faq6_a',
  'negocios_cierre_titulo', 'negocios_cierre_sub',
];

describe('ruta /negocios registrada en todas las listas del sistema', () => {
  it('AppRouter.jsx: NON_HOME_PREFIXES incluye /negocios', () => {
    const src = read('../router/AppRouter.jsx');
    const m = src.match(/const NON_HOME_PREFIXES = \[([^\]]+)\]/);
    expect(m).not.toBeNull();
    expect(m[1]).toContain("'/negocios'");
  });

  it('App.jsx: NON_HOME_PREFIXES incluye /negocios', () => {
    const src = read('../App.jsx');
    const m = src.match(/const NON_HOME_PREFIXES = \[([^\]]+)\]/);
    expect(m).not.toBeNull();
    expect(m[1]).toContain("'/negocios'");
  });

  it('App.jsx: nonHomePrefixes de la rama de carga incluye /negocios', () => {
    const src = read('../App.jsx');
    const m = src.match(/const nonHomePrefixes = \[([^\]]+)\]/);
    expect(m).not.toBeNull();
    expect(m[1]).toContain("'/negocios'");
  });

  it('useAppInitialization.js: SYSTEM_ROUTES incluye "negocios"', () => {
    const src = read('../hooks/useAppInitialization.js');
    const m = src.match(/const SYSTEM_ROUTES = \[([^\]]+)\]/);
    expect(m).not.toBeNull();
    expect(m[1]).toContain('"negocios"');
  });

  it('useAppInitialization.js: initialView resuelve /negocios', () => {
    const src = read('../hooks/useAppInitialization.js');
    expect(src).toContain('if (p.startsWith("/negocios")) return "negocios";');
  });

  it('useUIStore.js: INVALID_CITY_SLUGS incluye "negocios"', () => {
    const src = read('../store/useUIStore.js');
    const m = src.match(/const INVALID_CITY_SLUGS = new Set\(\[([\s\S]*?)\]\)/);
    expect(m).not.toBeNull();
    expect(m[1]).toContain('"negocios"');
  });

  it('api/sitemap.xml.js: rutas estáticas incluyen /negocios', () => {
    const src = read('../../api/sitemap.xml.js');
    expect(src).toContain("'/negocios'");
  });
});

describe('ruta /negocios montada en el router', () => {
  it('AppRouter.jsx tiene el lazy import de BusinessLanding', () => {
    const src = read('../router/AppRouter.jsx');
    expect(src).toContain("const BusinessLanding = React.lazy(() => import('../components/BusinessLanding.jsx'));");
  });

  it('AppRouter.jsx tiene <Route path="/negocios"', () => {
    const src = read('../router/AppRouter.jsx');
    expect(src).toContain('<Route path="/negocios"');
    expect(src).toContain('onStartPaidPlan={startPaidPlan}');
  });

  it('AppRouter.jsx recibe startPaidPlan por props', () => {
    const src = read('../router/AppRouter.jsx');
    expect(src).toContain('startPaidPlan\n  } = props;');
  });

  it('App.jsx pasa startPaidPlan a AppRouter', () => {
    const src = read('../App.jsx');
    expect(src).toContain('startPaidPlan={startPaidPlan}');
  });
});

describe('enlaces de entrada a /negocios', () => {
  it('SideMenu.jsx enlaza a /negocios', () => {
    const src = read('../components/SideMenu.jsx');
    expect(src).toContain("routerNavigate('/negocios')");
    expect(src).toContain('t("menu_para_negocios", "Para Negocios")');
  });

  it('Footer.jsx enlaza a /negocios', () => {
    const src = read('../components/Footer.jsx');
    expect(src).toContain("'/negocios'");
    expect(src).toContain('t("cuenta_planes_titulo", "Planes para tu negocio")');
  });
});

describe('i18n: las 53 claves negocios_* existen en es y en', () => {
  it('las 53 claves existen y no están vacías en ambos idiomas', () => {
    expect(NEGOCIOS_KEYS).toHaveLength(53);
    for (const k of NEGOCIOS_KEYS) {
      expect(TRANSLATIONS.es[k], `es.${k}`).toBeTruthy();
      expect(TRANSLATIONS.en[k], `en.${k}`).toBeTruthy();
    }
  });
});

// /negocios es LA página de planes (10 nov 2026): la antigua «ver planes»
// (PlansPage, /precios) se eliminó y /precios redirige a /negocios. El pago
// sigue funcionando: el modal de Stripe vive en PlanPaymentModal y lo abre
// App.jsx cuando hay un plan pendiente.
describe('/precios redirige a /negocios y PlansPage ya no existe', () => {
  it('AppRouter.jsx: la ruta /precios es una redirección a /negocios', () => {
    const src = read('../router/AppRouter.jsx');
    expect(src).toContain('<Route path="/precios" element={<Navigate to="/negocios" replace />} />');
    expect(src).not.toContain('PlansPage');
  });

  it('useAppInitialization.js: /precios resuelve a la vista "negocios"', () => {
    const src = read('../hooks/useAppInitialization.js');
    expect(src).toContain('if (p.startsWith("/precios")) return "negocios";');
  });

  it('App.jsx: la vista "precios" navega a /negocios', () => {
    const src = read('../App.jsx');
    expect(src).toContain('else if (v === "precios") navigate("/negocios");');
    expect(src).toContain('else if (v === "precios") path = "/negocios";');
  });

  it('AccountView.jsx: «Ver planes» de Mi Negocio lleva a /negocios', () => {
    const src = read('../components/AccountView.jsx');
    expect(src).toContain('else if (act === "business_plans") navigate("/negocios");');
    expect(src).not.toContain('setShowPlans');
  });

  it('App.jsx: con un plan pendiente se abre el modal de pago (PlanPaymentModal)', () => {
    const src = read('../App.jsx');
    expect(src).toContain("const PlanPaymentModal = lazy(() => import('./components/PlanPaymentModal.jsx'));");
    expect(src).toContain('<PlanPaymentModal');
    expect(src).toContain('pendingPlan={pendingPlan}');
    expect(src).toContain('onConsumePendingPlan={() => setPendingPlan(null)}');
    expect(src).not.toContain('PlansPage');
  });

  it('PlansPage.jsx ya no existe en el repo', () => {
    expect(existsSync(new URL('../components/PlansPage.jsx', import.meta.url))).toBe(false);
  });

  it('PlanPaymentModal.jsx existe y conserva el checkout de Stripe', () => {
    expect(existsSync(new URL('../components/PlanPaymentModal.jsx', import.meta.url))).toBe(true);
    const src = read('../components/PlanPaymentModal.jsx');
    expect(src).toContain('/api/stripe-checkout');
    expect(src).toContain('isTrialSelection');
    expect(src).toContain('onConsumePendingPlan');
  });
});
