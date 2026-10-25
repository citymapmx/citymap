import SlidingCategoryTrack from '../components/ui/SlidingCategoryTrack.jsx';
import {useLocation, useNavigate} from 'react-router-dom';
import SearchRecoveryLinks from '../components/home/SearchRecoveryLinks.jsx';
import {eventMatchesQuery} from '../lib/eventSearch.js';
import SearchSuggestions from '../components/home/SearchSuggestions.jsx';
import React from "react";
import { m } from "framer-motion";
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useTranslation } from "../hooks/useTranslation.js";
import { useShallow } from 'zustand/react/shallow';
import { getThumbUrl, getCategoryDescription, haptic, getScheduleStatus, isOpenNow, getMinutesToClose, isNear, METRO_ZONES } from "../lib/utils";
import Icon from "../components/ui/Icon.jsx";
import Footer from "../components/Footer.jsx";
import { PageLogo } from "../components/Brand.jsx";
import { Sk, CardSk, DuoSk, EventSk } from "../components/ui/Skeleton.jsx";
import FeaturedCard from "../components/cards/FeaturedCard.jsx";
import DestacadoCard from "../components/cards/DestacadoCard.jsx";
import CompactCard from "../components/cards/CompactCard.jsx";
import OptimizedImage from "../components/ui/OptimizedImage.jsx";
import { Virtuoso } from "react-virtuoso";
import { Helmet } from "react-helmet-async";
import CouponCard from "../components/ui/CouponCard.jsx";
import HomeEvents from "../components/home/HomeEvents.jsx";
import SurpriseModal from "../components/SurpriseModal.jsx";
import HomeTopGrids from "../components/home/HomeTopGrids.jsx";
import BusinessListTransition from "../components/ui/BusinessListTransition.jsx";
import HomeHero from "../components/home/HomeHero.jsx";

// Seed determinista que rota cada 6 horas (0-5, 6-11, 12-17, 18-23)
const CURRENT_SEED = (() => {
  const d = new Date();
  const period = Math.floor(d.getHours() / 6);
  return d.getFullYear() * 100000 + (d.getMonth() + 1) * 1000 + d.getDate() * 10 + period;
})();

// Seeded pseudo-random: deterministic per (id, seed) pair so order is stable
function seededRand(id, seed) {
  let h = seed ^ 0xdeadbeef;
  const s = String(id || "");
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 0x9e3779b9);
    h ^= h >>> 16;
  }
  return (h >>> 0) / 0xffffffff;
}

// Caché de spotlight a nivel de módulo: persiste entre re-mounts y múltiples
// actualizaciones de mapPins. Clave: "SPOTLIGHT_PERIOD:city_slug" → biz.id
const SPOTLIGHT_CACHE = {};

// Contador absoluto de bloques de 6 h (hora local). Cambia 4 veces al día y
// nunca se repite, así sirve como índice de rotación (round-robin).
const SPOTLIGHT_PERIOD = (() => {
  const d = new Date();
  const localDays = Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000);
  return localDays * 4 + Math.floor(d.getHours() / 6);
})();

