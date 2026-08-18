import { useState, memo } from "react";
import { m, AnimatePresence } from "framer-motion";
import Icon from "../ui/Icon.jsx";
import OptimizedImage from "../ui/OptimizedImage.jsx";
import { FONT_BIZ } from "../../lib/constants.js";
import { CAT_EMOJI, isOpenNow, getScheduleStatus, getThumbUrl, haptic } from "../../lib/utils.js";
import ProgressiveImage from "../ProgressiveImage.jsx";
import { useTranslation } from "../../hooks/useTranslation.js";

export default memo(function BusinessCard({
  variant = "compact", // "compact" | "destacado" | "featured"
  b,
  T,
  dark,
  isFav,
  toggleFav,
  onTap,
  distStr,
  realFavs = 0,
  hideReviews = false,
  hideSchedule = false,
  hideFavs = false,
  showDirections = false,
  note,
  onEditNote,
  stayTimeStr,
  rank,
  goWhatsApp,
  showStars = true
}) {
  const thumb = b.photos?.[0];
  const [showPlus, setShowPlus] = useState(false);
  const { t } = useTranslation();

  const handleFav = (e) => {
    e.stopPropagation();
    haptic("light");
    if (!isFav) {
      setShowPlus(true);
      setTimeout(() => setShowPlus(false), 1000);
    }
    toggleFav(b.id, e);
  };

  // 1. CUSTOM PLACE CARD (Only applicable for compact view / itinerary popup)
  if (b._isCustom) {
    return (
      <div 
        className={onTap ? "press" : ""} 
        onClick={onTap ? () => { haptic("light"); onTap(b); } : undefined} 
        style={{ 
          background: T.white, 
          borderRadius: 16, 
          overflow: "hidden", 
          boxShadow: T.shadow, 
          display: "flex", 
          flexDirection: "column", 
          position: "relative", 
          border: `1px solid ${T.border}`, 
          padding: "14px", 
          cursor: onTap ? "pointer" : "default" 
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", textAlign: "left", width: "100%" }}>
          <h3 style={{ fontFamily: FONT_BIZ, margin: 0, fontSize: 15, fontWeight: 800, color: T.text, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textOverflow: "ellipsis", width: "100%" }}>{b.name}</h3>
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
            {t("abrir_maps", "Abrir ubicación en Maps")}
          </button>
        )}
        {(note || stayTimeStr) && (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px dashed ${T.border}`, width: "100%", position: "relative", textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
            {stayTimeStr && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>🕒</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t("estancia", "Estancia")}: <span style={{ fontWeight: 500, color: T.sub }}>{stayTimeStr}</span></span>
              </div>
            )}
            {note && (
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>📝</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: T.sub, textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("nota", "Nota")}</span>
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

  // 2. COMPACT LAYOUT (Horizontal list card)
  if (variant === "compact") {
    return (
      <m.div 
        whileHover={onTap ? "hover" : undefined} 
        whileTap={onTap ? { scale: 0.96 } : undefined} 
        className={onTap ? "press" : ""} 
        onClick={onTap ? () => { haptic("light"); onTap(b); } : undefined} 
        style={{ 
          background: T.white, 
          borderRadius: 16, 
          overflow: "hidden", 
          boxShadow: T.shadow, 
          display: "flex", 
          flexDirection: "column", 
          position: "relative", 
          border: `1px solid ${T.border}`, 
          minHeight: 100, 
          cursor: onTap ? "pointer" : "default" 
        }} 
        variants={{ hover: { y: -3, boxShadow: "0 12px 30px rgba(0, 0, 0, 0.1)" } }} 
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
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
                  <span style={{ fontSize: 11, color: getScheduleStatus(b, isOpenNow(b), true).color, fontWeight: 600 }}>{t(getScheduleStatus(b, isOpenNow(b), true).text)}</span>
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
                  <Icon name="map" size={14} /> {t("como_llegar", "Cómo llegar")}
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
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{t("estancia", "Estancia")}: <span style={{ fontWeight: 500, color: T.sub }}>{stayTimeStr}</span></span>
              </div>
            )}
            {note && (
              <div style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 14 }}>📝</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: T.sub, textTransform: "uppercase", letterSpacing: "0.5px" }}>{t("nota", "Nota")}</span>
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
            <m.button whileTap={{ scale: 0.7 }} aria-label={isFav ? t("quitar_fav", "Quitar de favoritos") : t("anadir_fav", "Añadir a favoritos")} onClick={handleFav} style={{ width: 44, height: 44, background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", outline: "none" }}>
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
  }

  // 3. DESTACADO LAYOUT (Grid card with top banner)
  if (variant === "destacado") {
    return (
      <m.div 
        whileHover="hover" 
        whileTap={{ scale: 0.96 }} 
        className="press" 
        onClick={() => { haptic("light"); onTap(b); }} 
        style={{ 
          background: T.white, 
          borderRadius: 16, 
          overflow: "hidden", 
          boxShadow: T.shadow, 
          display: "flex", 
          flexDirection: "column", 
          position: "relative", 
          border: `1.5px solid ${T.green}40` 
        }} 
        variants={{ hover: { y: -4, boxShadow: "0 16px 40px rgba(0, 0, 0, 0.12)" } }} 
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
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
            <m.button whileTap={{ scale: 0.7 }} aria-label={isFav ? t("quitar_fav", "Quitar de favoritos") : t("anadir_fav", "Añadir a favoritos")} onClick={handleFav} style={{ width: 44, height: 44, borderRadius: "50%", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}>
              <Icon name={isFav ? "heart_overlay_f" : "heart_overlay"} size={26} color="none" />
            </m.button>
            <AnimatePresence>
              {showPlus && (
                <m.div initial={{ opacity: 0, y: 0, scale: 0.5 }} animate={{ opacity: 1, y: -30, scale: 1.2 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} style={{ position: "absolute", top: 0, left: 0, right: 0, pointerEvents: "none", display: "flex", justifyContent: "center", color: "#FFFFFF", fontWeight: 900, fontSize: 18, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                  +1
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "12px 14px", position: "relative" }}>
          <h3 style={{ fontFamily: FONT_BIZ, fontSize: 18, color: T.text, lineHeight: 1.2, fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</span>
            {(b.plan === "destacado" || b.plan === "premium" || b.plan === "pro") && (
              <img src="/verificado.png" alt="Verificado" width="18" height="18" style={{ marginLeft: 6, flexShrink: 0 }} />
            )}
          </h3>
          
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
                <span style={{ fontSize: 12, color: getScheduleStatus(b, isOpenNow(b), true).color, fontWeight: 600 }}>{t(getScheduleStatus(b, isOpenNow(b), true).text)}</span>
              </div>
            </div>
            
            {distStr && <div style={{ fontSize: 11, fontWeight: 600, color: T.sub }}>{distStr}</div>}
          </div>
        </div>
      </m.div>
    );
  }

  // 4. FEATURED LAYOUT (Promotional dark style with social and rank overlays)
  if (variant === "featured") {
    return (
      <m.div 
        whileHover="hover" 
        whileTap={{ scale: 0.96 }} 
        className="press" 
        onClick={() => { haptic("light"); onTap(b); }} 
        style={{ 
          borderRadius: 18, 
          overflow: "hidden", 
          background: "#0a0a0a", 
          position: "relative", 
          display: "flex", 
          flexDirection: "column", 
          border: `1.5px solid ${T.border}`, 
          boxShadow: T.shadow 
        }} 
        variants={{ hover: { y: -4, boxShadow: T.shadowLg } }} 
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
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
              <span style={{ fontFamily: "var(--heading)", fontSize: 18, color: rank === 1 ? "#FDE047" : rank === 2 ? "#E5E7EB" : rank === 3 ? "#FDBA74" : "#FFFFFF" }}>{rank}</span>
            </div>
          )}

          {/* Premium Logo (Top Left) */}
          {b.logo_url && (b.plan === "premium" || b.plan === "pro" || b.plan === "destacado") && (
            <div style={{ position: "absolute", top: 12, left: rank ? 56 : 12, width: 76, height: 76, borderRadius: "50%", background: "#fff", border: "1px solid rgba(255,255,255,0.8)", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", boxSizing: "border-box", overflow: "hidden" }}>
              <OptimizedImage src={b.logo_url} widthRequest={200} heightRequest={200} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", display: "block" }} alt="logo" />
            </div>
          )}

          {/* Top right actions (Fav only) */}
          <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}>
            <m.button whileTap={{ scale: 0.7 }} aria-label={isFav ? t("quitar_fav", "Quitar de favoritos") : t("anadir_fav", "Añadir a favoritos")} onClick={handleFav} style={{ width: 44, height: 44, borderRadius: "50%", background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}>
              <Icon name={isFav ? "heart_overlay_f" : "heart_overlay"} size={26} color="none" />
            </m.button>
            <AnimatePresence>
              {showPlus && (
                <m.div initial={{ opacity: 0, y: 0, scale: 0.5 }} animate={{ opacity: 1, y: -30, scale: 1.2 }} exit={{ opacity: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} style={{ position: "absolute", top: 0, left: 0, right: 0, pointerEvents: "none", display: "flex", justifyContent: "center", color: "#FFFFFF", fontWeight: 900, fontSize: 18, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
                  +1
                </m.div>
              )}
            </AnimatePresence>
          </div>

          {/* Text overlay bottom */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "30px 14px 4px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            {b.badge && <div style={{ fontSize: 9, fontWeight: 800, color: "#C9A84C", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 2 }}>{b.badge}</div>}
            <h3 style={{ fontFamily: FONT_BIZ, fontSize: 22, color: "#fff", lineHeight: 1.15, fontWeight: 800, letterSpacing: 0, marginBottom: 2, textShadow: "0 2px 4px rgba(0,0,0,0.5)", paddingRight: 8, display: "flex", alignItems: "center" }}>
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</span>
              {(b.plan === "destacado" || b.plan === "premium" || b.plan === "pro") && (
                <img src="/verificado.png" alt="Verificado" width="18" height="18" style={{ marginLeft: 6, flexShrink: 0, filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.5))" }} />
              )}
            </h3>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {showStars ? (
                  b.review_count > 0 ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 3, background: "rgba(0,0,0,0.04)", padding: "4px 8px", borderRadius: 20 }}>
                      <img src="/estrella.svg" alt="star" width={14} height={14} loading="lazy" style={{ width: 14, height: 14, marginTop: -2, filter: "brightness(0) invert(1) drop-shadow(0px 1px 2px rgba(0,0,0,0.5))" }} />
                      <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{b.rating && !isNaN(parseFloat(String(b.rating).replace(',', '.'))) ? parseFloat(String(b.rating).replace(',', '.')).toFixed(1) : "N/A"}</span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,.9)", fontWeight: 500, marginLeft: 2, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>({b.review_count})</span>
                      {realFavs > 0 && <><span style={{ fontSize: 10, color: "rgba(255,255,255,.4)", margin: "0 2px" }}>·</span><Icon name="heart" size={11} color="rgba(255,255,255,.9)" /><span style={{ fontSize: 11, color: "rgba(255,255,255,.9)", fontWeight: 600, marginLeft: 2, textShadow: "0 1px 2px rgba(0,0,0,0.8)" }}>{realFavs}</span></>}
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
                       <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)", fontStyle: "italic", fontWeight: 500 }}>{t("primer_apoyo", "Sé el primero en apoyar")}</span>
                     </div>
                  )
                )}

                <span style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>·</span>
                
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span className={getScheduleStatus(b, isOpenNow(b), true).dot} style={{ width: 4, height: 4, boxShadow: "0 0 4px rgba(0,0,0,0.5)" }} />
                  <span style={{ fontSize: 11, color: getScheduleStatus(b, isOpenNow(b), true).color, fontWeight: 700, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>{t(getScheduleStatus(b, isOpenNow(b), true).text)}</span>
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
      </m.div>
    );
  }

  return null;
});
