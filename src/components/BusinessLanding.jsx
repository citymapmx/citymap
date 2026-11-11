import { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import Icon from "./ui/Icon.jsx";
import { useUIStore } from "../store/useUIStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { getCountryCode } from "../lib/domain.js";
import CompactCard from "./cards/CompactCard.jsx";
import DestacadoCard from "./cards/DestacadoCard.jsx";
import FeaturedCard from "./cards/FeaturedCard.jsx";
import { getBusinessPricing, buildBusinessPlans } from "../lib/businessPlans.js";
import { NEGOCIOS_STATS_FALLBACK, fetchNegociosStats } from "../lib/negociosStats.js";
import { EJEMPLO_POR_PLAN } from "../lib/negociosEjemplos.js";
import { useCountUp } from "../hooks/useCountUp.js";
import { useTranslation } from "../hooks/useTranslation.js";

// Cifra con conteo animado: sube de 0 a su valor cuando la sección entra en
// pantalla (una sola vez). Antes de eso muestra el valor tal cual.
function StatNumber({ value, active }) {
  const display = useCountUp(value, active);
  return <>{display.toLocaleString("es-MX")}</>;
}



// Visitas desde Google: cifras REALES de Search Console (captura de
// Jonathan del 10 nov 2026, últimos 28 días) del sitio COMPLETO, no por
// negocio y no inventadas. Para actualizarlas, cambiar solo los valores
// de aquí: el texto, las cifras grandes y los ejemplos se arman solos.
// impressionsThousands es el número en miles: 105 = "105 mil" (es) /
// "105K" (en). Ejemplos: clics por página en esos 28 días.
const GOOGLE_SEARCH_CONSOLE = {
  clicks: 446,
  impressionsThousands: 105,
  examples: { formentera: 27, campomar: 15, akami: 14 },
};

// Página /negocios: CityMap para negocios. Mismo lenguaje visual que la
// antigua página de planes (encabezado sticky con blur, maxWidth 1140,
// tarjetas con borde y radio grande, claro/oscuro) y los mismos datos de
// planes del módulo compartido src/lib/businessPlans.js.
export default function BusinessLanding({ T, dark, navigate, user, myBizList, onAddBiz, onStartPaidPlan, setShowAuth }) {
  const { t, lang } = useTranslation();
  const activeCity = useUIStore(s => s.activeCity);
  const cities = useDataStore(s => s.cities);
  const countryCode = getCountryCode(activeCity, cities);
  const pricing = getBusinessPricing(countryCode);
  const plans = buildBusinessPlans(t, pricing, dark);
  const [billing, setBilling] = useState("monthly"); // "monthly" | "annual"
  useEffect(() => { window.scrollTo(0, 0); }, []);

  // Cifras en vivo: se calculan de la base en cada visita (sin caché) y
  // mientras cargan se muestran los valores fijos de antes como reserva.
  const [liveStats, setLiveStats] = useState(NEGOCIOS_STATS_FALLBACK);
  useEffect(() => {
    let cancelled = false;
    fetchNegociosStats().then((s) => { if (!cancelled) setLiveStats(s); });
    return () => { cancelled = true; };
  }, []);

  // La animación de conteo arranca cuando las cifras entran en pantalla.
  const statsRef = useRef(null);
  const [statsInView, setStatsInView] = useState(false);
  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") { setStatsInView(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        setStatsInView(true);
        io.disconnect();
      }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Map the 'plan' DB field to the plan key used here (igual que la antigua página de planes)
  // DB values: free, pro, elite, premium (premium = elite)
  const rawPlan = myBizList?.[0]?.plan || "free";
  const currentPlanKey = rawPlan === "premium" ? "elite" : ["pro", "destacado"].includes(rawPlan) ? "pro" : rawPlan === "elite" ? "elite" : "free";
  const isCurrent = p => Boolean(myBizList?.length) && p.key === currentPlanKey;

  const scrollToPlans = () => { document.getElementById("planes")?.scrollIntoView({ behavior: "smooth" }); };

  const accent = dark ? '#70ADFF' : '#0066CC';
  const surface = dark ? '#202023' : '#FFFFFF';
  const pageBg = dark ? '#161617' : '#F5F5F7';
  const ink = dark ? '#F5F5F7' : '#1D1D1F';
  const muted = dark ? '#ABABB1' : '#6E6E73';
  const line = dark ? '#353538' : '#E5E5E8';

  const stats = [
    { value: liveStats.businesses, label: t("negocios_stat_negocios", "negocios publicados") },
    { value: liveStats.cities, label: t("negocios_stat_ciudades", "ciudades") },
    { value: liveStats.events, label: t("negocios_stat_eventos", "eventos vigentes") },
    { value: liveStats.tours, label: t("negocios_stat_tours", "tours y guías") },
  ];
  // "105 mil" en español, "105K" en inglés (ver GOOGLE_SEARCH_CONSOLE).
  const impressionsDisplay = lang === "en"
    ? `${GOOGLE_SEARCH_CONSOLE.impressionsThousands}K`
    : `${GOOGLE_SEARCH_CONSOLE.impressionsThousands} mil`;
  const benefits = [
    { icon: "pin", title: t("negocios_ben_mapa_titulo", "Te encuentran en el mapa"), text: t("negocios_ben_mapa_texto", "Tu negocio aparece con su pin en el mapa de tu ciudad, junto a los lugares, restaurantes y eventos que la gente ya busca. Con Premium, tu logotipo se ve directo en el mapa.") },
    { icon: "globe", title: t("negocios_ben_google_titulo", "Te encuentran en Google"), text: t("negocios_ben_google_texto", "Tu página queda indexada y aparece en las búsquedas de Google. Con Destacado, tu posicionamiento mejora; con Premium, hasta tu menú interactivo aparece en Google.") },
    { icon: "whatsapp", title: t("negocios_ben_whatsapp_titulo", "Pedidos por WhatsApp, sin comisiones"), text: t("negocios_ben_whatsapp_texto", "Tus clientes ven tu menú, arman su pedido y te lo mandan por WhatsApp. CityMap no cobra comisión por tus ventas: el pago es directo entre tu cliente y tú.") },
    { icon: "menu", title: t("negocios_ben_menu_titulo", "Un menú digital que vende solo"), text: t("negocios_ben_menu_texto", "Con Premium, tu menú es interactivo: fotos, precios, opciones y carrito. Tus clientes piden desde el celular sin llamarte. Con Destacado, tienes tu menú en QR para ponerlo en las mesas del local.") },
    { icon: "calendar", title: t("negocios_ben_eventos_titulo", "Tus eventos y promociones llegan a la gente"), text: t("negocios_ben_eventos_texto", "Con Premium, publicas tus eventos y reservas, lanzas cupones y creas tarjetas de lealtad para que tus clientes regresen.") },
    { icon: "bar_chart", title: t("negocios_ben_datos_titulo", "Sabes qué está funcionando"), text: t("negocios_ben_datos_texto", "Desde tu panel ves tus visitas y tus pedidos, y con Premium tienes estadísticas y soporte prioritario.") },
  ];
  const steps = [
    { n: "1", title: t("negocios_paso1_titulo", "Crea tu perfil gratis"), text: t("negocios_paso1_texto", "Te registras y publicas tu negocio en minutos: nombre, fotos, horarios y contacto.") },
    { n: "2", title: t("negocios_paso2_titulo", "Completa tu información"), text: t("negocios_paso2_texto", "Sube tu portada, tu galería y tu menú. Entre más completo, más te encuentran.") },
    { n: "3", title: t("negocios_paso3_titulo", "Te encuentran y te escriben"), text: t("negocios_paso3_texto", "Tu negocio aparece en el mapa, en el buscador, en la guía de tu ciudad y en Google. Los clientes te escriben directo por WhatsApp.") },
  ];
  const faqs = [
    [t("negocios_faq1_q", "¿Cuánto cuesta empezar?"), t("negocios_faq1_a", "Nada. Crear tu perfil y publicar tu negocio es gratis. Solo pagas si quieres Destacado o Premium.")],
    [t("negocios_faq2_q", "¿Necesito pagar para aparecer en CityMap?"), t("negocios_faq2_a", "No. Con el plan gratuito tu negocio ya tiene su página pública, con teléfono, dirección, horarios y portada.")],
    [t("negocios_faq3_q", "¿CityMap cobra comisión por mis ventas?"), t("negocios_faq3_a", "No. Los pedidos te llegan por WhatsApp y el pago es directo entre tu cliente y tú.")],
    [t("negocios_faq4_q", "¿Puedo probar los planes de pago gratis?"), t("negocios_faq4_a", "Sí. Los planes Destacado y Premium mensuales tienen 7 días de prueba gratis, sin compromiso.")],
    [t("negocios_faq5_q", "¿En qué ciudades está CityMap?"), t("negocios_faq5_a", "En ${count} ciudades, entre ellas Guadalajara, Zapopan, Tlaquepaque, Tepic, Puerto Vallarta, Ciudad de México, Mérida, Monterrey, Cancún y Playa del Carmen.", { count: liveStats.cities })],
    [t("negocios_faq6_q", "¿Qué necesito para registrar mi negocio?"), t("negocios_faq6_a", "Solo tu información básica: nombre, fotos, horarios y un teléfono o WhatsApp para que te contacten.")],
  ];

  const priceNote = p => {
    if (p.key === "free") return t("cuenta_sin_costo", "Sin costo de suscripción.");
    if (billing === "annual") return t("cuenta_cobra_ano", "Se cobra el importe completo del año.");
    if (p.key === "pro" || p.key === "elite") return t("negocios_prueba_gratis", "Pruébalo 7 días gratis (solo en el pago mensual).");
    return t("cuenta_fact_mensual", "Facturación mensual.");
  };
  const planButton = p => {
    if (p.key === "free") {
      return { disabled: Boolean(myBizList?.length), label: myBizList?.length ? t("cuenta_incluido_sin_costo", "Incluido sin costo") : t("cuenta_crear_perfil_gratis", "Crear perfil gratis"), onClick: () => onAddBiz?.() };
    }
    if (isCurrent(p)) {
      return { disabled: true, label: t("cuenta_tu_plan_actual", "Tu plan actual"), onClick: undefined };
    }
    if (p.key === "pro") {
      // La prueba de 7 días solo existe en el pago mensual (igual que
      // Premium/elite): en anual, el CTA normal de pago.
      if (billing === "monthly") {
        return { disabled: false, label: t("negocios_cta_probar", "Probar 7 días gratis"), onClick: () => onStartPaidPlan?.({ key: "pro" }, billing) };
      }
      return { disabled: false, label: t("cuenta_elegir_plan", `Elegir ${p.name}`, { name: p.name }), onClick: () => onStartPaidPlan?.({ key: "pro" }, billing) };
    }
    if (billing === "monthly") {
      return { disabled: false, label: t("negocios_cta_probar", "Probar 7 días gratis"), onClick: () => onStartPaidPlan?.({ key: "elite" }, billing) };
    }
    return { disabled: false, label: t("negocios_cta_premium", "Empezar con Premium"), onClick: () => onStartPaidPlan?.({ key: "elite" }, billing) };
  };

  return (
    <div className="business-landing" style={{ minHeight: '100vh', background: pageBg, color: ink, fontFamily: 'inherit', letterSpacing: 0, '--plans-accent': accent, '--plans-line': line, '--plans-surface': surface, '--plans-shadow': dark ? '0 10px 28px rgba(0,0,0,0.40)' : '0 10px 28px rgba(15,26,20,0.08)', '--plans-shadow-pro': dark ? '0 16px 40px rgba(112,173,255,0.25)' : '0 16px 40px rgba(0,102,204,0.18)' }}>
      <Helmet>
        <title>{`${t("negocios_h1", "Haz que más personas encuentren tu negocio.")} | CityMap`}</title>
        <meta name="description" content={t("negocios_sub", "Publica tu negocio gratis en citymap. Te encuentran en el mapa, en el buscador y en Google, y te escriben directo por WhatsApp, sin comisiones.")} />
        <link rel="canonical" href="https://citymap.mx/negocios" />
      </Helmet>
      <style>{`
        .business-landing * {box-sizing:border-box}
        .business-landing button {font-family:inherit}
        .business-landing button:focus-visible,.business-landing summary:focus-visible {outline:3px solid var(--plans-accent);outline-offset:4px}
        .business-landing .plans-grid{display:grid;grid-template-columns:minmax(0,1fr);gap:16px}
        .business-landing .plans-card{display:flex;flex-direction:column;padding:28px 24px 24px;border:1px solid var(--plans-line);border-radius:28px;background:var(--plans-surface);min-width:0;box-shadow:var(--plans-shadow)}
        .business-landing .plans-card[data-plan="pro"]{order:1;border-color:var(--plans-accent);box-shadow:var(--plans-shadow-pro)}
        .business-landing .plans-card[data-plan="free"]{order:0}
        .business-landing .plans-card[data-plan="elite"]{order:2}
        .business-landing .plans-action{width:100%;min-height:48px;border-radius:999px;font-size:15px;font-weight:600;cursor:pointer;margin-top:20px}
        .business-landing .plans-action:disabled{cursor:default;opacity:.65}
        .business-landing .plans-feature{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.5}
        .business-landing .plans-features{flex:1;display:flex;flex-direction:column;gap:12px;padding-top:22px;margin-top:22px;border-top:1px solid var(--plans-line)}
        .business-landing .stat-card{box-shadow:var(--plans-shadow)}
        .business-landing .benefit-card{box-shadow:var(--plans-shadow)}
        .plans-faq summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:16px;font-size:15px;font-weight:600;line-height:1.5}
        .plans-faq summary::after{content:'+';font-size:20px;font-weight:400}
        .plans-faq[open] summary::after{content:'−'}
        @media(min-width:900px){.business-landing .plans-grid{grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.business-landing .plans-card[data-plan="free"]{order:0}.business-landing .plans-card[data-plan="pro"]{order:1}.business-landing .plans-card[data-plan="elite"]{order:2}}
        @media(prefers-reduced-motion:reduce){.business-landing *{scroll-behavior:auto!important;transition:none!important}}
      `}</style>
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: dark ? 'rgba(22,22,23,.92)' : 'rgba(245,245,247,.92)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${line}` }}>
        <div style={{ maxWidth: 1140, margin: 'auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 62 }}>
          <img src="/logo-brand.png" alt="CityMap" width={87} height={26} style={{ height: 26, width: 'auto', objectFit: 'contain', filter: dark ? undefined : 'brightness(0)' }} />
        </div>
      </header>
      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '0 20px 64px' }}>
        <section style={{ textAlign: 'center', padding: '48px 0 24px', maxWidth: 680, margin: 'auto' }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: muted, margin: '0 0 12px', textTransform: 'uppercase' }}>{t("negocios_eyebrow", "CityMap para negocios")}</p>
          <h1 style={{ fontFamily: 'var(--heading)', fontSize: 'clamp(30px,5vw,44px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-.045em', margin: '0 auto 16px', maxWidth: 620 }}>{t("negocios_h1", "Haz que más personas encuentren tu negocio.")}</h1>
          <p style={{ fontSize: 16, lineHeight: 1.55, color: muted, margin: '0 auto 24px', maxWidth: 560 }}>{t("negocios_sub", "Publica tu negocio gratis en citymap. Te encuentran en el mapa, en el buscador y en Google, y te escriben directo por WhatsApp, sin comisiones.")}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
            <button onClick={() => onAddBiz?.()} style={{ minHeight: 48, padding: '12px 24px', border: 0, borderRadius: 999, background: accent, color: dark ? '#101827' : '#FFFFFF', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{t("cuenta_crear_perfil_gratis", "Crear perfil gratis")}</button>
            <button onClick={scrollToPlans} style={{ minHeight: 48, padding: '12px 24px', border: `1px solid ${line}`, borderRadius: 999, background: 'transparent', color: ink, fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{t("ver_planes", "Ver planes")}</button>
          </div>
        </section>
        <section ref={statsRef} aria-label={t("negocios_eyebrow", "CityMap para negocios")} style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12, maxWidth: 720, margin: '24px auto 0' }}>
          {stats.map(s => (
            <div className="stat-card" key={s.label} style={{ textAlign: 'center', padding: '22px 12px', background: surface, border: `1px solid ${line}`, borderRadius: 24 }}>
              <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.04em', fontVariantNumeric: 'tabular-nums', color: accent }}><StatNumber value={s.value} active={statsInView} /></div>
              <div style={{ fontSize: 13, lineHeight: 1.4, color: muted, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </section>
        {/* Tu negocio ya aparece en Google: prueba con cifras reales de
        Search Console (ver GOOGLE_SEARCH_CONSOLE arriba). Va justo después
        de las cifras en vivo y antes de los planes. Mismo lenguaje visual
        que las cifras: tarjetas con radio 24 y número grande en acento. */}
        <section style={{ marginTop: 64 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <img src="/googlelogo.svg" alt="Google" style={{ width: 32, height: 32, objectFit: 'contain' }} />
          </div>
          <h2 style={{ fontFamily: 'inherit', fontSize: 26, fontWeight: 600, letterSpacing: '-.035em', textAlign: 'center', margin: '0 0 8px' }}>{t("negocios_google_titulo", "Tu negocio ya aparece en Google")}</h2>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: muted, textAlign: 'center', margin: '0 auto 28px', maxWidth: 560 }}>{t("negocios_google_texto", "Los negocios de CityMap reciben visitas reales desde el buscador: ${clicks} clics y ${impressions} impresiones en los últimos 28 días. Sin pagar anuncios, la gente ya llega a tu menú y a tu perfil desde Google.", { clicks: GOOGLE_SEARCH_CONSOLE.clicks, impressions: impressionsDisplay })}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12, maxWidth: 720, margin: '0 auto' }}>
            <div className="stat-card" style={{ textAlign: 'center', padding: '22px 12px', background: surface, border: `1px solid ${line}`, borderRadius: 24 }}>
              <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.04em', fontVariantNumeric: 'tabular-nums', color: accent }}>{GOOGLE_SEARCH_CONSOLE.clicks}</div>
              <div style={{ fontSize: 13, lineHeight: 1.4, color: muted, marginTop: 4 }}>{t("negocios_google_clics", "clics")}</div>
              <div style={{ fontSize: 12, lineHeight: 1.4, color: muted, marginTop: 2 }}>{t("negocios_google_periodo", "últimos 28 días")}</div>
            </div>
            <div className="stat-card" style={{ textAlign: 'center', padding: '22px 12px', background: surface, border: `1px solid ${line}`, borderRadius: 24 }}>
              <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.04em', fontVariantNumeric: 'tabular-nums', color: accent }}>{impressionsDisplay}</div>
              <div style={{ fontSize: 13, lineHeight: 1.4, color: muted, marginTop: 4 }}>{t("negocios_google_impresiones", "impresiones")}</div>
              <div style={{ fontSize: 12, lineHeight: 1.4, color: muted, marginTop: 2 }}>{t("negocios_google_periodo", "últimos 28 días")}</div>
            </div>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: muted, textAlign: 'center', margin: '20px auto 0', maxWidth: 560 }}>{t("negocios_google_ejemplos", "El menú de Formentera recibió ${formentera} visitas desde Google; Campomar, ${campomar}; y Akami Sushi, ${akami}.", { formentera: GOOGLE_SEARCH_CONSOLE.examples.formentera, campomar: GOOGLE_SEARCH_CONSOLE.examples.campomar, akami: GOOGLE_SEARCH_CONSOLE.examples.akami })}</p>
          <p style={{ fontSize: 13, lineHeight: 1.5, color: muted, textAlign: 'center', margin: '12px auto 0', maxWidth: 560 }}>{t("negocios_google_solo_google", "Esto es solo el tráfico que llega desde Google.")}</p>
        </section>
        <section style={{ marginTop: 64 }}>
          <h2 style={{ fontFamily: 'inherit', fontSize: 26, fontWeight: 600, letterSpacing: '-.035em', textAlign: 'center', margin: '0 0 8px' }}>{t("negocios_beneficios_titulo", "Por qué CityMap")}</h2>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: muted, textAlign: 'center', margin: '0 auto 28px', maxWidth: 480 }}>{t("negocios_beneficios_sub", "Lo que gana tu negocio")}</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
            {benefits.map(b => (
              <article className="benefit-card" key={b.title} style={{ padding: '24px', background: surface, border: `1px solid ${line}`, borderRadius: 24 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: dark ? '#18304A' : '#EDF5FF', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                  <Icon name={b.icon} size={24} color={accent} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.015em', lineHeight: 1.3, margin: '0 0 8px' }}>{b.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: muted, margin: 0 }}>{b.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section style={{ marginTop: 64 }}>
          <h2 style={{ fontFamily: 'inherit', fontSize: 26, fontWeight: 600, letterSpacing: '-.035em', textAlign: 'center', margin: '0 0 28px' }}>{t("negocios_como_titulo", "Cómo funciona")}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
            {steps.map(s => (
              <article key={s.n} style={{ padding: '24px', background: surface, border: `1px solid ${line}`, borderRadius: 22 }}>
                <div style={{ width: 36, height: 36, borderRadius: 999, background: accent, color: dark ? '#101827' : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>{s.n}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-.015em', lineHeight: 1.3, margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.6, color: muted, margin: 0 }}>{s.text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="planes" style={{ marginTop: 64, scrollMarginTop: 80 }}>
          <h2 style={{ fontFamily: 'inherit', fontSize: 26, fontWeight: 600, letterSpacing: '-.035em', textAlign: 'center', margin: '0 0 8px' }}>{t("negocios_planes_titulo", "Planes")}</h2>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: muted, textAlign: 'center', margin: '0 auto 24px', maxWidth: 480 }}>{t("negocios_planes_sub", "Precios por negocio. Pago mensual o anual (el anual sale 17% menos).")}</p>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 26 }}>
            <div role="group" aria-label={t("cuenta_periodo_facturacion", "Periodo de facturación")} style={{ display: 'inline-flex', padding: 4, borderRadius: 999, background: dark ? '#2B2B2E' : '#E8E8ED', gap: 3 }}>
              {[['monthly', t("cuenta_mensual", "Mensual")], ['annual', t("cuenta_anual", "Anual")]].map(([value, label]) => <button key={value} aria-pressed={billing === value} onClick={() => setBilling(value)} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 38, padding: '8px 17px', border: 0, borderRadius: 999, background: billing === value ? surface : 'transparent', boxShadow: billing === value ? '0 1px 5px rgba(0,0,0,.09)' : 'none', color: billing === value ? ink : muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{label}{value === 'annual' && <span style={{ color: accent, fontSize: 11 }}>−17%</span>}</button>)}
            </div>
          </div>
          <div className="plans-grid" aria-label={t("negocios_planes_titulo", "Planes")}>
            {plans.map(p => {
              const btn = planButton(p);
              return (
                <article className="plans-card" data-plan={p.key} key={p.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, minHeight: 24, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: muted, fontWeight: 500 }}>{p.key === 'free' ? t("cuenta_para_empezar", "Para empezar") : p.key === 'pro' ? t("cuenta_para_visibilidad", "Para ganar visibilidad") : t("cuenta_para_vender", "Para conectar y vender")}</span>
                    {p.badge && <span style={{ fontSize: 11, fontWeight: 600, color: accent, background: dark ? '#18304A' : '#EDF5FF', padding: '5px 10px', borderRadius: 999 }}>{p.badge}</span>}
                  </div>
                  <h3 style={{ fontFamily: 'inherit', fontSize: 22, fontWeight: 700, letterSpacing: '-.015em', lineHeight: 1.2, margin: '0 0 7px' }}>{p.name}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.5, color: muted, margin: '0 0 20px' }}>{p.desc}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}><strong style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.05em', fontVariantNumeric: 'tabular-nums' }}>{billing === 'annual' ? p.priceAnnual : p.priceMonthly}</strong><span style={{ fontSize: 12, color: muted }}>{pricing.currency} / {billing === 'annual' ? t("cuenta_ano", "año") : t("cuenta_mes", "mes")}</span></div>
                  <p style={{ minHeight: 34, margin: '7px 0 18px', fontSize: 12, lineHeight: 1.5, color: muted }}>{priceNote(p)}</p>
                  <div className="plans-features">{p.features.map(f => <div className="plans-feature" key={f}><span aria-hidden="true" style={{ color: p.key === 'pro' ? accent : muted, fontSize: 15 }}>✓</span><span>{f}</span></div>)}</div>
                  <button className="plans-action" disabled={btn.disabled} onClick={btn.onClick} style={{ background: p.key === 'pro' ? accent : 'transparent', border: `1px solid ${p.key === 'pro' ? accent : line}`, color: p.key === 'pro' ? (dark ? '#101827' : '#FFFFFF') : ink }}>{btn.label}</button>
                  <section aria-label={t("cuenta_vista_previa_plan", `Vista previa del plan ${p.name}`, { name: p.name })} style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${line}`, color: muted }}>
                    <h3 style={{ fontSize: 13, fontWeight: 600, textAlign: "center", margin: "0 0 12px" }}>{t("cuenta_asi_se_vera", "Así se verá tu negocio")}</h3>
                    <div style={{ pointerEvents: 'none', borderRadius: 14, overflow: 'hidden', marginTop: 12 }}>
                      {p.key === 'free' ? <CompactCard b={EJEMPLO_POR_PLAN.free} T={T} favIds={[]} toggleFav={() => {}} distStr="1.6 km" realFavs={4} /> : p.key === 'pro' ? <DestacadoCard b={EJEMPLO_POR_PLAN.pro} T={T} favIds={[]} toggleFav={() => {}} distStr="1.6 km" realFavs={12} /> : <FeaturedCard b={EJEMPLO_POR_PLAN.elite} T={T} favIds={[]} toggleFav={() => {}} distStr="1.6 km" realFavs={45} />}
                    </div>
                    {p.screenshots && <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 14 }}>{p.screenshots.map((shot) => <div key={shot.url} style={{ flex: '0 0 100px', color: muted }}><img src={shot.url} alt={shot.label} style={{ width: '100%', borderRadius: 10 }} /><span style={{ fontSize: 11 }}>{shot.label}</span></div>)}</div>}
                  </section>
                </article>
              );
            })}
          </div>
        </section>
        <section style={{ maxWidth: 720, margin: '64px auto 0' }}>
          <h2 style={{ fontFamily: 'inherit', fontSize: 26, fontWeight: 600, letterSpacing: '-.035em', textAlign: 'center', margin: '0 0 22px' }}>{t("negocios_faq_titulo", "Preguntas frecuentes")}</h2>
          {faqs.map(([q, a]) => <details className="plans-faq" key={q} style={{ padding: '20px 0', borderBottom: `1px solid ${line}` }}><summary>{q}</summary><p style={{ fontSize: 14, lineHeight: 1.65, color: muted, margin: '12px 26px 0 0' }}>{a}</p></details>)}
        </section>
        <section style={{ textAlign: 'center', margin: '64px auto 0', padding: '40px 20px', maxWidth: 720, background: surface, borderRadius: 24, border: `1px solid ${line}` }}>
          <h2 style={{ fontFamily: 'inherit', fontSize: 26, fontWeight: 600, letterSpacing: '-.035em', margin: '0 0 8px' }}>{t("negocios_cierre_titulo", "Tu negocio ya lo buscan. Que lo encuentren.")}</h2>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: muted, margin: '0 auto 20px', maxWidth: 420 }}>{t("negocios_cierre_sub", "Súmate a los ${count} negocios que ya están en CityMap.", { count: liveStats.businesses })}</p>
          <button onClick={() => onAddBiz?.()} style={{ minHeight: 48, padding: '12px 28px', border: 0, borderRadius: 999, background: accent, color: dark ? '#101827' : '#FFFFFF', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{t("cuenta_crear_perfil_gratis", "Crear perfil gratis")}</button>
        </section>
      </main>
    </div>
  );
}
