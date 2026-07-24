import { Suspense } from "react";
import { motion } from "framer-motion";
import { getThumbUrl, getScheduleStatus, isNear } from "../lib/utils";
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useShallow } from 'zustand/react/shallow';
import Icon from "../components/ui/Icon.jsx";

export default function MapView() {
  const ctx = useAppContext();
  const { dark, activeCity, toast$ } = useUIStore(useShallow(s => ({ dark: s.dark, activeCity: s.activeCity, toast$: s.toast$ })));
  const { cats, mapPins } = useDataStore(useShallow(s => ({ cats: s.cats, mapPins: s.mapPins })));
  const { user, setShowAuth } = useAuthStore(useShallow(s => ({ user: s.user, setShowAuth: s.setShowAuth })));
  
  const { viewStyle, T, activeCat, setActiveCat, GMap, navigate, setSelected, setMapPin, mapPin, userCoords, requestLocation, FONT_BIZ, CAT_EMOJI, getKm, isOpen, allNearby, nearbyRadius, setNearbyRadius, setNearbyFilter, nearbyFilter, LoaderFallback, setShowAddBiz, city } = ctx;

  const cityPins = mapPins.filter(b => isNear(b, userCoords, activeCity, 40));
  let displayedPins = (activeCat === "todas" || activeCat === "explorar") ? cityPins : cityPins.filter(b => b.category === activeCat);
  if (nearbyFilter === "open") {
    displayedPins = displayedPins.filter(b => isOpen(b));
  }

  return (
    <div style={{ paddingBottom: 84, ...viewStyle }}>
          {/* Header Title & Categories */}
          {!mapPin && (
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 10px) 20px 8px", background: T.white, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                <img src="/citymap.mx.png" alt="CityMap" style={{ height: 58, objectFit: "contain", filter: dark ? "none" : "brightness(0)", marginBottom: -6 }} />
                <p style={{ fontSize: 13, color: T.sub, margin: 0, lineHeight: 1.2 }}>Encuentra los mejores lugares cerca de ti</p>
              </div>
              {/* Category Bar (Above Map) */}
              <div style={{ overflowX: "auto", scrollbarWidth: "none", background: T.white, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", WebkitOverflowScrolling: "touch" }}>
                <div style={{ display: "inline-block", padding: "0 16px 12px 16px" }}>
                  <div style={{ display: "inline-flex", gap: 4, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", padding: 4, borderRadius: 24, position: "relative", verticalAlign: "middle" }}>
                    {[{id: "todas", label: "Todos", icon: "📍"}, ...cats].map(c => {
                       const isSel = activeCat === c.id || (c.id === "todas" && activeCat === "explorar");
                       return (
                         <button key={c.id} className="press" onClick={() => setActiveCat(c.id === "todas" ? "explorar" : c.id)} style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", gap: 6, background: "transparent", color: isSel ? "#fff" : T.text, border: "none", padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "color 0.2s", flexShrink: 0 }}>
                           {isSel && (
                             <>
                               <style>{`
                                 @keyframes pillGradientFlow {
                                   0% { background-position: 0% 50%; }
                                   50% { background-position: 100% 50%; }
                                   100% { background-position: 0% 50%; }
                                 }
                                 .animated-pill {
                                   background: linear-gradient(270deg, #34D399, #38BDF8, #818CF8, #34D399);
                                   background-size: 300% 300%;
                                   animation: pillGradientFlow 6s ease infinite;
                                 }
                               `}</style>
                               <motion.div layoutId="mapCatIndicator" className="animated-pill" style={{ position: "absolute", inset: 0, borderRadius: 20, zIndex: -1, boxShadow: "0 2px 8px rgba(56, 189, 248, 0.3)" }} transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
                             </>
                           )}
                           {(() => {
                             let iconVal = c.icon || "📍";
                             let cleanIcon = typeof iconVal === 'string' ? iconVal.trim() : iconVal;
                             let isImg = typeof cleanIcon === 'string' && (cleanIcon.toLowerCase().endsWith('.svg') || cleanIcon.toLowerCase().endsWith('.png'));
                             return isImg ? <img src={`/${cleanIcon}`} alt="" style={{ width: 14, height: 14, objectFit: "contain" }} /> : <span style={{ fontSize: 14 }}>{cleanIcon}</span>;
                           })()}
                           <span>{c.label}</span>
                         </button>
                       );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Map Container — Fixed Height with Floating Card */}
          <div style={{ margin: "24px 16px 8px", height: "55vh", position: "relative", zIndex: 1, borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.14)", border: `1px solid ${T.border}` }}>
            <Suspense fallback={<LoaderFallback/>}><GMap businesses={displayedPins} selected={mapPin} onPin={b => { setMapPin(p => p?.id === b.id ? null : b); }} userLocation={userCoords} onRequestLocation={requestLocation} categories={cats} radiusKm={nearbyRadius} /></Suspense>

            {/* Empty State hint */}
            {!mapPin && (
              <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.15)", padding: "6px 14px", borderRadius: 20, fontSize: 11, fontWeight: 700, color: "#fff", zIndex: 10, pointerEvents: "none", whiteSpace: "nowrap", letterSpacing: "0.2px" }}>
                Toca un pin para ver detalles
              </div>
            )}

            {/* Close Button on map (Top Left) */}
            {mapPin && (
              <button 
                className="press" 
                onClick={() => setMapPin(null)} 
                style={{ position: "absolute", top: 12, left: 12, width: 36, height: 36, borderRadius: "50%", background: T.white, boxShadow: "0 4px 12px rgba(0,0,0,0.2)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 20 }}
              >
                <Icon name="x" size={16} color={T.text} />
              </button>
            )}
          </div>

          {/* Map Pin Card — slides in directly below the map */}
          {mapPin && (
            <motion.div
              key={mapPin.id}
              initial={{ y: 30, opacity: 0, height: 0 }}
              animate={{ y: 0, opacity: 1, height: "auto" }}
              exit={{ y: 30, opacity: 0, height: 0 }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
              style={{ margin: "0 16px 16px", background: T.white, borderRadius: 20, boxShadow: "0 12px 32px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden", border: `1px solid ${T.border}`, position: "relative" }}
            >
              {/* Imagen Banner */}
              <div style={{ width: "100%", height: 140, background: T.bg, position: "relative" }}>
                {mapPin.photos?.[0]?.url
                  ? <img src={getThumbUrl(mapPin.photos[0].url, 1000, 700)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48 }}>
                      {(() => {
                        let emojiVal = mapPin.emoji || cats.find(c => c.id === mapPin.category)?.icon || CAT_EMOJI[mapPin.category] || "📍";
                        let cleanEmoji = typeof emojiVal === 'string' ? emojiVal.trim() : emojiVal;
                        let isImg = typeof cleanEmoji === 'string' && (cleanEmoji.toLowerCase().endsWith('.svg') || cleanEmoji.toLowerCase().endsWith('.png'));
                        return isImg ? <img src={`/${cleanEmoji}`} alt="" style={{ width: 64, height: 64, objectFit: "contain" }} /> : cleanEmoji;
                      })()}
                    </div>
                }
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "50%", background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent)", pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: 10, left: 12, right: 12, zIndex: 2 }}>
                  <div style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 17, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>{mapPin.name}</div>
                </div>
              </div>

              {/* Contenido compacto */}
              <div style={{ padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 11, color: T.sub, fontWeight: 600, whiteSpace: "nowrap" }}>{CAT_EMOJI[mapPin.category]} {mapPin.category || "Lugar"}</span>
                    <span style={{ fontSize: 11, color: T.sub, opacity: 0.4 }}>•</span>
                    <span style={{ fontSize: 11, color: getScheduleStatus(mapPin, isOpen(mapPin)).color, fontWeight: 700, whiteSpace: "nowrap" }}>{getScheduleStatus(mapPin, isOpen(mapPin)).text}</span>
                    {mapPin.review_count > 0 && (<>
                      <span style={{ fontSize: 11, color: T.sub, opacity: 0.4 }}>•</span>
                      <span style={{ fontSize: 11, color: T.sub, fontWeight: 600 }}>⭐ {mapPin.rating}</span>
                    </>)}
                  </div>
                  {userCoords && mapPin.lat && (
                    <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#3B82F615", borderRadius: 20, padding: "3px 9px", flexShrink: 0 }}>
                      <Icon name="nav" size={11} color="#3B82F6" />
                      <span style={{ fontSize: 11, color: "#3B82F6", fontWeight: 800 }}>
                        {(() => { const d = getKm(userCoords.lat, userCoords.lng, parseFloat(mapPin.lat), parseFloat(mapPin.lng)); return d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`; })()}
                      </span>
                    </div>
                  )}
                </div>

                {mapPin.tagline && (
                  <div style={{ fontSize: 11, color: T.text, fontWeight: 500, lineHeight: 1.3, display: 'flex', gap: 6, alignItems: 'flex-start', background: dark ? 'rgba(255,255,255,0.04)' : '#F9FAFB', padding: '8px 10px', borderRadius: 10, border: `1px solid ${T.border}` }}>
                    <span style={{ fontSize: 13 }}>✨</span>
                    <span style={{ fontStyle: "italic", opacity: 0.9 }}>"{mapPin.tagline}"</span>
                  </div>
                )}

                <div style={{ display: "flex", gap: 8 }}>
                  <button className="press" onClick={() => { setSelected(mapPin); navigate("detail"); setMapPin(null); }} style={{ flex: 1, background: T.text, border: "none", borderRadius: 10, padding: "8px 0", fontSize: 13, fontWeight: 800, color: T.bg, cursor: "pointer", fontFamily: "inherit" }}>Ver detalles</button>
                  <button className="press" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${mapPin.lat},${mapPin.lng}`, "_blank")} style={{ flex: 1, background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "8px 0", fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><Icon name="nav" size={13} color={T.text} /> Cómo llegar</button>
                </div>
              </div>
            </motion.div>
          )}

          <div style={{ padding: "0 20px 0" }}>
            {/* ── CERCA DE TI en Mapa ── */}
            {(() => {
              return (
                <div style={{ marginBottom: 20 }}>
                  {/* Title row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 20, color: T.text, fontWeight: 700 }}>{activeCat === "explorar" || activeCat === "todas" ? "Cerca de ti" : `${cats.find(c => c.id === activeCat)?.label || "Lugares"} cerca de ti`}</span>
                    {userCoords && allNearby.length > 0 && <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>{allNearby.length} lugares</span>}
                  </div>

                  {/* Filter pills */}
                  {userCoords && (
                    <div style={{ display: "flex", gap: 12, marginBottom: 12, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
                      
                      {/* Magnetic Segmented Control */}
                      <div style={{ display: "flex", background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", padding: 4, borderRadius: 24, position: "relative" }}>
                        {[0.4, 1, 3, 5].map(km => {
                          const active = nearbyRadius === km;
                          return (
                            <button key={km} onClick={() => setNearbyRadius(km)} style={{ position: "relative", zIndex: 1, padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, color: active ? (dark ? "#000" : "#000") : T.text, background: "transparent", border: "none", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", transition: "color 0.3s ease", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {active && (
                                <motion.div layoutId="mapDistIndicator" style={{ position: "absolute", inset: 0, background: dark ? "#fff" : "#fff", borderRadius: 20, zIndex: -1, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }} transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
                              )}
                              {km === 0.4 ? "🚶‍♂️ 5 min" : `${km} km`}
                            </button>
                          );
                        })}
                      </div>

                      <button className="press" onClick={() => setNearbyFilter(nearbyFilter === "open" ? "all" : "open")} style={{ display: "flex", alignItems: "center", gap: 5, background: nearbyFilter === "open" ? (dark ? "#fff" : "#1a1a1a") : "transparent", color: nearbyFilter === "open" ? (dark ? "#000" : "#fff") : T.text, border: nearbyFilter === "open" ? "none" : `1.5px solid ${T.border}`, padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .2s", flexShrink: 0, whiteSpace: "nowrap" }}>
                        <div className="live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#16A34A" }} />
                        Solo abiertos
                      </button>
                    </div>
                  )}

                  {!userCoords && (
                    <div onClick={requestLocation} style={{ padding: "14px 16px", background: T.white, borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, boxShadow: T.shadow }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: T.greenL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Icon name="pin" size={16} color={T.green} />
                      </div>
                      <span style={{ fontSize: 13, color: T.green, fontWeight: 600 }}>Toca para ver negocios cerca de ti</span>
                    </div>
                  )}

                  {userCoords && <>
                    {allNearby.length === 0 ? (
                      <div className="press" onClick={() => { if (!user) { setShowAuth(true); toast$("Inicia sesión para sugerir un lugar"); } else { setShowAddBiz(true); } }} style={{ padding: "14px 16px", background: T.white, borderRadius: 14, display: "flex", alignItems: "center", gap: 12, boxShadow: T.shadow, cursor: "pointer", border: `1.5px dashed ${T.border}` }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: T.greenL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="plus" size={16} color={T.green} /></div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: T.text }}>¡Sé el primero en descubrir esta zona! 🗺️</div>
                          <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>Amplía tu radio de búsqueda o sugiere una joya oculta</div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none", alignItems: "flex-start" }}>
                        {allNearby.map(b => {
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
                                  <span style={{ fontSize: 8, color: getScheduleStatus(b, isOpen(b)).color, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.2 }}>{getScheduleStatus(b, isOpen(b)).text}</span>
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

