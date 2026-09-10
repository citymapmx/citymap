import React from "react";
import { useQuery } from "@tanstack/react-query";
import { sb } from "../lib/supabase.js";
import { getCityFilterEq } from "../lib/utils.js";
import ReactDOM from "react-dom";
import { m, AnimatePresence } from "framer-motion";
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useTranslation } from "../hooks/useTranslation.js";
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
import HomeEvents from "../components/home/HomeEvents.jsx";
import HomeTopGrids from "../components/home/HomeTopGrids.jsx";
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
// actualizaciones de mapPins. Clave: "CURRENT_SEED:city_slug" → biz.id
const SPOTLIGHT_CACHE = {};

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
  const { dbReady, cats, banners, globalFavCounts, coupons, events, raffles, cities, experiences, setMapPins } = useDataStore(useShallow(s => ({ dbReady: s.dbReady, cats: s.cats, banners: s.banners, globalFavCounts: s.globalFavCounts, coupons: s.coupons, events: s.events, raffles: s.raffles, cities: s.cities, experiences: s.experiences, setMapPins: s.setMapPins })));
  
  const { data: mapPins = [] } = useQuery({
    queryKey: ['home-businesses', activeCity],
    queryFn: async () => {
      const selectCols = "id,name,lat,lng,category,emoji,logo_url,photos,rating,review_count,schedule,plan,city_slug,status,address,created_at,slug,is_place,type,tagline,whatsapp,phone,facebook,instagram,social_links,hide_location,tags,badge,mercado_libre_url,mercado_libre_nickname,banner_url";
      const batch = await sb.get("businesses", `?select=${selectCols}&status=eq.approved&plan=neq.menu&${getCityFilterEq(activeCity)}&order=plan.desc,rating.desc.nullslast,id.desc&limit=50`);
      
      const processBatch = (arr) => arr ? arr.map(b => ({
        ...b,
        category: b.category?.toLowerCase(),
        rating: b.rating || 0,
        photos: typeof b.photos === 'string' ? JSON.parse(b.photos || '[]') : (b.photos || [])
      })) : [];
      
      const processed = processBatch(batch);
      setTimeout(() => setMapPins(processed), 0);
      return processed;
    },
    enabled: !!activeCity,
    staleTime: 5 * 60 * 1000
  });
  const { user, setShowAuth } = useAuthStore(useShallow(s => ({ user: s.user, setShowAuth: s.setShowAuth })));
  const now = useTimeStore(s => s.now);
  
  const { t, lang } = useTranslation();

  const placeholdersKeys = React.useMemo(() => [
    "buscar_placeholder", "buscar_sushi", "cafeterias_cerca", "antojo_mariscos",
    "bares_locales", "buscar_tacos", "lugares_cenar", "que_hacer", "buscar_pizza",
    "romanticos", "fin_de_semana", "buscar_hamburguesas", "desayunos", "pet_friendly",
    "healthy", "postres", "cena_amigos", "buffets", "donde_cafe", "buscar_cerveza",
    "típica", "leer_libro", "aire_libre", "comerciales", "cortes"
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

  const [viewingPlan, setViewingPlan] = React.useState(null);
  const [isViewing, setIsViewing] = React.useState(false);
  const [phIdx, setPhIdx] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setPhIdx(prev => (prev + 1) % placeholdersKeys.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [placeholdersKeys.length]);

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

    const cacheKey = `${CURRENT_SEED}:${activeCity}`;

    // Si ya teníamos uno guardado para hoy+ciudad y sigue en mapPins → devuélvelo sin recalcular
    const cachedId = SPOTLIGHT_CACHE[cacheKey];
    if (cachedId) {
      const found = mapPins.find(b => b.id === cachedId);
      if (found) return found;
      // Si no lo encontramos (mapPins parcial), esperamos a que llegue
      // devolvemos null en vez de recalcular con datos incompletos
      return null;
    }

    // Primera vez para hoy+ciudad: calculamos y guardamos en el caché de módulo
    const nearPins = mapPins.filter(b => isNear(b, null, activeCity));
    if (nearPins.length === 0) return null;
    
    // Le damos un "bonus" al plan destacado (+0.7) y al pro (+0.3)
    // De esta forma tienen mucha más probabilidad de aparecer, pero no monopolizan
    // la recomendación si hay pocos, permitiendo que otros negocios con buena "suerte" (semilla alta) aparezcan.
    const sorted = [...nearPins].sort((a, b) => {
      const getScore = (biz) => {
        let base = seededRand(biz.id, CURRENT_SEED);
        if (biz.plan === "destacado") base += 0.7;
        else if (biz.plan === "pro") base += 0.3;
        const hasPhoto = (biz.photos && biz.photos.length > 0) || biz.img1 || biz.img_url || biz.img2 || biz.img3;
        if (!hasPhoto) base -= 1.5;
        return base;
      };
      return getScore(b) - getScore(a);
    });
    
    if (sorted[0]) SPOTLIGHT_CACHE[cacheKey] = sorted[0].id;
    return sorted[0] || null;
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
          <HomeHero dark={dark} T={T} t={t} search={search} setSearch={setSearch} localizedPlaceholders={localizedPlaceholders} phIdx={phIdx} locating={locating} detectCity={detectCity} userCoords={userCoords} dbReady={dbReady} cats={cats} activeCat={activeCat} setActiveCat={setActiveCat} activeCity={activeCity} city={city} cities={cities} haptic={haptic} detectedTown={detectedTown} />
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
              if (!isNear(ev, userCoords, activeCity)) return false;
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
                  <span style={{ fontSize: 12, color: T.sub, fontWeight: 600 }}>{displayList.length + matchingEvents.length} {t("resultados", "resultados")}</span>
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
                      >{loadingMore ? t("cargando", "Cargando...") : t("ver_mas", "Ver más")}</button>
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
                      { label: t("vuelos_baratos", "Vuelos Baratos"), emoji: "✈️", url: "https://expedia.com/affiliate/G4ETQnX", match: isVuelos },
                      { label: t("hospedaje_ideal", "Hospedaje Ideal"), emoji: "🏨", url: "https://booking.stay22.com/citymapmx/MQbyFZdMFZ", match: isHotel },
                      { label: t("renta_autos", "Renta de Autos"), emoji: "🚗", url: "https://expedia.com/affiliate/DTtL3D8", match: isRenta },
                      { label: t("tours_tickets", "Tours y Tickets"), emoji: "🎟️", url: "https://getyourguide.stay22.com/citymapmx/594Wk5DWwJ", match: isTours },
                    ];

                    return (
                      <div style={{ padding: "8px 0 20px" }}>
                        {isTravel ? (
                          <>
                            <div style={{ fontSize: 14, color: T.sub, marginBottom: 16, textAlign: "center" }}>
                              {t("no_encontramos_negocios", "No encontramos negocios para")} <strong style={{ color: T.text }}>"{search}"</strong>, {t("pero_reservar", "pero puedes reservar aquí:")}
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
                            <div style={{ fontSize: 16, fontWeight: 700, color: T.text, marginTop: 12 }}>{t("no_resultados", "No encontramos resultados")}</div>
                            <div style={{ fontSize: 14, color: T.sub, marginTop: 4 }}>{t("intenta_otro", "Intenta con otras palabras o busca en otra ciudad.")}</div>
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
                  <span style={{ fontFamily: "var(--heading)", fontWeight: 900, letterSpacing: "-0.5px", fontSize: 22, color: T.text, margin: 0 }}>{activeCat === "explorar" || activeCat === "todas" ? t("cerca_de_ti", "Cerca de ti") : `${t(cats.find(c => c.id === activeCat)?.label || "Lugares")} ${t("cerca_de_ti", "cerca de ti").toLowerCase()}`}</span>
                  {userCoords && nearbyList.length > 0 && <span style={{ fontSize: 13, color: T.sub, fontWeight: 600 }}>{nearbyList.length} {t("lugares_cerca", "lugares")}</span>}
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
                      {t("abierto_ahora", "Abiertos ahora")}
                    </button>
                  </div>
                )}

                {!userCoords && (
                  <div onClick={requestLocation} style={{ padding: "14px 16px", background: T.white, borderRadius: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 12, boxShadow: T.shadow }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: T.greenL, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Icon name="pin" size={16} color={T.green} />
                    </div>
                    <span style={{ fontSize: 13, color: T.green, fontWeight: 600 }}>{t("toca_cerca", "Toca para ver lugares cerca de ti")}</span>
                  </div>
                )}

                {userCoords && <>
                  {nearbyList.length === 0 ? (
                    <div style={{ padding: "24px 16px", background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderRadius: 16, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: T.text, marginBottom: 4 }}>{t("sugerir_zona", "¡Sé el primero en descubrir esta zona! 🗺️")}</div>
                        <div style={{ fontSize: 13, color: T.sub }}>{t("sugerir_desc", "Amplía tu radio de búsqueda o sugiere una joya oculta")}</div>
                      </div>
                      <button className="press" onClick={() => { if (!user) { setShowAuth(true); toast$("Inicia sesión para sugerir un lugar"); } else { setShowAddBiz(true); } }} style={{ background: "#0ea5e9", color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                        <Icon name="plus" size={16} color="#fff" /> {t("sugerir_btn", "Sugerir lugar")}
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
                                <span style={{ fontSize: 9, color: getScheduleStatus(b, isOpen(b)).color, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.2 }}>{t(getScheduleStatus(b, isOpen(b)).text)}</span>
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

          
          {/* ── LUGAR DEL DÍA ── */}
          {!search && activeCat === "explorar" && <HomeEvents events={events} activeCity={activeCity} userCoords={userCoords} dbReady={dbReady} dark={dark} t={t} cityImg={cityImg} handleEventTap={handleEventTap} T={T} city={city} />}

          {!search && activeCat === "explorar" && spotlightBiz && (
            <div style={{ padding: "16px 20px 0 20px" }}>
              <h2 style={{ fontFamily: "var(--heading)", fontWeight: 800, fontSize: 20, color: T.text, letterSpacing: "-0.5px", margin: "0 0 16px 0", textAlign: "center" }}>
                Recomendación del día
              </h2>
              <div 
                className="press"
                onClick={() => handleCardTap(spotlightBiz)}
                style={{ 
                  borderRadius: 18, 
                  background: T.bg, 
                  border: `1px solid ${T.border}`,
                  overflow: "hidden", 
                  cursor: "pointer", 
                  boxShadow: "0 6px 16px rgba(0,0,0,0.06)",
                  display: "flex",
                  flexDirection: "column"
                }}
              >
                <div style={{ position: "relative", width: "100%", height: 180, background: "linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}>
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
                    // Placeholder fallback if no image exists
                    return <Icon name="image" size={48} color="#94A3B8" />;
                  })()}
                </div>
                <div style={{ padding: "12px 16px", textAlign: "center" }}>
                  <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text, lineHeight: 1.2 }}>{spotlightBiz.name}</h3>
                </div>
              </div>
            </div>
          )}


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
          {!search && activeCat === "explorar" && <HomeTopGrids topFavs={topFavsMemo} showMoreTopFavs={showMoreTopFavs} setShowMoreTopFavs={setShowMoreTopFavs} topRated={topRatedMemo} showMoreTopRated={showMoreTopRated} setShowMoreTopRated={setShowMoreTopRated} userCoords={userCoords} getKm={getKm} dark={dark} T={T} favIds={favIds} toggleFav={toggleFav} handleCardTap={handleCardTap} globalFavCounts={globalFavCounts} t={t} />}




          {/* ── TODOS LOS NEGOCIOS POR CATEGORÍA ── */}
          {!search && activeCat !== "explorar" && <div id="all-biz-section" style={{ padding: "20px 20px 0" }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              {!dbReady ? <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}><Sk w="60%" h={26} r={6} dark={dark} /></div> : <h1 style={{ fontFamily: "var(--heading)", fontWeight: 900, letterSpacing: "-0.5px", fontSize: 26, color: T.text, margin: "0 0 6px 0", padding: 0, textAlign: "center" }}>{t(cats.find(c => c.id === activeCat)?.label || activeCat)} {lang === 'en' ? 'in' : 'en'} {(city || "").split(',')[0]}</h1>}
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
              {dbReady && displayList.length === 0 && <div style={{ textAlign: "center", padding: "32px 0", color: T.sub }}><Icon name="search" size={36} color={T.border} /><p style={{ fontWeight: 700, color: T.text, marginTop: 14, marginBottom: 6 }}>{t("sin_negocios_cat", "Sin negocios en esta categoría")}</p><p style={{ fontSize: 14 }}>{t("prueba_otra_cat", "Prueba otra categoría")}</p></div>}
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

