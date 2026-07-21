import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "../ui/Icon.jsx";
import { FONT_BIZ } from "../../lib/constants.js";
import { CAT_EMOJI, isOpenNow, getScheduleStatus, getThumbUrl, haptic } from "../../lib/utils.js";
import ProgressiveImage from "../ProgressiveImage.jsx";

export default memo(function FeaturedCard({ b, T, dark, isFav, toggleFav, onTap, goWhatsApp, goDir, doShare, distStr, rank, realFavs, showStars = true }) {
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
    <motion.div whileHover="hover" whileTap={{ scale: 0.96 }} className="press" onClick={() => { haptic("light"); onTap(b); }} style={{ borderRadius: 18, overflow: "hidden", background: "#0a0a0a", position: "relative", display: "flex", flexDirection: "column", border: `1.5px solid ${T.border}`, boxShadow: T.shadow }} variants={{ hover: { y: -4, boxShadow: T.shadowLg } }} transition={{ duration: 0.3, ease: "easeOut" }}>
      <div style={{ position: "relative", height: 190, overflow: "hidden" }}>
        {thumb?.url
         ? <ProgressiveImage 
              variants={{ hover: { scale: 1.08 } }} 
              transition={{ duration: 0.4, ease: "easeOut" }} 
              src={getThumbUrl(thumb.url, 1200, 900)} 
              thumbSrc={getThumbUrl(thumb.url, 20, 20)}
              alt={b.name} 
              style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} 
            />
          : <div style={{ height: "100%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>{(b.emoji || CAT_EMOJI[b.category]) || "🏪"}</div>
        }
        {/* Bottom dark gradient for text readability */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.4) 60%, rgba(0,0,0,0) 100%)" }} />
        
        {/* Podium Badge */}
        {rank && (
          <div style={{ position: "absolute", top: 12, left: 12, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
            <span style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 18, color: rank === 1 ? "#FDE047" : rank === 2 ? "#E5E7EB" : rank === 3 ? "#FDBA74" : "#FFFFFF" }}>{rank}</span>
          </div>
        )}

        {/* Premium Logo (Top Left) */}
        {b.logo_url && (
          <div style={{ position: "absolute", top: 12, left: rank ? 56 : 12, width: 76, height: 76, borderRadius: "50%", background: "#fff", border: "1px solid rgba(255,255,255,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", boxSizing: "border-box", overflow: "hidden" }}>
            <img src={getThumbUrl(b.logo_url, 150, 150)} width={76} height={76} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: "50%" }} alt="logo" />
          </div>
        )}

        {/* Top right actions (Fav only) */}
        <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}>
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

        {/* Text overlay bottom */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "30px 14px 4px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
          {b.badge && <div style={{ fontSize: 9, fontWeight: 800, color: "#C9A84C", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 2 }}>{b.badge}</div>}
          <h3 style={{ fontFamily: FONT_BIZ, fontSize: 22, color: "#fff", lineHeight: 1.15, fontWeight: 800, marginBottom: 2, textShadow: "0 2px 4px rgba(0,0,0,0.5)", paddingRight: 8 }}>{b.name}</h3>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {showStars ? (
                b.review_count > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(0,0,0,0.04)", padding: "4px 8px", borderRadius: 20 }}>
                    <img src="/estrella.svg" alt="star" width={14} height={14} loading="lazy" style={{ width: 14, height: 14, marginTop: -2, filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.5))" }} />
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{b.rating && !isNaN(parseFloat(String(b.rating).replace(',', '.'))) ? parseFloat(String(b.rating).replace(',', '.')).toFixed(1) : "N/A"}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,.6)", fontWeight: 500, marginLeft: 2 }}>({b.review_count})</span>
                    {realFavs > 0 && <><span style={{ fontSize: 10, color: "rgba(255,255,255,.4)", margin: "0 2px" }}>·</span><Icon name="heart" size={11} color="rgba(255,255,255,.6)" /><span style={{ fontSize: 11, color: "rgba(255,255,255,.6)", fontWeight: 600, marginLeft: 2 }}>{realFavs}</span></>}
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
                     {[1,2,3,4,5].map(i => <Icon key={i} name="star" size={11} color="rgba(255,255,255,0.3)" />)}
                  </div>
                )
              ) : (
                realFavs > 0 ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <Icon name="heart" size={12} color="rgba(255,255,255,.8)" />
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,.8)", fontWeight: 600 }}>{realFavs}</span>
                  </div>
                ) : (
                   <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                     <span style={{ fontSize: 13, opacity: 0.4 }}>🤍</span>
                     <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)", fontStyle: "italic", fontWeight: 500 }}>Sé el primero en apoyar</span>
                   </div>
                )
              )}

              <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>·</span>
              
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span className={getScheduleStatus(b, isOpenNow(b), true).dot} style={{ width: 6, height: 6, boxShadow: "0 0 6px rgba(0,0,0,0.5)" }} />
                <span style={{ fontSize: 11, color: getScheduleStatus(b, isOpenNow(b), true).color, fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>{getScheduleStatus(b, isOpenNow(b), true).text}</span>
              </div>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
              {b.whatsapp && (
                <button aria-label="Contactar por WhatsApp" onClick={(e) => { e.stopPropagation(); goWhatsApp && goWhatsApp(b, e); }} style={{ width: 36, height: 36, borderRadius: "50%", background: "transparent", border: "none", padding: 6, cursor: "pointer", transition: "transform 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                  <img src="/whatsapp.svg" alt="WhatsApp" width={24} height={24} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }} />
                </button>
              )}
              {(b.instagram || b.social_links?.instagram) && (
                <button aria-label="Ver Instagram" onClick={(e) => { 
                  e.stopPropagation(); 
                  const ig = b.instagram || b.social_links?.instagram;
                  window.open(`https://instagram.com/${ig.replace("@","")}`, "_blank"); 
                }} style={{ width: 36, height: 36, borderRadius: "50%", background: "transparent", border: "none", padding: 6, cursor: "pointer", transition: "transform 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                  <img src="/instagram.svg" alt="Instagram" width={24} height={24} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }} />
                </button>
              )}
              {(b.facebook || b.social_links?.facebook) && (
                <button aria-label="Ver Facebook" onClick={(e) => { 
                  e.stopPropagation(); 
                  const fb = b.facebook || b.social_links?.facebook;
                  window.open(fb.includes("http") ? fb : `https://facebook.com/${fb}`, "_blank"); 
                }} style={{ width: 36, height: 36, borderRadius: "50%", background: "transparent", border: "none", padding: 6, cursor: "pointer", transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                  <svg viewBox="0 0 24 24" fill="none" style={{ width: "100%", height: "100%", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }}>
                    <circle cx="12" cy="12" r="12" fill="#1877F2"/>
                    <path d="M15.4 12H13v8.5h-3.5V12H8v-3h1.5V7.1c0-2.3 1-3.6 3.8-3.6h2.5v3h-1.8c-1.1 0-1.3.4-1.3 1.3V9h3l-.4 3z" fill="#FFF"/>
                  </svg>
                </button>
              )}
            </div>
            
            {distStr && (
              <div style={{ display: "flex", alignItems: "center", marginLeft: 6 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>{distStr}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
});
