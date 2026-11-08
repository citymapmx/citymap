import { eventCalendarDay, isListedEvent, formatEventCardDate, matchesDateFilter, matchesEventSearch, groupEventsByMonth } from '../lib/eventListing.js';
import { CITY_TZ } from '../lib/constants.js';
import React, { useState, useMemo, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { useShallow } from 'zustand/react/shallow';
import Icon from "../components/ui/Icon.jsx";
import OptimizedImage from "../components/ui/OptimizedImage.jsx";
import EventPosterFallback from "../components/home/EventPosterFallback.jsx";
import Footer from "../components/Footer.jsx";
import { haptic } from "../lib/utils";
import { useFlipList } from "../lib/useFlipList.js";
import useTimeStore from "../store/useTimeStore.js";
import { useTranslation } from "../hooks/useTranslation.js";

const PAGE_SIZE = 20;
const DATE_FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "hoy", label: "Hoy" },
  { key: "manana", label: "Mañana" },
  { key: "finde", label: "Este finde" },
  { key: "mes", label: "Este mes" },
];

export default function EventsView() {
  const { t, lang } = useTranslation();
  const ctx = useAppContext();
  const { dark, activeCity } = useUIStore(useShallow(s => ({ dark: s.dark, activeCity: s.activeCity })));
  const { user, setShowAuth } = useAuthStore(useShallow(s => ({ user: s.user, setShowAuth: s.setShowAuth })));
  const { cities } = useDataStore(useShallow(s => ({ cities: s.cities })));
  const now = useTimeStore(s => s.now);

  const {
    viewStyle, T, handleEventTap, setShowCreateEvent,
    savedEventIds, setSavedEventIds, events
  } = ctx;

  // Secondary sub-filters
  const [eventCategoryFilter, setEventCategoryFilter] = useState("Todos");
  // Buscador, filtro rápido por fecha y paginación ("Cargar más")
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("todos");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
    let list = visibleEvents;
    if (eventCategoryFilter !== "Todos") {
      const q = eventCategoryFilter.toLowerCase();
      list = list.filter(ev => matchesCategory(ev, q));
    }
    list = list.filter(ev => matchesDateFilter(ev, dateFilter, todayLocal));
    if (searchQuery.trim()) list = list.filter(ev => matchesEventSearch(ev, searchQuery));
    return list;
  }, [visibleEvents, eventCategoryFilter, dateFilter, searchQuery, todayLocal]);

  // Al cambiar cualquier filtro se vuelve a mostrar desde los primeros 20.
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [searchQuery, eventCategoryFilter, dateFilter]);

  // Solo se renderizan los primeros visibleCount; el resto llega con "Ver más".
  const renderedEvents = useMemo(() => filteredEvents.slice(0, visibleCount), [filteredEvents, visibleCount]);
  // Secciones por mes de lo ya cargado, y totales por mes del filtro completo.
  const monthGroups = useMemo(() => groupEventsByMonth(renderedEvents), [renderedEvents]);
  const allMonthGroups = useMemo(() => groupEventsByMonth(filteredEvents), [filteredEvents]);
  const monthTotal = useMemo(() => new Map(allMonthGroups.map(g => [g.key, g.events.length])), [allMonthGroups]);

  const hasActiveFilters = searchQuery.trim() !== "" || dateFilter !== "todos" || eventCategoryFilter !== "Todos";
  const clearFilters = () => { setSearchQuery(""); setDateFilter("todos"); setEventCategoryFilter("Todos"); };

  // Saltar a un mes: carga lo necesario para que exista y baja hasta su título.
  const jumpToMonth = (key) => {
    let last = -1;
    filteredEvents.forEach((ev, i) => {
      if (((ev.date || "").slice(0, 7) || "sin-fecha") === key) last = i;
    });
    if (last < 0) return;
    setVisibleCount(c => Math.max(c, last + 1));
    setTimeout(() => {
      document.getElementById(`mes-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  // Estilo compartido de las píldoras (fecha y categoría se ven igual).
  const chipStyle = (selected) => ({
    padding: "8px 16px",
    borderRadius: 9999,
    border: selected ? "none" : `1px solid ${dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
    background: selected ? (dark ? "#FFFFFF" : "#0F172A") : (dark ? "rgba(255,255,255,0.04)" : "#F8FAFC"),
    color: selected ? (dark ? "#000000" : "#FFFFFF") : T.sub,
    fontWeight: selected ? 800 : 600,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
    fontFamily: "inherit",
  });
  // Fila de píldoras con desvanecido a la derecha (se ve que hay más).
  const chipRowStyle = {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 4,
    scrollbarWidth: "none",
    WebkitMaskImage: "linear-gradient(90deg, #000 88%, transparent)",
    maskImage: "linear-gradient(90deg, #000 88%, transparent)",
  };

  // Idea 2 de motion.dev: al cambiar de categoría, las tarjetas se
  // deslizan a su nuevo lugar y las nuevas entran con un fundido.
  const registerFlip = useFlipList(renderedEvents.map((ev) => ev.id).join(','));

  // Handle saving/unsaving events
  const handleToggleSaveEvent = (ev, e) => {
    if (e) e.stopPropagation();
    // Sin sesión el corazón pide iniciar sesión para que se guarde de verdad (como toggleFav).
    if (!user) { setShowAuth(true); return; }
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
                    background: T.green,
                    border: "none",
                    color: dark ? "#18181B" : "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 16px",
                    borderRadius: 9999,
                    fontFamily: "inherit",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                    flexShrink: 0
                  }}
                >
                  <Icon name="plus" size={14} color={dark ? "#18181B" : "#FFFFFF"} />
                  {t("crear_evento", "Crear evento")}
                </button>
              ) : (
                <span style={{ fontSize: 13, fontWeight: 700, color: T.sub }}>
                  {filteredEvents.length} {t("eventos_total", "eventos")}
                </span>
              )}
            </div>

            {/* Buscador por nombre o lugar (sin importar mayúsculas ni acentos) */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: dark ? "rgba(255,255,255,0.06)" : "#F1F5F9", border: `1px solid ${T.border}`, borderRadius: 9999, padding: "10px 14px" }}>
              <Icon name="search" size={18} color={T.sub} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar evento o lugar…"
                aria-label="Buscar eventos"
                style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: T.text, fontSize: 15, fontFamily: "inherit" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} aria-label="Limpiar búsqueda" style={{ border: "none", background: "transparent", color: T.sub, fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 0 }}>×</button>
              )}
            </div>

            {/* Filtro rápido por fecha */}
            <div style={chipRowStyle}>
              {DATE_FILTERS.map(f => (
                <button
                  key={f.key}
                  onClick={() => { haptic(); setDateFilter(f.key); }}
                  style={chipStyle(dateFilter === f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Category Filter Chips: Only show when there are active categories with events */}
            {visibleEvents.length > 0 && availableCategoryChips.length > 1 && (
              <div style={chipRowStyle}>
                {availableCategoryChips.map(chip => {
                  const isSelected = eventCategoryFilter === chip;
                  return (
                    <button
                      key={chip}
                      onClick={() => {
                        haptic();
                        setEventCategoryFilter(chip);
                      }}
                      style={chipStyle(isSelected)}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Salto por mes (solo cuando hay más de un mes en los resultados) */}
            {allMonthGroups.length > 1 && (
              <div style={chipRowStyle}>
                {allMonthGroups.map(g => (
                  <button
                    key={g.key}
                    onClick={() => { haptic(); jumpToMonth(g.key); }}
                    style={chipStyle(false)}
                  >
                    {g.label} · {g.events.length}
                  </button>
                ))}
              </div>
            )}

            {/* Event Cards Vertical Stack (Matches Image 1) */}
            {filteredEvents.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: dark ? "rgba(255,255,255,0.05)" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <Icon name="calendar" size={28} color={T.sub} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{hasActiveFilters ? "Sin resultados" : t("sin_eventos", "Sin eventos por ahora")}</div>
                <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>{hasActiveFilters ? "Prueba con otra búsqueda o quita los filtros" : t("sin_eventos_desc", "Pronto habrá novedades en tu ciudad")}</div>
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="press" style={{ marginTop: 16, padding: "10px 18px", borderRadius: 9999, border: `1px solid ${T.border}`, background: T.white, color: T.text, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>Limpiar filtros</button>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {monthGroups.map(group => (
                  <div key={group.key} id={`mes-${group.key}`} style={{ scrollMarginTop: 120 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10 }}>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text, fontFamily: "var(--heading)", letterSpacing: "-0.3px" }}>{group.label}</h3>
                      <span style={{ fontSize: 13, fontWeight: 600, color: T.sub }}>{monthTotal.get(group.key) ?? group.events.length} {(monthTotal.get(group.key) ?? group.events.length) === 1 ? "evento" : "eventos"}</span>
                    </div>
                    <div className="event-list-grid" style={{
                      display: "grid",
                      gridTemplateColumns: "var(--event-grid-columns, repeat(2, minmax(0, 1fr)))",
                      gap: 12
                    }}>
                      {group.events.map((ev, index) => {
                  const isSaved = savedEventIds.includes(ev.id);
                  const imgSrc = ev.img_url || ev.img;

                  return (
                    <article key={ev.id} ref={registerFlip(ev.id)} style={{ minWidth: 0, position:'relative', borderRadius:18, overflow:'hidden', background:T.white, border:`1px solid ${T.border}` }}>
                      <button type="button" onClick={() => handleEventTap(ev)} aria-label={`${ev.title || 'Evento'}. ${fmtCardDate(ev)}`} className="event-list-card" style={{ display:'block', width:'100%', textAlign:'left', border:0, padding:0, background:'transparent', color:T.text, cursor:'pointer', fontFamily:'inherit' }}>
                        <div style={{ aspectRatio:'5 / 7', position:'relative', overflow:'hidden', background:dark ? '#23252b' : '#edf0f4' }}>
                          {imgSrc ? <OptimizedImage src={imgSrc} alt={ev.title || 'Evento'} widthRequest={600} priority={index < 2} style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
                            : <EventPosterFallback title={ev.title || 'Evento'} radius={0} />}
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
                  </div>
                ))}
                {filteredEvents.length > visibleCount && (
                  <button onClick={() => { haptic(); setVisibleCount(c => c + PAGE_SIZE); }} className="press" style={{ width: "100%", minHeight: 48, background: T.green, color: dark ? "#18181B" : "#FFFFFF", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, cursor: "pointer", fontFamily: "inherit" }}>
                    Ver más eventos ({filteredEvents.length - visibleCount} restantes)
                  </button>
                )}
              </div>
            )}
          </div>
        )}



      </div>

      <Footer />
    </div>
  );
}

