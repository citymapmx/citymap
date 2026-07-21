import { useEffect } from 'react';
import Icon from './ui/Icon.jsx';

export default function About({ T, onBack }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ paddingBottom: 84, animation: "fadeUp .4s ease" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, background: T.bg, zIndex: 10, borderBottom: `1px solid ${T.border}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <button className="press" onClick={onBack} style={{ background: T.white, border: `1.5px solid ${T.border}`, width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}><Icon name="chevron" size={20} color={T.text} style={{ transform: "rotate(180deg)" }} /></button>
        <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 22, color: T.text, margin: 0, letterSpacing: 0.5 }}>Sobre CityMap</h2>
      </div>

      <div style={{ padding: "32px 20px" }}>
        
        {/* Intro */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ width: 80, height: 80, background: T.greenL, borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px", boxShadow: `0 8px 24px rgba(0,0,0,0.1)` }}>
            <Icon name="map" size={40} color={T.green} />
          </div>
          <h1 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 32, color: T.text, marginBottom: 8, letterSpacing: 1 }}>CityMap</h1>
          <p style={{ fontSize: 16, color: T.sub, lineHeight: 1.6 }}>Tu guía local inteligente para descubrir lo mejor de la ciudad, en un solo lugar.</p>
        </div>

        {/* Misión */}
        <div style={{ marginBottom: 32, background: T.white, borderRadius: 20, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.05)", border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#FEF3C7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="star" size={20} color="#D97706" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>Nuestra Misión</h3>
          </div>
          <p style={{ fontSize: 15, color: T.sub, lineHeight: 1.7 }}>
            Conectar a las personas con los mejores negocios y experiencias locales, impulsando la economía de nuestra ciudad a través de una plataforma accesible, moderna y fácil de usar para todos.
          </p>
        </div>

        {/* Visión */}
        <div style={{ marginBottom: 32, background: T.white, borderRadius: 20, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.05)", border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#E0E7FF", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="eye" size={20} color="#4F46E5" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>Nuestra Visión</h3>
          </div>
          <p style={{ fontSize: 15, color: T.sub, lineHeight: 1.7 }}>
            Ser la aplicación líder y el referente número uno para descubrir lugares increíbles, creando una comunidad fuerte donde los usuarios y negocios locales prosperen juntos.
          </p>
        </div>

        {/* Valores */}
        <div style={{ background: T.white, borderRadius: 20, padding: 24, boxShadow: "0 4px 16px rgba(0,0,0,0.05)", border: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: "#DCFCE7", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="heart" size={20} color="#16A34A" />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 800, color: T.text, margin: 0 }}>Nuestros Valores</h3>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ fontWeight: 800, color: T.text }}>1.</div>
              <div>
                <strong style={{ color: T.text, display: "block", marginBottom: 2 }}>Comunidad Primero</strong>
                <span style={{ fontSize: 14, color: T.sub, lineHeight: 1.5 }}>Existimos para servir a nuestra gente y fortalecer los lazos locales.</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ fontWeight: 800, color: T.text }}>2.</div>
              <div>
                <strong style={{ color: T.text, display: "block", marginBottom: 2 }}>Innovación Continua</strong>
                <span style={{ fontSize: 14, color: T.sub, lineHeight: 1.5 }}>Buscamos siempre la mejor tecnología para brindar experiencias únicas.</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ fontWeight: 800, color: T.text }}>3.</div>
              <div>
                <strong style={{ color: T.text, display: "block", marginBottom: 2 }}>Transparencia</strong>
                <span style={{ fontSize: 14, color: T.sub, lineHeight: 1.5 }}>Reseñas reales y tratos justos para todos nuestros comercios aliados.</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <div style={{ fontWeight: 800, color: T.text }}>4.</div>
              <div>
                <strong style={{ color: T.text, display: "block", marginBottom: 2 }}>Calidad</strong>
                <span style={{ fontSize: 14, color: T.sub, lineHeight: 1.5 }}>Nos aseguramos de que cada interacción en CityMap sea excepcional.</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
