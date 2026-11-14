import { useState, memo } from "react";
import { m, AnimatePresence } from "framer-motion";
import Icon from "../ui/Icon.jsx";
import SaveHeartButton from "../ui/SaveHeartButton.jsx";
import OptimizedImage from "../ui/OptimizedImage.jsx";
import { FONT_BIZ } from "../../lib/constants.js";
import { CAT_EMOJI, isOpenNow, getScheduleStatus, getThumbUrl, getThumbSrcSet, SRCSET_THUMB, SRCSET_CARD, haptic } from "../../lib/utils.js";
import ProgressiveImage from "../ProgressiveImage.jsx";
import { useTranslation } from "../../hooks/useTranslation.js";
import { useDataStore } from "../../store/useDataStore.js";
import { displayRating, formatReviewCount } from "../../lib/googleRatings.js";

// Corazón de guardar con el diseño actual intacto (mismo botón 44x44,
// misma posición, tamaño y colores): SaveHeartButton añade el pop único
// + chispas + confeti solo al guardar; el "+1" de abajo se conserva.
const renderFavoriteButton = (isFav, onClick, showPlus, overlay = false, T, iconSize = null) => {
  return (
    <div style={{ position: "relative" }}>
      <SaveHeartButton
        isFav={isFav}
        onToggle={onClick}
        size={iconSize ?? (overlay ? 26 : 16)}
        overlay={overlay}
        T={T}
      />
      <AnimatePresence>
        {showPlus && (
          <m.div 
            animate={{ opacity: 1, y: -30, scale: 1.2 }} 
            exit={{ opacity: 0 }} 
            transition={{ duration: 0.6, ease: "easeOut" }} 
            style={{ 
              position: "absolute", 
              top: 0, 
              left: 0, 
              right: 0, 
              pointerEvents: "none", 
              display: "flex", 
              justifyContent: "center", 
              color: "#FFFFFF", 
              fontWeight: 900, 
              fontSize: overlay ? 18 : 16, 
              textShadow: "0 2px 4px rgba(0,0,0,0.5)" 
            }}
          >
            +1
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const renderRatingRow = (b, realFavs, hideReviews, hideFavs, T, starStyle = {}, textStyle = {}, googleRatings = null) => {
  if (hideReviews) return null;
  // Con dato vigente en caché se muestra el conteo de Google; si no,
  // el conteo propio de CityMap (displayRating decide).
  const disp = displayRating(b, googleRatings);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {disp.count > 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Icon name="star_f" size={14} color={textStyle.color || T.text} style={{ marginTop: -2, ...starStyle }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text, ...textStyle }}>
            {disp.rating != null
              ? disp.rating.toFixed(1)
              : "N/A"}
          </span>
          <span style={{ fontSize: 12, color: T.sub, fontWeight: 700, ...textStyle }}>({formatReviewCount(disp.count)})</span>
          {disp.source === "google" && (
            <img src="/googlelogo.svg" alt="Google" style={{ width: 12, height: 12, objectFit: "contain" }} />
          )}
          {!hideFavs && realFavs > 0 && (
            <>
              <span style={{ fontSize: 10, color: T.border, margin: "0 2px" }}>·</span>
              <Icon name="heart" size={11} color={T.sub} />
              <span style={{ fontSize: 11, fontWeight: 700, color: T.sub, marginLeft: 2, ...textStyle }}>{realFavs}</span>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: 1 }}>
          {[1,2,3,4,5].map(i => <Icon key={i} name="star" size={11} color={T.border} />)}
        </div>
      )}
    </div>
  );
};

const renderScheduleRow = (b, T, t) => {
  const status = getScheduleStatus(b, isOpenNow(b), true);
  if (status.hidden) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <span className={status.dot} style={{ width: 4, height: 4 }} />
      <span style={{ fontSize: 11, color: status.color, fontWeight: 600 }}>{t(status.text)}</span>
    </div>
  );
};

