'use client';
import React from 'react';
import Image from 'next/image';

const PLATFORM_STYLES = {
  opentable: { img: "https://citymap.mx/assets/opentable-DtBv3P8y.webp", label: "OpenTable", invertImg: true },
  cover: { color: "#FF5A5F", label: "Cover", icon: "🎟️" },
  resy: { color: "#b02a26", label: "Resy", icon: "🍷" },
  ubereats: { img: "https://citymap.mx/assets/uber-Brm3hS2o.webp", label: "Uber Eats" },
  rappi: { img: "https://citymap.mx/assets/rappi-DqB9_9-Q.webp", label: "Rappi" },
  didifood: { img: "https://citymap.mx/assets/didi-D1xT9X6X.webp", label: "DiDi Food" },
  tiqets: { img: "https://citymap.mx/assets/tiqets.webp", label: "Tiqets" },
  whatsapp: { color: "#25D366", label: "WhatsApp", icon: "💬" },
  comprar_entradas: { color: "#111827", label: "Comprar Entradas", icon: "🎟️" },
  otro: { color: "#1877F2", label: "Sitio Web", icon: "🔗" }
};

const renderIcon = (s, size = 16) => {
  if (s.img) return <img src={s.img} alt={s.label} style={{ height: size * 1.4, width: "auto", display: "block", filter: s.invertImg ? "invert(1) brightness(2)" : "none" }} />;
  return <span style={{ fontSize: size }}>{s.icon}</span>;
};

const openLink = (url) => {
  let finalUrl = url;
  if (!finalUrl.startsWith('http') && !finalUrl.startsWith('wa.me')) finalUrl = 'https://' + finalUrl;
  window.open(finalUrl, '_blank', 'noopener,noreferrer');
};

const getPrefix = (platform) => {
  if (platform === 'tiqets') return '';
  if (['ubereats', 'rappi', 'didifood'].includes(platform)) return 'Haz tu pedido en';
  if (['whatsapp', 'otro'].includes(platform)) return 'Ir a';
  return 'Reservar en';
};

export default function ReservationsBlock({ linksStr, dark = false }) {
  if (!linksStr) return null;
  let links = [];
  try {
    links = JSON.parse(linksStr);
  } catch(e) { return null; }
  
  if (!Array.isArray(links) || links.length === 0) return null;

  if (links.length === 1) {
    const l = links[0];
    const s = PLATFORM_STYLES[l.platform] || PLATFORM_STYLES.otro;
    const prefix = getPrefix(l.platform);
    return (
      <div className="mb-6 mt-2">
        <button className="active:scale-95 transition-transform" onClick={() => openLink(l.url)} style={{ width: "100%", background: dark ? "#222" : "#ffffff", border: `1px solid ${dark ? "#333" : "#E5E7EB"}`, borderRadius: 16, padding: "14px", color: dark ? "#fff" : "#111827", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: dark ? "none" : "0 2px 12px rgba(0,0,0,0.04)" }}>
          {renderIcon(s, 22)} {prefix ? prefix + ' ' : ''}{s.label}
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 mt-2">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        {links.map((link, i) => {
          const platformStyle = PLATFORM_STYLES[link.platform] || PLATFORM_STYLES.otro;
          const s = { ...platformStyle, label: link.custom_title || platformStyle.label };
          return (
            <button key={i} className="active:scale-95 transition-transform" onClick={() => openLink(link.url)} style={{ background: dark ? "#222" : "#ffffff", border: `1px solid ${dark ? "#333" : "#E5E7EB"}`, borderRadius: 14, padding: "12px 10px", color: dark ? "#fff" : "#111827", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,0.03)" }}>
              {renderIcon(s, 18)} 
              <span style={{ lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
