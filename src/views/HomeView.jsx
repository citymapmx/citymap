import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useShallow } from 'zustand/react/shallow';
import { getThumbUrl, getCategoryDescription, haptic, getScheduleStatus, isOpenNow, getMinutesToClose, isNear } from "../lib/utils";
import Icon from "../components/ui/Icon.jsx";
import { PageLogo } from "../components/Brand.jsx";
import { Sk, CardSk, DuoSk, EventSk } from "../components/ui/Skeleton.jsx";
import FeaturedCard from "../components/cards/FeaturedCard.jsx";
import DestacadoCard from "../components/cards/DestacadoCard.jsx";
import CompactCard from "../components/cards/CompactCard.jsx";
import BentoCategories from "../components/BentoCategories.jsx";
import { Virtuoso } from "react-virtuoso";
import { Helmet } from "react-helmet-async";

const SESSION_SEED = Math.random();

function DebouncedSearchBar({ initialValue, onSearch, placeholders, phIdx, locating, detectCity }) {
  const [localSearch, setLocalSearch] = React.useState(initialValue);
  const [displayedPlaceholder, setDisplayedPlaceholder] = React.useState("");
  
  React.useEffect(() => {
    setLocalSearch(initialValue);
  }, [initialValue]);

  React.useEffect(() => {
    const t = setTimeout(() => onSearch(localSearch), 300);
    return () => clearTimeout(t);
  }, [localSearch, onSearch]);

  React.useEffect(() => {
    const targetText = placeholders[phIdx] || "";
    let i = 0;
    setDisplayedPlaceholder("|"); // Start with cursor
    
    let interval;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        setDisplayedPlaceholder(targetText.slice(0, i + 1) + (i < targetText.length - 1 ? "|" : ""));
        i++;
        if (i >= targetText.length) {
          clearInterval(interval);
          setDisplayedPlaceholder(targetText);
        }
      }, 50);
    }, phIdx === 0 ? 500 : 100);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [phIdx, placeholders]);

  return (
    <>
      <input 
        className="inp hero-search-input" 
        style={{ width: "100%", padding: "12px 16px 12px 44px", border: "none", borderRadius: 100, color: "#fff", fontSize: 15, fontWeight: 600, outline: "none", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }} 
        placeholder={displayedPlaceholder} 
        value={localSearch} 
        onChange={e => setLocalSearch(e.target.value)} 
      />
      <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", zIndex: 5, pointerEvents: "none", display: "flex" }}>
        <Icon name="search" size={18} color="rgba(255,255,255,0.8)" sw={2} />
      </span>
      {localSearch ? (
        <button aria-label="Borrar búsqueda" className="press" onClick={() => setLocalSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.15)", borderRadius: "50%", width: 28, height: 28, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, padding: 0 }}>
          <Icon name="x" size={14} color="#fff" sw={3} />
        </button>
      ) : (
        <button aria-label="Actualizar ubicación" className="press" onClick={() => { localStorage.removeItem("cg_manual_city"); if (!locating) detectCity({ showToast: true }); }} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 5, padding: 8, animation: locating ? "pulse 1.5s infinite" : "none" }} title="Actualizar GPS">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="2" x2="12" y2="5"></line><line x1="12" y1="19" x2="12" y2="22"></line><line x1="2" y1="12" x2="5" y2="12"></line><line x1="19" y1="12" x2="22" y2="12"></line></svg>
        </button>
      )}
    </>
  );
}

