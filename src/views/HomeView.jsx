import React from "react";
import ReactDOM from "react-dom";
import { m, AnimatePresence } from "framer-motion";
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useShallow } from 'zustand/react/shallow';
import { getThumbUrl, getCategoryDescription, haptic, getScheduleStatus, isOpenNow, getMinutesToClose, isNear } from "../lib/utils";
import Icon from "../components/ui/Icon.jsx";
import Footer from "../components/Footer.jsx";
import ExperienceViewer from "../components/ExperienceViewer.jsx";
import { PageLogo } from "../components/Brand.jsx";
import { Sk, CardSk, DuoSk, EventSk } from "../components/ui/Skeleton.jsx";
import FeaturedCard from "../components/cards/FeaturedCard.jsx";
import DestacadoCard from "../components/cards/DestacadoCard.jsx";
import CompactCard from "../components/cards/CompactCard.jsx";
import OptimizedImage from "../components/ui/OptimizedImage.jsx";
import { Virtuoso } from "react-virtuoso";
import { Helmet } from "react-helmet-async";

const SESSION_SEED = Math.random();



import DebouncedSearchBar from "../components/home/DebouncedSearchBar.jsx";

import TopImperdibles from "../components/home/TopImperdibles.jsx";
import SquareCarousel from "../components/home/SquareCarousel.jsx";
import BannerSlider from "../components/home/BannerSlider.jsx";
import { getDailyScore } from '../lib/utils.js';
import useTimeStore from '../store/useTimeStore.js';
import CityEmptyState from '../components/CityEmptyState.jsx';

// Removed FloatingParticles

const placeholders = [
  "Buscar lugares, eventos...",
  "Buscar 'Sushi'...",
  "Cafeterías cerca...",
  "¿Antojo de mariscos?...",
  "Descubre bares locales...",
  "Buscar 'Tacos'...",
  "Lugares para cenar...",
  "¿Qué hacer hoy?...",
  "Buscar 'Pizza'...",
  "Restaurantes románticos...",
  "Eventos de fin de semana...",
  "Buscar 'Hamburguesas'...",
  "Desayunos deliciosos...",
  "Lugares pet-friendly...",
  "Comida saludable...",
  "Postres y helados...",
  "Cena con amigos...",
  "Buffets cerca de mi...",
  "Dónde tomar un café...",
  "Buscar 'Cerveza artesanal'...",
  "Comida típica de la región...",
  "Lugares para leer un libro...",
  "Parques y lugares al aire libre...",
  "Centros comerciales...",
  "Buscar 'Cortes de carne'..."
];

