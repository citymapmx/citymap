import { useEffect } from 'react';
import Icon from './ui/Icon.jsx';

export default function About({ T, onBack }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const isDark = T.bg === "#000" || T.bg === "#111827";
  const cardBg = isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC";
  const cardBorder = isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0";
  const accentGradient = "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)";

  return (
    <div style={{ paddingBottom: 84, animation: "fadeUp .4s ease", background: T.bg, minHeight: "100vh" }}>
      {/* Navbar */}
      <div style={{ position: "sticky", top: 0, background: T.bg, zIndex: 10, borderBottom: `1px solid ${T.border}`, padding: "16px 20px", display: "flex", alignItems: "center" }}>
        <button className="press" onClick={onBack} style={{ background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}><Icon name="chevron" size={24} color={T.text} style={{ transform: "rotate(180deg)" }} /></button>
        <span style={{ marginLeft: 16, fontSize: 16, fontWeight: 700, color: T.text }}>Acerca de CityMap</span>
      </div>

      <div style={{ padding: "32px 20px" }}>
        
        {/* Hero Section */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 48, marginTop: 16 }}>
          <img 
            src="/logo-brand.png" 
            alt="CityMap Logo" 
            style={{ 
              height: 60, 
              objectFit: "contain", 
              marginBottom: 16,
              filter: isDark ? "brightness(10)" : "brightness(0)",
              transition: "filter .3s"
            }} 
          />
          <p style={{ fontSize: 16, color: T.sub, lineHeight: 1.6, fontWeight: 500, maxWidth: 300, margin: 0 }}>
            Tu guía local inteligente para descubrir lo mejor de la ciudad, en un solo lugar.
          </p>
        </div>

        {/* Misión y Visión (Cards) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 48 }}>
          {/* Misión Card */}
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 24, padding: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(59, 130, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, color: "#3B82F6" }}>
              <Icon name="star" size={20} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: "0 0 12px 0", letterSpacing: -0.5 }}>Misión</h3>
            <p style={{ fontSize: 15, color: T.sub, lineHeight: 1.7, fontWeight: 500, margin: 0 }}>
              Conectar a las personas con los mejores negocios y experiencias locales, impulsando la economía de nuestra ciudad a través de una plataforma accesible, moderna y fácil de usar para todos.
            </p>
          </div>

          {/* Visión Card */}
          <div style={{ background: cardBg, border: `1px solid ${cardBorder}`, borderRadius: 24, padding: 24, position: "relative", overflow: "hidden" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(139, 92, 246, 0.1)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, color: "#8B5CF6" }}>
              <Icon name="eye" size={20} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: "0 0 12px 0", letterSpacing: -0.5 }}>Visión</h3>
            <p style={{ fontSize: 15, color: T.sub, lineHeight: 1.7, fontWeight: 500, margin: 0 }}>
              Ser la aplicación líder y el referente número uno para descubrir lugares increíbles, creando una comunidad fuerte donde los usuarios y negocios locales prosperen juntos.
            </p>
          </div>
        </div>

        {/* Valores */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, justifyContent: "center" }}>
            <h3 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: 0, letterSpacing: -0.5 }}>Nuestros Valores</h3>
          </div>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}>
            
            {[
              { num: "01", title: "Comunidad Primero", desc: "Existimos para servir a nuestra gente y fortalecer los lazos locales." },
              { num: "02", title: "Innovación Continua", desc: "Buscamos siempre la mejor tecnología para brindar experiencias únicas." },
              { num: "03", title: "Transparencia", desc: "Reseñas reales y tratos justos para todos nuestros comercios aliados." },
              { num: "04", title: "Calidad", desc: "Nos aseguramos de que cada interacción en CityMap sea excepcional." }
            ].map((v) => (
              <div key={v.num} style={{ background: isDark ? "rgba(255,255,255,0.02)" : "#fff", border: `1px solid ${cardBorder}`, borderRadius: 20, padding: 20, position: "relative", overflow: "hidden", boxShadow: isDark ? "none" : "0 4px 12px rgba(0,0,0,0.02)" }}>
                <div style={{ position: "absolute", top: -10, right: -10, fontSize: 80, fontWeight: 900, color: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", pointerEvents: "none", letterSpacing: -5 }}>
                  {v.num}
                </div>
                <div style={{ position: "relative", zIndex: 1 }}>
                  <strong style={{ display: "block", fontSize: 17, color: T.text, letterSpacing: -0.2, marginBottom: 6 }}>{v.title}</strong>
                  <p style={{ fontSize: 14, color: T.sub, lineHeight: 1.6, margin: 0, paddingRight: 20 }}>{v.desc}</p>
                </div>
              </div>
            ))}

          </div>
        </div>

      </div>
    </div>
  );
}