function SquareCarousel({ title, list, handleCardTap, getThumbUrl, CAT_EMOJI, T, FONT_BIZ }) {
  if (!list || list.length === 0) return null;
  const isSingle = list.length === 1;

  return (
    <div style={{ padding: "24px 0 0" }}>
      <div style={{ padding: "0 20px", marginBottom: 12 }}>
        <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 22, color: T.text, letterSpacing: 0.5, textAlign: "center", margin: 0 }}>{title}</h2>
      </div>
      <div style={{ display: "flex", gap: 10, overflowX: isSingle ? "visible" : "auto", paddingLeft: 20, paddingRight: 20, paddingBottom: 6, scrollbarWidth: "none" }}>
        {list.map((b) => {
          const imgToUse = b.logo_url || b.photos?.[0]?.url;
          
          if (isSingle) {
            return (
              <div key={b.id} className="press" onClick={() => handleCardTap(b)} style={{ width: "100%", background: T.white, borderRadius: 16, padding: 12, display: "flex", alignItems: "center", gap: 14, boxShadow: T.shadow, cursor: "pointer", border: `1px solid ${T.border}` }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", background: T.border, flexShrink: 0, position: "relative" }}>
                  {imgToUse
                    ? <img src={getThumbUrl(imgToUse, 600, 600)} alt={b.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{(b.emoji || CAT_EMOJI[b.category]) || "📍"}</div>
                  }
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 16, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2 }}>{b.name}</div>
                  <div style={{ fontSize: 13, color: T.sub, marginTop: 4, textTransform: "capitalize" }}>{b.category}</div>
                </div>
              </div>
            );
          }

          return (
            <div key={b.id} className="press" onClick={() => handleCardTap(b)} style={{ minWidth: 90, maxWidth: 90, flexShrink: 0, cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ width: 90, height: 90, borderRadius: 20, overflow: "hidden", background: T.border, boxShadow: T.shadow, position: "relative" }}>
                {imgToUse
                  ? <img src={getThumbUrl(imgToUse, 600, 600)} alt={b.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32 }}>{(b.emoji || CAT_EMOJI[b.category]) || "📍"}</div>
                }
              </div>
              <div style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 11, color: T.text, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.1 }}>{b.name}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DuoAutoSlider({ openBiz, userCoords, getKm, cityImg, setSelected, navigate, trackEvent, T, FONT_BIZ }) {
  const [displayed, setDisplayed] = React.useState([]);
  const [keySuffix, setKeySuffix] = React.useState(0);
  
  React.useEffect(() => {
    if (openBiz.length === 0) return;
    if (openBiz.length <= 2) {
      setDisplayed(openBiz);
      return;
    }
    
    const pickRandom = (current) => {
      const currentIds = current.map(c => c.id);
      const available = openBiz.filter(b => !currentIds.includes(b.id));
      const shuffled = available.sort(() => 0.5 - Math.random());
      return shuffled.slice(0, 2);
    };

    setDisplayed(pickRandom([]));

    const interval = setInterval(() => {
      setDisplayed(prev => pickRandom(prev));
      setKeySuffix(k => k + 1);
    }, 4500);
    return () => clearInterval(interval);
  }, [openBiz]);

  return (
    <div style={{ display: "flex", gap: 12, overflow: "hidden", padding: "0 20px 10px" }}>
      <AnimatePresence mode="popLayout">
        {displayed.map(b => {
          const dist = userCoords ? getKm(userCoords.lat, userCoords.lng, parseFloat(b.lat), parseFloat(b.lng)) : null;
          const distStr = dist !== null ? (dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`) : "";
          const imgToUseRaw = b.photos?.[0]?.url || b.logo_url || cityImg;
          const imgToUse = getThumbUrl(imgToUseRaw, 600, 450);
          return (
            <motion.div
              key={b.id + "-" + keySuffix}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="press" 
              onClick={() => { setSelected(b); navigate("detail"); trackEvent(b.id, "view"); }} 
              style={{ flex: 1, minWidth: "calc(50% - 6px)", height: 140, borderRadius: 16, background: `linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 60%), url(${imgToUse}) center/cover`, position: "relative", cursor: "pointer", boxShadow: T.shadow }}
            >
              {distStr && <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.5)", padding: "2px 4px", borderRadius: 4 }}><span style={{ fontSize: 9, color: "#fff", fontWeight: 700, lineHeight: 1, display: "block" }}>{distStr}</span></div>}
              <div style={{ position: "absolute", bottom: 12, left: 8, right: 8, display: "flex", justifyContent: "center", textAlign: "center" }}>
                <span style={{ fontFamily: FONT_BIZ, fontSize: 14, fontWeight: 800, color: "#fff", lineHeight: 1.2, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>{b.name}</span>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

function BannerSlider({ activeBanners }) {
  const [idx, setIdx] = React.useState(0);
  
  React.useEffect(() => {
    if (!activeBanners || activeBanners.length <= 1) return;
    const interval = setInterval(() => {
      setIdx(prev => (prev + 1) % activeBanners.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activeBanners]);

  if (!activeBanners || activeBanners.length === 0) return null;
  const bn = activeBanners[idx];

  return (
    <>
      <AnimatePresence mode="wait">
        <motion.div
          key={bn.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{ height: "100%", width: "100%", position: "absolute", top: 0, left: 0 }}
          onClick={() => {
            if (bn.link_url) {
              let url = bn.link_url.trim();
              if (!url.match(/^https?:\/\//i) && !url.match(/^(mailto|tel|sms):/i)) {
                url = 'https://' + url;
              }
              window.open(url, "_blank");
            }
          }}
        >
          <img src={getThumbUrl(bn.img_url, 1400, 600)} alt={bn.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover", cursor: bn.link_url ? "pointer" : "default" }} loading="lazy" />
        </motion.div>
      </AnimatePresence>
      <div style={{ display: "none" }}>
        {[1].map(offset => {
          const nextBn = activeBanners[(idx + offset) % activeBanners.length];
          return nextBn?.img_url ? <img key={"preload_" + nextBn.id} src={getThumbUrl(nextBn.img_url, 1400, 600)} alt="" loading="eager" fetchpriority="high" /> : null;
        })}
      </div>
    </>
  );
}
import { getDailyScore } from '../lib/utils.js';
import useTimeStore from '../store/useTimeStore.js';

const stardustParticles = [...Array(30)].map((_, i) => ({
  size: Math.random() * 2 + 1.5,
  left: Math.random() * 100,
  animDuration: Math.random() * 8 + 12,
  delay: Math.random() * 20
}));

const FloatingParticles = () => {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
      <style>{`
        @keyframes stardustFloat {
          0% { transform: translateY(20vh) scale(0.5); opacity: 0; }
          20% { opacity: 0.9; }
          80% { opacity: 0.9; }
          100% { transform: translateY(-80vh) scale(1.2); opacity: 0; }
        }
        .stardust {
          position: absolute;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 50%;
          filter: blur(0.5px);
          bottom: 0;
          box-shadow: 0 0 6px rgba(255,255,255,0.6);
        }
      `}</style>
      {stardustParticles.map((p, i) => (
        <div
          key={i}
          className="stardust"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            animation: `stardustFloat ${p.animDuration}s linear infinite`,
            animationDelay: `-${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default function HomeView() {
  const ctx = useAppContext();
  const { dark, activeCity, showCityPicker, setShowCityPicker, toast$ } = useUIStore(useShallow(s => ({ dark: s.dark, activeCity: s.activeCity, showCityPicker: s.showCityPicker, setShowCityPicker: s.setShowCityPicker, toast$: s.toast$ })));
  const { dbReady, cats, banners, mapPins, globalFavCounts, coupons, events, raffles } = useDataStore(useShallow(s => ({ dbReady: s.dbReady, cats: s.cats, banners: s.banners, mapPins: s.mapPins, globalFavCounts: s.globalFavCounts, coupons: s.coupons, events: s.events, raffles: s.raffles })));
  const { user, setShowAuth } = useAuthStore(useShallow(s => ({ user: s.user, setShowAuth: s.setShowAuth })));
  const now = useTimeStore(s => s.now);
  
  const [phIdx, setPhIdx] = React.useState(0);
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
    "Lugares pet-friendly..."
  ];
  React.useEffect(() => {
    const interval = setInterval(() => {
      setPhIdx(prev => (prev + 1) % placeholders.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const { viewStyle, cityImg, locating, detectCity, city, isAdmin, setShowAdmin, search, setSearch, setShowAddBiz, activeCat, setActiveCat, T, displayList, userCoords, getKm, favIds, toggleFav, setSelected, navigate, trackEvent, goWhatsApp, goDir, doShare, handleCardTap, loadPaginatedBiz, hasMore, loadingMore, nearbyRadius, setNearbyRadius, nearbyFilter, setNearbyFilter, requestLocation, allNearby, isOpen, topFavsMemo, showMoreTopFavs, setShowMoreTopFavs, topRatedMemo, showMoreTopRated, setShowMoreTopRated, newBizMemo, biz, AutoSlider, CAT_EMOJI, FONT_BIZ, detectedTown, detectedState, setSelectedEvent, cleanCityPrefix, createSlug } = ctx;

  const nearbyList = React.useMemo(() => {
    if (!allNearby || !allNearby.length) return [];
    let list = allNearby.filter(b => b._km <= nearbyRadius);
    if (activeCat !== "todas" && activeCat !== "explorar") {
      list = list.filter(b => b.category === activeCat);
    }
    if (nearbyFilter === "open") list = list.filter(b => isOpen(b));
    return list;
  }, [allNearby, nearbyRadius, nearbyFilter, activeCat, isOpen, now]);

  const openBizMemo = React.useMemo(() => {
    const isExcluded = (b) => {
       if (!b.category) return false;
       const c = b.category.toLowerCase();
       return c.includes("lugares") || c.includes("plaza") || c.includes("unidad") || c.includes("parque");
    };
    
    const d = new Date();
    const dailySeed = d.getFullYear() + d.getMonth() * 31 + d.getDate();

    return [...mapPins].filter(b => isNear(b, userCoords, activeCity) && b.status === "approved" && isOpen(b) && !isExcluded(b)).sort((a, b) => {
       return getDailyScore(b.id, dailySeed) - getDailyScore(a.id, dailySeed);
    });
  }, [mapPins, activeCity, isOpen, now]);

  const timeBasedListsMemo = React.useMemo(() => {
    const h = new Date().getHours();
    let listTitle = "Para iniciar el día";
    let timeList = [];

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

    timeList = timeList.sort((a, b) => b.plan - a.plan).slice(0, 8);
    const sportsList = mapPins.filter(b => isNear(b, userCoords, activeCity) && (b.category === "fitness" || b.category === "unidad deportiva")).sort((a, b) => b.plan - a.plan).slice(0, 8);
    const showActiva = h >= 6 && h < 18;

    return { listTitle, timeList, sportsList, showActiva };
  }, [mapPins, activeCity]);

  const activeBannersMemo = React.useMemo(() => {
    const today = now.toISOString().split("T")[0];
    const todayMD = today.slice(5);
    return banners.filter(bn => {
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
<div style={{ paddingBottom: 84, ...viewStyle }}>
      <Helmet>
        <title>{currentTitle}</title>
        <meta name="description" content={currentDesc} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

          {/* ── HERO HEADER ── */}
          <div style={{ position: "relative", overflow: "hidden", padding: "8px 20px 0px", minHeight: search ? "auto" : 220, display: "flex", flexDirection: "column", background: "#0F172A" }}>
            {/* Fondo Premium */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, background: "#060B14", overflow: "hidden" }}>
              {/* Subtle Glows */}
              <div style={{ position: "absolute", top: "-30%", left: "-10%", width: "70%", height: "70%", background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, rgba(124,58,237,0) 70%)", filter: "blur(40px)" }} />
              <div style={{ position: "absolute", bottom: "-10%", right: "-20%", width: "80%", height: "80%", background: "radial-gradient(circle, rgba(56,189,248,0.08) 0%, rgba(56,189,248,0) 70%)", filter: "blur(40px)" }} />
              <FloatingParticles />
            </div>

            {/* Contenido Header (Por encima del fondo) */}
            <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
              


              {/* ── Fila 2: Título Hero ── */}
              {!search && (() => {
                const cityName = detectedTown || (city || "").split(",")[0] || "tu ciudad";
                return (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", marginBottom: 0, paddingTop: 20, paddingLeft: 10, paddingRight: 10, textAlign: "center", position: "relative", zIndex: 10 }}>
                    <div className="hero-title-anim" style={{ marginBottom: 4 }}>
                      <img 
                        src="/citymap.mx.png" 
                        alt="CityMap" 
                        style={{ height: 72, objectFit: "contain", filter: "drop-shadow(0 4px 12px rgba(56, 189, 248, 0.3))" }} 
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
                    <h1 className="hero-title-anim" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "clamp(28px, 7.5vw, 42px)", fontWeight: 800, lineHeight: 1.1, margin: 0, letterSpacing: "-0.5px" }}>
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
                      content: "";
                      position: absolute;
                      top: -50%; left: -50%;
                      width: 200%; height: 200%;
                      background: conic-gradient(from 90deg, #0ea5e9, #1e3a8a, #3b82f6, #93c5fd, #1d4ed8, #0ea5e9);
                      animation: magicBorderSpin 8s linear infinite;
                      filter: blur(2px);
                    }
                    .hero-search-magic-inner {
                      position: absolute;
                      top: 2px; left: 2px; right: 2px; bottom: 2px;
                      border-radius: 100px;
                      background: rgba(15, 23, 42, 0.8);
                      backdrop-filter: blur(24px);
                      -webkit-backdrop-filter: blur(24px);
                      box-shadow: inset 0 1px 1px rgba(255,255,255,0.15), 0 0 25px rgba(56, 189, 248, 0.4);
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
                  <DebouncedSearchBar initialValue={search} onSearch={setSearch} placeholders={placeholders} phIdx={phIdx} locating={locating} detectCity={detectCity} />
              </div>

              {/* Fila 4: Categorías Iconos (Ocultos en Inicio) */}
              {!search && <div style={{ margin: "12px -20px 0" }}>
                <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", paddingTop: 8, paddingBottom: 8, paddingLeft: 20, paddingRight: 20, gap: 20, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
                  {!dbReady ? [1, 2, 3, 4, 5].map(i => <Sk key={i} w={56} h={56} r={28} dark={true} style={{ flexShrink: 0 }} />)
                    : [{id: "explorar", label: "Explorar"}, ...cats].map((c) => {
                      const isActive = activeCat === c.id
                      const catSlug = (c.id || "").replace(/\s+/g, '-').toLowerCase();
                      const catUrl = `/${(activeCity || city || "").split(",")[0]}${c.id === "explorar" ? "" : "/" + catSlug}`;
                      
                      let bg = isActive ? "linear-gradient(145deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))" : "rgba(0,0,0,0.25)";
                      let border = isActive ? "1px solid rgba(255,255,255,0.4)" : "1px solid rgba(255,255,255,0.06)";
                      let boxShadow = isActive ? "0 10px 24px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.3)" : "inset 0 1px 1px rgba(255,255,255,0.05)";
                      let emoji = c.id === "explorar" ? "🌎" : (c.icon === "❤️" ? "🤍" : (c.emoji || c.icon || "✨"));

                      return (
                        <a href={catUrl} key={c.id} onClick={(e) => { e.preventDefault(); haptic("light"); setActiveCat(c.id); window.history.pushState(null, "", catUrl); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textDecoration: "none", flexShrink: 0, width: 56 }}>
                          <div style={{ width: 42, height: 42, borderRadius: 14, background: bg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", transform: isActive ? "translateY(-4px)" : "none", border: border, boxShadow: boxShadow }}>
                            <span style={{ fontSize: 20, lineHeight: 1, filter: isActive ? "drop-shadow(0 4px 8px rgba(0,0,0,0.3))" : "drop-shadow(0 2px 4px rgba(0,0,0,0.5))" }}>{emoji}</span>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: isActive ? "#fff" : "rgba(255,255,255,0.7)", textAlign: "center", lineHeight: 1.15, textShadow: "0 2px 4px rgba(0,0,0,0.5)", transition: "color 0.3s" }}>{c.label}</span>
                            {isActive && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#FDE047", boxShadow: "0 0 8px rgba(253, 224, 71, 0.8)" }} />}
                          </div>
                        </a>
                      );
                    })}
                </div>
              </div>}

            </div>
          </div>

          {/* ── NEW CITY CONQUEST MODE (Apple Minimalist) ── */}
          {!search && dbReady && mapPins.filter(b => isNear(b, userCoords, activeCity)).length === 0 && (
            <div style={{ margin: "24px 20px 10px", padding: "30px 24px", background: dark ? "#111" : "#ffffff", borderRadius: 24, boxShadow: dark ? "0 12px 32px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.06)", border: `1px solid ${T.border}`, textAlign: "center", position: "relative" }}>
              <div style={{ display: "inline-flex", padding: "6px 12px", background: T.bg, borderRadius: 20, fontSize: 11, fontWeight: 800, color: T.text, textTransform: "uppercase", letterSpacing: 1, marginBottom: 16, border: `1px solid ${T.border}` }}>Nueva Ciudad</div>
              <h2 style={{ fontFamily: "'Coolvetica', sans-serif", letterSpacing: 0.5, fontSize: 28, color: T.text, margin: "0 0 14px", lineHeight: 1.15, textTransform: "capitalize" }}>Sé el pionero en <span style={{ fontStyle: "italic" }}>{(activeCity || "").replace(/-/g, " ")}</span></h2>
              <p style={{ fontSize: 15, color: T.sub, margin: "0 0 24px", lineHeight: 1.5 }}>Destaca ante toda la ciudad registrando tu negocio antes que tu competencia.</p>
              <button className="press" onClick={() => { if (!user) { setShowAuth(true); toast$("Inicia sesión para agregar tu negocio"); } else { setShowAddBiz(true); } }} style={{ width: "100%", padding: "16px", background: dark ? "#ffffff" : "#000000", color: dark ? "#000000" : "#ffffff", border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "transform 0.2s" }}>
                <Icon name="plus" size={16} color={dark ? "#000" : "#fff"} /> Registra tu negocio primero
              </button>
            </div>
          )}

          {/* ── BANNERS ── */}
          {!search && activeCat === "explorar" && (() => {
            if (activeBannersMemo.length === 0) return null;
            return <div style={{ margin: "24px 20px 8px", borderRadius: 14, overflow: "hidden", aspectRatio: "21/9", position: "relative", background: T.border, boxShadow: "0 6px 16px rgba(0,0,0,0.1)" }}>
              <BannerSlider activeBanners={activeBannersMemo} />
            </div>;
          })()}


          {/* ── SEARCH RESULTS ── */}
          {search && (() => {
            const query = search.toLowerCase();
            const qWords = query.split(/\s+/).filter(Boolean);
            const matchingEvents = (events || []).filter(ev => {
              if (ev.city_slug !== activeCity) return false;
              const text = [ev.title, ev.description, ev.location, ev.venue_name, ev.category].join(" ").toLowerCase();
              return qWords.every(w => text.includes(w));
            });
            const isEventQuery = qWords.some(w => w === "evento" || w === "eventos");
            const hasResults = displayList.length > 0 || matchingEvents.length > 0;
            
            const EventosBlock = () => matchingEvents.length > 0 ? (
              <div style={{ marginBottom: 10, marginTop: isEventQuery ? 0 : 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: "0 0 10px 0" }}>Eventos ({matchingEvents.length})</h3>
                <div style={{ display: "flex", overflowX: "auto", gap: 12, paddingBottom: 10, margin: "0 -20px", padding: "0 20px", scrollbarWidth: "none" }}>
                  {matchingEvents.map(ev => {
                    const posterUrl = ev.img_url || ev.img || ev.poster_url;
                    return (
                      <div key={ev.id} className="press" onClick={() => { setSelectedEvent(ev); navigate("events"); }} style={{ width: 140, height: 180, borderRadius: 14, background: `#f3f4f6 url('${getThumbUrl(posterUrl, 400, 500)}') center/cover`, border: `1px solid ${T.border}`, cursor: "pointer", flexShrink: 0, boxShadow: T.shadow, position: "relative", overflow: "hidden" }}>
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
                  <span style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 20, color: T.text }}>"{search}"</span>
                  <span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>{displayList.length + matchingEvents.length} resultados</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {!dbReady && [1, 2].map(i => <CardSk key={i} dark={dark} />)}
                  
                  {isEventQuery && <EventosBlock />}

                  {dbReady && displayList.length > 0 && <Virtuoso
                    useWindowScroll
                    data={displayList}
                    endReached={() => { if (hasMore && !loadingMore) loadPaginatedBiz(false); }}
                    components={{ Footer: !isEventQuery ? EventosBlock : undefined }}
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
                  />}
                  
                  {dbReady && displayList.length === 0 && !isEventQuery && matchingEvents.length > 0 && <EventosBlock />}
                  
                  {dbReady && displayList.length === 0 && matchingEvents.length === 0 && (
                    <div style={{ textAlign: "center", padding: "40px 20px" }}>
                      <Icon name="search" size={32} color={T.border} />
                      <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 12 }}>No encontramos resultados</div>
                      <div style={{ fontSize: 14, color: T.sub, marginTop: 4 }}>Intenta con otras palabras o busca en otra ciudad.</div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* ── CERCA DE TI ── */}
          {(() => {
            const isLocal = !userCoords || mapPins.some(b => b.city_slug === activeCity && b.lat && b.lng && getKm(userCoords.lat, userCoords.lng, parseFloat(b.lat), parseFloat(b.lng)) < 50);
            if (search || !dbReady || !isLocal || activeCat === "explorar") return null;
            return (
            <div style={{ padding: "8px 20px 0" }}>
              <div>
                {/* Title row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12 }}>
                  <span style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 22, color: T.text, fontWeight: 700, margin: 0 }}>{activeCat === "explorar" || activeCat === "todas" ? "Cerca de ti" : `${cats.find(c => c.id === activeCat)?.label || "Lugares"} cerca de ti`}</span>
                  {userCoords && nearbyList.length > 0 && <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>{nearbyList.length} lugares</span>}
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
                              <motion.div layoutId="homeDistIndicator" style={{ position: "absolute", inset: 0, background: dark ? "#fff" : "#fff", borderRadius: 20, zIndex: -1, boxShadow: "0 2px 8px rgba(0,0,0,0.12)" }} transition={{ type: "spring", bounce: 0.25, duration: 0.5 }} />
                            )}
                            {km === 0.4 ? "🚶‍♂️ 5 min" : `${km} km`}
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
                    <div className="press" onClick={() => { if (!user) { setShowAuth(true); toast$("Inicia sesión para sugerir un lugar"); } else { setShowAddBiz(true); } }} style={{ padding: "14px 16px", background: T.white, borderRadius: 14, display: "flex", alignItems: "center", gap: 12, boxShadow: T.shadow, cursor: "pointer", border: `1.5px dashed ${T.border}` }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: T.greenL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="plus" size={16} color={T.green} /></div>
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, color: T.text }}>¡Sé el primero en descubrir esta zona! 🗺️</div>
                          <div style={{ fontSize: 11, color: T.sub, marginTop: 2 }}>Amplía tu radio de búsqueda o sugiere una joya oculta</div>
                        </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none", alignItems: "flex-start", marginRight: -20, paddingRight: 20 }}>
                      {nearbyList.map(b => (
                        <div key={b.id} className="press" onClick={() => handleCardTap(b)}
                          style={{ minWidth: 120, maxWidth: 120, height: "max-content", flexShrink: 0, background: T.white, borderRadius: 12, overflow: "hidden", boxShadow: T.shadow, transition: "all .2s", cursor: "pointer" }}>
                          {/* Photo */}
                          <div style={{ height: 90, overflow: "hidden", position: "relative", background: T.border }}>
                            {b.photos?.[0]?.url
                              ? <img src={getThumbUrl(b.photos[0].url, 300, 300)} alt={b.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
            const now2 = now;
            const upcomingEvents = (events || []).filter(ev => {
              if (ev.city_slug !== activeCity || ev.status !== "approved") return false;
              if (ev.date) {
                const endDateStr = ev.end_date || ev.date;
                const evDT = ev.time ? new Date(`${endDateStr}T${ev.time}`) : new Date(`${endDateStr}T23:59`);
                if ((now2 - evDT) > 86400000) return false;
              }
              return true;
            }).sort((a,b) => a.date.localeCompare(b.date));
            if (!dbReady) return (
              <div style={{ padding: "24px 0 0 20px" }}>
                <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 18, color: T.text, margin: "0 0 12px 0", letterSpacing: 0.5 }}>Agenda Local</h2>
                <EventSk dark={dark} />
              </div>
            );
            if (upcomingEvents.length === 0) return null;
            
            return (
              <div style={{ padding: "24px 0 0 20px" }}>
                <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 22, color: T.text, letterSpacing: 0.5, textAlign: "center", margin: "0 0 16px 0" }}>Agenda Local</h2>
                <div style={{ display: "flex", gap: 14, overflowX: "auto", scrollbarWidth: "none", paddingBottom: 16, paddingRight: 20 }}>
                  {upcomingEvents.map(ev => {
                    const posterUrl = getThumbUrl(ev.img_url || cityImg, 600, 800);
                    return (
                      <div key={ev.id} className="press" onClick={() => { setSelectedEvent(ev); navigate("events"); }} style={{ width: 150, height: 210, borderRadius: 18, background: `url(${posterUrl}) center/cover`, border: `1px solid ${T.border}`, cursor: "pointer", flexShrink: 0, boxShadow: "0 8px 20px rgba(0,0,0,0.15)", position: "relative", overflow: "hidden" }}>
                        {ev.date && (() => {
                          const d = new Date(ev.date + "T12:00:00");
                          const m = d.toLocaleString('es-MX', { month: 'short' }).replace('.', '');
                          return (
                            <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", padding: "6px 10px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.2)", display: "flex", flexDirection: "column", alignItems: "center", lineHeight: 1 }}>
                              <span style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 2 }}>{d.getDate()}</span>
                              <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.8)", textTransform: "uppercase" }}>{m}</span>
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── BENTO CATEGORIES ── */}
          {!search && activeCat === "explorar" && dbReady && cats?.length > 0 && (
             <BentoCategories 
               categories={cats} 
               onSelectCategory={catId => { 
                 haptic("light");
                 setActiveCat(catId);
                 window.scrollTo({ top: 0, behavior: "smooth" });
                 const catSlug = (catId || "").replace(/\s+/g, '-').toLowerCase();
                 window.history.pushState(null, "", `/${activeCity || ""}/${catSlug}`);
               }} 
             />
          )}

          {!search && activeCat === "explorar" && <div id="explorar-section">
            {(() => {
              const openBiz = openBizMemo;
              if (openBiz.length === 0) return null;
              return <div style={{ padding: "24px 0 0px" }}>
                <div style={{ padding: "0 20px", display: "flex", justifyContent: "center", alignItems: "center", marginBottom: 16 }}>
                  <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 22, color: T.text, letterSpacing: 0.5, textAlign: "center", margin: 0 }}>Abiertos ahora mismo</h2>
                </div>
                <DuoAutoSlider openBiz={openBiz} userCoords={userCoords} getKm={getKm} cityImg={cityImg} setSelected={setSelected} navigate={navigate} trackEvent={trackEvent} T={T} FONT_BIZ={FONT_BIZ} />
              </div>;
            })()}

            {(() => {
              const { listTitle, timeList, sportsList, showActiva } = timeBasedListsMemo;
              if (timeList.length === 0) return null;
              return (
                <>
                  <SquareCarousel title={listTitle} list={timeList} handleCardTap={handleCardTap} getThumbUrl={getThumbUrl} CAT_EMOJI={CAT_EMOJI} T={T} FONT_BIZ={FONT_BIZ} />
                  {showActiva && <SquareCarousel title="Activa tu día" list={sportsList} handleCardTap={handleCardTap} getThumbUrl={getThumbUrl} CAT_EMOJI={CAT_EMOJI} T={T} FONT_BIZ={FONT_BIZ} />}
                </>
              );
            })()}


          </div>}

          {/* ── FAVORITOS DE LA CIUDAD ── */}
          {!search && activeCat === "explorar" && (() => {
              const topFavs = topFavsMemo;
              if (topFavs.length === 0) return null;
              
              const visibleFavs = topFavs.slice(0, showMoreTopFavs ? 10 : 5);

              return <div style={{ margin: "24px 20px" }}>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 22, color: T.text, letterSpacing: 0.5, textAlign: "center", margin: 0 }}>🤍 Favoritos de la ciudad 🤍</h2>
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
                  <h2 style={{ fontFamily: "'Coolvetica', sans-serif", fontSize: 22, color: T.text, letterSpacing: 0.5, textAlign: "center", margin: 0 }}>⭐ Mejor Calificados ⭐</h2>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 6 }}>
              {!dbReady ? <Sk w="40%" h={22} r={6} dark={dark} /> : <h1 style={{ fontFamily: "'Coolvetica', sans-serif", letterSpacing: 0.5, fontSize: 26, color: T.text, margin: 0, padding: 0 }}>{cats.find(c => c.id === activeCat)?.label || activeCat} en {(city || "").split(',')[0]}</h1>}
              {!dbReady ? <Sk w={60} h={14} r={5} dark={dark} /> : <span style={{ fontSize: 13, color: T.sub, fontWeight: 700, paddingBottom: 4 }}>{displayList.length} lugares</span>}
            </div>
            {!dbReady ? null : <h2 style={{ fontSize: 13, color: T.sub, fontWeight: 500, margin: "0 0 16px 0", lineHeight: 1.4, textAlign: "left" }}>{getCategoryDescription(activeCat, cats.find(c => c.id === activeCat)?.label, city)}</h2>}
            <div style={{ flexDirection: "column", gap: 14 }}>
              {!dbReady && [1, 2, 3].map(i => <CardSk key={i} dark={dark} />)}
              {dbReady && displayList.length > 0 && <Virtuoso
                useWindowScroll
                data={displayList}
                endReached={() => { if (hasMore && !loadingMore) loadPaginatedBiz(false); }}
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
              />}
              {dbReady && displayList.length === 0 && <div style={{ textAlign: "center", padding: "32px 0", color: T.sub }}><Icon name="search" size={36} color={T.border} /><p style={{ fontWeight: 700, color: T.text, marginTop: 14, marginBottom: 6 }}>Sin negocios en esta categoría</p><p style={{ fontSize: 14 }}>Prueba otra categoría</p></div>}
              {loadingMore && [1, 2].map(i => <CardSk key={`more-${i}`} dark={dark} />)}
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

          {/* Bottom Spacing */}
          <div style={{ height: 20 }} />
        </div>
  );
}