// Hash numérico estable de un texto (FNV-1a), para ordenar distinto en cada ciudad
function hashString(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Misma fuente de imagen que usa la tarjeta de "Recomendación del día"
const hasSpotlightPhoto = (biz) => !!((biz.photos && biz.photos[0]?.url) || biz.img1 || biz.img2 || biz.img3 || biz.img_url);

import DebouncedSearchBar from "../components/home/DebouncedSearchBar.jsx";

import TopImperdibles from "../components/home/TopImperdibles.jsx";
import SquareCarousel from "../components/home/SquareCarousel.jsx";
import AiNightPlanner from "../components/AiNightPlanner.jsx";
import BannerSlider from "../components/home/BannerSlider.jsx";
import { getDailyScore, getKm, createSlug, cleanCityPrefix, CAT_EMOJI } from '../lib/utils.js';
import { FONT_BIZ } from '../lib/constants.js';
import useTimeStore from '../store/useTimeStore.js';
import CityEmptyState from '../components/CityEmptyState.jsx';

// Removed FloatingParticles

const placeholders = [
  "Buscar 'Restaurantes'...",
  "Buscar 'Cafeterías'...",
  "Buscar 'Bares'...",
  "Buscar 'Antros'...",
  "Buscar 'Tacos'...",
  "Buscar 'Mariscos'...",
  "Buscar 'Hamburguesas'...",
  "Buscar 'Sushi'...",
  "Buscar 'Postres'...",
  "Buscar 'Pizzas'..."
];

export default function HomeView({ isBackground }) {
  const ctx = useAppContext();
  
  const dark = useUIStore(s => s.dark);
  const activeCity = useUIStore(s => s.activeCity);
  const showCityPicker = useUIStore(s => s.showCityPicker);
  const setShowCityPicker = useUIStore(s => s.setShowCityPicker);
  const toast$ = useUIStore(s => s.toast$);

  const dbReady = useDataStore(s => s.dbReady);
  const cats = useDataStore(s => s.cats);
  const banners = useDataStore(s => s.banners);
  const globalFavCounts = useDataStore(s => s.globalFavCounts);
  const coupons = useDataStore(s => s.coupons);
  const events = useDataStore(s => s.events);
  const raffles = useDataStore(s => s.raffles);
  const cities = useDataStore(s => s.cities);
  const experiences = useDataStore(s => s.experiences);
  const mapPins = useDataStore(s => s.mapPins);
  const pinsLoading = useDataStore(s => s.initialBizCount === null);

  const user = useAuthStore(s => s.user);
  const setShowAuth = useAuthStore(s => s.setShowAuth);

  const now = useTimeStore(s => s.now);
  
  const { t, lang } = useTranslation();

  const placeholdersKeys = React.useMemo(() => [
    "buscar_restaurantes", "buscar_cafeterias", "buscar_bares", "buscar_antros", 
    "buscar_tacos", "buscar_mariscos", "buscar_hamburguesas", "buscar_sushi", 
    "buscar_postres", "buscar_pizza"
  ], []);

  const localizedPlaceholders = React.useMemo(() => {
    return placeholdersKeys.map(k => t(k));
  }, [t, placeholdersKeys]);

  const getCategoryDesc = React.useCallback((catId, catLabel, cityLabel) => {
    const desc = getCategoryDescription(catId, catLabel, cityLabel);
    if (lang === 'en') {
      const cityClean = (cityLabel || "your city").split(',')[0];
      const id = catId.toLowerCase();
      if (id === 'salud') return `Find the best medical care in ${cityClean}. Trusted specialists, clinics, and hospitals with verified services and hours.`;
      if (id === 'educacion') return `Boost your future at the best schools and academies in ${cityClean}. Find the ideal institution for your development and learning.`;
      if (id === 'restaurantes') return `Delight in the best restaurants in ${cityClean}. Find everything from local gems to fine dining with menus, hours, and reviews.`;
      if (id === 'cafe') return `Discover the best coffee shops and bakeries in ${cityClean}. Ideal spots to work, read, or enjoy a good cup of coffee.`;
      if (id === 'belleza') return `Pamper yourself at the top salons, spas, and barbershops in ${cityClean}. Verified services, prices, and reviews for your personal care.`;
      if (id === 'fitness') return `Stay active at the best gyms, yoga studios, and sports centers in ${cityClean}. Choose the discipline that fits your lifestyle.`;
      if (id === 'compras') return `Explore the best local stores and boutiques in ${cityClean}. Support local businesses and discover unique products.`;
      if (id === 'tech') return `Solve your digital needs with local tech services in ${cityClean}. Repair shops, software, and accessories with verified quality.`;
      if (id === 'ocio') return `Find the best entertainment in ${cityClean}. Cinemas, parks, and recreational activities for the whole family.`;
      if (id === 'hoteles') return `Find the best hotels and hostels in ${cityClean}. Verified lodging options for a comfortable and safe stay.`;
      if (id === 'antros-y-bares') return `Enjoy the nightlife in ${cityClean}. Bars, clubs, and pubs with the best atmosphere, drinks, and music.`;
      if (id === 'servicios') return `Find trusted professional services in ${cityClean}. Plumbers, mechanics, and legal consultants near you.`;
      if (id === 'mascotas') return `Keep your best friend happy with the top vets, groomers, and pet stores in ${cityClean}.`;
      return `Discover the best places and experiences in ${cityClean}.`;
    }
    return desc;
  }, [lang]);

  const articleNavigate = useNavigate();
  const [showAiPlanner, setShowAiPlanner] = React.useState(false);
  const [showSurprise, setShowSurprise] = React.useState(false);
  const [phIdx, setPhIdx] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPhIdx(prev => (prev + 1) % placeholdersKeys.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [placeholdersKeys.length]);

  
  const { businessListReady = true, businessListError = false, viewStyle, cityImg, locating, detectCity, city, isAdmin, setShowAdmin, search, setSearch, setShowAddBiz, activeCat, setActiveCat, T, displayList, userCoords, favIds, toggleFav, setSelected, navigate, trackEvent, goWhatsApp, goDir, doShare, handleCardTap, handleEventTap, loadPaginatedBiz, hasMore, loadingMore, nearbyRadius, setNearbyRadius, nearbyFilter, setNearbyFilter, requestLocation, allNearby, topFavsMemo, showMoreTopFavs, setShowMoreTopFavs, topRatedMemo, showMoreTopRated, setShowMoreTopRated, newBizMemo, biz, AutoSlider, detectedTown, detectedState, setSelectedEvent } = ctx;

  const recoveryLocation = useLocation();
  const [ratedRecoveryStatus, setRatedRecoveryStatus] = React.useState(null);
  const loadHomeHighlights = useDataStore(state => state.loadHomeHighlights);
  const isRatedRecovery = recoveryLocation.hash === '#mejor-calificados';
  React.useEffect(() => {
    if (!isRatedRecovery || search || activeCat !== 'explorar' || !dbReady || pinsLoading) return;
    let cancelled = false;
    setRatedRecoveryStatus('loading');
    loadHomeHighlights(activeCity).then(() => {
      if (!cancelled) setRatedRecoveryStatus(useDataStore.getState().highlightsCity === activeCity ? 'ready' : 'error');
    }).catch(() => { if (!cancelled) setRatedRecoveryStatus('error'); });
    return () => { cancelled = true; };
  }, [isRatedRecovery, search, activeCat, dbReady, pinsLoading, activeCity, loadHomeHighlights]);
  React.useEffect(() => {
    if (!isRatedRecovery || !ratedRecoveryStatus || ratedRecoveryStatus === 'loading' || search || activeCat !== 'explorar') return;
    const frame = requestAnimationFrame(() => document.getElementById('mejor-calificados')?.scrollIntoView({behavior:'smooth',block:'start'}));
    return () => cancelAnimationFrame(frame);
  }, [isRatedRecovery, ratedRecoveryStatus, search, activeCat, activeCity]);

  const [selectedSubcat, setSelectedSubcat] = React.useState("todas");
  const [showAllSearchResults, setShowAllSearchResults] = React.useState(false);
  React.useEffect(() => { setShowAllSearchResults(false); }, [search, activeCity, activeCat]);

  React.useEffect(() => {
    setSelectedSubcat("todas");
  }, [activeCat]);

  const availableSubcats = React.useMemo(() => {
    if (!activeCat || activeCat === "explorar" || !biz) return [];
    const subcatMap = new Map();
    
    biz.forEach(b => {
      const candidates = [];
      if (b.subcategory) {
        candidates.push(...String(b.subcategory).split(/[,/•|]/));
      } else if (b.type) {
        candidates.push(...String(b.type).split(/[,/•|]/));
      }
      
      candidates.forEach(raw => {
        const item = raw.trim();
        if (item && item.length > 1) {
          const key = item.toLowerCase();
          if (!subcatMap.has(key)) {
            const formatted = item.charAt(0).toUpperCase() + item.slice(1);
            subcatMap.set(key, formatted);
          }
        }
      });
    });

    return Array.from(subcatMap.values()).sort((a, b) => a.localeCompare(b));
  }, [biz, activeCat]);

  const finalDisplayList = React.useMemo(() => {
    if (!selectedSubcat || selectedSubcat === "todas") return displayList;
    const target = selectedSubcat.toLowerCase().trim();
    return displayList.filter(b => {
      const sub = (b.subcategory || "").toLowerCase();
      const typ = (b.type || "").toLowerCase();
      const tags = Array.isArray(b.tags) ? b.tags.join(" ").toLowerCase() : (b.tags || "").toLowerCase();
      return sub.includes(target) || typ.includes(target) || tags.includes(target);
    });
  }, [biz, displayList, selectedSubcat]);

  const isOpen = React.useCallback((b) => isOpenNow(b, city?.timezone || "America/Mexico_City"), [city?.timezone]);


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
        if (!isNear(b, userCoords, activeCity)) return false;
        const isNight = ["bar", "antros", "club", "cerveceria"].includes(b.category) || 
                        (b.tags && Array.isArray(b.tags) && b.tags.some(t => typeof t === 'string' && t.toLowerCase() === 'cenas'));
        if (!isNight && b.category !== "restaurante") return false;
        return getMinutesToClose(b) > 0;
      });
    } else if (h >= 12 && h < 17) {
      listTitle = "Hora de comer";
      timeList = mapPins.filter(b => {
        if (!isNear(b, userCoords, activeCity)) return false;
        const isFood = ["restaurantes", "restaurante", "comida rapida", "mariscos", "tacos", "pizzeria"].includes(b.category) || 
                       (b.tags && Array.isArray(b.tags) && b.tags.some(t => typeof t === 'string' && t.toLowerCase() === 'comidas'));
        if (!isFood) return false;
        return getMinutesToClose(b) > 0;
      });
    } else {
      listTitle = "Para iniciar el día";
      timeList = mapPins.filter(b => {
        if (!isNear(b, userCoords, activeCity)) return false;
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

    // Sort by plan tier first, then stable daily seed within same tier — no flicker on GPS load
    timeList = timeList.sort((a, b) => {
      const planDiff = (b.plan || 0) - (a.plan || 0);
      if (planDiff !== 0) return planDiff;
      return seededRand(a.id, CURRENT_SEED) - seededRand(b.id, CURRENT_SEED);
    }).slice(0, 8);

    const sportsList = mapPins.filter(b => isNear(b, userCoords, activeCity) && (b.category === "fitness" || b.category === "unidad deportiva")).sort((a, b) => {
      const planDiff = (b.plan || 0) - (a.plan || 0);
      if (planDiff !== 0) return planDiff;
      return seededRand(a.id, CURRENT_SEED) - seededRand(b.id, CURRENT_SEED);
    }).slice(0, 8);

    const showActiva = h >= 6 && h < 18;

    return { listTitle, timeList, sportsList, showActiva };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapPins, activeCity]);

  const spotlightBiz = React.useMemo(() => {
    if (!mapPins || mapPins.length === 0) return null;

    const cacheKey = `${SPOTLIGHT_PERIOD}:${activeCity}`;

    // Si ya elegimos uno para este periodo+ciudad y sigue disponible → mantenerlo estable
    const cachedId = SPOTLIGHT_CACHE[cacheKey];
    if (cachedId) {
      const found = mapPins.find(b => b.id === cachedId);
      if (found) return found;
    }

    // 1) Elegibles: cualquier plan (gratuito, destacado, premium), solo publicados
    //    (status "approved" excluye pendientes, rechazados, suspendidos y eliminados),
    //    sin los "Solo Menú" privados y únicamente de la ciudad consultada
    //    (o su zona metropolitana). Se excluyen los negocios globales (city_slug "all").
    const allowedCities = METRO_ZONES[activeCity] || [activeCity];
    const eligible = mapPins.filter(b =>
      b && b.id &&
      b.status === "approved" &&
      b.plan !== "menu" &&
      typeof b.city_slug === "string" &&
      b.city_slug.split(",").some(c => allowedCities.includes(c.trim()))
    );
    if (eligible.length === 0) return null;

    // 2) Preferimos negocios con foto para conservar el diseño de la tarjeta;
    //    si en la ciudad ninguno tiene, se usan todos.
    const withPhoto = eligible.filter(hasSpotlightPhoto);
    const pool = withPhoto.length > 0 ? withPhoto : eligible;

    // 3) Rotación justa (round-robin): orden aleatorio pero fijo por ciudad, y cada
    //    periodo de 6 h avanza una posición. Todos los negocios salen una vez antes
    //    de que alguno se repita, y nunca sale el mismo dos periodos seguidos.
    const citySeed = hashString(activeCity);
    const order = [...pool].sort((a, b) =>
      (seededRand(a.id, citySeed) - seededRand(b.id, citySeed)) || String(a.id).localeCompare(String(b.id))
    );
    const pick = order[SPOTLIGHT_PERIOD % order.length];

    if (pick) SPOTLIGHT_CACHE[cacheKey] = pick.id;
    return pick || null;
  }, [mapPins, activeCity]);

  const activeBannersMemo = React.useMemo(() => {
    const today = now.toISOString().split("T")[0];
    const todayMD = today.slice(5);
    return banners.filter(bn => {
      if (!bn) return false;
      if (!bn.active) return false;
      if (!isNear(bn, userCoords, activeCity)) return false;
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
  }, [banners, activeCity, now, userCoords]);

  let currentTitle = "CityMap - Tu Guía Local Inteligente";
  let currentDesc = "Descubre los mejores lugares en tu ciudad con CityMap.";
  if (activeCat && activeCat !== "todas" && activeCat !== "explorar") {
    const catLabel = cats.find(c => c.id === activeCat)?.label || activeCat;
    const cityName = (city || activeCity || "tu ciudad").split(",")[0];
    currentTitle = `Los mejores ${catLabel} en ${cityName} - CityMap`;
    currentDesc = getCategoryDescription(activeCat, catLabel, cityName);
  }

  const canonicalUrl = `https://citymap.mx/${activeCity}`;
  // Track already-shown IDs so 🎲 never repeats until the full pool is exhausted
  const surpriseSeenRef = React.useRef(new Set());

  const handleExperienceTap = (exp) => {
    articleNavigate(`/revista/${activeCity}/${createSlug(exp.title)}`, { state: { articleOrigin: true } });
  };

  return (
    <div data-city-home={activeCity} style={{ paddingBottom: 84, position: "relative", ...viewStyle }}>
          {/* ── HERO HEADER ── */}
          <HomeHero dark={dark} T={T} t={t} search={search} setSearch={setSearch} localizedPlaceholders={localizedPlaceholders} phIdx={phIdx} locating={locating} detectCity={detectCity} userCoords={userCoords} dbReady={dbReady} cats={cats} activeCat={activeCat} setActiveCat={setActiveCat} activeCity={activeCity} city={city} cities={cities} haptic={haptic} detectedTown={detectedTown} onSurprise={() => { haptic("light"); setShowSurprise(true); }} navigate={navigate} />
          

          {/* ── EMPTY CITY STATE ── */}
          {!search && dbReady && !pinsLoading && mapPins.filter(b => isNear(b, userCoords, activeCity)).length === 0 && (
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
              if (ev.status !== 'approved' || !isNear(ev, userCoords, activeCity)) return false;
              return eventMatchesQuery(search, ev);
            });
            const isEventQuery = qWords.some(w => w === "evento" || w === "eventos");
            
            const EventosBlock = () => matchingEvents.length > 0 ? (
              <div style={{ marginBottom: 10, marginTop: isEventQuery ? 0 : 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: T.text, margin: "0 0 10px 0" }}>Eventos ({matchingEvents.length})</h3>
                <div style={{ display: "flex", overflowX: "auto", gap: 12, paddingBottom: 10, margin: "0 -20px", padding: "0 20px", scrollbarWidth: "none" }}>
                  {matchingEvents.map(ev => {
                    const posterUrl = ev.img_url || ev.img || ev.poster_url;
                    return (
                      <button type="button" aria-label={`Ver evento: ${ev.title}`} key={ev.id} className="press" onClick={() => { handleEventTap(ev); }} style={{ width: 140, height: 180, padding: 0, textAlign: "left", fontFamily: "inherit", borderRadius: 14, background: `transparent url('${getThumbUrl(posterUrl, 400, 500)}') center/cover`, border: `1px solid ${T.border}`, cursor: "pointer", flexShrink: 0, boxShadow: T.shadow, position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent, rgba(0,0,0,0.85))", padding: "20px 10px 10px", color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>
                          {ev.title}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null;

            return (
              <div style={{ padding: "16px 20px 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <span style={{ fontFamily: "var(--heading)", fontWeight: 900, letterSpacing: "-0.5px", fontSize: 20, color: T.text }}>"{search}"</span>
                  <span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>{displayList.length + matchingEvents.length} {displayList.length + matchingEvents.length === 1 ? t("resultado", "resultado") : t("resultados", "resultados")}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {(!dbReady || (!businessListReady && !businessListError)) && [1, 2].map(i => <CardSk key={i} dark={dark} />)}
                  
                  {isEventQuery && <EventosBlock />}

                  {dbReady && businessListReady && displayList.length > 0 && !showAllSearchResults && <SearchSuggestions results={displayList} cats={cats} userCoords={userCoords} T={T} onSelect={handleCardTap} onViewAll={() => setShowAllSearchResults(true)} />}
                  {dbReady && businessListReady && showAllSearchResults && displayList.length > 0 && displayList.map((b, index) => {
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
                  {dbReady && businessListReady && showAllSearchResults && hasMore && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0' }}>
                      <button
                        onClick={() => loadPaginatedBiz(false)}
                        disabled={loadingMore}
                        style={{ padding: '10px 28px', borderRadius: 20, border: `1px solid ${T.border}`, background: 'none', color: T.text, fontWeight: 700, fontSize: 14, cursor: loadingMore ? 'default' : 'pointer', opacity: loadingMore ? 0.5 : 1 }}
                      >{loadingMore ? t("cargando", "Cargando...") : t("ver_mas", "Ver más")}</button>
                    </div>
                  )}
                  
                  {dbReady && !isEventQuery && matchingEvents.length > 0 && <EventosBlock />}
                  
                  {dbReady && businessListReady && displayList.length === 0 && matchingEvents.length === 0 && (() => {


                    return (
                      <div style={{ padding: "10px 0 30px" }}>
                        <div style={{ fontSize: 15, color: T.sub, marginBottom: 20, textAlign: "center", padding: "0 10px", lineHeight: 1.4 }}>
                          No encontramos resultados para <strong style={{ color: T.text }}>"{search}"</strong>. <br/>Explora la ciudad:
                        </div>
                        
                        <SearchRecoveryLinks activeCity={activeCity} cities={cities} T={T} dark={dark} onSelect={category => { setSearch(''); setActiveCat(category); }} />

                        <div style={{ textAlign: "center", padding: "20px", background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)", borderRadius: 20, border: `1px dashed ${T.border}` }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 6 }}>¿Conoces este lugar?</div>
                          <div style={{ fontSize: 13, color: T.sub, marginBottom: 16, opacity: 0.8 }}>Ayúdanos a agregarlo al mapa de la ciudad.</div>
                          <button 
                            className="press" 
                            onClick={() => { 
                               if (!user) { 
                                 setShowAuth(true); 
                               } else { 
                                 setShowAddBiz(true); 
                               }
                            }} 
                            style={{ background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 20, padding: "12px 24px", fontSize: 14, fontWeight: 800, cursor: "pointer", boxShadow: "0 4px 12px rgba(14, 165, 233, 0.3)", display: "inline-block", fontFamily: "inherit" }}
                          >
                            + Sugerir Lugar
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}


          
          {/* ── BANNERS ── */}
          {!search && activeCat === "explorar" && (() => {
            if (activeBannersMemo.length === 0) return null;
            return <div style={{ margin: "6px 20px 8px", borderRadius: 14, overflow: "hidden", aspectRatio: "21/9", position: "relative", background: "transparent" }}>
              <BannerSlider activeBanners={activeBannersMemo} />
            </div>;
          })()}

          {/* ── EVENTOS ── */}
          {!search && activeCat === "explorar" && <HomeEvents events={events} activeCity={activeCity} userCoords={userCoords} dbReady={dbReady} dark={dark} t={t} cityImg={cityImg} handleEventTap={handleEventTap} T={T} city={city} />}

          {/* ── LUGAR DEL DÍA (Recomendación) ── */}
          {!search && activeCat === "explorar" && spotlightBiz && (
            <div style={{ padding: "16px 20px 0 20px" }}>
              <div 
                className="press"
                onClick={() => handleCardTap(spotlightBiz)}
                style={{ 
                  position: "relative",
                  width: "100%",
                  height: 240,
                  borderRadius: 20, 
                  background: T.bg, 
                  overflow: "hidden", 
                  cursor: "pointer", 
                  boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
                }}
              >
                {(() => {
                  const src = (spotlightBiz.photos && spotlightBiz.photos[0]?.url) || spotlightBiz.img1 || spotlightBiz.img2 || spotlightBiz.img3 || spotlightBiz.img_url || cityImg;
                  if (src) {
                    return (
                      <OptimizedImage 
                        src={src} 
                        alt={spotlightBiz.name}
                        widthRequest={800} heightRequest={600}
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    );
                  }
                  return <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="image" size={48} color="#94A3B8" /></div>;
                })()}

                {/* Gradient Overlay for Text Readability */}
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 100%)" }} />

                {/* Top Badge */}
                <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(255,255,255,0.25)", backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)", padding: "4px 10px", borderRadius: 8, display: "flex", alignItems: "center", gap: 6, boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
                   <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", textTransform: "uppercase", letterSpacing: "0.5px" }}>✨ Recomendación del día</span>
                </div>

                {/* Bottom Text Content */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "30px 16px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
                    <h3 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: "#fff", lineHeight: 1.1, textShadow: "0 2px 8px rgba(0,0,0,0.5)", letterSpacing: "-0.5px", textAlign: "left" }}>
                      {spotlightBiz.name}
                    </h3>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginTop: 2 }}>
                      {spotlightBiz.category ? (
                        <span style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: 600, textTransform: "capitalize", textShadow: "0 1px 4px rgba(0,0,0,0.4)", textAlign: "left" }}>
                          {spotlightBiz.category}
                        </span>
                      ) : <span />}
                      
                      {spotlightBiz.rating > 0 && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                          <span style={{ fontSize: 13, color: "#fff", fontWeight: 800 }}>{spotlightBiz.rating}</span>
                          <span style={{ fontSize: 11 }}>⭐</span>
                        </div>
                      )}
                    </div>
                </div>
              </div>
            </div>
          )}

          {/* ── EXPLORAR SECTION ── */}
          {!search && activeCat === "explorar" && <div id="explorar-section">
            {(() => {
              const { listTitle, timeList } = timeBasedListsMemo;
              if (timeList.length === 0) return null;
              return (
                <SquareCarousel title={listTitle} list={timeList} handleCardTap={handleCardTap} getThumbUrl={getThumbUrl} CAT_EMOJI={CAT_EMOJI} T={T} FONT_BIZ={FONT_BIZ} />
              );
            })()}

            <TopImperdibles experiences={experiences} T={T} FONT_BIZ={FONT_BIZ} city={city} />

          </div>}

          {/* ── FAVORITOS DE LA CIUDAD ── */}
          {!search && activeCat === "explorar" && <HomeTopGrids ratedStatus={isRatedRecovery ? ratedRecoveryStatus : null} topFavs={topFavsMemo} showMoreTopFavs={showMoreTopFavs} setShowMoreTopFavs={setShowMoreTopFavs} topRated={topRatedMemo} showMoreTopRated={showMoreTopRated} setShowMoreTopRated={setShowMoreTopRated} userCoords={userCoords} getKm={getKm} dark={dark} T={T} favIds={favIds} toggleFav={toggleFav} handleCardTap={handleCardTap} globalFavCounts={globalFavCounts} t={t} />}




          {/* ── TODOS LOS NEGOCIOS POR CATEGORÍA ── */}
          {!search && activeCat !== "explorar" && <div id="all-biz-section" style={{ padding: "6px 20px 0" }}>
            <div style={{ textAlign: "center", marginBottom: availableSubcats.length > 0 ? 12 : 16 }}>
              {!dbReady ? <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><Sk w="60%" h={26} r={6} dark={dark} /></div> : <h1 style={{ fontFamily: "var(--heading)", fontWeight: 900, letterSpacing: "-0.5px", fontSize: 26, color: T.text, margin: "0 0 6px 0", padding: 0, textAlign: "center" }}>{t(cats.find(c => c.id === activeCat)?.label || activeCat)} {lang === 'en' ? 'in' : 'en'} {(city || "").split(',')[0]}</h1>}
              {!dbReady ? <div style={{ display: "flex", justifyContent: "center" }}><Sk w="80%" h={14} r={4} dark={dark} /></div> : <h2 style={{ fontSize: 13, color: T.sub, fontWeight: 500, margin: 0, lineHeight: 1.4, textAlign: "center" }}>{getCategoryDescription(activeCat, cats.find(c => c.id === activeCat)?.label, city)}</h2>}
            </div>

            {/* ── BARRA DE SUBCATEGORÍAS ── */}
            {dbReady && businessListReady && availableSubcats.length > 0 && (
              <SlidingCategoryTrack dark={dark} selectedKey={selectedSubcat}  
                style={{
                  display: "flex",
                  gap: 6,
                  overflowX: "auto",
                  paddingBottom: 14,
                  scrollbarWidth: "none",
                  msOverflowStyle: "none",
                  WebkitOverflowScrolling: "touch",
                  justifyContent: availableSubcats.length <= 3 ? "center" : "flex-start",
                }}
                className="no-scrollbar"
              >
                <button
                  className="press"
                  aria-pressed={selectedSubcat === "todas"}
                  onClick={() => setSelectedSubcat("todas")}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    border: selectedSubcat === "todas" ? "none" : `1px solid ${dark ? "rgba(255,255,255,0.12)" : "#ECEFF2"}`,
                    background: selectedSubcat === "todas" 
                      ? (dark ? "#fff" : "#0F1A14") 
                      : (dark ? "rgba(255,255,255,0.06)" : "#F8FAFC"),
                    color: selectedSubcat === "todas" 
                      ? (dark ? "#0F1A14" : "#fff") 
                      : (dark ? "#9CA3AF" : "#4B5563"),
                    cursor: "pointer",
                    boxShadow: "none",
                    flexShrink: 0,
                    transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                  }}
                >
                  Todos
                </button>
                {availableSubcats.map(sub => {
                  const isSelected = selectedSubcat.toLowerCase() === sub.toLowerCase();
                  return (
                    <button
                      key={sub}
                      className="press"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedSubcat(isSelected ? "todas" : sub)}
                      style={{
                        padding: "5px 12px",
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 700,
                        whiteSpace: "nowrap",
                        border: isSelected ? "none" : `1px solid ${dark ? "rgba(255,255,255,0.12)" : "#ECEFF2"}`,
                        background: isSelected 
                          ? (dark ? "#fff" : "#0F1A14") 
                          : (dark ? "rgba(255,255,255,0.06)" : "#F8FAFC"),
                        color: isSelected 
                          ? (dark ? "#0F1A14" : "#fff") 
                          : (dark ? "#9CA3AF" : "#4B5563"),
                        cursor: "pointer",
                        boxShadow: "none",
                        flexShrink: 0,
                        transition: "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
                      }}
                    >
                      {sub}
                    </button>
                  );
                })}
              </SlidingCategoryTrack>
            )}

            <div style={{ flexDirection: "column", gap: 14 }}>
              {(!dbReady || (!businessListReady && !businessListError)) && <div role="status" aria-label="Cargando negocios de esta categoría">{[1, 2, 3].map(i => <CardSk key={i} dark={dark} />)}</div>}
              {dbReady && businessListError && <div role="status" style={{ padding: 24, textAlign: "center", color: T.sub }}><p>No se pudieron cargar los negocios.</p><button type="button" onClick={() => loadPaginatedBiz()} disabled={loadingMore}>{loadingMore ? "Cargando…" : "Reintentar"}</button></div>}
              {dbReady && businessListReady && finalDisplayList.length > 0 && (
                <BusinessListTransition transitionKey={JSON.stringify([activeCity, activeCat, selectedSubcat])}>
                <Virtuoso
                  useWindowScroll
                  data={finalDisplayList}
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
                </BusinessListTransition>
              )}
              {dbReady && businessListReady && finalDisplayList.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 0", color: T.sub }}>
                  <Icon name="search" size={36} color={T.border} />
                  <p style={{ fontWeight: 700, color: T.text, marginTop: 14, marginBottom: 6 }}>
                    {selectedSubcat !== "todas" 
                      ? `Sin negocios en "${selectedSubcat}"` 
                      : t("sin_negocios_cat", "Sin negocios en esta categoría")}
                  </p>
                  {selectedSubcat !== "todas" ? (
                    <button 
                      onClick={() => setSelectedSubcat("todas")}
                      style={{ 
                        marginTop: 6, 
                        padding: "8px 16px", 
                        background: dark ? "rgba(255,255,255,0.1)" : "#E5E7EB", 
                        borderRadius: 12, 
                        border: "none", 
                        color: T.text, 
                        fontSize: 13, 
                        fontWeight: 700, 
                        cursor: "pointer" 
                      }}
                    >
                      Ver todas las opciones
                    </button>
                  ) : (
                    <p style={{ fontSize: 14 }}>{t("prueba_otra_cat", "Prueba otra categoría")}</p>
                  )}
                </div>
              )}
            </div>
          </div>}
          {!search && raffles && raffles.length > 0 && <div style={{ padding: "20px 20px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: T.text, display: "flex", alignItems: "center", gap: 6 }}><Icon name="gift" size={18} color="#D94F3D" /> {t("sorteos_semana", "Sorteos de la semana")}</span>
            </div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
              {raffles.map(r => {
                const b = biz.find(x => x.id === r.biz_id);
                return <div key={r.id} onClick={() => { setSelected(b); navigate("detail"); }} style={{ minWidth: 260, flexShrink: 0, background: "linear-gradient(135deg, #FFF9E6, #FFF0B3)", borderRadius: 16, padding: "16px", border: "1.5px solid #FDE047", cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: "#F59E0B", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}><Icon name="gift" size={20} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 900, fontSize: 14, color: "#92400E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</div>
                      <div style={{ fontSize: 11, color: "#B45309", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t("por", "Por")} {b?.name}</div>
                    </div>
                  </div>
                  <div style={{ background: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: 12, fontWeight: 900, color: "#D97706" }}>{t("premio", "Premio")}: {r.prize}</div>
                  </div>
                </div>;
              })}
            </div>
          </div>}
          {!search && coupons.length > 0 && <div style={{ padding: "20px 20px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{t("cupones_activos", "Cupones activos")}</span>
            </div>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 4 }}>
              {coupons.map(c => {
                const b = biz.find(x => x.id === c.biz_id); return <div key={c.id} style={{ minWidth: 280, flexShrink: 0 }}>
                  <CouponCard 
                    coupon={c} 
                    bizName={b?.name || "Oferta Especial"} 
                    dark={dark} 
                    T={T} 
                    onClick={() => { const cleanSlug = createSlug(b?.name || b?.id || ""); navigate(`/${b?.city_slug || activeCity}/${cleanSlug}`); }} 
                  />
                </div>;
              })}
            </div>
          </div>}


          {/* Footer */}
          <Footer />

          {/* Bottom Spacing */}
          <div style={{ height: 20 }} />

          {/* AI Night Planner FAB (Shows after 5 PM and before 4 AM) - OCULTO TEMPORALMENTE */}
          {/* eslint-disable-next-line no-constant-binary-expression */}
          {false && !search && (new Date().getHours() >= 17 || new Date().getHours() < 4) && (
            <div style={{ position: "fixed", bottom: 84, left: 0, right: 0, display: "flex", justifyContent: "center", pointerEvents: "none", zIndex: 90 }}>
              <button
                onClick={() => setShowAiPlanner(true)}
                className="press"
                style={{
                  pointerEvents: "auto",
                  padding: "14px 24px",
                  background: "linear-gradient(135deg, #7C3AED, #EC4899)",
                  border: "none",
                  borderRadius: 30,
                  color: "#fff",
                  fontSize: 15,
                  fontWeight: 800,
                  boxShadow: "0 8px 24px rgba(124,58,237,0.35)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer"
                }}
              >
                <span style={{ fontSize: 18 }}>✨</span> Planea tu noche
              </button>
            </div>
          )}

          <AiNightPlanner 
            open={showAiPlanner} 
            onClose={() => setShowAiPlanner(false)} 
            businesses={mapPins} 
            city={city} 
            isOpen={isOpen} 
            dark={dark} 
            T={T} 
            handleCardTap={handleCardTap} 
          />
          <SurpriseModal
            open={showSurprise}
            onClose={() => setShowSurprise(false)}
            mapPins={mapPins}
            events={events}
            experiences={experiences}
            activeCity={activeCity}
            userCoords={userCoords}
            isNear={isNear}
            dark={dark}
            T={T}
            handleCardTap={handleCardTap}
            handleEventTap={handleEventTap}
            handleExperienceTap={handleExperienceTap}
            city={city}
          />
        </div>
  );
}

