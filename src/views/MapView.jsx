import { Suspense, useEffect, useState, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { getThumbUrl, getScheduleStatus, isNear } from "../lib/utils";
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useShallow } from 'zustand/react/shallow';
import Icon from "../components/ui/Icon.jsx";
import { useTranslation } from "../hooks/useTranslation.js";

export default function MapView() {
  const { t, lang } = useTranslation();
  const ctx = useAppContext();
  const { dark, activeCity, toast$, mapFullScreen, setMapFullScreen, setSelectedEvent, setOpenedFromMap } = useUIStore(useShallow(s => ({ dark: s.dark, activeCity: s.activeCity, toast$: s.toast$, mapFullScreen: s.mapFullScreen, setMapFullScreen: s.setMapFullScreen, setSelectedEvent: s.setSelectedEvent, setOpenedFromMap: s.setOpenedFromMap })));
  const { cats, mapPins, events, loadMapPinsByBounds, cities } = useDataStore(useShallow(s => ({ cats: s.cats, mapPins: s.mapPins, events: s.events, loadMapPinsByBounds: s.loadMapPinsByBounds, cities: s.cities })));
  const { user, setShowAuth } = useAuthStore(useShallow(s => ({ user: s.user, setShowAuth: s.setShowAuth })));
  
  const { viewStyle, T, activeCat, setActiveCat, GMap, navigate, setSelected, setMapPin, mapPin, userCoords, requestLocation, FONT_BIZ, CAT_EMOJI, getKm, isOpen, allNearby, nearbyRadius, setNearbyRadius, setNearbyFilter, nearbyFilter, LoaderFallback, setShowAddBiz, city, handleCardTap } = ctx;

  const [visibleCount, setVisibleCount] = useState(5);
  const scrollRef = useRef(null);

  // Sync URL to /mapa/:city for SEO
  useEffect(() => {
    if (activeCity) {
      const target = `/mapa/${activeCity}`;
      if (window.location.pathname !== target) {
        window.history.replaceState({}, '', target);
      }
    }
  }, [activeCity]);

  const cityPins = mapFullScreen ? mapPins : mapPins.filter(b => isNear(b, userCoords, activeCity, 40));
  let displayedPins = (activeCat === "todas" || activeCat === "explorar") ? cityPins : cityPins.filter(b => b.category === activeCat);
  if (nearbyFilter === "open") {
    displayedPins = displayedPins.filter(b => isOpen(b));
  }
  // Radius limitation removed to show all businesses in the city
  const filteredNearby = allNearby.filter(b => displayedPins.some(dp => dp.id === b.id));
  const renderedNearby = filteredNearby.slice(0, visibleCount);

  const [prevFilters, setPrevFilters] = useState([nearbyRadius, nearbyFilter, activeCat]);
  if (prevFilters[0] !== nearbyRadius || prevFilters[1] !== nearbyFilter || prevFilters[2] !== activeCat) {
    setPrevFilters([nearbyRadius, nearbyFilter, activeCat]);
    setVisibleCount(5);
     
    queueMicrotask(() => { if (scrollRef.current) scrollRef.current.scrollLeft = 0; });
  }

  const cityName = cities.find(c => c.slug === activeCity)?.name || (activeCity ? activeCity.charAt(0).toUpperCase() + activeCity.slice(1).replace(/-/g, ' ') : t("tu_ciudad", "tu ciudad"));
  const shortCity = cityName.split(",")[0];

  const handleScroll = (e) => {
    const { scrollLeft, scrollWidth, clientWidth } = e.target;
    // If scrolled within 100px of the end
    if (scrollLeft + clientWidth >= scrollWidth - 100) {
      if (visibleCount < filteredNearby.length) {
        setVisibleCount(prev => prev + 5);
      }
    }
  };

  return (
    <div style={{ paddingBottom: 84, ...viewStyle }}>
          {/* Default List Header (Always visible now) */}
          <div>
            <style>{`
              @keyframes expGradientFlow {
                0% { background-position: 0% center; }
                100% { background-position: 200% center; }
              }
              @keyframes expFadeUp {
                0% { opacity: 0; transform: translateY(10px); }
                100% { opacity: 1; transform: translateY(0); }
              }
              .exp-city-anim {
                display: inline;
                background: linear-gradient(90deg, #34D399 0%, #38BDF8 25%, #818CF8 50%, #38BDF8 75%, #34D399 100%);
                background-size: 200% auto;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                animation: expGradientFlow 4s linear infinite;
                font-weight: 900;
              }
              .exp-subtitle-anim {
                animation: expFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
              .animated-pill {
                background: #0f172a !important;
                border-color: #0f172a !important;
                box-shadow: 0 2px 10px rgba(0,0,0,0.25) !important;
                animation: none !important;
              }
            `}</style>
            <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 10px) 20px 6px", background: T.white, textAlign: "center" }}>
              <img
                src="/citymap.mx.png"
                alt="CityMap"
                style={{ height: 44, objectFit: "contain", filter: dark ? "none" : "brightness(0)", marginBottom: 4, display: "block", margin: "0 auto 4px" }}
              />
              <p className="exp-subtitle-anim" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.sub, lineHeight: 1.4 }}>
                {t("encuentra_mejores_lugares", "Encuentra los mejores lugares en ")}<span className="exp-city-anim">{shortCity}</span>
              </p>
            </div>
            {/* Category Bar (Above Map) */}
            <div style={{ overflowX: "auto", scrollbarWidth: "none", background: T.white, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", WebkitOverflowScrolling: "touch" }}>
              <div style={{ display: "flex", gap: 8, padding: "4px 16px 14px" }}>
                {[{id: "todas", label: t("todos_category", "Todos"), icon: "📍"}, ...cats].map(c => {
                   const isSel = activeCat === c.id || (c.id === "todas" && activeCat === "explorar");
                   return (
                     <button key={c.id} className={isSel ? "animated-pill press" : "press"} onClick={() => setActiveCat(c.id === "todas" ? "explorar" : c.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", background: dark ? "rgba(255,255,255,0.05)" : T.white, color: isSel ? "#fff" : T.text, border: `1px solid ${T.border}`, borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", flexShrink: 0 }}>
                       {(() => {
                         let iconVal = c.icon || "📍";
                         let cleanIcon = typeof iconVal === 'string' ? iconVal.trim() : iconVal;
                         let isImg = typeof cleanIcon === 'string' && (cleanIcon.toLowerCase().endsWith('.svg') || cleanIcon.toLowerCase().endsWith('.png'));
                         return isImg ? <img src={`/${cleanIcon}`} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} /> : <span style={{ fontSize: 14 }}>{cleanIcon}</span>;
                       })()}
                       <span>{t(c.label, c.label)}</span>
                     </button>
                   );
                })}
              </div>
            </div>
          </div>

          {/* Map Container */}
          <div style={mapFullScreen ? {
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0, height: "100dvh", width: "100vw", zIndex: 99999, margin: 0, borderRadius: 0, background: T.bg
          } : { margin: "16px 16px 8px", aspectRatio: "1 / 1.1", position: "relative", zIndex: 1, borderRadius: 24, overflow: "hidden", boxShadow: "0 12px 40px rgba(0,0,0,0.12)", border: `1px solid ${T.border}` }}>
            
            {/* Full Screen Toggle */}
            <button onClick={() => setMapFullScreen(!mapFullScreen)} className="press" style={{ position: "absolute", top: 16, right: 16, zIndex: 10, width: 44, height: 44, borderRadius: "50%", background: "rgba(255,255,255,0.9)", backdropFilter: "blur(10px)", border: "1px solid rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 12px rgba(0,0,0,0.15)", cursor: "pointer" }}>
              <Icon name={mapFullScreen ? "minimize-2" : "maximize-2"} size={20} color="#0F172A" />
            </button>

            {/* Floating Category Filter (Bottom, Circular Icons) */}
            {mapFullScreen && !mapPin && (
              <div style={{ position: "absolute", bottom: 76, left: 0, right: 64, zIndex: 10, display: "flex", overflowX: "auto", gap: 10, scrollbarWidth: "none", WebkitOverflowScrolling: "touch", padding: "10px 0", WebkitMaskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)", maskImage: "linear-gradient(to right, transparent, black 6%, black 94%, transparent)" }}>
                 <div style={{ display: "flex", gap: 10, margin: "0 auto", padding: "0 20px" }}>
                  {[{id: "todas", label: "Todos", icon: "📍"}, ...cats].map(c => {
                     const isSel = activeCat === c.id || (c.id === "todas" && activeCat === "explorar");
                     return (
                       <button 
                         key={c.id} 
                         className={isSel ? "animated-pill press" : "press"} 
                         onClick={() => setActiveCat(c.id === "todas" ? "explorar" : c.id)} 
                         title={t(c.label, c.label)}
                         style={{ 
                           display: "flex", alignItems: "center", justifyContent: "center", 
                           width: 40, height: 40,
                           background: isSel ? (dark ? "rgba(255,255,255,0.15)" : "#F0F9FF") : (dark ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.95)"), 
                           border: isSel ? "2px solid #0EA5E9" : (dark ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)"), 
                           borderRadius: "50%", cursor: "pointer", 
                           backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", 
                           boxShadow: isSel ? "0 4px 16px rgba(14, 165, 233, 0.3)" : "0 4px 12px rgba(0,0,0,0.12)", 
                           flexShrink: 0, transition: "all 0.2s"
                         }}
                       >
                         {(() => {
                           let iconVal = c.icon || "📍";
                           let cleanIcon = typeof iconVal === 'string' ? iconVal.trim() : iconVal;
                           let isImg = typeof cleanIcon === 'string' && (cleanIcon.toLowerCase().endsWith('.svg') || cleanIcon.toLowerCase().endsWith('.png'));
                           return isImg ? <img src={`/${cleanIcon}`} alt="" style={{ width: 24, height: 24, objectFit: "contain" }} /> : <span style={{ fontSize: 24 }}>{cleanIcon}</span>;
                         })()}
                       </button>
                     );
                  })}
                 </div>
              </div>
            )}

            <Suspense fallback={<LoaderFallback/>}><GMap events={(events||[]).filter(e => e.city_slug === activeCity || e.city_slug === 'all')} businesses={displayedPins} selected={mapPin} onPin={b => { setMapPin(p => p?.id === b.id ? null : b); }} userLocation={userCoords} onRequestLocation={requestLocation} categories={cats} radiusKm={null} onBoundsChanged={(bounds) => loadMapPinsByBounds(activeCity, bounds)} showRoute={mapFullScreen} /></Suspense>

            {/* GPS Overlay */}
            {!userCoords && (
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 15, background: T.white, padding: "16px 20px", borderRadius: 20, boxShadow: "0 12px 32px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, maxWidth: 260, textAlign: "center", border: `1px solid ${T.border}` }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: T.text }}>{t("que_hay_cerca", "¿Qué hay cerca?")}</div>
                <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.3 }}>{t("activa_ubicacion_desc", "Activa tu ubicación para explorar lugares a tu alrededor.")}</div>
                <button className="press" onClick={() => { localStorage.removeItem("cg_manual_city"); requestLocation(); }} style={{ background: "#0ea5e9", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="2" x2="12" y2="5"></line><line x1="12" y1="19" x2="12" y2="22"></line><line x1="2" y1="12" x2="5" y2="12"></line><line x1="19" y1="12" x2="22" y2="12"></line></svg>
                  {t("activar_gps", "Activar GPS")}
                </button>
              </div>
            )}

            {/* Solo abiertos Overlay */}
            {!mapPin && (
              <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", zIndex: 10 }}>
                <button className="press" onClick={() => setNearbyFilter(nearbyFilter === "open" ? "all" : "open")} style={{ display: "flex", alignItems: "center", gap: 6, background: nearbyFilter === "open" ? (dark ? "#fff" : "#0F172A") : "rgba(255, 255, 255, 0.95)", border: nearbyFilter === "open" ? "1px solid transparent" : "1px solid rgba(0,0,0,0.1)", padding: "8px 18px", borderRadius: 24, fontSize: 13, cursor: "pointer", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", boxShadow: "0 6px 16px rgba(0,0,0,0.15)", fontFamily: "inherit", transition: "all .2s", whiteSpace: "nowrap" }}>
                  <div className="live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: nearbyFilter === "open" ? "#10B981" : "#9CA3AF" }} />
                  <span style={{ fontWeight: 800, background: "linear-gradient(90deg, #3B82F6 0%, #06B6D4 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", display: "inline-block" }}>
                    {t("mostrar_solo_abiertos", "Mostrar solo lugares abiertos")}
                  </span>
                </button>
              </div>
            )}

          </div>

                    {/* Backdrop for selected map pin */}
          <AnimatePresence>
            {mapPin && (
              <m.div
                key="backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: "fixed",
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: dark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.2)",
                  zIndex: 99990
                }}
                onClick={() => setMapPin(null)}
              />
            )}
          </AnimatePresence>

          {/* Map Pin Card — Evento Centrado */}
          <AnimatePresence>
          {mapPin && mapPin._isEvent && (
            <m.div
              key={"ev_" + mapPin.id}
              initial={{ opacity: 0, scale: 0.95, y: -20, x: "-50%" }}
              animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, scale: 0.9, y: 10, x: "-50%" }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
              style={{
                position: "absolute",
                top: "20%",
                left: "50%",
                width: 280,
                background: T.white,
                borderRadius: 24,
                boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                border: `1px solid ${T.border}`,
                zIndex: 100000,
                cursor: "pointer"
              }}
              onClick={() => { setOpenedFromMap(true); setSelectedEvent(mapPin); setMapPin(null); }}
            >
              <div style={{ width: "100%", height: 320, background: T.bg, position: "relative" }}>
                <button onClick={(e) => { e.stopPropagation(); setMapPin(null); }} style={{ position: "absolute", top: 12, left: 12, zIndex: 5, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.5)", backdropFilter: "blur(6px)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="x" size={14} color="#fff" />
                </button>
                <img src={getThumbUrl(mapPin.img_url || mapPin.img, 400, 600)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                {(() => {
                  let countdownStr = "";
                  if (mapPin.date) {
                    const evD = new Date(mapPin.date + "T00:00:00");
                    const tod = new Date();
                    tod.setHours(0,0,0,0);
                    const diff = Math.ceil((evD - tod) / (1000 * 60 * 60 * 24));
                    if (diff === 0) countdownStr = "Es hoy 🎉";
                    else if (diff === 1) countdownStr = "Mañana";
                    else if (diff > 1) countdownStr = `Faltan ${diff} días`;
                  }
                  return countdownStr ? (
                    <div style={{ position: "absolute", top: 12, left: "50%", transform: "translateX(-50%)", zIndex: 5, background: "#111111", color: "#fff", padding: "4px 10px", borderRadius: 10, fontSize: 9, fontWeight: 800, textTransform: "uppercase", lineHeight: 1.2, letterSpacing: 0.5, boxShadow: "0 2px 8px rgba(0, 0, 0, 0.5)" }}>
                      {countdownStr}
                    </div>
                  ) : null;
                })()}
                
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: 16, left: 12, right: 12, zIndex: 2, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                  <div style={{ fontFamily: FONT_BIZ, fontWeight: 900, fontSize: 16, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.8)", lineHeight: 1.1 }}>{mapPin.title}</div>
                  <div style={{ display: "inline-block", background: "#FCD34D", color: "#000", padding: "3px 12px", borderRadius: 8, fontSize: 10, fontWeight: 800, lineHeight: 1.2 }}>Ver detalles</div>
                </div>
              </div>
            </m.div>
          )}
          </AnimatePresence>

          {/* Map Pin Card — Negocio Centrado */}
          <AnimatePresence>
          {mapPin && !mapPin._isEvent && (
            <m.div
              key={"biz_" + mapPin.id}
              initial={{ opacity: 0, scale: 0.95, y: -20, x: "-50%" }}
              animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
              exit={{ opacity: 0, scale: 0.9, y: 10, x: "-50%" }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
              style={{
                position: "absolute",
                top: "15%",
                left: "50%",
                width: 320,
                background: T.white,
                borderRadius: 24,
                boxShadow: "0 16px 40px rgba(0,0,0,0.3)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                border: `1px solid ${T.border}`,
                zIndex: 100000
              }}
            >
              {/* Imagen Banner */}
              <div style={{ width: "100%", height: 160, background: T.bg, position: "relative" }}>
                <button onClick={() => setMapPin(null)} style={{ position: "absolute", top: 12, left: 12, zIndex: 5, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(6px)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="x" size={14} color="#fff" />
                </button>
                {mapPin.photos?.[0]?.url
                  ? <img src={getThumbUrl(mapPin.photos[0].url, 400, 300)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
                      {(() => {
                        let emojiVal = mapPin.emoji || cats.find(c => c.id === mapPin.category)?.icon || CAT_EMOJI[mapPin.category] || "📍";
                        let cleanEmoji = typeof emojiVal === 'string' ? emojiVal.trim() : emojiVal;
                        let isImg = typeof cleanEmoji === 'string' && (cleanEmoji.toLowerCase().endsWith('.svg') || cleanEmoji.toLowerCase().endsWith('.png'));
                        return isImg ? <img src={`/${cleanEmoji}`} alt="" style={{ width: 64, height: 64, objectFit: "contain" }} /> : cleanEmoji;
                      })()}
                    </div>
                }
              </div>

              {/* Contenido compacto */}
              <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontFamily: FONT_BIZ, fontWeight: 900, fontSize: 20, color: T.text, lineHeight: 1.1, marginBottom: 2 }}>{mapPin.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", minWidth: 0 }}>
                  <span style={{ fontSize: 11, color: getScheduleStatus(mapPin, isOpen(mapPin)).color, fontWeight: 700, whiteSpace: "nowrap" }}>{t(getScheduleStatus(mapPin, isOpen(mapPin)).text)}</span>
                  {mapPin.review_count > 0 && (<>
                    <span style={{ fontSize: 11, color: T.sub, opacity: 0.4 }}>•</span>
                    <span style={{ fontSize: 11, color: T.sub, fontWeight: 600, whiteSpace: "nowrap" }}>⭐ {mapPin.rating}</span>
                  </>)}
                  {userCoords && mapPin.lat && (<>
                    <span style={{ fontSize: 11, color: T.sub, opacity: 0.4 }}>•</span>
                    <span style={{ fontSize: 11, color: T.sub, fontWeight: 600, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 3 }}>
                      <Icon name="nav" size={10} color={T.sub} />
                      {(() => { const d = getKm(userCoords.lat, userCoords.lng, parseFloat(mapPin.lat), parseFloat(mapPin.lng)); return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`; })()}
                    </span>
                  </>)}
                </div>

                {mapPin.address && (
                  <div style={{ fontSize: 11, color: T.sub, display: "flex", gap: 5, alignItems: "center", opacity: 0.8 }}>
                    <Icon name="pin" size={11} color={T.sub} />
                    <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{mapPin.address}</span>
                  </div>
                )}

                {mapPin.tagline && (
                  <div style={{ fontSize: 11, color: T.text, fontWeight: 500, lineHeight: 1.3, display: 'flex', gap: 6, alignItems: 'flex-start', background: dark ? 'rgba(255,255,255,0.04)' : '#F9FAFB', padding: '8px 10px', borderRadius: 10, border: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 13 }}>✨</span>
                    <span style={{ fontStyle: "italic", opacity: 0.9 }}>"{mapPin.tagline}"</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="press" onClick={() => { setOpenedFromMap(true); handleCardTap(mapPin); setMapPin(null); }} style={{ flex: 1, background: T.text, border: "none", borderRadius: 10, padding: "8px 0", fontSize: 13, fontWeight: 800, color: T.bg, cursor: "pointer", fontFamily: "inherit" }}>{t("ver_detalles", "Ver detalles")}</button>
                  <button className="press" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${mapPin.lat},${mapPin.lng}`, "_blank")} style={{ flex: 1, background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "8px 0", fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><Icon name="nav" size={13} color={T.text} /> {t("como_llegar", "Cómo llegar")}</button>
                </div>
              </div>
            </m.div>
          )}
          </AnimatePresence>

          <div style={{ padding: "0 20px 0" }}>
            {/* ── CERCA DE TI en Mapa ── */}
            {(() => {
              return (
                <div style={{ marginBottom: 20 }}>
                  {/* Title row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontFamily: "var(--heading)", fontSize: 20, color: T.text, fontWeight: 800 }}>{activeCat === "explorar" || activeCat === "todas" ? `${t("descubre", "Descubre")} ${shortCity}` : `${t(cats.find(c => c.id === activeCat)?.label || "Lugares", cats.find(c => c.id === activeCat)?.label || "Lugares")} en ${shortCity}`}</span>
                    {userCoords && filteredNearby.length > 0 && <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>{filteredNearby.length} {lang === 'en' ? 'places' : 'lugares'}</span>}
                  </div>

                  {/* Filter pills */}


                  {!userCoords && (
                    <div onClick={requestLocation} style={{ padding: "14px 16px", background: T.white, borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, boxShadow: T.shadow }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: T.greenL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name="pin" size={16} color={T.green} />
                      </div>
                      <span style={{ fontSize: 13, color: T.green, fontWeight: 600 }}>{t("toca_ver_negocios_cerca", "Toca para ver negocios cerca de ti")}</span>
                    </div>
                  )}

                  {userCoords && <>
                    {filteredNearby.length === 0 ? (
                      <div style={{ padding: "24px 16px", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: T.text, marginBottom: 4 }}>{t("primero_descubrir_zona", "¡Sé el primero en descubrir esta zona! 🗺️")}</div>
                          <div style={{ fontSize: 13, color: T.sub }}>{t("primero_descubrir_desc", "Amplía tu radio de búsqueda o sugiere una joya oculta")}</div>
                        </div>
                        <button className="press" onClick={() => { if (!user) { setShowAuth(true); toast$(t("inicia_sesion_sugerir", "Inicia sesión para sugerir un lugar")); } else { setShowAddBiz(true); } }} style={{ background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                          <Icon name="plus" size={16} color="#fff" /> {t("sugerir_lugar", "Sugerir lugar")}
                        </button>
                      </div>
                    ) : (
                      <div 
                        ref={scrollRef}
                        onScroll={handleScroll}
                        style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none", alignItems: "flex-start" }}
                      >
                        {renderedNearby.map(b => {
                          const hasRating = b.review_count > 0 && b.rating;
                          const ratingStr = hasRating ? parseFloat(String(b.rating).replace(',', '.')).toFixed(1) : null;
                          return (
                          <div key={b.id} className="press" onClick={() => setMapPin(b)}
                            style={{ minWidth: 108, maxWidth: 108, height: "max-content", flexShrink: 0, background: T.white, borderRadius: 12, overflow: "hidden", border: `2px solid ${mapPin?.id === b.id ? T.green : "transparent"}`, boxShadow: T.shadow, transition: "all .2s", cursor: "pointer" }}>
                            {/* Photo */}
                            <div style={{ height: 68, overflow: "hidden", position: "relative", background: T.border }}>
                              {b.photos?.[0]?.url
                                ? <img src={getThumbUrl(b.photos[0].url, 200, 200)} alt={b.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{(b.emoji || CAT_EMOJI[b.category]) || "📍"}</div>
                              }
                            </div>
                            {/* Info */}
                            <div style={{ padding: "3px 6px 4px" }}>
                              <div style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 11, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.1 }}>{b.name}</div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                  <div style={{ width: 4, height: 4, borderRadius: "50%", background: getScheduleStatus(b, isOpen(b)).color, flexShrink: 0 }} />
                                  <span style={{ fontSize: 8, color: getScheduleStatus(b, isOpen(b)).color, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.2 }}>{t(getScheduleStatus(b, isOpen(b)).text)}</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 1, color: T.sub, fontSize: 9, fontWeight: 600 }}>
                                  <Icon name="pin" size={8} color={T.sub} />
                                  {b._km < 1 ? `${Math.round(b._km * 1000)}m` : `${b._km.toFixed(1)}km`}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                        })}
                      </div>
                    )}
                  </>}
                </div>
              );
            })()}
          </div>
        </div>
  );
}