export default function HomeView({ isBackground }) {
  const ctx = useAppContext();
  const { dark, activeCity, showCityPicker, setShowCityPicker, toast$ } = useUIStore(useShallow(s => ({ dark: s.dark, activeCity: s.activeCity, showCityPicker: s.showCityPicker, setShowCityPicker: s.setShowCityPicker, toast$: s.toast$ })));
  const { dbReady, cats, banners, mapPins, globalFavCounts, coupons, events, raffles, cities, experiences } = useDataStore(useShallow(s => ({ dbReady: s.dbReady, cats: s.cats, banners: s.banners, mapPins: s.mapPins, globalFavCounts: s.globalFavCounts, coupons: s.coupons, events: s.events, raffles: s.raffles, cities: s.cities, experiences: s.experiences })));
  const { user, setShowAuth } = useAuthStore(useShallow(s => ({ user: s.user, setShowAuth: s.setShowAuth })));
  const now = useTimeStore(s => s.now);
  
  const [viewingPlan, setViewingPlan] = React.useState(null);
  const [isViewing, setIsViewing] = React.useState(false);
  const [phIdx, setPhIdx] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPhIdx(prev => (prev + 1) % placeholders.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  const { viewStyle, cityImg, locating, detectCity, city, isAdmin, setShowAdmin, search, setSearch, setShowAddBiz, activeCat, setActiveCat, T, displayList, userCoords, getKm, favIds, toggleFav, setSelected, navigate, trackEvent, goWhatsApp, goDir, doShare, handleCardTap, handleEventTap, loadPaginatedBiz, hasMore, loadingMore, nearbyRadius, setNearbyRadius, nearbyFilter, setNearbyFilter, requestLocation, allNearby, isOpen, topFavsMemo, showMoreTopFavs, setShowMoreTopFavs, topRatedMemo, showMoreTopRated, setShowMoreTopRated, newBizMemo, biz, AutoSlider, CAT_EMOJI, FONT_BIZ, detectedTown, detectedState, setSelectedEvent, cleanCityPrefix, createSlug } = ctx;

  const nearbyList = React.useMemo(() => {
    if (!allNearby || !allNearby.length) return [];
    let list = allNearby.filter(b => b._km <= nearbyRadius);
    if (activeCat !== "todas" && activeCat !== "explorar") {
      list = list.filter(b => b.category === activeCat);
    }
    if (nearbyFilter === "open") list = list.filter(b => isOpen(b));
    return list;
  }, [allNearby, nearbyRadius, nearbyFilter, activeCat, isOpen]);

  const timeBasedListsMemo = React.useMemo(() => {
    const h = new Date().getHours();
    let listTitle;
    let timeList;

    if (h >= 17 || h < 4) {
      listTitle = "Para cerrar el día";
      timeList = mapPins.filter(b => {
        if (b.city_slug !== activeCity) return false;
        const isNight = ["bar", "antros", "club", "cerveceria"].includes(b.category) || 
                        (b.tags && Array.isArray(b.tags) && b.tags.some(t => typeof t === 'string' && t.toLowerCase() === 'cenas'));
        if (!isNight && b.category !== "restaurante") return false;
        return getMinutesToClose(b) > 0;
      });
    } else if (h >= 12 && h < 17) {
      listTitle = "Hora de comer";
      timeList = mapPins.filter(b => {
        if (b.city_slug !== activeCity) return false;
        const isFood = ["restaurantes", "restaurante", "comida rapida", "mariscos", "tacos", "pizzeria"].includes(b.category) || 
                       (b.tags && Array.isArray(b.tags) && b.tags.some(t => typeof t === 'string' && t.toLowerCase() === 'comidas'));
        if (!isFood) return false;
        return getMinutesToClose(b) > 0;
      });
    } else {
      listTitle = "Para iniciar el día";
      timeList = mapPins.filter(b => {
        if (b.city_slug !== activeCity) return false;
        const isCafe = b.category === "cafe";
        const isFood = ["restaurantes", "restaurante", "comida rapida", "mariscos", "tacos", "pizzeria", "comida"].includes(b.category);
        const hasDesayunosTag = b.tags && Array.isArray(b.tags) && b.tags.some(t => typeof t === 'string' && t.toLowerCase() === 'desayunos');
        if (!isCafe && !hasDesayunosTag && !isFood) return false;
        return getMinutesToClose(b) > 0;
      });
    }

    if (timeList.length === 0) {
       timeList = mapPins.filter(b => isNear(b, userCoords, activeCity) && (b.category === "restaurantes" || b.category === "restaurante") && getMinutesToClose(b) > 0);
    }

    timeList = timeList.sort((a, b) => {
      if (userCoords) {
        const distA = getKm(userCoords.lat, userCoords.lng, a.lat, a.lng);
        const distB = getKm(userCoords.lat, userCoords.lng, b.lat, b.lng);
        return distA - distB;
      }
      return b.plan - a.plan;
    }).slice(0, 8);
    
    const sportsList = mapPins.filter(b => isNear(b, userCoords, activeCity) && (b.category === "fitness" || b.category === "unidad deportiva")).sort((a, b) => {
      if (userCoords) {
        const distA = getKm(userCoords.lat, userCoords.lng, a.lat, a.lng);
        const distB = getKm(userCoords.lat, userCoords.lng, b.lat, b.lng);
        return distA - distB;
      }
      return b.plan - a.plan;
    }).slice(0, 8);
    
    const showActiva = h >= 6 && h < 18;

    return { listTitle, timeList, sportsList, showActiva };
  }, [mapPins, activeCity, userCoords, getKm]);

  const activeBannersMemo = React.useMemo(() => {
    const today = now.toISOString().split("T")[0];
    const todayMD = today.slice(5);
    return banners.filter(bn => {
      if (!bn) return false;
      if (!bn.active) return false;
      if (bn.city_slug !== "all" && bn.city_slug !== activeCity) return false;
      if (bn.repeat_yearly) {
        const startMD = bn.start_date ? bn.start_date.slice(5) : "01-01";
        const endMD = bn.end_date ? bn.end_date.slice(5) : "12-31";
        return todayMD >= startMD && todayMD <= endMD;
      }
      if (bn.start_date && today < bn.start_date) return false;
      if (bn.end_date && today > bn.end_date) return false;
      if (!bn.img_url) return false;
      return true;
    });
  }, [banners, activeCity, now]);

  let currentTitle = "CityMap - Tu Guía Local Inteligente";
  let currentDesc = "Descubre los mejores lugares en tu ciudad con CityMap.";
  if (activeCat && activeCat !== "todas" && activeCat !== "explorar") {
    const catLabel = cats.find(c => c.id === activeCat)?.label || activeCat;
    const cityName = (city || activeCity || "tu ciudad").split(",")[0];
    currentTitle = `Los mejores ${catLabel} en ${cityName} - CityMap`;
    currentDesc = getCategoryDescription(activeCat, catLabel, cityName);
  }

  const canonicalUrl = `https://citymap.mx/${activeCity}`;

  return (
    <div style={{ paddingBottom: 84, position: "relative", ...viewStyle }}>
      {!isBackground && (
        <Helmet>
          <title>{currentTitle}</title>
          <meta name="description" content={currentDesc} />
          <link rel="canonical" href={canonicalUrl} />
        </Helmet>
      )}

          {/* ── HERO HEADER ── */}
          <div style={{ position: "relative", padding: "8px 20px 0px", minHeight: search ? "auto" : 220, display: "flex", flexDirection: "column", background: "transparent" }}>

            {/* Contenido Header (Por encima del fondo) */}
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
              


              {/* ── Fila 2: Título Hero ── */}
              {!search && (() => {
                const cityName = detectedTown || (city || "").split(",")[0] || "tu ciudad";
                return (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", marginBottom: 0, paddingTop: 10, paddingLeft: 10, paddingRight: 10, textAlign: "center", position: "relative", zIndex: 10 }}>
                    <div className="hero-title-anim" style={{ marginBottom: 4 }}>
                      <img 
                        src="/citymap.mx.png" 
                        alt="CityMap" 
                        style={{ height: 56, objectFit: "contain", filter: dark ? "none" : "invert(1)" }} 
                      />
                    </div>
                    <style>{`
                      @keyframes heroGradientFlow {
                        0% { background-position: 100% center; }
                        100% { background-position: 0% center; }
                      }
                      @keyframes premiumFadeUp {
                        0% { opacity: 0; transform: translateY(15px); filter: blur(8px); }
                        100% { opacity: 1; transform: translateY(0); filter: blur(0); }
                      }
                      .animated-city {
                        display: inline-block;
                        font-family: 'Montserrat', sans-serif;
                        font-size: 1.1em;
                        font-weight: 800;
                        line-height: 1;
                        letter-spacing: normal;
                        padding-right: 8px;
                        background: linear-gradient(90deg, #34D399 0%, #38BDF8 25%, #818CF8 50%, #38BDF8 75%, #34D399 100%);
                        background-size: 200% auto;
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        animation: heroGradientFlow 4s linear infinite;
                      }
                      .hero-title-anim {
                        color: #ffffff;
                        animation: premiumFadeUp 1.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                        filter: drop-shadow(0 4px 16px rgba(0,0,0,0.6));
                      }
                    `}</style>
                    <h1 className="hero-title-anim" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "clamp(24px, 6vw, 36px)", fontWeight: 800, lineHeight: 1.1, margin: 0, letterSpacing: "-0.5px", color: dark ? "#fff" : T.text }}>
                      Descubre lo mejor de <br/><span className="animated-city">{cityName}</span>
                    </h1>
                  </div>
                );
              })()}

              {/* ── Fila 3: Search Bar ── */}
              <div style={{ position: "relative", width: "100%", marginTop: search ? 76 : 16, zIndex: 10 }}>
                  <style>{`
                    @keyframes magicBorderSpin {
                      100% { transform: rotate(1turn); }
                    }
                    .hero-search-magic-container {
                      position: absolute;
                      top: 0; left: 0; right: 0; bottom: 0;
                      border-radius: 100px;
                      overflow: hidden;
                      z-index: 1;
                      pointer-events: none;
                    }
                    .hero-search-magic-container::before {
                      display: none;
                    }
                    .hero-search-magic-inner {
                      position: absolute;
                      top: 0; left: 0; right: 0; bottom: 0;
                      border-radius: 100px;
                      background: rgba(15, 23, 42, 0.8);
                      backdrop-filter: blur(24px);
                      -webkit-backdrop-filter: blur(24px);
                      box-shadow: inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.1);
                      z-index: 2;
                    }
                    .hero-search-input {
                      position: relative;
                      z-index: 3;
                      -webkit-appearance: none !important;
                      appearance: none !important;
                      background: transparent !important;
                    }
                    .hero-search-input::placeholder {
                      color: rgba(255, 255, 255, 0.85) !important;
                      -webkit-text-fill-color: rgba(255, 255, 255, 0.85) !important;
                      opacity: 1;
                      letter-spacing: 0.2px;
                    }
                    .hero-search-input:focus {
                      box-shadow: none !important;
                    }
                  `}</style>
                  <div className="hero-search-magic-container">
                    <div className="hero-search-magic-inner"></div>
                  </div>
                  <DebouncedSearchBar initialValue={search} onSearch={setSearch} placeholders={placeholders} phIdx={phIdx} locating={locating} detectCity={detectCity} userCoords={userCoords} />
              </div>

              {/* Fila 4: Categorías Iconos (Ocultos en Inicio) */}
              {!search && <div style={{ margin: "12px -20px 0" }}>
                <style>{`
                  @keyframes catHeartbeat {
                    0% { transform: translateY(-4px) scale(1.1); }
                    50% { transform: translateY(-4px) scale(1.25); }
                    100% { transform: translateY(-4px) scale(1.1); }
                  }
                `}</style>
                <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", paddingTop: 8, paddingBottom: 8, paddingLeft: 20, paddingRight: 20, gap: 20, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                  {!dbReady ? [1, 2, 3, 4, 5].map(i => <Sk key={i} w={56} h={56} r={28} dark={true} style={{ flexShrink: 0 }} />)
                    : [{id: "explorar", label: "Explorar"}, ...cats].map((c) => {
                      const isActive = activeCat === c.id
                      const catSlug = (c.id || "").replace(/\s+/g, '-').toLowerCase();
                      const catUrl = `/${(activeCity || city || "").split(",")[0]}${c.id === "explorar" ? "" : "/" + catSlug}`;
                      
                      let emojiVal = c.id === "explorar" ? "🌎" : (c.icon === "❤️" ? "🤍" : (c.emoji || c.icon || "✨"));
                      let cleanEmoji = typeof emojiVal === 'string' ? emojiVal.trim() : emojiVal;
                      let isImage = typeof cleanEmoji === 'string' && (cleanEmoji.toLowerCase().endsWith('.svg') || cleanEmoji.toLowerCase().endsWith('.png'));

                      return (
                        <a href={catUrl} key={c.id} onClick={(e) => { e.preventDefault(); haptic("light"); setActiveCat(c.id); window.history.pushState(null, "", catUrl); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0, width: 64 }}>
                          <div style={{ width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", transition: isActive ? "none" : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", transform: isActive ? "translateY(-4px) scale(1.1)" : "none", animation: isActive ? "catHeartbeat 2s ease-in-out infinite" : "none" }}>
                            {isImage ? (
                              <img src={`/${cleanEmoji}`} alt={c.label} style={{ width: 32, height: 32, objectFit: "contain" }} />
                            ) : (
                              <span style={{ fontSize: 32, lineHeight: 1 }}>{cleanEmoji}</span>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? T.text : T.sub, textAlign: "center", lineHeight: 1.15, transition: "color 0.3s" }}>{c.label}</span>
                            {isActive && <div style={{ width: 4, height: 4, borderRadius: "50%", background: T.text }} />}
                          </div>
                        </a>
                      );
                    })}
                </div>
              </div>}

            </div>
          </div>

          {/* ── EMPTY CITY STATE ── */}
          {!search && dbReady && mapPins.filter(b => isNear(b, userCoords, activeCity)).length === 0 && (
            <CityEmptyState 
              activeCity={activeCity} 
              userCoords={userCoords} 
              cities={cities} 
              T={T} 
              dark={dark} 
            />
          )}




          {/* ── SEARCH RESULTS ── */}
          {search && (() => {
            const query = search.toLowerCase();
            const qWords = query.split(/\s+/).filter(Boolean);
            const matchingEvents = (events || []).filter(ev => {
              if (ev.city_slug !== "all" && ev.city_slug) {
                const cities = ev.city_slug.split(",");
                if (!cities.includes(activeCity)) return false;
              }
              const text = [ev.title, ev.description, ev.location, ev.venue_name, ev.category].join(" ").toLowerCase();
              return qWords.every(w => text.includes(w));
            });
            const isEventQuery = qWords.some(w => w === "evento" || w === "eventos");
            
            const EventosBlock = () => matchingEvents.length > 0 ? (
              <div style={{ marginBottom: 10, marginTop: isEventQuery ? 0 : 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: "0 0 10px 0" }}>Eventos ({matchingEvents.length})</h3>
                <div style={{ display: "flex", overflowX: "auto", gap: 12, paddingBottom: 10, margin: "0 -20px", padding: "0 20px", scrollbarWidth: "none" }}>
                  {matchingEvents.map(ev => {
                    const posterUrl = ev.img_url || ev.img || ev.poster_url;
                    return (
                      <div key={ev.id} className="press" onClick={() => { handleEventTap(ev); }} style={{ width: 140, height: 180, borderRadius: 14, background: `#f3f4f6 url('${getThumbUrl(posterUrl, 400, 500)}') center/cover`, border: `1px solid ${T.border}`, cursor: "pointer", flexShrink: 0, boxShadow: T.shadow, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.85))", padding: "20px 10px 10px", color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>
                          {ev.title}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null;

            return (
              <div style={{ padding: "16px 20px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontFamily: "var(--heading)", fontWeight: 900, letterSpacing: "-0.5px", fontSize: 20, color: T.text }}>"{search}"</span>
                  <span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>{displayList.length + matchingEvents.length} resultados</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {!dbReady && [1, 2].map(i => <CardSk key={i} dark={dark} />)}
                  
                  {isEventQuery && <EventosBlock />}

                  {dbReady && displayList.length > 0 && displayList.map((b, index) => {
                    const dist = userCoords ? getKm(userCoords.lat, userCoords.lng, parseFloat(b.lat), parseFloat(b.lng)) : null;
                    const distStr = dist !== null ? (dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`) : null;
                    if (b.plan === "premium") {
                      return <div key={b.id} style={{ paddingBottom: 14 }}><FeaturedCard b={b} T={T} dark={dark} isFav={favIds.includes(b.id)} toggleFav={toggleFav} onTap={handleCardTap} goWhatsApp={goWhatsApp} goDir={goDir} doShare={doShare} distStr={distStr} realFavs={globalFavCounts[b.id] || 0} /></div>;
                    } else if (b.plan === "destacado") {
                      return <div key={b.id} style={{ paddingBottom: 14 }}><DestacadoCard b={b} T={T} dark={dark} isFav={favIds.includes(b.id)} toggleFav={toggleFav} onTap={handleCardTap} distStr={distStr} realFavs={globalFavCounts[b.id] || 0} /></div>;
                    } else {
                      return <div key={b.id} style={{ paddingBottom: 14 }}><CompactCard b={b} T={T} dark={dark} isFav={favIds.includes(b.id)} toggleFav={toggleFav} onTap={handleCardTap} distStr={distStr} realFavs={globalFavCounts[b.id] || 0} /></div>;
                    }
                  })}
                  {dbReady && hasMore && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                      <button
                        onClick={() => loadPaginatedBiz(false)}
                        disabled={loadingMore}
                        style={{ padding: '10px 28px', borderRadius: 20, border: `1px solid ${T.border}`, background: 'none', color: T.text, fontWeight: 700, fontSize: 14, cursor: loadingMore ? 'default' : 'pointer', opacity: loadingMore ? 0.5 : 1 }}
                      >{loadingMore ? 'Cargando...' : 'Ver más'}</button>
                    </div>
                  )}
                  
                  {dbReady && displayList.length === 0 && !isEventQuery && matchingEvents.length > 0 && <EventosBlock />}
                  
                  {dbReady && displayList.length === 0 && matchingEvents.length === 0 && (() => {
                    const q = search.toLowerCase();
                    const isVuelos = /vuelo|flight|avion|avión|aero/.test(q);
                    const isRenta = /renta|auto|carro|car|rent/.test(q);
                    const isHotel = /hotel|hostal|hospedaje|alojamiento|stay/.test(q);
                    const isTours = /tour|ticket|actividad|excursion|excursión/.test(q);
                    const isTravel = isVuelos || isRenta || isHotel || isTours;

                    const travelOptions = [
                      { label: "Vuelos Baratos", emoji: "✈️", url: "https://expedia.com/affiliate/G4ETQnX", match: isVuelos },
                      { label: "Hospedaje Ideal", emoji: "🏨", url: "https://booking.stay22.com/citymapmx/MQbyFZdMFZ", match: isHotel },
                      { label: "Renta de Autos", emoji: "🚗", url: "https://expedia.com/affiliate/DTtL3D8", match: isRenta },
                      { label: "Tours y Tickets", emoji: "🎟️", url: "https://getyourguide.stay22.com/citymapmx/594Wk5DWwJ", match: isTours },
                    ];

                    return (
                      <div style={{ padding: "8px 0 20px" }}>
                        {isTravel ? (
                          <>
                            <div style={{ fontSize: 14, color: T.sub, marginBottom: 16, textAlign: "center" }}>
                              No encontramos negocios para <strong style={{ color: T.text }}>"{search}"</strong>, pero puedes reservar aquí:
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                              {travelOptions.map(opt => (
                                <a
                                  key={opt.label}
                                  href={opt.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: "14px 12px",
                                    borderRadius: 16,
                                    background: opt.match
                                      ? (dark ? "rgba(74,222,128,0.15)" : "rgba(22,163,74,0.08)")
                                      : (dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"),
                                    border: opt.match
                                      ? `1.5px solid ${dark ? "rgba(74,222,128,0.4)" : "rgba(22,163,74,0.3)"}`
                                      : `1px solid ${dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)"}`,
                                    textDecoration: "none",
                                    transition: "transform 0.15s ease",
                                  }}
                                >
                                  <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.3 }}>{opt.label}</span>
                                </a>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div style={{ textAlign: "center", padding: "40px 20px" }}>
                            <Icon name="search" size={32} color={T.border} />
                            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 12 }}>No encontramos resultados</div>
                            <div style={{ fontSize: 14, color: T.sub, marginTop: 4 }}>Intenta con otras palabras o busca en otra ciudad.</div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}

          {/* ── CERCA DE TI ── */}
          {(() => {
            const isLocal = !userCoords || mapPins.some(b => b.city_slug && b.city_slug.split(",").includes(activeCity) && b.lat && b.lng && getKm(userCoords.lat, userCoords.lng, parseFloat(b.lat), parseFloat(b.lng)) < 50);
            if (search || !dbReady || !isLocal || activeCat === "explorar") return null;
            return (
            <div style={{ padding: "8px 20px 0" }}>
              <div>
                {/* Title row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                  <span style={{ fontFamily: "var(--heading)", fontWeight: 900, letterSpacing: "-0.5px", fontSize: 22, color: T.text, margin: 0 }}>{activeCat === "explorar" || activeCat === "todas" ? "Cerca de ti" : `${cats.find(c => c.id === activeCat)?.label || "Lugares"} cerca de ti`}</span>
                  {userCoords && nearbyList.length > 0 && <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>{nearbyList.length} lugares</span>}
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
                              <m.div layoutId="homeDistIndicator" style={{ position: "absolute", inset: 0, background: dark ? "#fff" : "#fff", borderRadius: 20, zIndex: -1, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }} transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
                            )}
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    <button className="press" onClick={() => setNearbyFilter(nearbyFilter === "open" ? "all" : "open")} style={{ display: "flex", alignItems: "center", gap: 5, background: nearbyFilter === "open" ? (dark ? "#fff" : "#1a1a1a") : "transparent", color: nearbyFilter === "open" ? (dark ? "#000" : "#fff") : T.text, border: nearbyFilter === "open" ? "none" : `1.5px solid ${T.border}`, padding: "5px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .2s", flexShrink: 0, whiteSpace: "nowrap" }}>
                      <div className="live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#16A34A" }} />
                      Abiertos ahora
                    </button>
                  </div>
                )}

                {!userCoords && (
                  <div onClick={requestLocation} style={{ padding: "14px 16px", background: T.white, borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, boxShadow: T.shadow }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: T.greenL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name="pin" size={16} color={T.green} />
                    </div>
                    <span style={{ fontSize: 13, color: T.green, fontWeight: 600 }}>Toca para ver lugares cerca de ti</span>
                  </div>
                )}

                {userCoords && <>
                  {nearbyList.length === 0 ? (
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
                    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none", alignItems: "flex-start", marginRight: -20, paddingRight: 20 }}>
                      {nearbyList.map(b => (
                        <div key={b.id} className="press" onClick={() => handleCardTap(b)}
                          style={{ minWidth: 120, maxWidth: 120, height: "max-content", flexShrink: 0, background: T.white, borderRadius: 12, overflow: "hidden", boxShadow: T.shadow, transition: "all .2s", cursor: "pointer" }}>
                          {/* Photo */}
                          <div style={{ height: 90, overflow: "hidden", position: "relative", background: T.border }}>
                            {b.photos?.[0]?.url
                              ? <OptimizedImage src={b.photos[0].url} widthRequest={200} heightRequest={200} alt={b.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>{(b.emoji || CAT_EMOJI[b.category]) || "📍"}</div>
                            }
                          </div>
                          {/* Info */}
                          <div style={{ padding: "6px 8px" }}>
                            <div style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.1, marginBottom: 4 }}>{b.name}</div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                                <div style={{ width: 5, height: 5, borderRadius: "50%", background: getScheduleStatus(b, isOpen(b)).color, flexShrink: 0 }} />
                                <span style={{ fontSize: 9, color: getScheduleStatus(b, isOpen(b)).color, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.2 }}>{getScheduleStatus(b, isOpen(b)).text}</span>
                              </div>
                              <div style={{ display: "flex", alignItems: "center", gap: 1, color: T.sub, fontSize: 10, fontWeight: 600 }}>
                                <Icon name="pin" size={9} color={T.sub} />
                                {b._km < 1 ? `${Math.round(b._km * 1000)}m` : `${b._km.toFixed(1)}km`}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>}
              </div>
            </div>
            );
          })()}

          {/* ── AGENDA LOCAL (EVENTOS DE HOY/PRÓXIMOS) ── */}
          {!search && activeCat === "explorar" && (() => {
            const now2 = new Date();
            const upcomingEvents = (events || []).filter(ev => {
              if (ev.status !== "approved") return false;
              if (ev.city_slug !== "all" && ev.city_slug) {
                const cities = ev.city_slug.split(",");
                if (!cities.includes(activeCity)) return false;
              }
              if (ev.date) {
                const endDateStr = ev.end_date || ev.date;
                const evDT = ev.time ? new Date(`${endDateStr}T${ev.time}:00`) : new Date(`${endDateStr}T23:59:00`);
                if ((now2 - evDT) > 86400000) return false;
              }
              return true;
            }).filter(ev => ev && ev.date).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
            if (!dbReady) return (
              <div style={{ padding: "24px 0 0 20px" }}>
                <h2 style={{ fontFamily: "var(--heading)", fontWeight: 900, fontSize: 18, color: T.text, margin: "0 0 12px 0", letterSpacing: "-0.5px" }}>Agenda Local</h2>
                <EventSk dark={dark} />
              </div>
            );
            if (upcomingEvents.length === 0) return null;
            
            const now = new Date();
            const tz = window.CITY_TZ || 'America/Mazatlan';
            const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
            const tomorrow = new Date(now.getTime() + 86400000);
            const tomorrowStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(tomorrow);

            const isEventToday = ev => ev.date === todayStr || (ev.end_date && ev.date <= todayStr && ev.end_date >= todayStr);
            const isEventTomorrow = ev => ev.date === tomorrowStr || (ev.end_date && ev.date <= tomorrowStr && ev.end_date >= tomorrowStr);
            
            return (
              <div style={{ padding: "24px 0 0 0" }}>
                <h2 style={{ fontFamily: "var(--heading)", fontWeight: 900, fontSize: 22, color: T.text, letterSpacing: "-0.5px", textAlign: "center", margin: "0 0 16px 0" }}>Agenda Local</h2>
                
                {upcomingEvents.length > 0 && (
                  <div style={{ display: "flex", gap: 14, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 16, paddingLeft: 20, paddingRight: 20 }}>
                    {upcomingEvents.map(ev => {
                      const posterUrl = getThumbUrl(ev.img_url || cityImg, 600, 800);
                      const isToday = isEventToday(ev);
                      const isTomorrow = isEventTomorrow(ev);
                      return (
                        <div key={ev.id} className="press" onClick={() => { handleEventTap(ev); }} style={{ width: 150, height: 210, borderRadius: 18, background: `url(${posterUrl}) center/cover`, border: `1px solid ${T.border}`, cursor: "pointer", flexShrink: 0, boxShadow: "0 8px 20px rgba(0,0,0,0.15)", position: "relative", overflow: "hidden" }}>
                          {(isToday || isTomorrow) && (
                            <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)", color: "#fff", padding: "4px 8px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.2)", fontWeight: 800, fontSize: 10, letterSpacing: 0.5, animation: isToday ? "pulse 2s infinite" : "none", display: "flex", alignItems: "center", gap: 4, zIndex: 2 }}>
                              {isToday ? "🤩 ES HOY" : "⏳ MAÑANA"}
                            </div>
                          )}
                          {ev.date && (() => {
                            const d = new Date(ev.date + "T12:00:00");
                            const m = d.toLocaleString('es-MX', { month: 'short' }).replace('.', '');
                            let dayTxt = d.getDate();
                            let moTxt = m;
                            if (ev.end_date && ev.end_date !== ev.date) {
                                const d2 = new Date(ev.end_date + "T12:00:00");
                                dayTxt = `${d.getDate()}-${d2.getDate()}`;
                                if (d.getMonth() !== d2.getMonth()) {
                                    const m2 = d2.toLocaleString('es-MX', { month: 'short' }).replace('.', '');
                                    moTxt = `${m}/${m2}`;
                                }
                            }
                            return (
                              <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: "6px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
                                <span style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginBottom: 2, whiteSpace: "nowrap" }}>{dayTxt}</span>
                                <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase", whiteSpace: "nowrap" }}>{moTxt}</span>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── BENTO CATEGORIES (REMOVED) ── */}          {!search && activeCat === "explorar" && <div id="explorar-section">
            {/* ── BANNERS ── */}
            {(() => {
              if (activeBannersMemo.length === 0) return null;
              return <div style={{ margin: "24px 20px 8px", borderRadius: 14, overflow: "hidden", aspectRatio: "21/9", position: "relative", background: T.border, boxShadow: "0 6px 16px rgba(0,0,0,0.1)" }}>
                <BannerSlider activeBanners={activeBannersMemo} />
              </div>;
            })()}
            {(() => {
              const { listTitle, timeList } = timeBasedListsMemo;
              if (timeList.length === 0) return null;
              return (
                <SquareCarousel title={listTitle} list={timeList} handleCardTap={handleCardTap} getThumbUrl={getThumbUrl} CAT_EMOJI={CAT_EMOJI} T={T} FONT_BIZ={FONT_BIZ} />
              );
            })()}

            <TopImperdibles experiences={experiences} globalFavCounts={globalFavCounts} setViewingPlan={setViewingPlan} setIsViewing={setIsViewing} T={T} FONT_BIZ={FONT_BIZ} city={city} />

          </div>}

          {/* ── FAVORITOS DE LA CIUDAD ── */}
          {!search && activeCat === "explorar" && (() => {
              const topFavs = topFavsMemo;
              if (topFavs.length === 0) return null;
              
              const visibleFavs = topFavs.slice(0, showMoreTopFavs ? 10 : 5);

              return <div style={{ margin: "24px 20px" }}>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <h2 style={{ fontFamily: "var(--heading)", fontWeight: 900, fontSize: 22, color: T.text, letterSpacing: "-0.5px", textAlign: "center", margin: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                    <div style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))", display: "flex" }}><Icon name="heart_overlay_f" size={22} color="none" /></div>
                    Favoritos de la ciudad
                    <div style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))", display: "flex" }}><Icon name="heart_overlay_f" size={22} color="none" /></div>
                  </h2>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {visibleFavs.map((b, index) => {
                    const dist = userCoords ? getKm(userCoords.lat, userCoords.lng, parseFloat(b.lat), parseFloat(b.lng)) : null;
                    const distStr = dist !== null ? (dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`) : null;
                    
                    const numColor = dark ? "#fff" : "#4B5563";
                    const pillBg = dark ? "#333" : "#F3F4F6";

                    return (
                      <div key={b.id} style={{ position: "relative", paddingBottom: 0 }}>
                        <div style={{ position: "absolute", top: index < 3 ? -2 : -2, left: index < 3 ? -2 : -2, width: index < 3 ? 38 : 34, height: index < 3 ? 38 : 34, borderRadius: "50%", background: index < 3 ? "transparent" : pillBg, color: numColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: index < 3 ? 32 : 15, fontWeight: 900, boxShadow: index < 3 ? "none" : "0 4px 10px rgba(0,0,0,0.15)", zIndex: 10, border: index < 3 ? "none" : `2.5px solid ${dark ? "#111" : "#f4f4f5"}`, filter: index < 3 ? "drop-shadow(0 4px 6px rgba(0,0,0,0.2))" : "none" }}>
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                        </div>
                        <CompactCard b={b} T={T} dark={dark} isFav={favIds.includes(b.id)} toggleFav={toggleFav} onTap={handleCardTap} distStr={distStr} realFavs={globalFavCounts[b.id] || 0} hideReviews={true} hideSchedule={true} />
                      </div>
                    );
                  })}
                </div>
                
                {topFavs.length > 5 && (
                  <button onClick={() => setShowMoreTopFavs(v => !v)} className="press" style={{ width: "100%", padding: "12px", background: "none", border: `1px solid ${T.border}`, borderRadius: 12, marginTop: 12, fontSize: 13, fontWeight: 700, color: T.green, cursor: "pointer", fontFamily: "inherit" }}>
                    {showMoreTopFavs ? "Ver menos" : "Ver 5 más"}
                  </button>
                )}
              </div>;
            })()}

            {!search && activeCat === "explorar" && (() => {
              const topRated = topRatedMemo;
              if (topRated.length === 0) return null;
              
              const visibleRated = topRated.slice(0, showMoreTopRated ? 10 : 5);

              return <div style={{ margin: "24px 20px" }}>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <h2 style={{ fontFamily: "var(--heading)", fontWeight: 900, fontSize: 22, color: T.text, letterSpacing: "-0.5px", textAlign: "center", margin: 0 }}>⭐ Mejor Calificados ⭐</h2>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {visibleRated.map((b, index) => {
                    const dist = userCoords ? getKm(userCoords.lat, userCoords.lng, parseFloat(b.lat), parseFloat(b.lng)) : null;
                    const distStr = dist !== null ? (dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`) : null;
                    
                    const numColor = dark ? "#fff" : "#4B5563";
                    const pillBg = dark ? "#333" : "#F3F4F6";

                    return (
                      <div key={b.id} style={{ position: "relative", paddingBottom: 0 }}>
                        <div style={{ position: "absolute", top: index < 3 ? -2 : -2, left: index < 3 ? -2 : -2, width: index < 3 ? 38 : 34, height: index < 3 ? 38 : 34, borderRadius: "50%", background: index < 3 ? "transparent" : pillBg, color: numColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: index < 3 ? 32 : 15, fontWeight: 900, boxShadow: index < 3 ? "none" : "0 4px 10px rgba(0,0,0,0.15)", zIndex: 10, border: index < 3 ? "none" : `2.5px solid ${dark ? "#111" : "#f4f4f5"}`, filter: index < 3 ? "drop-shadow(0 4px 6px rgba(0,0,0,0.2))" : "none" }}>
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                        </div>
                        <CompactCard b={b} T={T} dark={dark} isFav={favIds.includes(b.id)} toggleFav={toggleFav} onTap={handleCardTap} distStr={distStr} realFavs={globalFavCounts[b.id] || 0} hideFavs={true} hideSchedule={true} />
                      </div>
                    );
                  })}
                </div>
                
                {topRated.length > 5 && (
                  <button onClick={() => setShowMoreTopRated(v => !v)} className="press" style={{ width: "100%", padding: "12px", background: "none", border: `1px solid ${T.border}`, borderRadius: 12, marginTop: 12, fontSize: 13, fontWeight: 700, color: T.green, cursor: "pointer", fontFamily: "inherit" }}>
                    {showMoreTopRated ? "Ver menos" : "Ver 5 más"}
                  </button>
                )}
              </div>;
            })()}



          {/* ── TODOS LOS NEGOCIOS POR CATEGORÍA ── */}
          {!search && activeCat !== "explorar" && <div id="all-biz-section" style={{ padding: "20px 20px 0" }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              {!dbReady ? <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><Sk w="60%" h={26} r={6} dark={dark} /></div> : <h1 style={{ fontFamily: "var(--heading)", fontWeight: 900, letterSpacing: "-0.5px", fontSize: 26, color: T.text, margin: "0 0 6px 0", padding: 0, textAlign: "center" }}>{cats.find(c => c.id === activeCat)?.label || activeCat} en {(city || "").split(',')[0]}</h1>}
              {!dbReady ? <div style={{ display: "flex", justifyContent: "center" }}><Sk w="80%" h={14} r={4} dark={dark} /></div> : <h2 style={{ fontSize: 13, color: T.sub, fontWeight: 500, margin: 0, lineHeight: 1.4, textAlign: "center" }}>{getCategoryDescription(activeCat, cats.find(c => c.id === activeCat)?.label, city)}</h2>}
            </div>
            <div style={{ flexDirection: "column", gap: 14 }}>
              {!dbReady && [1, 2, 3].map(i => <CardSk key={i} dark={dark} />)}
              {dbReady && displayList.length > 0 && (
                <Virtuoso
                  useWindowScroll
                  data={displayList}
                  endReached={() => {
                    if (hasMore && !loadingMore) loadPaginatedBiz(false);
                  }}
                  computeItemKey={(index, b) => b.id}
                  itemContent={(index, b) => {
                    const dist = userCoords ? getKm(userCoords.lat, userCoords.lng, parseFloat(b.lat), parseFloat(b.lng)) : null;
                    const distStr = dist !== null ? (dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`) : null;
                    
                    if (b.plan === "premium") {
                      return <div style={{ paddingBottom: 14 }}><FeaturedCard b={b} T={T} dark={dark} isFav={favIds.includes(b.id)} toggleFav={toggleFav} onTap={handleCardTap} goWhatsApp={goWhatsApp} goDir={goDir} doShare={doShare} distStr={distStr} realFavs={globalFavCounts[b.id] || 0} /></div>;
                    } else if (b.plan === "destacado") {
                      return <div style={{ paddingBottom: 14 }}><DestacadoCard b={b} T={T} dark={dark} isFav={favIds.includes(b.id)} toggleFav={toggleFav} onTap={handleCardTap} distStr={distStr} realFavs={globalFavCounts[b.id] || 0} /></div>;
                    } else {
                      return <div style={{ paddingBottom: 14 }}><CompactCard b={b} T={T} dark={dark} isFav={favIds.includes(b.id)} toggleFav={toggleFav} onTap={handleCardTap} distStr={distStr} realFavs={globalFavCounts[b.id] || 0} /></div>;
                    }
                  }}
                  components={{
                    Footer: () => (
                      <div style={{ paddingBottom: 20 }}>
                        {loadingMore && [1, 2].map(i => <CardSk key={`more-${i}`} dark={dark} />)}
                      </div>
                    )
                  }}
                />
              )}
              {dbReady && displayList.length === 0 && <div style={{ textAlign: "center", padding: "32px 0", color: T.sub }}><Icon name="search" size={36} color={T.border} /><p style={{ fontWeight: 700, color: T.text, marginTop: 14, marginBottom: 6 }}>Sin negocios en esta categoría</p><p style={{ fontSize: 14 }}>Prueba otra categoría</p></div>}
            </div>
          </div>}
          {!search && raffles && raffles.length > 0 && <div style={{ padding: "20px 20px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: T.text, display: "flex", alignItems: "center", gap: 6 }}><Icon name="gift" size={18} color="#D94F3D" /> Sorteos de la semana</span>
            </div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
              {raffles.map(r => {
                const b = biz.find(x => x.id === r.biz_id);
                return <div key={r.id} onClick={() => { setSelected(b); navigate("detail"); }} style={{ minWidth: 260, flexShrink: 0, background: "linear-gradient(135deg, #FFF9E6, #FFF0B3)", borderRadius: 16, padding: "16px", border: "1.5px solid #FDE047", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}><Icon name="gift" size={20} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 14, color: "#92400E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: "#B45309", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Por {b?.name}</div>
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#D97706" }}>Premio: {r.prize}</div>
                  </div>
                </div>;
              })}
            </div>
          </div>}
          {!search && coupons.length > 0 && <div style={{ padding: "20px 20px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: T.text }}>Cupones activos</span>
            </div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
              {coupons.map(c => {
                const b = biz.find(x => x.id === c.biz_id); return <div key={c.id} style={{ minWidth: 200, flexShrink: 0, background: "#F5F3FF", borderRadius: 14, padding: "14px", border: "1.5px dashed #7C3AED44" }}>
                  <div style={{ fontWeight: 800, fontSize: 22, color: "#7C3AED" }}>{c.discount_pct}%</div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text, marginTop: 4 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>{b?.name}</div>
                  <div style={{ marginTop: 8, background: "#7C3AED", color: "#fff", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 800, letterSpacing: 1, display: "inline-block" }}>{c.code}</div>
                </div>;
              })}
            </div>
          </div>}


          {/* Footer */}
          <Footer />

          {/* Bottom Spacing */}
          <div style={{ height: 20 }} />

          {ReactDOM.createPortal(
            <AnimatePresence>
              {isViewing && viewingPlan && (
                <ExperienceViewer 
                  exp={viewingPlan} 
                  T={T} 
                  dark={dark} 
                  onClose={() => { 
                    setIsViewing(false); 
                    setTimeout(() => setViewingPlan(null), 300);
                    // restore URL to home view
                    window.history.pushState({}, '', `/${activeCity}`);
                  }} 
                />
              )}
            </AnimatePresence>,
            document.body
          )}
        </div>
  );
}

