import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "../ui/Icon.jsx";
import { FONT_BIZ } from "../../lib/constants.js";
import { CAT_EMOJI, isOpenNow, getScheduleStatus, getThumbUrl, haptic } from "../../lib/utils.js";
import ProgressiveImage from "../ProgressiveImage.jsx";

export default memo(function DestacadoCard({ b, T, dark, isFav, toggleFav, onTap, distStr, realFavs }) {
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
    <motion.div whileHover="hover" whileTap={{ scale: 0.96 }} className="press" onClick={() => { haptic("light"); onTap(b); }} style={{ background: T.white, borderRadius: 16, overflow: "hidden", boxShadow: T.shadow, display: "flex", flexDirection: "column", position: "relative", border: `1.5px solid ${T.green}40` }} variants={{ hover: { y: -4, boxShadow: "0 16px 40px rgba(0, 0, 0, 0.12)" } }} transition={{ duration: 0.3, ease: "easeOut" }}>
      {/* Top Banner */}
      <div style={{ height: 120, position: "relative", background: T.border }}>
        {thumb?.url
          ? <ProgressiveImage 
              variants={{ hover: { scale: 1.08 } }} 
              transition={{ duration: 0.4, ease: "easeOut" }} 
              src={getThumbUrl(thumb.url, 600, 400)} 
              thumbSrc={getThumbUrl(thumb.url, 20, 20)}
              alt={b.name} 
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} 
            />
          : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>{(b.emoji || CAT_EMOJI[b.category]) || "🏪"}</div>
        }
        
        {/* Heart overlaid on top banner */}
        <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10 }}>
          <motion.button whileTap={{ scale: 0.7 }} aria-label={isFav ? "Quitar de favoritos" : "Añadir a favoritos"} onClick={handleFav} style={{ width: 44, height: 44, borderRadius: "50%", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}>
            <Icon name={isFav ? "heart_overlay_f" : "heart_overlay"} size={26} color="none" />
          </motion.button>
          <AnimatePresence>
            {showPlus && (
              <motion.div initial={{ opacity: 0, y: 0, scale: 0.5 }} animate={{ opacity: 1, y: -30, scale: 1.2 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} style={{ position: "absolute", top: 0, left: 0, right: 0, pointerEvents: "none", display: "flex", justifyContent: "center", color: "#FFFFFF", fontWeight: 900, fontSize: 18, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                +1
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "12px 14px", position: "relative" }}>
        <h3 style={{ fontFamily: FONT_BIZ, fontSize: 18, color: T.text, lineHeight: 1.2, fontWeight: 800, marginBottom: 8, textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</h3>
        
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {b.review_count > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                <img src="/estrella.svg" alt="star" width={16} height={16} loading="lazy" style={{ width: 16, height: 16, marginTop: -2 }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{b.rating && !isNaN(parseFloat(String(b.rating).replace(',', '.'))) ? parseFloat(String(b.rating).replace(',', '.')).toFixed(1) : "N/A"}</span>
                <span style={{ fontSize: 12, color: T.sub, fontWeight: 500 }}>({b.review_count})</span>
                {realFavs > 0 && <><span style={{ fontSize: 10, color: T.border, margin: "0 2px" }}>·</span><Icon name="heart" size={11} color={T.sub} /><span style={{ fontSize: 11, fontWeight: 700, color: T.sub, marginLeft: 2 }}>{realFavs}</span></>}
              </div>
            ) : (
               <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
                 {[1,2,3,4,5].map(i => <Icon key={i} name="star" size={12} color={T.border} />)}
               </div>
            )}
            <span style={{ fontSize: 10, color: T.border }}>·</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span className={getScheduleStatus(b, isOpenNow(b), true).dot} style={{ width: 6, height: 6 }} />
              <span style={{ fontSize: 12, color: getScheduleStatus(b, isOpenNow(b), true).color, fontWeight: 600 }}>{getScheduleStatus(b, isOpenNow(b), true).text}</span>
            </div>
          </div>
          
          {distStr && <div style={{ fontSize: 11, fontWeight: 600, color: T.sub }}>{distStr}</div>}
        </div>
      </div>
    </motion.div>
  );
});
