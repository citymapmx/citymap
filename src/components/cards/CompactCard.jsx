import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "../ui/Icon.jsx";
import { FONT_BIZ } from "../../lib/constants.js";
import { CAT_EMOJI, isOpenNow, getScheduleStatus, getThumbUrl, haptic } from "../../lib/utils.js";
import ProgressiveImage from "../ProgressiveImage.jsx";

export default memo(function CompactCard({ b, T, dark, isFav, toggleFav, onTap, distStr, realFavs, hideReviews, hideSchedule, hideFavs }) {
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
  return (
    <motion.div whileHover="hover" whileTap={{ scale: 0.96 }} className="press" onClick={() => { haptic("light"); onTap(b); }} style={{ background: T.white, borderRadius: 16, overflow: "hidden", boxShadow: T.shadow, display: "flex", alignItems: "stretch", position: "relative", border: `1px solid ${T.border}`, height: 100 }} variants={{ hover: { y: -3, boxShadow: "0 12px 30px rgba(0, 0, 0, 0.1)" } }} transition={{ duration: 0.3, ease: "easeOut" }}>
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

      <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <h3 style={{ fontFamily: FONT_BIZ, fontSize: 16, color: T.text, lineHeight: 1.2, fontWeight: 800, marginBottom: 4, paddingRight: distStr ? 40 : 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{b.name}</h3>
        
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
              <span className={getScheduleStatus(b, isOpenNow(b), true).dot} style={{ width: 6, height: 6 }} />
              <span style={{ fontSize: 11, color: getScheduleStatus(b, isOpenNow(b), true).color, fontWeight: 600 }}>{getScheduleStatus(b, isOpenNow(b), true).text}</span>
            </div>
          )}
        </div>
      </div>

      {/* Fav button */}
      <div style={{ position: "absolute", bottom: -2, right: 4, zIndex: 10 }}>
        <motion.button whileTap={{ scale: 0.7 }} aria-label={isFav ? "Quitar de favoritos" : "Añadir a favoritos"} onClick={handleFav} style={{ width: 44, height: 44, background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", outline: "none" }}>
          <Icon name={isFav ? "heart_f" : "heart"} size={16} color={isFav ? "#F07060" : T.sub} />
        </motion.button>
        <AnimatePresence>
          {showPlus && (
            <motion.div initial={{ opacity: 0, y: 0, scale: 0.5 }} animate={{ opacity: 1, y: -30, scale: 1.2 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} style={{ position: "absolute", top: 0, left: 0, right: 0, pointerEvents: "none", display: "flex", justifyContent: "center", color: "#FFFFFF", fontWeight: 900, fontSize: 16, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
              +1
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
});
