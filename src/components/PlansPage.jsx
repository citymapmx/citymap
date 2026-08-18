import { useState, useEffect } from "react";
import { AnimatePresence, m } from "framer-motion";
import Icon from "./ui/Icon.jsx";
import CompactCard from "./cards/CompactCard.jsx";
import DestacadoCard from "./cards/DestacadoCard.jsx";
import FeaturedCard from "./cards/FeaturedCard.jsx";
import { useUIStore } from "../store/useUIStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { getCountryCode } from "../lib/domain.js";

export default function PlansPage({ myBizList, onAddBiz, T, dark, onClose }) {
  const activeCity = useUIStore(s => s.activeCity);
  const cities = useDataStore(s => s.cities);
  const countryCode = getCountryCode(activeCity, cities);

  const getPricing = () => {
    if (countryCode === "es") {
      return {
        currency: "EUR",
        symbol: "€",
        proMonthly: "9.99€",
        oldProMonthly: "19.99€",
        proAnnual: "99€",
        oldProAnnual: "199€",
        eliteMonthly: "19.99€",
        oldEliteMonthly: "39.99€",
        eliteAnnual: "199€",
        oldEliteAnnual: "399€",
      };
    } else if (countryCode === "us") {
      return {
        currency: "USD",
        symbol: "$",
        proMonthly: "$9.99",
        oldProMonthly: "$19.99",
        proAnnual: "$99",
        oldProAnnual: "$199",
        eliteMonthly: "$19.99",
        oldEliteMonthly: "$39.99",
        eliteAnnual: "$199",
        oldEliteAnnual: "$399",
      };
    } else {
      // Default: Mexico (MXN)
      return {
        currency: "MXN",
        symbol: "$",
        proMonthly: "$149",
        oldProMonthly: "$299",
        proAnnual: "$1,490",
        oldProAnnual: "$2,990",
        eliteMonthly: "$299",
        oldEliteMonthly: "$599",
        eliteAnnual: "$2,990",
        oldEliteAnnual: "$5,990",
      };
    }
  };

  const pricing = getPricing();
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [billing, setBilling] = useState("monthly"); // "monthly" | "annual"
  const [selectedPlan, setSelectedPlan] = useState(null);

  const mockFree = {
    id: "mock_free",
    name: "Donatella",
    category: "Restaurantes",
    plan: "gratis",
    rating: 4.9,
    review_count: 12,
    photos: [{ url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80" }],
  };

  const mockPro = {
    id: "mock_pro",
    name: "Donatella",
    category: "Restaurantes",
    plan: "destacado",
    rating: 4.9,
    review_count: 12,
    photos: [{ url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80" }],
  };

  const mockElite = {
    id: "mock_elite",
    name: "Donatella",
    category: "Restaurantes",
    plan: "premium",
    logo_url: "https://images.unsplash.com/photo-1590947132387-155cc02f3212?auto=format&fit=crop&w=200&q=80",
    rating: 4.9,
    review_count: 12,
    photos: [{ url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80" }],
    whatsapp: "1234567890",
    instagram: "donatella.mx",
    facebook: "donatella"
  };

  const plans = [
    { 
      key: "free", 
      name: "Gratuito", 
      priceMonthly: `${pricing.symbol}0`, 
      priceAnnual: `${pricing.symbol}0`, 
      desc: "Ideal para que cualquier negocio tenga presencia básica.",
      color: dark ? "#9CA3AF" : "#6B7280", 
      icon: "user", 
      features: ["Portada e Información del negocio", "Teléfono y Dirección", "Horarios", "Banner estándar"], 
    },
    { 
      key: "pro", 
      name: "Destacado", 
      priceMonthly: pricing.proMonthly, 
      oldPriceMonthly: pricing.oldProMonthly,
      priceAnnual: pricing.proAnnual, 
      oldPriceAnnual: pricing.oldProAnnual,
      desc: "Ideal para negocios que buscan captar clientes y mayor visibilidad.",
      color: dark ? "#E2E8F0" : "#0F172A", 
      icon: "star", 
      badge: "Más popular",
      features: ["Todo lo del plan gratuito, más:", "Banner destacado", "Galería de fotos", "Enlace a WhatsApp y redes sociales", "Menú Digital", "Panel de administrador"], 
      screenshots: [
        { url: "/plans/menu-digital.png", label: "Menú Digital" },
        { url: "/plans/galeria.png", label: "Galería de Fotos" }
      ]
    },
    { 
      key: "elite", 
      name: "Premium", 
      priceMonthly: pricing.eliteMonthly, 
      oldPriceMonthly: pricing.oldEliteMonthly,
      priceAnnual: pricing.eliteAnnual, 
      oldPriceAnnual: pricing.oldEliteAnnual,
      desc: "Ideal para negocios líderes que buscan dominar su mercado.",
      color: dark ? "#E2E8F0" : "#0F172A", 
      icon: "award", 
      badge: "Lo mejor",
      features: ["Todo lo del plan Destacado, más:", "Banner premium y Logotipo en mapa", "Vídeos", "Menú interactivo con carrito enlazado a WhatsApp", "Galería de fotos ilimitada", "Gestión de Eventos y Reservas", "Reseñas de Google Maps", "Estadísticas y Soporte prioritario"], 
      screenshots: [
        { url: "/plans/menu-interactivo.png", label: "Menú Interactivo y Carrito" },
        { url: "/plans/reservas.png", label: "Gestión de Reservas" }
      ]
    },
  ];

  const stats = [
    { num: "111+", label: "Negocios registrados", icon: "pin" },
    { num: "10K+", label: "Visitas mensuales", icon: "eye" },
    { num: "166", label: "Páginas en Google", icon: "globe" },
  ];

  const testimonials = [
    { name: "Roberto M.", biz: "Tacos el Patron", text: "Desde que me registré en CityMap, recibo más llamadas de clientes nuevos cada semana.", stars: 5 },
    { name: "Eduardo F.", biz: "Eduardo Barber", text: "El plan Destacado me ayudó a estar arriba en las búsquedas. ¡Muy recomendado!", stars: 5 },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: T.bg, zIndex: 9999, overflowY: "auto", fontFamily: "inherit", animation: "fadeUp .4s ease" }}>
      <style>{`
        @keyframes gradient-pan {
          0% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }
      `}</style>
      
      {/* Header */}
      <div style={{ position: "sticky", top: 0, background: T.white, zIndex: 10, borderBottom: `1px solid ${T.border}`, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: T.text, padding: "8px 12px 8px 0", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <Icon name="arrow_left" size={24} color={T.text} />
          </button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: T.text, fontFamily: "var(--heading)", letterSpacing: "-0.5px" }}>Planes para tu negocio</h1>
        </div>
      </div>

      <div style={{ padding: "0 20px 80px" }}>
        
        {/* Hero Section */}
        <div style={{ textAlign: "center", padding: "40px 0 30px" }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: T.text, margin: "0 0 12px 0", letterSpacing: '-0.5px' }}>Planes diseñados para crecer</h1>
          <p style={{ fontSize: 16, color: T.sub, lineHeight: 1.5, maxWidth: 360, margin: "0 auto", fontWeight: 400 }}>Elige la suscripción que mejor se adapte a los objetivos de tu negocio.</p>
        </div>

        {/* Stats Row */}
        <div style={{ display: "flex", gap: 12, marginBottom: 40 }}>
          {stats.map(s => (
            <div key={s.label} style={{ flex: 1, borderTop: `1px solid ${T.border}`, paddingTop: 16, textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{s.num}</div>
              <div style={{ fontSize: 11, color: T.sub, fontWeight: 500, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Billing Toggle */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ background: dark ? "rgba(255,255,255,0.06)" : "#F1F5F9", borderRadius: 14, display: "inline-flex", padding: 4, gap: 4 }}>
            <button onClick={() => setBilling("monthly")} style={{ padding: "10px 20px", borderRadius: 11, border: "none", background: billing === "monthly" ? T.white : "transparent", color: billing === "monthly" ? T.text : T.sub, fontWeight: 700, fontSize: 14, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit", boxShadow: billing === "monthly" ? "0 2px 8px rgba(0,0,0,0.06)" : "none" }}>Mensual</button>
            <button onClick={() => setBilling("annual")} style={{ padding: "10px 20px", borderRadius: 11, border: "none", background: billing === "annual" ? T.white : "transparent", color: billing === "annual" ? "#16A34A" : T.sub, fontWeight: 800, fontSize: 14, cursor: "pointer", transition: "all 0.2s", fontFamily: "inherit", boxShadow: billing === "annual" ? "0 2px 8px rgba(0,0,0,0.06)" : "none", position: "relative" }}>
              Anual
              <span style={{ position: "absolute", top: -8, right: -8, background: "#16A34A", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 8, whiteSpace: "nowrap" }}>-17%</span>
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {plans.map((p, idx) => (
            <m.div 
              key={p.key} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              style={{ 
                '--bg': T.bg,
                background: p.key === "elite" ? `linear-gradient(var(--bg), var(--bg)) padding-box, linear-gradient(to right, #34D399, #3B82F6, #8B5CF6, #34D399, #3B82F6) border-box` : T.bg, 
                backgroundSize: p.key === "elite" ? '100% 100%, 400% 100%' : 'auto',
                animation: p.key === "elite" ? 'gradient-pan 4s linear infinite' : 'none',
                borderRadius: 16, 
                padding: "24px", 
                border: p.key === "elite" ? `2px solid transparent` : `1px solid ${T.border}`, 
                position: "relative",
              }}
            >
              {/* Badge */}
              {p.badge && <div style={{ position: "absolute", top: -10, left: 24, background: p.key === "elite" ? "linear-gradient(to right, #34D399, #3B82F6, #8B5CF6, #34D399, #3B82F6)" : p.color, backgroundSize: p.key === "elite" ? "400% 100%" : "auto", animation: p.key === "elite" ? "gradient-pan 4s linear infinite" : "none", color: p.key === "elite" ? "#fff" : (dark ? "#0F172A" : "#fff"), padding: "4px 12px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, borderRadius: 20 }}>{p.key === "elite" ? "✨ " + p.badge : p.badge}</div>}
              
              {/* Plan Header */}
              <div style={{ marginBottom: 20, marginTop: p.badge ? 10 : 0 }}>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: T.text, margin: "0 0 8px 0" }}>{p.name}</h3>
                <p style={{ fontSize: 14, color: T.sub, margin: 0, lineHeight: 1.5 }}>{p.desc}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 16 }}>
                  {(billing === "monthly" ? p.oldPriceMonthly : p.oldPriceAnnual) && (
                    <span style={{ fontSize: 18, color: T.sub, textDecoration: "line-through", fontWeight: 400 }}>
                      {billing === "monthly" ? p.oldPriceMonthly : p.oldPriceAnnual}
                    </span>
                  )}
                  <span style={{ fontSize: 36, fontWeight: 800, color: T.text, letterSpacing: '-1px' }}>
                    {billing === "monthly" ? p.priceMonthly : p.priceAnnual}
                  </span>
                  <span style={{ fontSize: 14, color: T.sub, fontWeight: 500 }}>
                    {pricing.currency} / {billing === "monthly" ? "mes" : "año"}
                  </span>
                </div>
              </div>

              {/* Features */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 28, paddingTop: 20, borderTop: `1px solid ${T.border}` }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "flex-start", gap: 12, fontSize: 14, color: T.text, lineHeight: 1.4 }}>
                    <div style={{ marginTop: 2 }}><Icon name="check" size={14} color={p.key === "elite" ? "#8B5CF6" : p.color} /></div>
                    {f}
                  </div>
                ))}
              </div>

              {/* Banner Preview */}
              <div style={{ marginBottom: 20, padding: "14px 0", background: dark ? "rgba(255,255,255,0.03)" : "#F8FAFC", borderRadius: 16, border: `1px dashed ${T.border}`, overflow: "hidden" }}>
                <p style={{ fontSize: 11, color: T.sub, marginBottom: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center" }}>Así se ve tu negocio</p>
                <div style={{ pointerEvents: "none", transform: "scale(0.9)", transformOrigin: "top center", marginBottom: "-5%" }}>
                  {p.key === "free" && <CompactCard b={mockFree} T={T} favIds={["mock_free"]} toggleFav={()=>{}} distStr="1.6km" realFavs={4} />}
                  {p.key === "pro" && <DestacadoCard b={mockPro} T={T} favIds={["mock_pro"]} toggleFav={()=>{}} distStr="2.6km" realFavs={12} />}
                  {p.key === "elite" && <FeaturedCard b={mockElite} T={T} favIds={["mock_elite"]} toggleFav={()=>{}} distStr="1.2km" realFavs={45} showStars={false} />}
                </div>

                {/* Screenshots */}
                {p.screenshots && p.screenshots.length > 0 && (
                  <div style={{ marginTop: 20, padding: "0 16px" }}>
                    <p style={{ fontSize: 11, color: T.sub, marginBottom: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8, textAlign: "center" }}>Características incluidas</p>
                    <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none", msOverflowStyle: "none" }}>
                      {p.screenshots.map((shot, sIdx) => (
                        <div key={sIdx} style={{ flex: "0 0 160px", display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ width: 160, height: 240, borderRadius: 12, overflow: "hidden", background: T.bg, border: `1px solid ${T.border}` }}>
                            <img src={shot.url} alt={shot.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 600, color: T.text, textAlign: "center", lineHeight: 1.3 }}>{shot.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CTA Button */}
              <button 
                className="press"
                onClick={p.key !== "free" ? () => {
                  setSelectedPlan({ plan: p, billing });
                } : (!myBizList || myBizList.length === 0) ? onAddBiz : undefined} 
                style={{ 
                  width: "100%", 
                  padding: "14px", 
                  background: p.key === "free" ? "transparent" : p.key === "elite" ? "linear-gradient(to right, #34D399, #3B82F6, #8B5CF6, #34D399, #3B82F6)" : p.color, 
                  backgroundSize: p.key === "elite" ? "400% 100%" : "auto",
                  animation: p.key === "elite" ? "gradient-pan 4s linear infinite" : "none",
                  border: p.key === "free" ? `1px solid ${T.border}` : "none", 
                  borderRadius: 12, 
                  fontWeight: 600, 
                  fontSize: 15, 
                  color: p.key === "free" ? T.text : (p.key === "pro" && dark ? "#0F172A" : "#fff"), 
                  cursor: p.key === "free" && myBizList?.length > 0 ? "default" : "pointer", 
                }}
              >
                {p.key === "free" ? ((!myBizList || myBizList.length === 0) ? "Registrarse gratis" : "Plan actual") : `Activar ${p.name}`}
              </button>
            </m.div>
          ))}
        </div>

        {/* Social Proof */}
        <div style={{ marginTop: 36 }}>
          <h3 style={{ fontFamily: "var(--heading)", fontSize: 20, color: T.text, textAlign: "center", marginBottom: 16 }}>Lo que dicen nuestros clientes</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ background: T.white, borderRadius: 16, padding: "16px", border: `1px solid ${T.border}` }}>
                <div style={{ display: "flex", gap: 3, marginBottom: 8 }}>
                  {[1,2,3,4,5].map(s => (
                    <Icon key={s} name="star" size={14} color={s <= t.stars ? "#F59E0B" : T.border} />
                  ))}
                </div>
                <p style={{ fontSize: 14, color: T.text, lineHeight: 1.5, marginBottom: 10, fontStyle: "italic" }}>"{t.text}"</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #3B82F6, #8B5CF6)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>{t.name[0]}</span>
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: T.sub }}>{t.biz}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginTop: 36 }}>
          <h3 style={{ fontFamily: "var(--heading)", fontSize: 20, color: T.text, textAlign: "center", marginBottom: 16 }}>Preguntas frecuentes</h3>
          {[
            { q: "¿Puedo cancelar en cualquier momento?", a: "Sí, puedes cancelar tu suscripción cuando quieras. No hay contratos ni penalizaciones." },
            { q: "¿Cómo se realiza el pago?", a: "A través de MercadoPago con tarjeta de crédito, débito o transferencia. Totalmente seguro." },
            { q: "¿Cuánto tarda en activarse?", a: "Tu plan se activa de inmediato al confirmar el pago. En minutos tu negocio estará destacado." },
            { q: "¿Puedo cambiar de plan después?", a: "Sí, puedes subir o bajar de plan en cualquier momento. La diferencia se ajusta automáticamente." },
          ].map((faq, i) => (
            <div key={i} style={{ background: T.white, borderRadius: 14, padding: "14px 16px", marginBottom: 8, border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4 }}>{faq.q}</div>
              <div style={{ fontSize: 13, color: T.sub, lineHeight: 1.5 }}>{faq.a}</div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ marginTop: 32, textAlign: "center", padding: "24px 16px", background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))", borderRadius: 20 }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>💬</div>
          <h3 style={{ fontSize: 17, fontWeight: 800, color: T.text, marginBottom: 6 }}>¿Tienes dudas?</h3>
          <p style={{ fontSize: 13, color: T.sub, marginBottom: 16, lineHeight: 1.5 }}>Escríbenos por WhatsApp y te ayudamos a elegir el mejor plan para tu negocio.</p>
          <button 
            className="press"
            onClick={() => window.open("https://wa.me/523223792428?text=Hola, me interesa conocer más sobre los planes de CityMap para mi negocio.", "_blank")} 
            style={{ padding: "12px 24px", background: "#25D366", color: "#fff", border: "none", borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", gap: 8, boxShadow: "0 4px 14px rgba(37,211,102,0.3)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.613.613l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.24 0-4.312-.726-5.993-1.957l-.418-.31-2.647.888.888-2.647-.31-.418A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
            Hablar con un asesor
          </button>
        </div>

      </div>

      {/* Payment Modal */}
      <AnimatePresence>
        {selectedPlan && (
          <m.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ position: "fixed", inset: 0, zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", padding: 20 }} 
            onClick={() => setSelectedPlan(null)}
          >
            <m.div 
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 10 }} transition={{ duration: 0.3, ease: "easeOut" }}
              onClick={e => e.stopPropagation()} 
              style={{ background: dark ? "#1a1a1a" : "#fff", width: "100%", maxWidth: 340, borderRadius: 24, padding: "24px", position: "relative", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}
            >
              <button onClick={() => setSelectedPlan(null)} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", fontSize: 24, cursor: "pointer", color: T.sub, padding: 4 }}>×</button>
              
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, marginTop: 4 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: selectedPlan.plan.iconBg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name={selectedPlan.plan.icon} size={20} color={selectedPlan.plan.color} />
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0 }}>Plan {selectedPlan.plan.name}</h2>
                  <span style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>Suscripción {selectedPlan.billing === "monthly" ? "mensual" : "anual"}</span>
                </div>
              </div>
              
              <div style={{ background: dark ? "rgba(255,255,255,0.04)" : "#F8FAFC", borderRadius: 14, padding: "16px", marginBottom: 20, marginTop: 16 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: selectedPlan.plan.color, letterSpacing: -0.5 }}>{selectedPlan.billing === "monthly" ? selectedPlan.plan.priceMonthly : selectedPlan.plan.priceAnnual}</span>
                  <span style={{ fontSize: 16, color: T.sub, fontWeight: 500 }}>{pricing.currency}/{selectedPlan.billing === "monthly" ? "mes" : "año"}</span>
                </div>
                <p style={{ fontSize: 12, color: T.sub, margin: 0 }}>Facturación {selectedPlan.billing === "monthly" ? "mensual" : "anual"} · Cancela cuando quieras</p>
              </div>

              <button 
                onClick={async () => {
                  try {
                    const biz_id = myBizList?.[0]?.id; // Asume el primer negocio del usuario. En el futuro, si tienen varios, podrías agregar un selector.
                    if (!biz_id) return alert("Crea un negocio primero antes de suscribirte.");
                    
                    const apiUrl = window.location.origin.includes('localhost') || window.location.origin.includes('capacitor') 
                      ? 'https://citymap.mx/api/stripe-checkout' 
                      : '/api/stripe-checkout';

                    const res = await fetch(apiUrl, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        biz_id: biz_id,
                        plan_id: selectedPlan.plan.key, // 'pro' o 'elite'
                        interval: selectedPlan.billing === "monthly" ? "month" : "year",
                        host_url: 'https://citymap.mx',
                        currency: pricing.currency
                      })
                    });
                    
                    const data = await res.json();
                    if (data.url) {
                      if (window.location.origin.includes('capacitor') || window.location.origin.includes('localhost')) {
                        const { Browser } = await import('@capacitor/browser');
                        await Browser.open({ url: data.url });
                      } else {
                        window.location.href = data.url;
                      }
                    } else {
                      alert("Error iniciando Stripe: " + (data.error || "Desconocido"));
                    }
                  } catch (e) {
                    console.error(e);
                    alert("Error: " + e.message);
                  }
                }} 
                style={{ width: "100%", padding: 16, background: "#6366F1", color: "#fff", borderRadius: 14, fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.3)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 10 }}
              >
                Pagar con Tarjeta (Stripe)
              </button>
              <p style={{ fontSize: 11, color: T.sub, textAlign: "center", margin: 0 }}>🔒 Pago 100% seguro y encriptado</p>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
