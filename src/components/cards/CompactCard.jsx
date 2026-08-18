import { useState, memo } from "react";
import { m, AnimatePresence } from "framer-motion";
import Icon from "../ui/Icon.jsx";
import { FONT_BIZ } from "../../lib/constants.js";
import { CAT_EMOJI, isOpenNow, getScheduleStatus, getThumbUrl, haptic } from "../../lib/utils.js";
import ProgressiveImage from "../ProgressiveImage.jsx";

export default memo(function CompactCard({ b, T, dark, isFav, toggleFav, onTap, distStr, realFavs, hideReviews, hideSchedule, hideFavs, showDirections, note, onEditNote, stayTimeStr }) {
  const thumb = b.photos?.[0];
  const [showPlus, setShowPlus] = useState(false);
  const handleFav = (e) => {
    e.stopPropagation();
    haptic("light");
    if (!isFav) {
      setShowPlus(true);
      setTimeout(() => setShowPlus(false), 1000);
    }
    toggleFav(b.id, e);
  };
  if (b._isCustom) {
    return (
      <div className={onTap ? "press" : ""} onClick={onTap ? () => { haptic("light"); onTap(b); } : undefined} style={{ background: T.white, borderRadius: 16, overflow: "hidden", boxShadow: T.shadow, display: "flex", flexDirection: "column", position: "relative", border: `1px solid ${T.border}`, padding: "14px", cursor: onTap ? "pointer" : "default" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left", width: "100%" }}>
          <h3 style={{ fontFamily: FONT_BIZ, margin: 0, fontSize: 15, fontWeight: 800, color: T.text, lineHeight: 1.2, letterSpacing: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{b.name}</h3>
          {b.address && <p style={{ margin: 0, fontSize: 12, color: T.sub, marginTop: 4, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{b.address}</p>}
        </div>
        {showDirections && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`, '_blank');
            }}
            style={{ marginTop: 14, width: "100%", background: "transparent", color: T.sub, border: `1px solid ${T.border}`, borderRadius: 10, padding: "8px 0", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}
          >
            Abrir ubicación en Maps
          </button>
        )}
        {(note || stayTimeStr) && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${T.border}`, width: "100%", position: "relative", textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
            {stayTimeStr && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>🕒</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Estancia: <span style={{ fontWeight: 500, color: T.sub }}>{stayTimeStr}</span></span>
              </div>
            )}
            {note && (
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>📝</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: T.sub, textTransform: "uppercase", letterSpacing: "0.5px" }}>Nota</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.5, whiteSpace: "pre-wrap", paddingRight: onEditNote ? 24 : 0 }}>{note}</p>
                {onEditNote && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); onEditNote(); }}
                    style={{ position: "absolute", top: 0, right: 0, background: "transparent", border: "none", cursor: "pointer", padding: 4 }}
                  >
                    <Icon name="edit" size={14} color={T.sub} />
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <m.div whileHover={onTap ? "hover" : undefined} whileTap={onTap ? { scale: 0.96 } : undefined} className={onTap ? "press" : ""} onClick={onTap ? () => { haptic("light"); onTap(b); } : undefined} style={{ background: T.white, borderRadius: 16, overflow: "hidden", boxShadow: T.shadow, display: "flex", flexDirection: "column", position: "relative", border: `1px solid ${T.border}`, minHeight: 100, cursor: onTap ? "pointer" : "default" }} variants={{ hover: { y: -3, boxShadow: "0 12px 30px rgba(0, 0, 0, 0.1)" } }} transition={{ duration: 0.3, ease: "easeOut" }}>
      <div style={{ display: "flex", alignItems: "stretch", flex: 1, position: "relative" }}>
        {distStr && <div style={{ position: "absolute", top: 12, right: 12, fontSize: 10, fontWeight: 700, color: T.sub, padding: "2px 6px", zIndex: 2 }}>{distStr}</div>}
        
        {/* Thumbnail */}
        <div style={{ width: 130, flexShrink: 0, position: "relative", background: T.border }}>
        {thumb?.url
          ? <ProgressiveImage 
              variants={{ hover: { scale: 1.08 } }} 
              transition={{ duration: 0.4, ease: "easeOut" }} 
              src={getThumbUrl(thumb.url, 300, 300)} 
              thumbSrc={getThumbUrl(thumb.url, 20, 20)}
              alt={b.name} 
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} 
            />
          : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>{(b.emoji || CAT_EMOJI[b.category]) || "🏪"}</div>
        }
        {b.badge && <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", borderRadius: 6, padding: "2px 6px", fontSize: 8, fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>{b.badge}</div>}
      </div>

      <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 4 }}>
        <h3 style={{ fontFamily: FONT_BIZ, fontSize: 16, color: T.text, lineHeight: 1.2, fontWeight: 800, letterSpacing: 0, marginBottom: 0, paddingRight: distStr ? 40 : 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", flexShrink: 0 }}>
          {b.name}
          {(b.plan === "destacado" || b.plan === "premium" || b.plan === "pro") && (
            <img src="/verificado.png" alt="Verificado" width="18" height="18" style={{ marginLeft: 6, flexShrink: 0 }} />
          )}
        </h3>
        
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap" }}>
          {!hideReviews && (
            b.review_count > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <img src="/estrella.svg" alt="star" width={14} height={14} loading="lazy" style={{ width: 14, height: 14, marginTop: -2 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{b.rating && !isNaN(parseFloat(String(b.rating).replace(',', '.'))) ? parseFloat(String(b.rating).replace(',', '.')).toFixed(1) : "N/A"}</span>
                <span style={{ fontSize: 12, color: T.sub, fontWeight: 700 }}>({b.review_count})</span>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
                {[1,2,3,4,5].map(i => <Icon key={i} name="star" size={11} color={T.border} />)}
              </div>
            )
          )}

          {!hideReviews && !hideFavs && realFavs > 0 && <span style={{ fontSize: 10, color: T.border, margin: "0 -2px" }}>·</span>}

          {!hideFavs && realFavs > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Icon name="heart" size={13} color={T.sub} />
              <span style={{ fontSize: 12, fontWeight: 700, color: T.sub }}>{realFavs}</span>
            </div>
          )}

          {!hideSchedule && (!hideReviews || (!hideFavs && realFavs > 0)) && (
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.border }} />
          )}

          {!hideSchedule && (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className={getScheduleStatus(b, isOpenNow(b), true).dot} style={{ width: 4, height: 4 }} />
              <span style={{ fontSize: 11, color: getScheduleStatus(b, isOpenNow(b), true).color, fontWeight: 600 }}>{getScheduleStatus(b, isOpenNow(b), true).text}</span>
            </div>
          )}
        </div>

        {showDirections && (
          <div style={{ marginTop: 8 }}>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${b.lat},${b.lng}`, '_blank');
              }}
              style={{ background: T.bg, color: T.text, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Icon name="map" size={14} /> Cómo llegar
            </button>
          </div>
        )}
      </div>
      </div>

      {(note || stayTimeStr) && (
        <div style={{ padding: "12px 14px", borderTop: `1px dashed ${T.border}`, background: "transparent", position: "relative", textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
          {stayTimeStr && (
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 14 }}>🕒</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Estancia: <span style={{ fontWeight: 500, color: T.sub }}>{stayTimeStr}</span></span>
            </div>
          )}
          {note && (
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 14 }}>📝</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: T.sub, textTransform: "uppercase", letterSpacing: "0.5px" }}>Nota</span>
              </div>
              <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.5, whiteSpace: "pre-wrap", paddingRight: onEditNote ? 24 : 0 }}>{note}</p>
              {onEditNote && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onEditNote(); }}
                  style={{ position: "absolute", top: 0, right: 0, background: "transparent", border: "none", cursor: "pointer", padding: 4 }}
                >
                  <Icon name="edit" size={14} color={T.sub} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Fav button */}
      {!hideFavs && (
        <div style={{ position: "absolute", bottom: -2, right: 4, zIndex: 10 }}>
          <m.button whileTap={{ scale: 0.7 }} aria-label={isFav ? "Quitar de favoritos" : "Añadir a favoritos"} onClick={handleFav} style={{ width: 44, height: 44, background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", outline: "none" }}>
            <Icon name={isFav ? "heart_f" : "heart"} size={16} color={isFav ? "#F07060" : T.sub} />
          </m.button>
          <AnimatePresence>
            {showPlus && (
              <m.div initial={{ opacity: 0, y: 0, scale: 0.5 }} animate={{ opacity: 1, y: -30, scale: 1.2 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} style={{ position: "absolute", top: 0, left: 0, right: 0, pointerEvents: "none", display: "flex", justifyContent: "center", color: "#FFFFFF", fontWeight: 900, fontSize: 16, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                +1
              </m.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </m.div>
  );
});
