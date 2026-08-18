import React, { memo } from "react";
import Icon from "../ui/Icon.jsx";
import { getThumbUrl, getScheduleStatus, isOpenNow } from "../../lib/utils.js";

const CAT_EMOJI = {
  restaurant: "🍽️", cafe: "☕", bar: "🍺", hotel: "🏨", shop: "🛍️",
  health: "🏥", sport: "⚽", culture: "🎭", nature: "🌿", service: "🔧"
};

const FONT_BIZ = "var(--heading)";

/**
 * Card that mimics the map popup style:
 * - Full-width cover photo with name overlay
 * - Category / open status row
 * - Only "Cómo llegar" button (no detail navigation)
 */
function ItineraryItemCard({ item, T, dark, note, onEditNote, stayTimeStr }) {
  const b = item?.biz;
  if (!b) return null;

  const mapsUrl = b.lat && b.lng
    ? `https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`
    : b.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.address)}`
    : null;

  const scheduleInfo = !b._isCustom ? getScheduleStatus(b, isOpenNow(b)) : null;

  // ── Custom place (Google Maps / manual) → simple style ──────────────────
  if (b._isCustom) {
    return (
      <div style={{ background: T.white, borderRadius: 16, overflow: "hidden", boxShadow: T.shadow, border: `1px solid ${T.border}`, padding: "14px", display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <h3 style={{ fontFamily: FONT_BIZ, margin: 0, fontSize: 18, fontWeight: 800, color: T.text, lineHeight: 1.2, textAlign: "left" }}>{b.name}</h3>
          {b.address && <p style={{ margin: 0, fontSize: 13, color: T.sub, lineHeight: 1.4, textAlign: "left" }}>{b.address}</p>}
        </div>
        {stayTimeStr && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.sub, fontWeight: 600 }}>
            <Icon name="clock" size={13} color={T.sub} />
            <span>Estancia: <strong style={{ color: T.text }}>{stayTimeStr}</strong></span>
          </div>
        )}
        {note && (
          <div style={{ background: dark ? "rgba(255,255,255,0.04)" : "#F9FAFB", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", textAlign: "left" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>📝 NOTA</div>
            <div style={{ fontSize: 14, color: T.text, lineHeight: 1.5 }}>{note}</div>
            {onEditNote && (
              <button onClick={onEditNote} style={{ marginTop: 6, background: "none", border: "none", padding: 0, fontSize: 12, color: T.sub, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="edit" size={12} color={T.sub} /> editar
              </button>
            )}
          </div>
        )}
        {mapsUrl && (
          <button className="press" onClick={e => { e.stopPropagation(); window.open(mapsUrl, "_blank"); }} style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="nav" size={14} color={T.text} /> Abrir ubicación en Maps
          </button>
        )}
      </div>
    );
  }

  // ── Registered CityMap business → map-popup style ────────────────────────
  return (
    <div style={{ background: T.white, borderRadius: 16, overflow: "hidden", boxShadow: T.shadow, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column" }}>

      {/* Cover photo with name overlay */}
      <div style={{ width: "100%", height: 140, background: T.bg, position: "relative", flexShrink: 0 }}>
        {b.photos?.[0]?.url
          ? <img src={getThumbUrl(b.photos[0].url, 1000, 700)} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
              {b.emoji || CAT_EMOJI[b.category] || "📍"}
            </div>
        }
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "55%", background: "linear-gradient(to top, rgba(0,0,0,0.6), transparent)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 10, left: 12, right: 12, zIndex: 2 }}>
          <div style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 17, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>{b.name}</div>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "10px 12px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
        {stayTimeStr && (
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.sub, fontWeight: 600 }}>
            <Icon name="clock" size={13} color={T.sub} />
            <span>Estancia: <strong style={{ color: T.text }}>{stayTimeStr}</strong></span>
          </div>
        )}
        {note && (
          <div style={{ background: dark ? "rgba(255,255,255,0.04)" : "#F9FAFB", border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", textAlign: "left" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 }}>📝 NOTA</div>
            <div style={{ fontSize: 14, color: T.text, lineHeight: 1.5 }}>{note}</div>
            {onEditNote && (
              <button onClick={onEditNote} style={{ marginTop: 6, background: "none", border: "none", padding: 0, fontSize: 12, color: T.sub, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                <Icon name="edit" size={12} color={T.sub} /> editar
              </button>
            )}
          </div>
        )}
        {mapsUrl && (
          <button className="press" onClick={e => { e.stopPropagation(); window.open(mapsUrl, "_blank"); }} style={{ width: "100%", background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "9px 0", fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="nav" size={14} color={T.text} /> Cómo llegar
          </button>
        )}
      </div>
    </div>
  );
}

export default memo(ItineraryItemCard);

