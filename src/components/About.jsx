import { useEffect } from 'react';
import Icon from './ui/Icon.jsx';

export default function About({ T, onBack }) {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ paddingBottom: 84, animation: "fadeUp .4s ease", background: T.bg, minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ position: "sticky", top: 0, background: T.bg, zIndex: 10, borderBottom: `1px solid ${T.border}`, padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <button className="press" onClick={onBack} style={{ background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", padding: 0 }}><Icon name="chevron" size={24} color={T.text} style={{ transform: "rotate(180deg)" }} /></button>
      </div>

      <div style={{ padding: "40px 24px" }}>
        
        {/* Intro */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <Icon name="map" size={32} color={T.text} />
            <h1 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 36, color: T.text, margin: 0, letterSpacing: 0.5 }}>CityMap</h1>
          </div>
          <p style={{ fontSize: 18, color: T.sub, lineHeight: 1.6, fontWeight: 500 }}>
            Tu guía local inteligente para descubrir lo mejor de la ciudad, en un solo lugar.
          </p>
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: T.border, width: "100%", marginBottom: 40 }} />

        {/* Misión */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Icon name="star" size={22} color={T.text} />
            <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0, letterSpacing: -0.5 }}>Misión</h3>
          </div>
          <p style={{ fontSize: 16, color: T.sub, lineHeight: 1.7, fontWeight: 500 }}>
            Conectar a las personas con los mejores negocios y experiencias locales, impulsando la economía de nuestra ciudad a través de una plataforma accesible, moderna y fácil de usar para todos.
          </p>
        </div>

        {/* Visión */}
        <div style={{ marginBottom: 48 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <Icon name="eye" size={22} color={T.text} />
            <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0, letterSpacing: -0.5 }}>Visión</h3>
          </div>
          <p style={{ fontSize: 16, color: T.sub, lineHeight: 1.7, fontWeight: 500 }}>
            Ser la aplicación líder y el referente número uno para descubrir lugares increíbles, creando una comunidad fuerte donde los usuarios y negocios locales prosperen juntos.
          </p>
        </div>

        {/* Separator */}
        <div style={{ height: 1, background: T.border, width: "100%", marginBottom: 40 }} />

        {/* Valores */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 32 }}>
            <Icon name="heart" size={22} color={T.text} />
            <h3 style={{ fontSize: 20, fontWeight: 800, color: T.text, margin: 0, letterSpacing: -0.5 }}>Valores</h3>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: T.sub, width: 20 }}>01</span>
                <strong style={{ fontSize: 17, color: T.text, letterSpacing: -0.2 }}>Comunidad Primero</strong>
              </div>
              <p style={{ fontSize: 15, color: T.sub, lineHeight: 1.6, marginLeft: 32, marginTop: 0, marginBottom: 0 }}>Existimos para servir a nuestra gente y fortalecer los lazos locales.</p>
            </div>
            
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: T.sub, width: 20 }}>02</span>
                <strong style={{ fontSize: 17, color: T.text, letterSpacing: -0.2 }}>Innovación Continua</strong>
              </div>
              <p style={{ fontSize: 15, color: T.sub, lineHeight: 1.6, marginLeft: 32, marginTop: 0, marginBottom: 0 }}>Buscamos siempre la mejor tecnología para brindar experiencias únicas.</p>
            </div>
            
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: T.sub, width: 20 }}>03</span>
                <strong style={{ fontSize: 17, color: T.text, letterSpacing: -0.2 }}>Transparencia</strong>
              </div>
              <p style={{ fontSize: 15, color: T.sub, lineHeight: 1.6, marginLeft: 32, marginTop: 0, marginBottom: 0 }}>Reseñas reales y tratos justos para todos nuestros comercios aliados.</p>
            </div>
            
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: T.sub, width: 20 }}>04</span>
                <strong style={{ fontSize: 17, color: T.text, letterSpacing: -0.2 }}>Calidad</strong>
              </div>
              <p style={{ fontSize: 15, color: T.sub, lineHeight: 1.6, marginLeft: 32, marginTop: 0, marginBottom: 0 }}>Nos aseguramos de que cada interacción en CityMap sea excepcional.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