const renderNotesBlock = (stayTimeStr, note, onEditNote, T, t) => {
  if (!note && !stayTimeStr) return null;
  
  return (
    <div style={{ padding: "12px 14px", borderTop: `1px dashed ${T.border}`, background: "transparent", position: "relative", textAlign: "left", display: "flex", flexDirection: "column", gap: 10 }}>
      {stayTimeStr && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}>🕒</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>
            {t("estancia", "Estancia")}: <span style={{ fontWeight: 500, color: T.sub }}>{stayTimeStr}</span>
          </span>
        </div>
      )}
      {note && (
        <div style={{ position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>📝</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: T.sub, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {t("nota", "Nota")}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.5, whiteSpace: "pre-wrap", paddingRight: onEditNote ? 24 : 0 }}>
            {note}
          </p>
          {onEditNote && (
            <button 
              aria-label={t("card_editar_nota", "Editar nota")}
              onClick={(e) => { e.stopPropagation(); onEditNote(); }}
              style={{ position: "absolute", top: 0, right: 0, background: "transparent", border: "none", cursor: "pointer", padding: 4 }}
            >
              <Icon name="edit" size={14} color={T.sub} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

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
  const thumb = b.photos?.[0] || (b.banner_url ? { url: b.banner_url } : null) || (b.logo_url ? { url: b.logo_url } : null);
  // Placeholder de color mientras carga la foto de la tarjeta
  // (hallazgo #7): antes se pedía además un thumb 20×20 al Render API
  // solo para el desenfoque; ahora el fondo de color hace de
  // placeholder y la foto aparece con fundido.
  const thumbPlaceholder = dark
    ? 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)'
    : 'linear-gradient(135deg, #EDEFF2 0%, #E2E6EB 100%)';
  const [showPlus, setShowPlus] = useState(false);
  const { t } = useTranslation();
  const googleRatings = useDataStore(s => s.googleRatings);

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
      <m.div 
        transition={{ duration: 0.3, ease: "easeOut" }}
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
        {renderNotesBlock(stayTimeStr, note, onEditNote, T, t)}
      </m.div>
    );
  }

  // 2. COMPACT LAYOUT (Horizontal list card)
  if (variant === "compact") {
    const schedHidden = getScheduleStatus(b, isOpenNow(b), true).hidden;
    return (
      <m.div 
        transition={{ duration: 0.3, ease: "easeOut" }}
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
          border: `1px solid ${dark ? "#52525B" : T.border}`, 
          minHeight: 100, 
          cursor: onTap ? "pointer" : "default",
          // Sin content-visibility: la lista ya virtualiza con Virtuoso
          // (las filas fuera de vista se desmontan) y con
          // content-visibility: auto el navegador además dejaba de pintar
          // las tarjetas montadas fuera de vista: al volver a subir se
          // volvían a pintar desde cero y se veían borrar y cargar de
          // nuevo. Las tarjetas montadas siempre se pintan.
        }} 
        variants={{ hover: { y: -3, boxShadow: "0 12px 30px rgba(0, 0, 0, 0.1)" } }} 
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div style={{ display: "flex", alignItems: "stretch", flex: 1, position: "relative" }}>
          {/* Thumbnail */}
          <div style={{ width: 135, flexShrink: 0, position: "relative", background: T.border, overflow: "hidden", borderRadius: 12 }}>
            {thumb?.url
              ? <ProgressiveImage 
                  variants={{ hover: { scale: 1.08 } }} 
                  transition={{ duration: 0.4, ease: "easeOut" }} 
                  src={getThumbUrl(thumb.url, 300, 300)} 
                  placeholder={thumbPlaceholder}
                  srcSet={getThumbSrcSet(thumb.url, SRCSET_THUMB, 400)}
                  sizes="135px"
                  alt={b.name} 
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} 
                />
              : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, background: dark ? "rgba(255,255,255,0.05)" : "#F3F4F6" }}>{(b.emoji || CAT_EMOJI[b.category]) || "🏪"}</div>
            }
            {b.badge && <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", borderRadius: 6, padding: "2px 6px", fontSize: 8, fontWeight: 800, color: "#fff", textTransform: "uppercase" }}>{b.badge}</div>}
          </div>

          <div style={{ flex: 1, padding: "12px 14px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 4, textAlign: "left" }}>
            <h3 style={{ fontFamily: FONT_BIZ, fontSize: 15, color: T.text, lineHeight: 1.25, fontWeight: 700, letterSpacing: 0, marginBottom: 0, paddingRight: !hideFavs ? 44 : 0, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", flexShrink: 0, textAlign: "left" }}>
              {b.name}
              {(b.plan === "destacado" || b.plan === "premium" || b.plan === "pro") && (
                <img src="/verificado.png" alt={t("card_verificado", "Verificado")} width="18" height="18" style={{ marginLeft: 6, flexShrink: 0 }} />
              )}
            </h3>
            
            {/* Fila de estado: envuelve en vez de recortar. En columnas
            angostas (como la cuadrícula de planes) la calificación + el
            horario no caben en una línea y con nowrap + overflow hidden
            «Cerrado» se partía a media letra («• Cerrad»). Con wrap, el
            horario baja entero a la siguiente línea; en su sección (los
            listados, a lo ancho) cabe todo y no cambia nada. Sin medidas
            fijas: se ajusta al ancho que tenga la tarjeta. */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, flexWrap: "wrap", overflow: "hidden" }}>
              {renderRatingRow(b, 0, hideReviews, hideFavs, T, {}, { fontSize: 11 }, googleRatings)}
              {!hideSchedule && !schedHidden && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  {!hideReviews && <span style={{ fontSize: 10, color: T.border, margin: "0 2px", flexShrink: 0 }}>·</span>}
                  {renderScheduleRow(b, T, t)}
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

        {renderNotesBlock(stayTimeStr, note, onEditNote, T, t)}

        {/* Fav button */}
        {!hideFavs && (
          <div style={{ position: "absolute", top: 8, right: 8, zIndex: 10, width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {renderFavoriteButton(isFav, handleFav, showPlus, true, T, 16)}
          </div>
        )}
      </m.div>
    );
  }

  // 3. DESTACADO LAYOUT (Grid card with top banner)
  if (variant === "destacado") {
    return (
      <m.div 
        transition={{ duration: 0.3, ease: "easeOut" }}
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
          border: `1.5px solid ${T.green}40`,
          // Sin content-visibility: ver el comentario en la variante
          // compacta — con Virtuoso virtualizando, solo hacía que las
          // tarjetas montadas se volvieran a pintar al volver a subir.
        }} 
        variants={{ hover: { y: -4, boxShadow: "0 16px 40px rgba(0, 0, 0, 0.12)" } }} 
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Top Banner */}
        <div style={{ height: thumb?.url ? 120 : 48, position: "relative", background: "transparent" }}>
          {thumb?.url
            ? <ProgressiveImage 
                variants={{ hover: { scale: 1.08 } }} 
                transition={{ duration: 0.4, ease: "easeOut" }} 
                src={getThumbUrl(thumb.url, 600, 400)} 
                placeholder={thumbPlaceholder}
                srcSet={getThumbSrcSet(thumb.url, SRCSET_CARD, 533)}
                sizes="(max-width: 640px) 100vw, 400px"
                alt={b.name} 
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} 
              />
            : null
          }
          
          {/* Heart overlaid on top banner */}
          <div style={{ position: "absolute", top: 10, right: 10, zIndex: 10 }}>
            {renderFavoriteButton(isFav, handleFav, showPlus, true, T)}
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "12px 14px", position: "relative" }}>
          <h3 style={{ fontFamily: FONT_BIZ, fontSize: 18, color: T.text, lineHeight: 1.2, fontWeight: 800, marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{b.name}</span>
            {(b.plan === "destacado" || b.plan === "premium" || b.plan === "pro") && (
              <img src="/verificado.png" alt={t("card_verificado", "Verificado")} width="18" height="18" style={{ marginLeft: 6, flexShrink: 0 }} />
            )}
          </h3>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {renderRatingRow(b, realFavs, hideReviews, hideFavs, T, { width: 16, height: 16 }, { fontSize: 13 }, googleRatings)}
              
              <span style={{ fontSize: 10, color: T.border }}>·</span>
              {renderScheduleRow(b, T, t)}
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
        transition={{ duration: 0.3, ease: "easeOut" }}
        whileHover="hover" 
        whileTap={{ scale: 0.96 }} 
        className="press" 
        onClick={() => { haptic("light"); onTap(b); }} 
        style={{ 
          borderRadius: 18, 
          overflow: "hidden", 
          background: "transparent", 
          position: "relative", 
          display: "flex", 
          flexDirection: "column", 
          border: `1.5px solid ${T.border}`, 
          boxShadow: T.shadow,
          // Sin content-visibility: ver el comentario en la variante
          // compacta — con Virtuoso virtualizando, solo hacía que las
          // tarjetas montadas se volvieran a pintar al volver a subir.
        }} 
        variants={{ hover: { y: -4, boxShadow: T.shadowLg } }} 
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div style={{ position: "relative", height: 190, overflow: "hidden", background: "transparent" }}>
          {thumb?.url
           ? <ProgressiveImage 
                variants={{ hover: { scale: 1.08 } }} 
                transition={{ duration: 0.4, ease: "easeOut" }} 
                src={getThumbUrl(thumb.url, 800, 600)} 
                placeholder={thumbPlaceholder}
                srcSet={getThumbSrcSet(thumb.url, SRCSET_CARD, 600)}
                sizes="(max-width: 640px) 100vw, 800px"
                alt={b.name} 
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center", display: "block" }} 
              />
            : <div style={{ height: "100%", background: dark ? "rgba(255,255,255,0.05)" : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 44 }}>{(b.emoji || CAT_EMOJI[b.category]) || "🏪"}</div>
          }
          {/* Bottom dark gradient for text readability (focalized only on bottom text area) */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "48%", background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 45%, rgba(0,0,0,0) 100%)", pointerEvents: "none" }} />
          
          {/* Podium Badge */}
          {rank && (
            <div style={{ position: "absolute", top: 12, left: 12, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.3)" }}>
              <span style={{ fontFamily: "var(--heading)", fontSize: 18, color: rank === 1 ? "#FDE047" : rank === 2 ? "#E5E7EB" : rank === 3 ? "#FDBA74" : "#FFFFFF" }}>{rank}</span>
            </div>
          )}

          {/* Premium Logo (Top Left) */}
          {b.logo_url && (b.plan === "premium" || b.plan === "pro" || b.plan === "destacado") && (
            <div style={{ position: "absolute", top: 12, left: rank ? 56 : 12, width: 76, height: 76, borderRadius: "50%", background: dark ? "rgba(15, 23, 42, 0.4)" : "rgba(255, 255, 255, 0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", border: "2px solid #FFFFFF", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", boxSizing: "border-box", overflow: "hidden" }}>
              <OptimizedImage src={b.logo_url} widthRequest={200} heightRequest={200} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%", display: "block", backgroundColor: "transparent" }} alt="logo" />
            </div>
          )}

          {/* Top right actions (Fav only) */}
          <div style={{ position: "absolute", top: 12, right: 12, zIndex: 10 }}>
            {renderFavoriteButton(isFav, handleFav, showPlus, true, T)}
          </div>

          {/* Text overlay bottom */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "30px 14px 4px", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
            {b.badge && <div style={{ fontSize: 9, fontWeight: 800, color: "#C9A84C", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 2 }}>{b.badge}</div>}
            {/* El nombre puede tomar 2 líneas (mismo patrón que la variante
            compacta): con una sola línea y elipsis, «Four Seasons Resort
            Punta Mita» se leía «Four Seasons Resor…». */}
            <h3 style={{ fontFamily: FONT_BIZ, fontSize: 22, color: "#fff", lineHeight: 1.15, fontWeight: 800, letterSpacing: 0, marginBottom: 2, textShadow: "0 2px 4px rgba(0,0,0,0.5)", paddingRight: 8, display: "flex", alignItems: "center" }}>
              <span style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{b.name}</span>
              {(b.plan === "destacado" || b.plan === "premium" || b.plan === "pro") && (
                <img src="/verificado.png" alt={t("card_verificado", "Verificado")} width="18" height="18" style={{ marginLeft: 6, flexShrink: 0, filter: "drop-shadow(0px 1px 2px rgba(0,0,0,0.5))" }} />
              )}
            </h3>
            
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {showStars ? (
                  renderRatingRow(
                    b, 
                    realFavs, 
                    hideReviews, 
                    hideFavs, 
                    T, 
                    { filter: "brightness(0) invert(1) drop-shadow(0px 1px 2px rgba(0,0,0,0.5))" }, 
                    { color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.8)" },
                    googleRatings
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
                {renderScheduleRow(b, T, t)}
              </div>
              
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto" }}>
                {b.whatsapp && (
                  <button aria-label={t("card_contactar_whatsapp", "Contactar por WhatsApp")} onClick={(e) => { e.stopPropagation(); goWhatsApp && goWhatsApp(b, e); }} style={{ width: 36, height: 36, borderRadius: "50%", background: "transparent", border: "none", padding: 6, cursor: "pointer", transition: "transform 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                    <img src="/whatsapp.svg" alt="WhatsApp" width={24} height={24} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }} />
                  </button>
                )}
                {(b.instagram || b.social_links?.instagram) && (
                  <button aria-label={t("card_ver_instagram", "Ver Instagram")} onClick={(e) => { 
                    e.stopPropagation(); 
                    const ig = b.instagram || b.social_links?.instagram;
                    window.open(`https://instagram.com/${ig.replace("@","")}`, "_blank"); 
                  }} style={{ width: 36, height: 36, borderRadius: "50%", background: "transparent", border: "none", padding: 6, cursor: "pointer", transition: "transform 0.2s", display: "flex", alignItems: "center", justifyContent: "center" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                    <img src="/instagram.svg" alt="Instagram" width={24} height={24} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }} />
                  </button>
                )}
                {(b.facebook || b.social_links?.facebook) && (
                  <button aria-label={t("card_ver_facebook", "Ver Facebook")} onClick={(e) => { 
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
                {b.social_links?.youtube && (
                  <button aria-label={t("card_ver_youtube", "Ver YouTube")} onClick={(e) => { 
                    e.stopPropagation(); 
                    const yt = b.social_links?.youtube;
                    window.open(yt.includes("http") ? yt : `https://youtube.com/${yt.startsWith('@') ? '' : '@'}${yt}`, "_blank"); 
                  }} style={{ width: 36, height: 36, borderRadius: "50%", background: "transparent", border: "none", padding: 6, cursor: "pointer", transition: "transform 0.2s" }} onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"} onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}>
                    <img src="/youtube.svg" alt="YouTube" width={24} height={24} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.4))" }} />
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
