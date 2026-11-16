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
import { comparePlanFeatures, effectivePlanFeatures } from "../lib/crearNegocio.js";
import { NEGOCIOS_STATS_FALLBACK, fetchNegociosStats } from "../lib/negociosStats.js";
import { EJEMPLO_POR_PLAN, YA_ESTAN_EN_CITYMAP } from "../lib/negociosEjemplos.js";
import { displayRating, businessShowsGoogleRating, formatReviewCount } from "../lib/googleRatings.js";
import { useCountUp } from "../hooks/useCountUp.js";
import { useTranslation } from "../hooks/useTranslation.js";
import { Reveal } from "./ui/Reveal.jsx";
import { safeAreaTop } from "../lib/safeArea.js";

// Cifra con conteo animado: sube de 0 a su valor cuando la sección entra en
// pantalla (una sola vez). Antes de eso muestra el valor tal cual.
function StatNumber({ value, active }) {
  const display = useCountUp(value, active);
  return <>{display.toLocaleString("es-MX")}</>;
}



// Visitas desde Google: cifras REALES de Search Console (captura de
// Jonathan del 15 nov 2026, últimos 28 días) del sitio COMPLETO, no por
// negocio y no inventadas. Para actualizarlas, cambiar solo los valores
// de aquí: el texto, las cifras grandes y los ejemplos se arman solos.
// impressionsThousands es el número en miles: 121 = "121 mil" (es) /
// "121K" (en). Ejemplos: clics por página en esos 28 días.
const GOOGLE_SEARCH_CONSOLE = {
  clicks: 533,
  impressionsThousands: 121,
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
  const googleRatings = useDataStore(s => s.googleRatings);
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
  // DB values: free, pro, elite, fideliza, premium (premium = elite),
  // destacado (destacado = pro). 'fideliza' es clave propia desde
  // 15 nov 2026: sin este caso caería a 'free'.
  const rawPlan = myBizList?.[0]?.plan || "free";
  const currentPlanKey = rawPlan === "premium" ? "elite" : ["pro", "destacado"].includes(rawPlan) ? "pro" : rawPlan === "elite" ? "elite" : rawPlan === "fideliza" ? "fideliza" : "free";
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
  // "121 mil" en español, "121K" en inglés (ver GOOGLE_SEARCH_CONSOLE).
  const impressionsDisplay = lang === "en"
    ? `${GOOGLE_SEARCH_CONSOLE.impressionsThousands}K`
    : `${GOOGLE_SEARCH_CONSOLE.impressionsThousands} mil`;
  const benefits = [
    { icon: "pin", title: t("negocios_ben_mapa_titulo", "Te encuentran en el mapa"), text: t("negocios_ben_mapa_texto", "Tu negocio aparece con su pin en el mapa de tu ciudad, junto a los lugares, restaurantes y eventos que la gente ya busca. Los planes de pago muestran tu logotipo directo en el mapa.") },
    { icon: "globe", title: t("negocios_ben_google_titulo", "Te encuentran en Google"), text: t("negocios_ben_google_texto", "Tu página queda indexada y aparece en las búsquedas de Google. Con Presencia, tu posicionamiento mejora; con Ventas, hasta tu menú interactivo aparece en Google.") },
    { icon: "whatsapp", title: t("negocios_ben_whatsapp_titulo", "Pedidos por WhatsApp, sin comisiones"), text: t("negocios_ben_whatsapp_texto", "Tus clientes ven tu menú, arman su pedido y te lo mandan por WhatsApp. CityMap no cobra comisión por tus ventas: el pago es directo entre tu cliente y tú.") },
    { icon: "menu", title: t("negocios_ben_menu_titulo", "Un menú digital que vende solo"), text: t("negocios_ben_menu_texto", "Con Ventas, tu menú es interactivo: fotos, precios, opciones y carrito. Tus clientes piden desde el celular sin llamarte. Con Presencia, tienes tu menú en QR para ponerlo en las mesas del local.") },
    { icon: "calendar", title: t("negocios_ben_eventos_titulo", "Tus eventos y promociones llegan a la gente"), text: t("negocios_ben_eventos_texto", "Con Fideliza, publicas tus eventos y reservas, lanzas cupones y creas tarjetas de lealtad para que tus clientes regresen.") },
    { icon: "bar_chart", title: t("negocios_ben_datos_titulo", "Sabes qué está funcionando"), text: t("negocios_ben_datos_texto", "Desde tu panel ves tus visitas y tus pedidos, y con Fideliza tienes estadísticas avanzadas y soporte prioritario.") },
  ];
  const steps = [
    { n: "1", title: t("negocios_paso1_titulo", "Crea tu perfil gratis"), text: t("negocios_paso1_texto", "Te registras y publicas tu negocio en minutos: nombre, fotos, horarios y contacto.") },
    { n: "2", title: t("negocios_paso2_titulo", "Completa tu información"), text: t("negocios_paso2_texto", "Sube tu portada, tu galería y tu menú. Entre más completo, más te encuentran.") },
    { n: "3", title: t("negocios_paso3_titulo", "Te encuentran y te escriben"), text: t("negocios_paso3_texto", "Tu negocio aparece en el mapa, en el buscador, en la guía de tu ciudad y en Google. Los clientes te escriben directo por WhatsApp.") },
  ];
  const faqs = [
    [t("negocios_faq1_q", "¿Cuánto cuesta empezar?"), t("negocios_faq1_a", "Nada. Crear tu perfil y publicar tu negocio es gratis. Solo pagas si quieres Presencia, Ventas o Fideliza.")],
    [t("negocios_faq2_q", "¿Necesito pagar para aparecer en CityMap?"), t("negocios_faq2_a", "No. Con el plan gratuito tu negocio ya tiene su página pública, con teléfono, dirección, horarios y portada.")],
    [t("negocios_faq3_q", "¿CityMap cobra comisión por mis ventas?"), t("negocios_faq3_a", "No. Los pedidos te llegan por WhatsApp y el pago es directo entre tu cliente y tú.")],
    [t("negocios_faq4_q", "¿Puedo probar los planes de pago gratis?"), t("negocios_faq4_a", "Sí. Los tres planes de pago tienen 7 días de prueba gratis, en pago mensual y anual, sin compromiso.")],
    [t("negocios_faq5_q", "¿En qué ciudades está CityMap?"), t("negocios_faq5_a", "En ${count} ciudades, entre ellas Guadalajara, Zapopan, Tlaquepaque, Tepic, Puerto Vallarta, Ciudad de México, Mérida, Monterrey, Cancún y Playa del Carmen.", { count: liveStats.cities })],
    [t("negocios_faq6_q", "¿Qué necesito para registrar mi negocio?"), t("negocios_faq6_a", "Solo tu información básica: nombre, fotos, horarios y un teléfono o WhatsApp para que te contacten.")],
  ];

  const priceNote = p => {
    if (p.key === "free") return t("cuenta_sin_costo", "Sin costo de suscripción.");
    // La prueba de 7 días existe en mensual Y en anual (15 nov 2026):
    // en anual, después de la prueba se cobra el año completo.
    if (billing === "annual") return t("negocios_prueba_gratis_anual", "Pruébalo 7 días gratis. Después se cobra el importe completo del año.");
    return t("negocios_prueba_gratis", "Pruébalo 7 días gratis.");
  };
  const planButton = p => {
    if (p.key === "free") {
      return { disabled: Boolean(myBizList?.length), label: myBizList?.length ? t("cuenta_incluido_sin_costo", "Incluido sin costo") : t("cuenta_crear_perfil_gratis", "Crear perfil gratis"), onClick: () => onAddBiz?.() };
    }
    if (isCurrent(p)) {
      return { disabled: true, label: t("cuenta_tu_plan_actual", "Tu plan actual"), onClick: undefined };
    }
    // Los tres planes de pago tienen 7 días de prueba gratis en mensual
    // Y en anual (15 nov 2026): el botón es el mismo en las dos
    // modalidades y el servidor aplica la prueba en el checkout.
    return { disabled: false, label: t("negocios_cta_probar", "Probar 7 días gratis"), onClick: () => onStartPaidPlan?.({ key: p.key }, billing) };
  };

  return (
    <div className="business-landing" style={{ minHeight: '100vh', background: pageBg, color: ink, fontFamily: 'inherit', letterSpacing: 0, '--plans-accent': accent, '--plans-line': line, '--plans-surface': surface, '--plans-shadow': dark ? '0 10px 28px rgba(0,0,0,0.40)' : '0 10px 28px rgba(15,26,20,0.08)', '--plans-shadow-pro': dark ? '0 16px 40px rgba(112,173,255,0.25)' : '0 16px 40px rgba(0,102,204,0.18)', '--plans-accent-fideliza': dark ? '#A78BFA' : '#6D28D9', '--plans-shadow-fideliza': dark ? '0 16px 40px rgba(167,139,250,0.25)' : '0 16px 40px rgba(109,40,217,0.18)' }}>
      <Helmet>
        <title>{`${t("negocios_h1", "Haz que más personas encuentren tu negocio.")} | CityMap`}</title>
        <meta name="description" content={t("negocios_sub", "CityMap ayuda a que más personas descubran negocios, lugares y servicios cuando buscan en internet. Las páginas de nuestra plataforma ya generan visitas desde Google, acercando a nuevos clientes a los negocios publicados.")} />
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
        .business-landing .plans-card[data-plan="fideliza"]{order:3;border-color:var(--plans-accent-fideliza);box-shadow:var(--plans-shadow-fideliza)}
        .business-landing .plans-action{width:100%;min-height:48px;border-radius:999px;font-size:15px;font-weight:600;cursor:pointer;margin-top:20px}
        .business-landing .plans-action:disabled{cursor:default;opacity:.65}
        .business-landing .plans-feature{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.5}
        .business-landing .plans-features{flex:1;display:flex;flex-direction:column;gap:12px;padding-top:22px;margin-top:22px;border-top:1px solid var(--plans-line)}
        .business-landing .stat-card{box-shadow:var(--plans-shadow)}
        .business-landing .benefit-card{box-shadow:var(--plans-shadow)}
        .business-landing .ya-estan-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
        .business-landing .ya-estan-card{display:block;background:var(--plans-surface);border:1px solid var(--plans-line);border-radius:24px;overflow:hidden;text-decoration:none;color:inherit;box-shadow:var(--plans-shadow)}
        .business-landing .ya-estan-name{font-size:15px;font-weight:700;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .business-landing .reveal{opacity:0;transform:translateY(14px);transition:opacity .55s cubic-bezier(.390,.575,.565,1),transform .55s cubic-bezier(.390,.575,.565,1)}
        .business-landing .reveal.is-visible{opacity:1;transform:translateY(0)}
        @media(prefers-reduced-motion:reduce){.business-landing .reveal{opacity:1;transform:none}}
        .plans-faq summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:16px;font-size:15px;font-weight:600;line-height:1.5}
        .plans-faq summary::after{content:'+';font-size:20px;font-weight:400}
        .plans-faq[open] summary::after{content:'−'}
        @media(min-width:900px){.business-landing .plans-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:20px}.business-landing .plans-card[data-plan="free"]{order:0}.business-landing .plans-card[data-plan="pro"]{order:1}.business-landing .plans-card[data-plan="elite"]{order:2}.business-landing .plans-card[data-plan="fideliza"]{order:3}.business-landing .ya-estan-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}}
        @media(prefers-reduced-motion:reduce){.business-landing *{scroll-behavior:auto!important;transition:none!important}}
      `}</style>
      <header style={{ position: 'sticky', top: 0, zIndex: 10, background: dark ? 'rgba(22,22,23,.92)' : 'rgba(245,245,247,.92)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${line}` }}>
        <div style={{ maxWidth: 1140, margin: 'auto', padding: `${safeAreaTop(12)} 20px 12px`, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 62 }}>
          <img src="/logo-brand.png" alt="CityMap" width={87} height={26} style={{ height: 26, width: 'auto', objectFit: 'contain', filter: dark ? undefined : 'brightness(0)' }} />
        </div>
      </header>
      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '0 20px 64px' }}>
        <section style={{ textAlign: 'center', padding: '48px 0 24px', maxWidth: 680, margin: 'auto' }}>
          <Reveal><p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', color: muted, margin: '0 0 12px', textTransform: 'uppercase' }}>{t("negocios_eyebrow", "CityMap para negocios")}</p></Reveal>
          <Reveal delay={90}><h1 style={{ fontFamily: 'var(--heading)', fontSize: 'clamp(30px,5vw,44px)', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-.045em', margin: '0 auto 16px', maxWidth: 620 }}>{t("negocios_h1", "Haz que más personas encuentren tu negocio.")}</h1></Reveal>
          <Reveal delay={180}><p style={{ fontSize: 16, lineHeight: 1.55, color: muted, margin: '0 auto 24px', maxWidth: 560 }}>{t("negocios_sub", "CityMap ayuda a que más personas descubran negocios, lugares y servicios cuando buscan en internet. Las páginas de nuestra plataforma ya generan visitas desde Google, acercando a nuevos clientes a los negocios publicados.")}</p></Reveal>
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
          <Reveal><h2 style={{ fontFamily: 'inherit', fontSize: 26, fontWeight: 600, letterSpacing: '-.035em', textAlign: 'center', margin: '0 0 8px' }}>{t("negocios_google_titulo", "Tu negocio ya aparece en Google")}</h2></Reveal>
          <Reveal delay={90}><p style={{ fontSize: 15, lineHeight: 1.55, color: muted, textAlign: 'center', margin: '0 auto 28px', maxWidth: 560 }}>{t("negocios_google_texto", "Los negocios de CityMap reciben visitas reales desde el buscador: ${clicks} clics y ${impressions} impresiones en los últimos 28 días. Sin pagar anuncios, la gente ya llega a tu menú y a tu perfil desde Google.", { clicks: GOOGLE_SEARCH_CONSOLE.clicks, impressions: impressionsDisplay })}</p></Reveal>
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
          <Reveal><p style={{ fontSize: 14, lineHeight: 1.6, color: muted, textAlign: 'center', margin: '20px auto 0', maxWidth: 560 }}>{t("negocios_google_ejemplos", "El menú de Formentera recibió ${formentera} visitas desde Google; Campomar, ${campomar}; y Akami Sushi, ${akami}.", { formentera: GOOGLE_SEARCH_CONSOLE.examples.formentera, campomar: GOOGLE_SEARCH_CONSOLE.examples.campomar, akami: GOOGLE_SEARCH_CONSOLE.examples.akami })}</p></Reveal>
          <Reveal delay={90}><p style={{ fontSize: 13, lineHeight: 1.5, color: muted, textAlign: 'center', margin: '12px auto 0', maxWidth: 560 }}>{t("negocios_google_solo_google", "Esto es solo el tráfico que llega desde Google.")}</p></Reveal>
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
          <Reveal><h2 style={{ fontFamily: 'inherit', fontSize: 26, fontWeight: 600, letterSpacing: '-.035em', textAlign: 'center', margin: '0 0 8px' }}>{t("negocios_planes_titulo", "Planes")}</h2></Reveal>
          <Reveal delay={90}><p style={{ fontSize: 15, lineHeight: 1.55, color: muted, textAlign: 'center', margin: '0 auto 24px', maxWidth: 480 }}>{t("negocios_planes_sub", "Precios por negocio. Pago mensual o anual (el anual sale 17% menos).")}</p></Reveal>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 26 }}>
            <div role="group" aria-label={t("cuenta_periodo_facturacion", "Periodo de facturación")} style={{ display: 'inline-flex', padding: 4, borderRadius: 999, background: dark ? '#2B2B2E' : '#E8E8ED', gap: 3 }}>
              {[['monthly', t("cuenta_mensual", "Mensual")], ['annual', t("cuenta_anual", "Anual")]].map(([value, label]) => <button key={value} aria-pressed={billing === value} onClick={() => setBilling(value)} style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 38, padding: '8px 17px', border: 0, borderRadius: 999, background: billing === value ? surface : 'transparent', boxShadow: billing === value ? '0 1px 5px rgba(0,0,0,.09)' : 'none', color: billing === value ? ink : muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{label}{value === 'annual' && <span style={{ color: accent, fontSize: 11 }}>−17%</span>}</button>)}
            </div>
          </div>
          <div className="plans-grid" aria-label={t("negocios_planes_titulo", "Planes")}>
            {plans.map(p => {
              const btn = planButton(p);
              // Fideliza lleva su acento violeta (borde, etiqueta y botón):
              // especial pero elegante, sin saturar. Presencia sigue en
              // azul; Ventas y Gratuito, neutros.
              const planAccent = p.key === 'fideliza' ? (dark ? '#A78BFA' : '#6D28D9') : accent;
              const tagline = p.key === 'free' ? t("cuenta_para_empezar", "Para empezar") : p.key === 'pro' ? t("cuenta_para_visibilidad", "Para ganar visibilidad") : p.key === 'elite' ? t("cuenta_para_vender", "Para conectar y vender") : t("cuenta_para_crecer", "Para hacer crecer tu negocio");
              return (
                <article className="plans-card" data-plan={p.key} key={p.key}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, minHeight: 24, marginBottom: 12 }}>
                    <span style={{ fontSize: 12, color: muted, fontWeight: 500 }}>{tagline}</span>
                    {p.badge && <span style={{ fontSize: 11, fontWeight: 600, color: planAccent, background: p.key === 'fideliza' ? (dark ? 'rgba(167,139,250,0.18)' : '#F5F0FF') : (dark ? '#18304A' : '#EDF5FF'), padding: '5px 10px', borderRadius: 999 }}>{p.badge}</span>}
                  </div>
                  <h3 style={{ fontFamily: 'inherit', fontSize: 22, fontWeight: 700, letterSpacing: '-.015em', lineHeight: 1.2, margin: '0 0 7px' }}>{p.name}</h3>
                  <p style={{ fontSize: 14, lineHeight: 1.5, color: muted, margin: '0 0 20px' }}>{p.desc}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }}><strong style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-.05em', fontVariantNumeric: 'tabular-nums' }}>{billing === 'annual' ? p.priceAnnual : p.priceMonthly}</strong><span style={{ fontSize: 12, color: muted }}>{pricing.currency} / {billing === 'annual' ? t("cuenta_ano", "año") : t("cuenta_mes", "mes")}</span></div>
                  <p style={{ minHeight: 34, margin: '7px 0 18px', fontSize: 12, lineHeight: 1.5, color: muted }}>{priceNote(p)}</p>
                  <div className="plans-features">{p.features.map(f => <div className="plans-feature" key={f}><span aria-hidden="true" style={{ color: p.key === 'pro' || p.key === 'fideliza' ? planAccent : muted, fontSize: 15 }}>✓</span><span>{f}</span></div>)}</div>
                  <button className="plans-action" disabled={btn.disabled} onClick={btn.onClick} style={{ background: p.key === 'pro' ? accent : p.key === 'fideliza' ? planAccent : 'transparent', border: `1px solid ${p.key === 'pro' ? accent : p.key === 'fideliza' ? planAccent : line}`, color: p.key === 'pro' || p.key === 'fideliza' ? (dark ? '#101827' : '#FFFFFF') : ink }}>{btn.label}</button>
                  <section aria-label={t("cuenta_vista_previa_plan", `Vista previa del plan ${p.name}`, { name: p.name })} style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${line}`, color: muted }}>
                    <Reveal><h3 style={{ fontSize: 13, fontWeight: 600, textAlign: "center", margin: "0 0 8px" }}>{t("cuenta_asi_se_vera", "Así se verá tu negocio")}</h3></Reveal>
                    {/* Insignia «Ejemplo» (15 nov 2026): la tarjeta y los
                    números de muestra (distancia, guardados) son de un
                    negocio real de CityMap, no del visitante. */}
                    <div style={{ textAlign: 'center', margin: '0 0 12px' }}><span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: dark ? 'rgba(255,255,255,0.08)' : '#EEF2F7', color: muted }}>{t("cuenta_ejemplo", "Ejemplo")}</span></div>
                    <div style={{ pointerEvents: 'none', borderRadius: 14, overflow: 'hidden', marginTop: 12 }}>
                      {p.key === 'free' ? <CompactCard b={EJEMPLO_POR_PLAN.free} T={T} favIds={[]} toggleFav={() => {}} distStr="1.6 km" realFavs={4} forceOpen hideReviews /> : p.key === 'pro' ? <DestacadoCard b={EJEMPLO_POR_PLAN.pro} T={T} favIds={[]} toggleFav={() => {}} distStr="1.6 km" realFavs={12} forceOpen /> : p.key === 'fideliza' ? <FeaturedCard b={EJEMPLO_POR_PLAN.fideliza} T={T} favIds={[]} toggleFav={() => {}} distStr="1.6 km" realFavs={1} forceOpen /> : <FeaturedCard b={EJEMPLO_POR_PLAN.elite} T={T} favIds={[]} toggleFav={() => {}} distStr="1.6 km" realFavs={45} forceOpen />}
                    </div>
                    {/* Tarjeta de lealtad en la vista previa de Fideliza
                    (15 nov 2026): es lo que distingue al plan y no tenía
                    ninguna imagen. SSAM aún no tiene tarjeta configurada
                    en la base, así que es una muestra con su logo real:
                    9 sellos = 1 premio. */}
                    {p.key === 'fideliza' && (
                      <div style={{ marginTop: 12, borderRadius: 14, padding: 14, background: 'linear-gradient(135deg, #1F2937 0%, #6D28D9 100%)', color: '#FFFFFF', textAlign: 'left' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img src="https://dpkjxhjkzdlkvyotoeai.supabase.co/storage/v1/object/public/media/cityguide/1791990555541_jdbn9u.jpg" alt="SSAM Comida Coreana" style={{ width: 32, height: 32, borderRadius: 8, objectFit: 'cover', background: '#FFFFFF' }} />
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.3 }}>SSAM Comida Coreana</div>
                            <div style={{ fontSize: 11, opacity: 0.85 }}>Tarjeta de lealtad</div>
                          </div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 4, marginTop: 12 }}>
                          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => <span key={i} style={{ aspectRatio: '1', borderRadius: '50%', background: i < 3 ? '#FFFFFF' : 'transparent', border: '1.5px solid rgba(255,255,255,0.7)' }} />)}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 10, opacity: 0.9 }}>9 sellos = 1 premio</div>
                      </div>
                    )}
                    {p.screenshots && <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginTop: 14 }}>{p.screenshots.map((shot) => <div key={shot.url} style={{ flex: '0 0 100px', color: muted }}>
                      {/* Cada mockup lleva el negocio del ejemplo (15 nov
                      2026): la captura es real de la app y el encabezado
                      dice de qué negocio es la vista previa. */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6, minWidth: 0 }}>
                        <img src={EJEMPLO_POR_PLAN[p.key].photos[0].url} alt="" style={{ width: 20, height: 20, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: ink, lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{EJEMPLO_POR_PLAN[p.key].name}</span>
                      </div>
                      <img src={shot.url} alt={shot.label} style={{ width: '100%', borderRadius: 10 }} /><span style={{ fontSize: 11 }}>{shot.label}</span>
                    </div>)}</div>}
                  </section>
                </article>
              );
            })}
          </div>
        </section>
        {/* Tabla comparativa (15 nov 2026, pedida por Jonathan): los cuatro
        planes con las mismas funciones que las tarjetas. Se genera sola
        desde el arreglo de planes (comparePlanFeatures + effectivePlanFeatures),
        igual que la tabla del modal de crear negocio: si un plan hereda
        una función, la fila lleva ✓. En móvil hace scroll horizontal. */}
        <section style={{ marginTop: 64 }}>
          <Reveal><h2 style={{ fontFamily: 'inherit', fontSize: 26, fontWeight: 600, letterSpacing: '-.035em', textAlign: 'center', margin: '0 0 8px' }}>{t("negocios_compara_titulo", "Compara los planes")}</h2></Reveal>
          <Reveal delay={90}><p style={{ fontSize: 15, lineHeight: 1.55, color: muted, textAlign: 'center', margin: '0 auto 28px', maxWidth: 480 }}>{t("negocios_compara_sub", "Todo lo que incluye cada plan. Los planes superiores incluyen todo lo de los inferiores.")}</p></Reveal>
          <div style={{ overflowX: 'auto', background: surface, border: `1px solid ${line}`, borderRadius: 24, boxShadow: 'var(--plans-shadow)' }}>
            <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '16px 16px 12px', fontSize: 12, color: muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em' }}>{t("negocios_compara_funcion", "Función")}</th>
                  {plans.map(p => (
                    <th key={p.key} style={{ textAlign: 'center', padding: '16px 10px 12px', minWidth: 76 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                      <div style={{ fontSize: 12, color: muted, fontWeight: 500, marginTop: 2 }}>{billing === 'annual' ? p.priceAnnual : p.priceMonthly}{p.key === 'free' ? '' : ` / ${billing === 'annual' ? t("cuenta_ano", "año") : t("cuenta_mes", "mes")}`}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparePlanFeatures(plans).map((f, i) => (
                  <tr key={f} style={{ borderTop: `1px solid ${line}`, background: i % 2 ? (dark ? 'rgba(255,255,255,0.02)' : '#FAFAFC') : 'transparent' }}>
                    <td style={{ padding: '11px 16px', lineHeight: 1.4 }}>{f}</td>
                    {plans.map(p => {
                      const has = effectivePlanFeatures(plans, p.key).includes(f);
                      const colAccent = p.key === 'fideliza' ? (dark ? '#A78BFA' : '#6D28D9') : p.key === 'pro' ? accent : ink;
                      return <td key={p.key} style={{ textAlign: 'center', padding: '11px 10px', color: has ? colAccent : muted, fontWeight: has ? 700 : 400 }}>{has ? '✓' : '—'}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        {/* Ya están en CityMap: prueba social con negocios reales de la base
        (ver YA_ESTAN_EN_CITYMAP en negociosEjemplos.js). Va después de los
        planes y antes de las preguntas frecuentes. La calificación se lee
        en vivo con displayRating (caché de Google vigente cuando lo hay);
        la «G» se muestra solo en negocios de pago (regla 12 nov 2026),
        incluido el valor verificado que se guarda como reserva en la
        constante (solo los de pago lo llevan). */}
        <section style={{ marginTop: 64 }}>
          <Reveal><h2 style={{ fontFamily: 'inherit', fontSize: 26, fontWeight: 600, letterSpacing: '-.035em', textAlign: 'center', margin: '0 0 8px' }}>{t("negocios_ya_estan_titulo", "Ya están en CityMap")}</h2></Reveal>
          <Reveal delay={90}><p style={{ fontSize: 15, lineHeight: 1.55, color: muted, textAlign: 'center', margin: '0 auto 28px', maxWidth: 480 }}>{t("negocios_ya_estan_sub", "Negocios reales que ya reciben clientes desde CityMap.")}</p></Reveal>
          <div className="ya-estan-grid">
            {YA_ESTAN_EN_CITYMAP.map((b) => {
              const shortSlug = b.slug.startsWith(`${b.city_slug}-`) ? b.slug.slice(b.city_slug.length + 1) : b.slug;
              const href = `/${b.city_slug}/${shortSlug}`;
              const disp = displayRating(b, googleRatings);
              const isGoogle = businessShowsGoogleRating(b) && (disp.source === "google" || b.googleRating);
              return (
                <a key={b.id} href={href} onClick={(e) => { if (navigate) { e.preventDefault(); navigate(href); } }} className="ya-estan-card">
                  <img src={b.photos[0].url} alt={b.name} loading="lazy" style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', display: 'block' }} />
                  <div style={{ padding: '14px 14px 16px' }}>
                    <div className="ya-estan-name" title={b.name}>{b.name}</div>
                    <div style={{ fontSize: 13, lineHeight: 1.4, color: muted, marginTop: 2 }}>{b.cityName}</div>
                    {disp.rating != null && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 6 }}>
                        <Icon name="star_f" size={14} color={ink} style={{ marginTop: -2 }} />
                        <span style={{ fontSize: 12, fontWeight: 700 }}>{disp.rating.toFixed(1)}</span>
                        <span style={{ fontSize: 12, color: muted, fontWeight: 700 }}>({formatReviewCount(disp.count)})</span>
                        {isGoogle && <img src="/googlelogo.svg" alt="Google" style={{ width: 12, height: 12, objectFit: 'contain' }} />}
                      </div>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </section>
        <section style={{ maxWidth: 720, margin: '64px auto 0' }}>
          <Reveal><h2 style={{ fontFamily: 'inherit', fontSize: 26, fontWeight: 600, letterSpacing: '-.035em', textAlign: 'center', margin: '0 0 22px' }}>{t("negocios_faq_titulo", "Preguntas frecuentes")}</h2></Reveal>
          {faqs.map(([q, a]) => <details className="plans-faq" key={q} style={{ padding: '20px 0', borderBottom: `1px solid ${line}` }}><summary>{q}</summary><p style={{ fontSize: 14, lineHeight: 1.65, color: muted, margin: '12px 26px 0 0' }}>{a}</p></details>)}
        </section>
        <section style={{ textAlign: 'center', margin: '64px auto 0', padding: '40px 20px', maxWidth: 720, background: surface, borderRadius: 24, border: `1px solid ${line}` }}>
          <Reveal><h2 style={{ fontFamily: 'inherit', fontSize: 26, fontWeight: 600, letterSpacing: '-.035em', margin: '0 0 8px' }}>{t("negocios_cierre_titulo", "Tu negocio ya lo buscan. Que lo encuentren.")}</h2></Reveal>
          <Reveal delay={90}><p style={{ fontSize: 15, lineHeight: 1.55, color: muted, margin: '0 auto 20px', maxWidth: 420 }}>{t("negocios_cierre_sub", "Súmate a los ${count} negocios que ya están en CityMap.", { count: liveStats.businesses })}</p></Reveal>
          <button onClick={() => onAddBiz?.()} style={{ minHeight: 48, padding: '12px 28px', border: 0, borderRadius: 999, background: accent, color: dark ? '#101827' : '#FFFFFF', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>{t("cuenta_crear_perfil_gratis", "Crear perfil gratis")}</button>
        </section>
      </main>
    </div>
  );
}
