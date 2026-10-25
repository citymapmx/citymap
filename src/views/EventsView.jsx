import { eventCalendarDay, isListedEvent, formatEventCardDate } from '../lib/eventListing.js';
import { CITY_TZ } from '../lib/constants.js';
import React, { useState, useMemo, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { useShallow } from 'zustand/react/shallow';
import Icon from "../components/ui/Icon.jsx";
import OptimizedImage from "../components/ui/OptimizedImage.jsx";
import Footer from "../components/Footer.jsx";
import { haptic } from "../lib/utils";
import useTimeStore from "../store/useTimeStore.js";
import { useTranslation } from "../hooks/useTranslation.js";

export default function EventsView() {
  const { t, lang } = useTranslation();
  const ctx = useAppContext();
  const { dark, activeCity } = useUIStore(useShallow(s => ({ dark: s.dark, activeCity: s.activeCity })));
  const { user } = useAuthStore(useShallow(s => ({ user: s.user })));
  const { cities } = useDataStore(useShallow(s => ({ cities: s.cities })));
  const now = useTimeStore(s => s.now);

  const {
    viewStyle, T, handleEventTap, setShowCreateEvent,
    savedEventIds, setSavedEventIds, events
  } = ctx;

  // Secondary sub-filters
  const [eventCategoryFilter, setEventCategoryFilter] = useState("Todos");

  // City Name calculation
  const cityName = useMemo(() => {
    const found = (cities || []).find(c => c.slug === activeCity)?.name;
    if (found) return found;
    if (!activeCity) return t("tu_ciudad", "Tu Ciudad");
    return activeCity.charAt(0).toUpperCase() + activeCity.slice(1).replace(/-/g, ' ');
  }, [cities, activeCity, t]);

  const shortCity = useMemo(() => cityName.split(",")[0].trim(), [cityName]);


  // Time formatting helper

  const cityTimeZone = (cities.find(c => c.slug === activeCity)?.timezone || CITY_TZ[activeCity] || 'America/Mexico_City').split(';')[0];
  const todayLocal = useMemo(() => eventCalendarDay(now, cityTimeZone), [now, cityTimeZone]);
  const tomorrowLocal = useMemo(() => {
    const [year, month, day] = todayLocal.split('-').map(Number);
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    return next.toISOString().slice(0, 10);
  }, [todayLocal]);
  const fmtCardDate = ev => formatEventCardDate(ev, { today: todayLocal, tomorrow: tomorrowLocal, lang });

  // Filter valid events
  const visibleEvents = useMemo(() => {
    return (events || []).filter(ev => isListedEvent(ev, todayLocal)).sort((a, b) => {
      if (!a.date) return 1;
      if (!b.date) return -1;
      const cmp = a.date.localeCompare(b.date);
      if (cmp !== 0) return cmp;
      return (a.time || "").localeCompare(b.time || "");
    });
  }, [events, todayLocal]);

  // Category matcher helper function
  const matchesCategory = (ev, q) => {
    const cat = (ev.event_category || ev.category || "").toLowerCase();
    const title = (ev.title || "").toLowerCase();
    if (cat === q || cat.includes(q)) return true;
    if (q === "concierto") return cat.includes("músic") || cat.includes("dj") || cat.includes("rock") || cat.includes("en vivo") || title.includes("concierto") || title.includes("en vivo");
    if (q === "comedia") return cat.includes("stand up") || cat.includes("comedi") || title.includes("comedia") || title.includes("stand up");
    if (q === "festival") return cat.includes("fest") || title.includes("festival");
    if (q === "obra de teatro") return cat.includes("teatro") || cat.includes("drama") || title.includes("teatro") || title.includes("obra");
    if (q === "fiesta") return cat.includes("party") || cat.includes("antro") || cat.includes("club") || title.includes("fiesta");
    if (q === "deporte") return cat.includes("deport") || cat.includes("carrera") || cat.includes("futbol") || cat.includes("maratón");
    if (q === "gastronomía") return cat.includes("gastro") || cat.includes("comida") || cat.includes("taco") || cat.includes("vino") || cat.includes("cerveza");
    if (q === "cultura") return cat.includes("cultur") || cat.includes("arte") || cat.includes("museo") || cat.includes("galería");
    return cat.includes(q) || title.includes(q);
  };

  // Dynamic category filter chips: ONLY categories with at least 1 event in this city!
  const availableCategoryChips = useMemo(() => {
    if (visibleEvents.length === 0) return [];

    const PRESET_CANDIDATES = [
      "Concierto",
      "Comedia",
      "Festival",
      "Obra de teatro",
      "Fiesta",
      "Deporte",
      "Gastronomía",
      "Cultura"
    ];

    const activeList = [];
    PRESET_CANDIDATES.forEach(cand => {
      const hasEvents = visibleEvents.some(ev => matchesCategory(ev, cand.toLowerCase()));
      if (hasEvents) {
        activeList.push(cand);
      }
    });

    // Also include any custom category present in visibleEvents that has events
    visibleEvents.forEach(ev => {
      const c = (ev.event_category || ev.category || "").trim();
      if (c && c.toLowerCase() !== "evento") {
        const formatted = c.charAt(0).toUpperCase() + c.slice(1);
        const alreadyCovered = activeList.some(al => al.toLowerCase() === c.toLowerCase() || matchesCategory(ev, al.toLowerCase()));
        if (!alreadyCovered && !activeList.includes(formatted)) {
          activeList.push(formatted);
        }
      }
    });

    if (activeList.length > 0) {
      return ["Todos", ...activeList];
    }
    return ["Todos"];
  }, [visibleEvents]);

  // Reset category filter if selected category is no longer present in available chips
  useEffect(() => {
    if (eventCategoryFilter !== "Todos" && !availableCategoryChips.includes(eventCategoryFilter)) {
      setEventCategoryFilter("Todos");
    }
  }, [availableCategoryChips, eventCategoryFilter]);

  const filteredEvents = useMemo(() => {
    if (eventCategoryFilter === "Todos") return visibleEvents;
    const q = eventCategoryFilter.toLowerCase();
    return visibleEvents.filter(ev => matchesCategory(ev, q));
  }, [visibleEvents, eventCategoryFilter]);

  // Handle saving/unsaving events
  const handleToggleSaveEvent = (ev, e) => {
    if (e) e.stopPropagation();
    const isSaved = savedEventIds.includes(ev.id);
    const nw = isSaved ? savedEventIds.filter(x => x !== ev.id) : [...savedEventIds, ev.id];
    setSavedEventIds(nw);
    try {
      localStorage.setItem("cg_saved_ev", JSON.stringify(nw));
    } catch { /* empty */ }
    haptic();
  };

  return (
    <div style={{ paddingBottom: 88, ...viewStyle, minHeight: "100vh", display: "flex", flexDirection: "column", overflowAnchor: "none" }}>
      {/* ── STICKY TOP HEADER ── */}
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
      `}</style>
      <div style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: T.bg,
        borderBottom: `1px solid ${dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
        padding: "calc(env(safe-area-inset-top, 0px) + 10px) 20px 12px"
      }}>
        {/* CityMap logo + subtitle + under-construction notice */}
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <img
            src="/citymap.mx.png"
            alt="CityMap"
            style={{
              height: 38,
              objectFit: "contain",
              filter: dark ? "brightness(0) invert(1)" : "brightness(0)",
              display: "block",
              margin: "0 auto 4px"
            }}
          />
          <p className="exp-subtitle-anim section-category-subtitle" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: T.sub, lineHeight: 1.4 }}>
            {t("planes_subtitulo", "Descubre los mejores planes y eventos en ")}<span className="exp-city-anim">{shortCity}</span>
          </p>

        </div>

      </div>

      {/* ── EVENT LISTING ── */}
      <div style={{ flex: 1, padding: "16px 20px 24px" }}>
        {(
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Header: "Eventos próximos" + Ver todos / Crear evento */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{
                margin: 0,
                fontSize: 18,
                fontWeight: 800,
                color: T.text,
                fontFamily: "var(--heading)",
                letterSpacing: "-0.3px"
              }}>
                {cityName ? (lang === 'en' ? `Upcoming events in ${cityName}` : `Próximos eventos en ${cityName}`) : t("eventos_proximos", "Próximos eventos")}
              </h2>
              {user ? (
                <button
                  onClick={() => setShowCreateEvent(true)}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: T.sub,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4
                  }}
                >
                  <Icon name="plus" size={13} color={T.sub} />
                  {t("crear_evento", "Crear")}
                </button>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 700, color: T.sub }}>
                  {filteredEvents.length} {t("eventos_total", "eventos")}
                </span>
              )}
            </div>

            {/* Category Filter Chips: Only show when there are active categories with events */}
            {visibleEvents.length > 0 && availableCategoryChips.length > 1 && (
              <div style={{
                display: "flex",
                gap: 8,
                overflowX: "auto",
                paddingBottom: 4,
                scrollbarWidth: "none"
              }}>
                {availableCategoryChips.map(chip => {
                  const isSelected = eventCategoryFilter === chip;
                  return (
                    <button
                      key={chip}
                      onClick={() => {
                        haptic();
                        setEventCategoryFilter(chip);
                      }}
                      style={{
                        padding: "8px 16px",
                        borderRadius: 9999,
                        border: isSelected ? "none" : `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                        background: isSelected ? (dark ? "#FFFFFF" : "#0F172A") : (dark ? "rgba(255,255,255,0.04)" : "#F8FAFC"),
                        color: isSelected ? (dark ? "#000000" : "#FFFFFF") : T.sub,
                        fontWeight: isSelected ? 800 : 600,
                        fontSize: 13,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                        transition: "all 0.2s"
                      }}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Event Cards Vertical Stack (Matches Image 1) */}
            {filteredEvents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: dark ? "rgba(255,255,255,0.05)" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <Icon name="calendar" size={28} color={T.sub} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{t("sin_eventos", "Sin eventos por ahora")}</div>
                <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>{t("sin_eventos_desc", "Pronto habrá novedades en tu ciudad")}</div>
              </div>
            ) : (
              <div className="event-list-grid" style={{
                display: "grid",
                gridTemplateColumns: "var(--event-grid-columns, repeat(2, minmax(0, 1fr)))",
                gap: 12
              }}>
                {filteredEvents.map((ev, index) => {
                  const isSaved = savedEventIds.includes(ev.id);
                  const imgSrc = ev.img_url || ev.img;

                  return (
                    <article key={ev.id} style={{ minWidth: 0, position:'relative', borderRadius:18, overflow:'hidden', background:T.white, border:`1px solid ${T.border}` }}>
                      <button type="button" onClick={() => handleEventTap(ev)} aria-label={`${ev.title || 'Evento'}. ${fmtCardDate(ev)}`} className="event-list-card" style={{ display:'block', width:'100%', textAlign:'left', border:0, padding:0, background:'transparent', color:T.text, cursor:'pointer', fontFamily:'inherit' }}>
                        <div style={{ aspectRatio:'5 / 7', position:'relative', overflow:'hidden', background:dark ? '#23252b' : '#edf0f4' }}>
                          {imgSrc ? <OptimizedImage src={imgSrc} alt={ev.title || 'Evento'} widthRequest={600} priority={index < 2} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
                            : <div style={{ height:'100%', display:'grid', placeItems:'center' }}><Icon name="calendar" size={32} color={T.sub} /></div>}
                        </div>
                        <div style={{ padding:'12px 12px 14px' }}>
                          <div style={{ fontSize:12, fontWeight:600, color:T.sub, marginBottom:6 }}>{fmtCardDate(ev)}</div>
                          <h3 style={{ fontSize:15, fontWeight:700, lineHeight:1.35, letterSpacing:'-0.2px', margin:0, overflowWrap:'anywhere' }}>{ev.title || 'Evento'}</h3>
                        </div>
                      </button>
                      <button type="button" onClick={e => handleToggleSaveEvent(ev, e)} aria-label={isSaved ? 'Quitar evento de guardados' : 'Guardar evento'} aria-pressed={isSaved} style={{ position:'absolute', top:6, right:6, width:44, height:44, background:'rgba(0,0,0,0.24)', border:0, borderRadius:'50%', display:'grid', placeItems:'center', cursor:'pointer', zIndex:2 }}>
                        <Icon name={isSaved ? 'heart_overlay_f' : 'heart_overlay'} size={25} color="none" />
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        )}



      </div>

      <Footer />
    </div>
  );
}
