import React from 'react';
import Icon from './ui/Icon';

export default function MercadoLibreShowcase({ nickname, bizName }) {
  if (!nickname) return null;

  const storeUrl = nickname.startsWith('http') ? nickname : `https://${nickname}`;

  return (
    <div style={{ padding: "20px 20px 0" }}>
      <div style={{ 
        background: "#FFE600", 
        borderRadius: 20, 
        padding: "16px",
        display: "flex", 
        alignItems: "center",
        gap: 12,
        position: "relative",
        overflow: "hidden",
        boxShadow: "0 6px 16px rgba(255, 230, 0, 0.2)"
      }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: "rgba(255,255,255,0.3)", borderRadius: "50%" }}></div>

        <div style={{ flex: 1, position: "relative", zIndex: 1, textAlign: "left" }}>
          <div style={{ fontWeight: 900, color: "#2D3277", fontSize: 16, letterSpacing: "-0.3px", lineHeight: 1.1, marginBottom: 2 }}>
            Tienda Oficial
          </div>
          <div style={{ fontSize: 12, color: "rgba(45, 50, 119, 0.85)", lineHeight: 1.2, fontWeight: 700 }}>
            de {bizName || "este negocio"} en Mercado Libre
          </div>
        </div>

        <a href={storeUrl} target="_blank" rel="noreferrer" className="press" style={{ 
          background: "#FFFFFF", 
          color: "#2D3277", 
          borderRadius: 12, 
          padding: "10px 16px", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          gap: 6, 
          fontWeight: 800, 
          textDecoration: "none", 
          fontSize: 13, 
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          position: "relative",
          zIndex: 1,
          flexShrink: 0
        }}>
          Ver catálogo completo
        </a>
      </div>
    </div>
  );
}
