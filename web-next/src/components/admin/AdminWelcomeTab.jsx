import React, { useState, useEffect } from 'react';

export default function AdminWelcomeTab({ setTab, T }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    // Ej: "lunes 7 sep · 3:05 p. m."
    const dateStr = date.toLocaleDateString("es-MX", { weekday: 'long', day: 'numeric', month: 'short' });
    const timeStr = date.toLocaleTimeString("es-MX", { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${dateStr} · ${timeStr}`;
  };

  const gridItems = [
    { id: "dashboard", icon: "📈", label: "Resumen" },
    { id: "biz", icon: "🏢", label: "Negocios" },
    { id: "pending", icon: "⏳", label: "Pendientes" },
    { id: "activity", icon: "📊", label: "Actividad" },
    { id: "events", icon: "🎫", label: "Eventos" },
    { id: "media", icon: "🖼️", label: "Multimedia" },
    { id: "experiences", icon: "🏕️", label: "Experiencias" },
    { id: "promos", icon: "🏷️", label: "Promos / Cupones" },
    { id: "banners", icon: "📢", label: "Banners" },
  ];

  return (
    <div style={{ padding: "40px 20px 80px", display: "flex", flexDirection: "column", alignItems: "center", minHeight: "100%" }}>
      {/* Header / Saludo */}
      <div style={{ textAlign: "center", marginBottom: 40, animation: "fadeInDown 0.5s ease" }}>
        <div style={{ fontSize: 42, marginBottom: 12 }}>👋</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: T.text, margin: "0 0 6px 0", letterSpacing: "-0.5px" }}>¡Hola, Administrador!</h2>
        <p style={{ fontSize: 14, color: T.sub, margin: 0, textTransform: "capitalize", fontWeight: 500 }}>{formatTime(time)}</p>
      </div>

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      {/* Grid de Accesos Directos */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(3, 1fr)", 
        gap: 16, 
        width: "100%", 
        maxWidth: 400 
      }}>
        {gridItems.map((item, index) => (
          <div 
            key={item.id}
            onClick={() => setTab(item.id)}
            className="press"
            style={{
              background: T.bg,
              border: `1px solid ${T.border}`,
              borderRadius: 16,
              padding: "20px 10px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
              animation: `popIn 0.4s ease forwards`,
              animationDelay: `${index * 0.05}s`,
              opacity: 0 // Inicia invisible para la animación
            }}
          >
            <div style={{ fontSize: 32, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.1))" }}>{item.icon}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.text, textAlign: "center", lineHeight: 1.2 }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
