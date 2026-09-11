import React from 'react';
import Icon from '../ui/Icon.jsx';

export default function DetailLocation({ selected, isElite, dText, dSub, T, goDir, t }) {
  if (selected.hide_location || !selected.lat || !selected.lng) {
    return null;
  }

  return (
    <div style={{ padding: "0 20px" }}>
      <div className="text-base" style={{ fontWeight: 800, color: dText, marginBottom: 12 }}>{t("ubicacion", "Ubicación")}</div>
      <div onClick={(e) => goDir(selected, e)} style={{ width: "100%", height: 160, borderRadius: 16, overflow: "hidden", position: "relative", cursor: "pointer", background: T.bg, border: `1px solid ${isElite ? "rgba(255,255,255,0.1)" : T.border}` }}>
        <img 
          src={`https://maps.googleapis.com/maps/api/staticmap?center=${selected.lat},${selected.lng}&zoom=15&size=800x400&maptype=roadmap&markers=color:red%7C${selected.lat},${selected.lng}&key=${import.meta.env.VITE_GMAPS_KEY}`}
          alt="Mapa"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          loading="lazy"
        />
      </div>
      {selected.address && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginTop: 12 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: dText }}>
              <Icon name="mapa" size={18} color={dText} />
              <span className="text-sm" style={{ fontWeight: 700 }}>{t("direccion", "Dirección")}</span>
            </div>
            <div className="text-sm" style={{ color: dSub, lineHeight: 1.5, paddingLeft: 26 }}>{selected.address}</div>
          </div>
          <button onClick={(e) => goDir(selected, e)} style={{ width: 44, height: 44, borderRadius: "50%", background: isElite ? "rgba(255,255,255,0.1)" : "#F3F4F6", border: "none", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, cursor: "pointer" }}>
            <Icon name="nav" size={20} color={dText} />
          </button>
        </div>
      )}
    </div>
  );
}
