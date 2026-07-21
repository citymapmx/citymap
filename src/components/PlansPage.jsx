import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Icon from "./ui/Icon.jsx";
import CompactCard from "./cards/CompactCard.jsx";
import DestacadoCard from "./cards/DestacadoCard.jsx";
import FeaturedCard from "./cards/FeaturedCard.jsx";

export default function PlansPage({ myBizList, onAddBiz, T, dark, onClose }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const [billing, setBilling] = useState("monthly"); // "monthly" | "annual"
  const [selectedPlan, setSelectedPlan] = useState(null);

  const mockFree = {
    id: "mock_free",
    name: "Starbucks Manglar",
    category: "Cafeterías",
    plan: "gratis",
    rating: 5.0,
    review_count: 1,
    photos: [{ url: "https://res.cloudinary.com/da6g5pt5x/image/upload/v1783319210/cityguide/ebrcuafqo3il7dl1lgc7.png" }],
  };

  const mockPro = {
    id: "mock_pro",
    name: "Starbucks Manglar",
    category: "Cafeterías",
    plan: "destacado",
    rating: 5.0,
    review_count: 1,
    photos: [{ url: "https://res.cloudinary.com/da6g5pt5x/image/upload/v1783319210/cityguide/ebrcuafqo3il7dl1lgc7.png" }],
  };

  const mockElite = {
    id: "mock_elite",
    name: "Starbucks Manglar",
    category: "Cafeterías",
    plan: "premium",
    logo_url: "https://res.cloudinary.com/da6g5pt5x/image/upload/v1783319244/cityguide/ytlhnaxpkghht8uow7zv.png",
    rating: 5.0,
    review_count: 1,
    photos: [{ url: "https://res.cloudinary.com/da6g5pt5x/image/upload/v1783319210/cityguide/ebrcuafqo3il7dl1lgc7.png" }],
    whatsapp: "123",
    instagram: "starbucksmex",
    facebook: "StarbucksMexico"
  };

  const plans = [
    { 
      key: "free", 
      name: "Gratuito", 
      priceMonthly: "$0", 
      priceAnnual: "$0", 
      desc: "Ideal para que cualquier negocio tenga presencia en CityMap.",
      color: "#6B7280", 
      icon: "user", 
      iconBg: "#F3F4F6", 
      features: ["Portada", "Información del negocio", "Teléfono", "Dirección", "Horarios", "Banner tamaño estándar"], 
      missing: [] 
    },
    { 
      key: "pro", 
      name: "Destacado", 
      priceMonthly: "$99", 
      priceAnnual: "$990", 
      desc: "Ideal para negocios que buscan más clientes y más visibilidad.",
      color: "#3B82F6", 
      icon: "star", 
      badge: "Más popular",
      iconBg: "#E0E7FF", 
      mpLinkMonthly: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=1345ec4d71144a8c86f0a0311175ad97", 
      mpLinkAnnual: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=476ef47b9f2c4e90afa40dc9634fdda8", 
      features: ["Todo lo del plan gratuito, más:", "Banner de tamaño destacado", "Hasta 6 fotos en la galería", "Enlace directo a WhatsApp", "Integración con redes sociales", "Enlace al sitio web", "Menú digital (PDF)", "Estadísticas básicas", "Prioridad media en búsquedas", "Actualización de imágenes una vez al mes"], 
      missing: [] 
    },
    { 
      key: "elite", 
      name: "Premium", 
      priceMonthly: "$199", 
      priceAnnual: "$1,990", 
      desc: "Ideal para negocios que quieran destacar frente a su competencia.",
      color: "#D97706", 
      icon: "award", 
      iconBg: "#FEF3C7", 
      mpLinkMonthly: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=b0011d69b19a466588d8b7a143af10e1", 
      mpLinkAnnual: "https://www.mercadopago.com.mx/subscriptions/checkout?preapproval_plan_id=edafc715b2324b74b82124230c8c9fd0", 
      features: ["Todo lo incluido en el plan Destacado, más:", "Banner de tamaño premium", "Logotipo resaltado en el mapa", "Logotipo circular en tu banner", "Vídeos", "Botones directos en tu banner", "Menú interactivo con carrito", "Hasta 10 fotos en la galería", "Eventos personalizados", "Reservas disponibles 24/7", "Estadísticas avanzadas", "Actualizaciones ilimitadas", "Soporte técnico"], 
      missing: [] 
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
      
      {/* Header */}
      <div style={{ position: "sticky", top: 0, background: T.bg, zIndex: 10, borderBottom: `1px solid ${T.border}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <button className="press" onClick={onClose} style={{ background: T.white, border: `1.5px solid ${T.border}`, width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <Icon name="chevron" size={20} color={T.text} style={{ transform: "rotate(180deg)" }} />
        </button>
        <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 22, color: T.text, margin: 0 }}>Planes para tu negocio</h2>
      </div>

      <div style={{ padding: "0 20px 80px" }}>
        
        {/* Hero Section */}
        <div style={{ textAlign: "center", padding: "32px 0 28px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "linear-gradient(135deg, rgba(34,197,94,0.1), rgba(59,130,246,0.1))", padding: "6px 14px", borderRadius: 20, marginBottom: 16 }}>
            <Icon name="star" size={14} color="#D97706" />
            <span style={{ fontSize: 12, fontWeight: 800, color: "#D97706", textTransform: "uppercase", letterSpacing: 0.5 }}>Oferta de lanzamiento</span>
          </div>
          <h1 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 28, color: T.text, margin: "0 0 8px 0", lineHeight: 1.2, letterSpacing: '1px' }}>Haz que más clientes te encuentren</h1>
          <p style={{ fontSize: 15, color: T.sub, lineHeight: 1.6, maxWidth: 340, margin: "0 auto" }}>Más de 100 negocios ya están en CityMap. Aumenta tu visibilidad y atrae más clientes desde hoy.</p>
        </div>

        {/* Stats Row */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28 }}>
          {stats.map(s => (
            <div key={s.label} style={{ flex: 1, background: T.white, borderRadius: 14, padding: "14px 8px", textAlign: "center", border: `1px solid ${T.border}` }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: T.text, fontFamily: "'Coolvetica', sans-serif", letterSpacing: '1px' }}>{s.num}</div>
              <div style={{ fontSize: 10, color: T.sub, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
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
            <motion.div 
              key={p.key} 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              style={{ 
                background: p.key === "elite" 
                  ? `linear-gradient(135deg, ${dark ? "#2D2410" : "#FFFBEB"}, ${dark ? "#1a1a1a" : "#fff"})` 
                  : T.white, 
                borderRadius: 20, 
                padding: "20px", 
                boxShadow: p.key === "pro" ? "0 8px 24px rgba(59,130,246,0.12)" : p.key === "elite" ? "0 8px 24px rgba(217,119,6,0.12)" : "0 4px 16px rgba(0,0,0,0.04)", 
                border: p.key === "elite" ? `2px solid ${T.gold}` : p.key === "pro" ? "2px solid #3B82F6" : `1px solid ${T.border}`, 
                position: "relative",
                overflow: "hidden"
              }}
            >
              {/* Badge */}
              {p.badge && <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #3B82F6, #2563EB)", color: "#fff", padding: "6px 14px 6px 18px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, borderBottomLeftRadius: 12 }}>★ {p.badge}</div>}
              {p.key === "elite" && <div style={{ position: "absolute", top: 0, right: 0, background: "linear-gradient(135deg, #F59E0B, #D97706)", color: "#fff", padding: "6px 14px 6px 18px", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, borderBottomLeftRadius: 12 }}>👑 Lo mejor</div>}
              
              {/* Plan Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: p.iconBg, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 4px 12px ${p.color}22` }}>
                  <Icon name={p.icon} size={24} color={p.color} />
                </div>
                <div>
                  <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0 }}>{p.name}</h3>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 2 }}>
                    <span style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 28, color: p.color }}>
                      {billing === "monthly" ? p.priceMonthly : p.priceAnnual}
                    </span>
                    <span style={{ fontSize: 13, color: T.sub, fontWeight: 500 }}>
                      MXN/{billing === "monthly" ? "mes" : "año"}
                    </span>
                    {billing === "annual" && p.key !== "free" && (
                      <span style={{ background: "rgba(34, 197, 94, 0.15)", color: "#166534", padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, marginLeft: 4 }}>
                        2 meses gratis
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <p style={{ fontSize: 13, color: T.sub, marginBottom: 16, lineHeight: 1.5 }}>{p.desc}</p>

              {/* Features */}
              <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 20, paddingTop: 14, borderTop: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "#F1F5F9"}` }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: T.text, fontWeight: f.startsWith("Todo lo") ? 700 : 400 }}>
                    <div style={{ width: 20, height: 20, borderRadius: 6, background: `${p.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name="check" size={12} color={p.color} />
                    </div>
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
              </div>

              {/* CTA Button */}
              <button 
                className="press"
                onClick={p.key !== "free" ? () => {
                  setSelectedPlan({ plan: p, billing });
                } : (!myBizList || myBizList.length === 0) ? onAddBiz : undefined} 
                style={{ 
                  width: "100%", 
                  padding: 15, 
                  background: p.key === "elite" ? "linear-gradient(135deg, #F59E0B, #D97706)" : p.key === "pro" ? "linear-gradient(135deg, #3B82F6, #2563EB)" : (!myBizList || myBizList.length === 0) ? T.greenL : "#E4E8E4", 
                  border: "none", 
                  borderRadius: 14, 
                  fontWeight: 800, 
                  fontSize: 15, 
                  color: p.key === "free" ? ((!myBizList || myBizList.length === 0) ? T.green : T.sub) : "#fff", 
                  cursor: p.key === "free" && myBizList?.length > 0 ? "default" : "pointer", 
                  fontFamily: "inherit",
                  boxShadow: p.key === "pro" ? "0 6px 20px rgba(59,130,246,0.3)" : p.key === "elite" ? "0 6px 20px rgba(217,119,6,0.3)" : "none"
                }}
              >
                {p.key === "free" ? ((!myBizList || myBizList.length === 0) ? "Registrar mi negocio gratis" : "Plan actual") : `Activar plan ${p.name}`}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Social Proof */}
        <div style={{ marginTop: 36 }}>
          <h3 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 20, color: T.text, textAlign: "center", marginBottom: 16 }}>Lo que dicen nuestros clientes</h3>
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
          <h3 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 20, color: T.text, textAlign: "center", marginBottom: 16 }}>Preguntas frecuentes</h3>
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
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ position: "fixed", inset: 0, zIndex: 100000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", padding: 20 }} 
            onClick={() => setSelectedPlan(null)}
          >
            <motion.div 
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
                  <span style={{ fontSize: 16, color: T.sub, fontWeight: 500 }}>MXN/{selectedPlan.billing === "monthly" ? "mes" : "año"}</span>
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
                        host_url: 'https://citymap.mx'
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
