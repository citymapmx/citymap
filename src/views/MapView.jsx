import { Suspense, useEffect, useState, useRef } from "react";
import { m } from "framer-motion";
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
  const { cats, mapPins, loadMapPinsByBounds, cities } = useDataStore(useShallow(s => ({ cats: s.cats, mapPins: s.mapPins, loadMapPinsByBounds: s.loadMapPinsByBounds, cities: s.cities })));
  const { user, setShowAuth } = useAuthStore(useShallow(s => ({ user: s.user, setShowAuth: s.setShowAuth })));
  
  const { viewStyle, T, activeCat, setActiveCat, GMap, navigate, setSelected, setMapPin, mapPin, userCoords, requestLocation, FONT_BIZ, CAT_EMOJI, getKm, isOpen, allNearby, nearbyRadius, setNearbyRadius, setNearbyFilter, nearbyFilter, LoaderFallback, setShowAddBiz, city } = ctx;

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

  const cityPins = mapPins.filter(b => isNear(b, userCoords, activeCity, 40));
  let displayedPins = (activeCat === "todas" || activeCat === "explorar") ? cityPins : cityPins.filter(b => b.category === activeCat);
  if (nearbyFilter === "open") {
    displayedPins = displayedPins.filter(b => isOpen(b));
  }
  if (userCoords && nearbyRadius) {
    displayedPins = displayedPins.filter(b => getKm(userCoords.lat, userCoords.lng, parseFloat(b.lat), parseFloat(b.lng)) <= nearbyRadius);
  }
  const filteredNearby = allNearby.filter(b => displayedPins.some(dp => dp.id === b.id));
  const renderedNearby = filteredNearby.slice(0, visibleCount);

  const [prevFilters, setPrevFilters] = useState([nearbyRadius, nearbyFilter, activeCat]);
  if (prevFilters[0] !== nearbyRadius || prevFilters[1] !== nearbyFilter || prevFilters[2] !== activeCat) {
    setPrevFilters([nearbyRadius, nearbyFilter, activeCat]);
    setVisibleCount(5);
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }

  const cityName = cities.find(c => c.slug === activeCity)?.name || (activeCity ? activeCity.charAt(0).toUpperCase() + activeCity.slice(1).replace(/-/g, ' ') : "tu ciudad");
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
          {/* Default List Header (No Pin Selected) */}
          {!mapPin && (
            <m.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
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
                  Encuentra los mejores lugares en <span className="exp-city-anim">{shortCity}</span>
                </p>
              </div>
              {/* Category Bar (Above Map) */}
              <div style={{ overflowX: "auto", scrollbarWidth: "none", background: T.white, borderBottom: `1px solid ${T.border}`, whiteSpace: "nowrap", WebkitOverflowScrolling: "touch" }}>
                <div style={{ display: "flex", gap: 8, padding: "4px 16px 14px" }}>
                  {[{id: "todas", label: "Todos", icon: "📍"}, ...cats].map(c => {
                     const isSel = activeCat === c.id || (c.id === "todas" && activeCat === "explorar");
                     return (
                       <button key={c.id} className={isSel ? "animated-pill press" : "press"} onClick={() => setActiveCat(c.id === "todas" ? "explorar" : c.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", background: dark ? "rgba(255,255,255,0.05)" : T.white, color: isSel ? "#fff" : T.text, border: `1px solid ${T.border}`, borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s", flexShrink: 0 }}>
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
            </m.div>
          )}

          {/* Map Container — Fixed Height with Floating Card */}
          <div style={{ margin: "24px 16px 8px", aspectRatio: "1 / 1", position: "relative", zIndex: 1, borderRadius: 20, overflow: "hidden", boxShadow: "0 8px 32px rgba(0,0,0,0.14)", border: `1px solid ${T.border}` }}>
            <Suspense fallback={<LoaderFallback/>}><GMap businesses={displayedPins} selected={mapPin} onPin={b => { setMapPin(p => p?.id === b.id ? null : b); }} userLocation={userCoords} onRequestLocation={requestLocation} categories={cats} radiusKm={nearbyRadius} onBoundsChanged={(bounds) => loadMapPinsByBounds(activeCity, bounds)} /></Suspense>

            {/* GPS Overlay */}
            {!userCoords && (
              <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 15, background: T.white, padding: "16px 20px", borderRadius: 20, boxShadow: "0 12px 32px rgba(0,0,0,0.2)", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, maxWidth: 260, textAlign: "center", border: `1px solid ${T.border}` }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: T.text }}>¿Qué hay cerca?</div>
                <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.3 }}>Activa tu ubicación para explorar lugares a tu alrededor.</div>
                <button className="press" onClick={() => { localStorage.removeItem("cg_manual_city"); requestLocation(); }} style={{ background: "#0ea5e9", color: "#fff", border: "none", padding: "8px 20px", borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="2" x2="12" y2="5"></line><line x1="12" y1="19" x2="12" y2="22"></line><line x1="2" y1="12" x2="5" y2="12"></line><line x1="19" y1="12" x2="22" y2="12"></line></svg>
                  Activar GPS
                </button>
              </div>
            )}

            {/* Empty State hint */}
            {!mapPin && (
              <div style={{ position: "absolute", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "rgba(255, 255, 255, 0.9)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", border: "1px solid rgba(0,0,0,0.08)", padding: "5px 12px", borderRadius: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", fontSize: 11, fontWeight: 700, color: "#1f2937", zIndex: 10, pointerEvents: "none", whiteSpace: "nowrap" }}>
                Toca un pin para detalles
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
            <m.div
              key={mapPin.id}
              initial={{ y: 30, opacity: 0, height: 0 }}
              animate={{ y: 0, opacity: 1, height: "auto" }}
              exit={{ y: 30, opacity: 0, height: 0 }}
              transition={{ type: "spring", bounce: 0.25, duration: 0.4 }}
              style={{ margin: "0 16px 16px", background: T.white, borderRadius: 20, boxShadow: "0 12px 32px rgba(0,0,0,0.15)", display: "flex", flexDirection: "column", overflow: "hidden", border: `1px solid ${T.border}`, position: "relative" }}
            >
              {/* Imagen Banner */}
              <div style={{ width: "100%", height: 140, background: T.bg, position: "relative" }}>
                <button onClick={() => setMapPin(null)} style={{ position: "absolute", top: 8, left: 8, zIndex: 5, width: 28, height: 28, borderRadius: "50%", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(6px)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="x" size={14} color="#fff" />
                </button>
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
                  <button className="press" onClick={() => { setSelected(mapPin); navigate(`/${mapPin.city || activeCity}/${mapPin.slug}`); setMapPin(null); }} style={{ flex: 1, background: T.text, border: "none", borderRadius: 10, padding: "8px 0", fontSize: 13, fontWeight: 800, color: T.bg, cursor: "pointer", fontFamily: "inherit" }}>Ver detalles</button>
                  <button className="press" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${mapPin.lat},${mapPin.lng}`, "_blank")} style={{ flex: 1, background: T.bg, border: `1.5px solid ${T.border}`, borderRadius: 10, padding: "8px 0", fontSize: 13, fontWeight: 700, color: T.text, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><Icon name="nav" size={13} color={T.text} /> Cómo llegar</button>
                </div>
              </div>
            </m.div>
          )}

          <div style={{ padding: "0 20px 0" }}>
            {/* ── CERCA DE TI en Mapa ── */}
            {(() => {
              return (
                <div style={{ marginBottom: 20 }}>
                  {/* Title row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <span style={{ fontFamily: "var(--heading)", fontSize: 20, color: T.text, fontWeight: 700 }}>{activeCat === "explorar" || activeCat === "todas" ? "Cerca de ti" : `${cats.find(c => c.id === activeCat)?.label || "Lugares"} cerca de ti`}</span>
                    {userCoords && filteredNearby.length > 0 && <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>{filteredNearby.length} lugares</span>}
                  </div>

                  {/* Filter pills */}
                  {userCoords && (
                    <div style={{ display: "flex", gap: 12, marginBottom: 12, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 2 }}>
                      
                      {/* Magnetic Segmented Control */}
                      <div style={{ display: "flex", background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)", padding: 4, borderRadius: 24, position: "relative" }}>
                        {[{ km: 0.5, label: "🚶‍♂️ 500m" }, { km: 1, label: "🚶‍♂️ 1km" }, { km: 2, label: "🚗 2km" }, { km: 3, label: "🚗 3km" }].map(opt => {
                          const active = nearbyRadius === opt.km;
                          return (
                            <button key={opt.km} onClick={() => setNearbyRadius(opt.km)} style={{ position: "relative", zIndex: 1, padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: 700, color: active ? (dark ? "#000" : "#000") : T.text, background: "transparent", border: "none", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap", transition: "color 0.3s ease", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              {active && (
                                <m.div layoutId="mapDistIndicator" style={{ position: "absolute", inset: 0, background: dark ? "#fff" : "#fff", borderRadius: 20, zIndex: -1, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }} transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
                              )}
                              {opt.label}
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
                    {filteredNearby.length === 0 ? (
                      <div style={{ padding: "24px 16px", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 14, color: T.text, marginBottom: 4 }}>¡Sé el primero en descubrir esta zona! 🗺️</div>
                          <div style={{ fontSize: 13, color: T.sub }}>Amplía tu radio de búsqueda o sugiere una joya oculta</div>
                        </div>
                        <button className="press" onClick={() => { if (!user) { setShowAuth(true); toast$("Inicia sesión para sugerir un lugar"); } else { setShowAddBiz(true); } }} style={{ background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                          <Icon name="plus" size={16} color="#fff" /> Sugerir lugar
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

