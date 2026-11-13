import { eventCalendarDay, isListedEvent, formatEventCardDate, matchesDateFilter, matchesEventSearch, groupEventsByMonth, eventCoversDay } from '../lib/eventListing.js';
import { matchesPriceFilter, priceSortValue } from '../lib/eventDetails.js';
import { CITY_TZ } from '../lib/constants.js';
import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from 'react-dom';
import { useAppContext } from "../context/AppContext";
import { useUIStore } from "../store/useUIStore.js";
import { useAuthStore } from "../store/useAuthStore.js";
import { useDataStore } from "../store/useDataStore.js";
import { useShallow } from 'zustand/react/shallow';
import Icon from "../components/ui/Icon.jsx";
import OptimizedImage from "../components/ui/OptimizedImage.jsx";
import EventPosterFallback from "../components/home/EventPosterFallback.jsx";
import Footer from "../components/Footer.jsx";
import { getThumbUrl, haptic, SRCSET_CARD } from "../lib/utils";
import { smoothScrollIntoView } from "../lib/smoothScroll.js";
import { useFlipList } from "../lib/useFlipList.js";
import SaveHeartButton from "../components/ui/SaveHeartButton.jsx";
import { cascadeDelayS, CASCADE_WINDOW_MS } from "../lib/cascade.js";
import useTimeStore from "../store/useTimeStore.js";
import { useTranslation } from "../hooks/useTranslation.js";
import { localizedTitle } from "../lib/i18nContent.js";
import { EventGridSk } from "../components/ui/Skeleton.jsx";

const PAGE_SIZE = 20;
const DATE_FILTERS = [
  { key: "todos", labelKey: "eventos_filtro_todos", label: "Todos" },
  { key: "hoy", labelKey: "eventos_filtro_hoy", label: "Hoy" },
  { key: "manana", labelKey: "eventos_filtro_manana", label: "Mañana" },
  { key: "finde", labelKey: "eventos_filtro_finde", label: "Este finde" },
  { key: "mes", labelKey: "eventos_filtro_mes", label: "Este mes" },
];
const PRICE_FILTERS = [
  { key: "todos", labelKey: "eventos_filtro_todos", label: "Todos" },
  { key: "gratis", labelKey: "eventos_filtro_gratis", label: "Gratis" },
  { key: "pago", labelKey: "eventos_filtro_pago", label: "De pago" },
];

export default function EventsView() {
  const { t, lang } = useTranslation();
  const ctx = useAppContext();
  const { dark, activeCity } = useUIStore(useShallow(s => ({ dark: s.dark, activeCity: s.activeCity })));
  const { user } = useAuthStore(useShallow(s => ({ user: s.user })));
  const { cities, dbReady } = useDataStore(useShallow(s => ({ cities: s.cities, dbReady: s.dbReady })));
  const now = useTimeStore(s => s.now);

  const {
    viewStyle, T, handleEventTap, setShowCreateEvent,
    savedEventIds, toggleSaveEvent, events
  } = ctx;

  // Secondary sub-filters
  const [eventCategoryFilter, setEventCategoryFilter] = useState("Todos");
  // Buscador, filtro rápido por fecha y paginación ("Cargar más")
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("todos");
  const [customDate, setCustomDate] = useState("");
  const [priceFilter, setPriceFilter] = useState("todos");
  const [sortBy, setSortBy] = useState("fecha");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  // "Ver más eventos": índice del primer evento del lote recién cargado.
  // Solo ese lote entra con scale-in-ver-top (se desenrolla desde arriba).
  // El lote se identifica por id (la lista se agrupa por mes y no hay un
  // índice global en el render). Se limpia 600 ms después de que el lote
  // llega (la animación dura 0.5 s) para que la clase no quede puesta.
  const [newBatchFrom, setNewBatchFrom] = useState(null);
  // (newBatchIds va DESPUÉS de filteredEvents: su useMemo lee filteredEvents
  // en el arreglo de dependencias, y leerlo antes de su const rompería la
  // vista al montar — eso tumbó /eventos en el PR #136.)
  // "Ver más eventos": tras cargar la tanda nueva, la vista se desliza
  // suave hasta la primera tarjeta nueva; sin esto la lista crecía de golpe
  // y la pantalla no se movía (brusco). El botón guarda el id del primer
  // evento nuevo y el efecto lo busca en la lista ya renderizada.
  const eventListRef = React.useRef(null);
  const pendingEventScrollRef = React.useRef(null);
  useEffect(() => {
    const id = pendingEventScrollRef.current;
    if (!id) return;
    pendingEventScrollRef.current = null;
    const el = eventListRef.current?.querySelector?.(`[data-event-id="${id}"]`);
    smoothScrollIntoView(el, 'nearest');
    const t = window.setTimeout(() => setNewBatchFrom(null), 600);
    return () => window.clearTimeout(t);
  }, [visibleCount]);
  // Tarjeta de filtros: se edita en borrador y se aplica con "Mostrar eventos".
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draftDate, setDraftDate] = useState("todos");
  const [draftCustomDate, setDraftCustomDate] = useState("");
  const [draftPrice, setDraftPrice] = useState("todos");
  const [draftSort, setDraftSort] = useState("fecha");

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
    if (dateFilter === "custom") list = list.filter(ev => eventCoversDay(ev, customDate));
    else list = list.filter(ev => matchesDateFilter(ev, dateFilter, todayLocal));
    if (searchQuery.trim()) list = list.filter(ev => matchesEventSearch(ev, searchQuery));
    list = list.filter(ev => matchesPriceFilter(ev, priceFilter));
    if (sortBy === "precio") {
      list = [...list].sort((a, b) => {
        const diff = priceSortValue(a) - priceSortValue(b);
        if (diff !== 0) return diff;
        return (a.date || "").localeCompare(b.date || "") || (a.time || "").localeCompare(b.time || "");
      });
    }
    return list;
  }, [visibleEvents, eventCategoryFilter, dateFilter, customDate, searchQuery, priceFilter, sortBy, todayLocal]);

  // Lote recién cargado con "Ver más eventos", identificado por id (la lista
  // se agrupa por mes y no hay un índice global en el render). SOLO puede
  // vivir aquí, después de filteredEvents: el useMemo lee filteredEvents en
  // su arreglo de dependencias, y antes de su const es zona muerta temporal
  // (ReferenceError al montar → "Algo salió mal", PR #136).
  const newBatchIds = useMemo(
    () => (newBatchFrom === null ? null : new Set(filteredEvents.slice(newBatchFrom, visibleCount).map(ev => ev.id))),
    [newBatchFrom, filteredEvents, visibleCount]
  );

  // Al cambiar cualquier filtro se vuelve a mostrar desde los primeros 20.
  useEffect(() => { setVisibleCount(PAGE_SIZE); setNewBatchFrom(null); }, [searchQuery, eventCategoryFilter, dateFilter, customDate, priceFilter, sortBy]);

  // Solo se renderizan los primeros visibleCount; el resto llega con "Ver más".
  const renderedEvents = useMemo(() => filteredEvents.slice(0, visibleCount), [filteredEvents, visibleCount]);
  // Secciones por mes de lo ya cargado, y totales por mes del filtro completo.
  const monthGroups = useMemo(() => groupEventsByMonth(renderedEvents), [renderedEvents]);
  const allMonthGroups = useMemo(() => groupEventsByMonth(filteredEvents), [filteredEvents]);
  const monthTotal = useMemo(() => new Map(allMonthGroups.map(g => [g.key, g.events.length])), [allMonthGroups]);

  // Cascada del lote inicial (demo #2 de "15 animaciones"): al entrar,
  // las primeras 20 tarjetas suben una tras otra (fade-in-bottom con
  // retraso escalonado, tope 0,6 s). Solo el lote inicial; lo que llega
  // con "Ver más eventos" sigue con scale-in-ver-top. La ventana se abre
  // cuando aparecen los primeros eventos y se cierra 1,3 s después
  // (retraso máximo + duración), para que la clase no quede puesta.
  const [cascadeActive, setCascadeActive] = useState(false);
  const cascadeStartedRef = React.useRef(false);
  useEffect(() => {
    if (cascadeStartedRef.current || renderedEvents.length === 0) return;
    cascadeStartedRef.current = true;
    setCascadeActive(true);
    const t = window.setTimeout(() => setCascadeActive(false), CASCADE_WINDOW_MS);
    return () => window.clearTimeout(t);
  }, [renderedEvents.length]);
  // Id → retraso de entrada del lote inicial (solo las 20 primeras).
  // Se declara DESPUÉS de renderedEvents: su useMemo lo lee (lección del
  // PR #137: leer una variable antes de su const tumbó /eventos).
  const cascadeDelayById = useMemo(() => {
    if (!cascadeActive) return null;
    return new Map(renderedEvents.slice(0, PAGE_SIZE).map((ev, i) => [ev.id, cascadeDelayS(i)]));
  }, [cascadeActive, renderedEvents]);

  const hasActiveFilters = searchQuery.trim() !== "" || dateFilter !== "todos" || eventCategoryFilter !== "Todos" || priceFilter !== "todos" || sortBy !== "fecha";
  const activeFilterCount = (dateFilter !== "todos" ? 1 : 0) + (eventCategoryFilter !== "Todos" ? 1 : 0) + (priceFilter !== "todos" ? 1 : 0) + (sortBy !== "fecha" ? 1 : 0);
  const clearFilters = () => { setSearchQuery(""); setDateFilter("todos"); setCustomDate(""); setEventCategoryFilter("Todos"); setPriceFilter("todos"); setSortBy("fecha"); };

  // La tarjeta abre con los filtros actuales en borrador; "Mostrar eventos" los aplica.
  const openSheet = () => {
    setDraftDate(dateFilter);
    setDraftCustomDate(customDate);
    setDraftPrice(priceFilter);
    setDraftSort(sortBy);
    setSheetOpen(true);
  };
  const applySheet = () => {
    setDateFilter(draftDate);
    setCustomDate(draftDate === "custom" ? draftCustomDate : "");
    setPriceFilter(draftPrice);
    setSortBy(draftSort);
    setSheetOpen(false);
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
  // Campo desplegable de la tarjeta de filtros (categoría y orden).
  const selectStyle = {
    width: "100%",
    appearance: "none",
    WebkitAppearance: "none",
    border: `1px solid ${T.border}`,
    borderRadius: 12,
    padding: "12px 40px 12px 14px",
    background: dark ? "rgba(255,255,255,0.04)" : "#F8FAFC",
    color: T.text,
    fontSize: 15,
    fontFamily: "inherit",
    cursor: "pointer",
  };

  // Idea 2 de motion.dev: al cambiar de categoría, las tarjetas se
  // deslizan a su nuevo lugar y las nuevas entran con un fundido.
  const registerFlip = useFlipList(renderedEvents.map((ev) => ev.id).join(','));

  // Guardar/quitar evento: delega en toggleSaveEvent (App.jsx), el mismo
  // que usan el muro global y el detalle del evento. Además de actualizar
  // el estado y localStorage, sincroniza con el servidor (tabla
  // event_favorites, PR #213) para que el recordatorio del día del evento
  // pueda avisar. Antes esta lista solo escribía en local (PR #218): el
  // guardado nunca llegaba al servidor aunque se tocara el corazón.
  // Sin sesión, el propio toggleSaveEvent pide iniciar sesión.
  const handleToggleSaveEvent = (ev, e) => {
    toggleSaveEvent?.(ev.id, e);
    if (user) haptic();
  };

  // La tarjeta de filtros es un overlay fixed que debe cubrir TODA la
  // ventana y centrarse en la pantalla visible: se monta con
  // createPortal en document.body para que ningún ancestro con transform
  // la descentre. Causa raíz (Jonathan, 12 nov 2026): la tarjeta vivía
  // al final de EventsView, cuya raíz lleva `...viewStyle` (App.jsx) —
  // `transform: translateY(0)` persistente tras el fade — y ese transform
  // vuelve la raíz el bloque contenedor de los fixed: el overlay cubría
  // toda la página de eventos (larga) y la tarjeta quedaba centrada en
  // el medio de la página, fuera de la pantalla visible. Con el portal
  // el overlay cuelga del body y el flex lo centra en la ventana
  // visible. Sin document (SSR/pruebas) se pinta en línea, como siempre.
  const filterOverlay = (
    <div
      onClick={() => setSheetOpen(false)}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", boxSizing: "border-box" }}
    >
      <div role="dialog" aria-modal="true" aria-label={t("eventos_filtros", "Filtros de eventos")} className="scale-in-center" onClick={(e) => e.stopPropagation()} style={{ background: T.bg, width: "calc(100vw - 32px)", maxWidth: 460, borderRadius: 24, padding: "20px 20px calc(16px + env(safe-area-inset-bottom, 0px))", boxShadow: "0 24px 48px rgba(0,0,0,0.2)", maxHeight: "92dvh", overflowY: "auto", boxSizing: "border-box" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: T.text, fontFamily: "var(--heading)", letterSpacing: "-0.3px" }}>{t("eventos_filtros", "Filtros de eventos")}</h2>
          <button onClick={() => setSheetOpen(false)} aria-label={t("eventos_cerrar_filtros", "Cerrar filtros")} style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: dark ? "rgba(255,255,255,0.08)" : "#F1F5F9", color: T.text, fontSize: 20, lineHeight: 1, cursor: "pointer" }}>×</button>
        </div>

        {/* Fecha */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Icon name="calendar" size={20} color={T.text} />
            <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{t("eventos_fecha", "Fecha")}</span>
          </div>
          <div style={chipRowStyle}>
            {DATE_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => { haptic(); setDraftDate(f.key); setDraftCustomDate(""); }}
                style={chipStyle(draftDate === f.key)}
              >
                {t(f.labelKey, f.label)}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, border: `1px solid ${draftDate === "custom" ? T.green : T.border}`, borderRadius: 12, padding: "4px 6px 4px 14px", background: dark ? "rgba(255,255,255,0.04)" : "#F8FAFC" }}>
            <Icon name="calendar" size={18} color={T.sub} />
            <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: T.text }}>{t("eventos_fecha_personalizada", "Fecha personalizada")}</span>
            <input type="date" value={draftCustomDate} onChange={e => { setDraftCustomDate(e.target.value); if (e.target.value) setDraftDate("custom"); }} aria-label={t("eventos_fecha_personalizada", "Fecha personalizada")} style={{ border: "none", outline: "none", background: "transparent", color: T.text, fontSize: 14, fontFamily: "inherit", maxWidth: 150, colorScheme: dark ? "dark" : "light" }} />
          </div>
        </div>

        {/* Precio */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <Icon name="tag" size={20} color={T.text} />
            <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{t("eventos_precio", "Precio")}</span>
          </div>
          <div style={chipRowStyle}>
            {PRICE_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => { haptic(); setDraftPrice(f.key); }}
                style={chipStyle(draftPrice === f.key)}
              >
                {t(f.labelKey, f.label)}
              </button>
            ))}
          </div>
        </div>

        {/* Ordenar por */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: T.text, lineHeight: 1 }}>↑↓</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: T.text }}>{t("eventos_ordenar_por", "Ordenar por")}</span>
          </div>
          <div style={{ position: "relative" }}>
            <select value={draftSort} onChange={e => setDraftSort(e.target.value)} aria-label={t("eventos_ordenar_por", "Ordenar por")} style={selectStyle}>
              <option value="fecha">{t("eventos_orden_fecha", "Próximos eventos")}</option>
              <option value="precio">{t("eventos_orden_precio", "Precio: menor a mayor")}</option>
            </select>
            <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%) rotate(90deg)", pointerEvents: "none", display: "flex" }}>
              <Icon name="chevron" size={18} color={T.sub} />
            </span>
          </div>
        </div>

        <button onClick={applySheet} className="press" style={{ width: "100%", minHeight: 52, background: T.green, color: dark ? "#18181B" : "#FFFFFF", border: "none", borderRadius: 9999, fontSize: 17, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{t("eventos_mostrar_eventos", "Mostrar eventos")}</button>
        <button onClick={() => { clearFilters(); setSheetOpen(false); }} style={{ display: "block", margin: "14px auto 0", border: "none", background: "transparent", color: T.sub, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{t("eventos_limpiar_filtros", "Limpiar filtros")}</button>
      </div>
    </div>
  );

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
            {/* Buscador por nombre o lugar (sin importar mayúsculas ni acentos) */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: dark ? "rgba(255,255,255,0.06)" : "#F1F5F9", border: `1px solid ${T.border}`, borderRadius: 9999, padding: "6px 6px 6px 14px" }}>
              <Icon name="search" size={18} color={T.sub} />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t("eventos_buscar_placeholder", "Buscar evento o lugar…")}
                aria-label={t("eventos_buscar_eventos", "Buscar eventos")}
                style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", color: T.text, fontSize: 15, fontFamily: "inherit" }}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} aria-label={t("eventos_limpiar_busqueda", "Limpiar búsqueda")} style={{ border: "none", background: "transparent", color: T.sub, fontSize: 20, lineHeight: 1, cursor: "pointer", padding: 0 }}>×</button>
              )}
              <button onClick={openSheet} aria-label={t("eventos_filtros", "Filtros de eventos")} className="press" style={{ position: "relative", flexShrink: 0, width: 36, height: 36, borderRadius: "50%", border: "none", background: T.green, display: "grid", placeItems: "center", cursor: "pointer" }}>
                <Icon name="sliders" size={18} color={dark ? "#18181B" : "#FFFFFF"} />
                {activeFilterCount > 0 && (
                  <span style={{ position: "absolute", top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9999, background: "#D94F3D", color: "#FFFFFF", fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center", padding: "0 4px", border: `2px solid ${T.bg}` }}>{activeFilterCount}</span>
                )}
              </button>
            </div>

            {/* Piedras de categorías (se quedan en la página) */}
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
                      {chip === "Todos" ? t("eventos_filtro_todos", "Todos") : chip}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Event Cards Vertical Stack (Matches Image 1) */}
            {/* Mientras los eventos todavía están cargando, las siluetas
                de las tarjetas con brillo (demo #3) en vez del "Sin eventos
                por ahora", que es mentira mientras llegan los datos. */}
            {filteredEvents.length === 0 ? (
              !dbReady && !hasActiveFilters ? (
                <EventGridSk dark={dark} />
              ) : (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ width: 60, height: 60, borderRadius: "50%", background: dark ? "rgba(255,255,255,0.05)" : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                  <Icon name="calendar" size={28} color={T.sub} />
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, color: T.text }}>{hasActiveFilters ? t("eventos_sin_resultados", "Sin resultados") : visibleEvents.length === 0 ? t("eventos_ciudad_vacia", "En ${ciudad} todavía no hay eventos", { ciudad: shortCity }) : t("sin_eventos", "Sin eventos por ahora")}</div>
                {/* Sin eventos en la ciudad: solo el mensaje, sin línea
                    de «cerca» ni recomendaciones (decisión de Jonathan,
                    12 Nov 2026). La descripción solo sale con filtros
                    activos o cuando la ciudad sí tiene eventos. */}
                {(hasActiveFilters || visibleEvents.length > 0) && (
                  <div style={{ fontSize: 13, color: T.sub, marginTop: 4 }}>{hasActiveFilters ? t("eventos_sin_resultados_desc", "Prueba con otra búsqueda o quita los filtros") : t("sin_eventos_desc", "Pronto habrá novedades en tu ciudad")}</div>
                )}
                {hasActiveFilters && (
                  <button onClick={clearFilters} className="press" style={{ marginTop: 16, padding: "10px 18px", borderRadius: 9999, border: `1px solid ${T.border}`, background: T.white, color: T.text, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>{t("eventos_limpiar_filtros", "Limpiar filtros")}</button>
                )}
              </div>
              )
            ) : (
              <div ref={eventListRef} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {monthGroups.map((group, monthIndex) => (
                  <div key={group.key} id={`mes-${group.key}`} style={{ scrollMarginTop: 120 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: T.text, fontFamily: "var(--heading)", letterSpacing: "-0.3px" }}>{group.label}</h3>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.sub }}>{monthTotal.get(group.key) ?? group.events.length} {(monthTotal.get(group.key) ?? group.events.length) === 1 ? t("eventos_evento", "evento") : t("eventos_eventos", "eventos")}</span>
                      </div>
                      {/* Botón «Crear evento» solo en el primer mes (PR #224):
                          antes vivía en la fila del encabezado «Próximos
                          eventos en {ciudad}», que se quitó. Sin sesión
                          no aparece, igual que antes. */}
                      {user && monthIndex === 0 && (
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
                      )}
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
                    <article key={ev.id} data-event-id={ev.id} ref={registerFlip(ev.id)} style={{ minWidth: 0, position:'relative', borderRadius:18, overflow:'hidden' }}>
                      {/* El lote recién cargado con "Ver más eventos" se
                          desenrolla desde arriba (scale-in-ver-top) y el
                          lote inicial entra en cascada (cascade-in). La
                          clase va en este envoltorio interior, nunca en
                          el <article>: FLIP (registerFlip) escribe
                          transform inline en el artículo y la animación
                          con fill both lo taparía para siempre. El
                          corazón va dentro para que toda la tarjeta anime
                          como una sola pieza. */}
                      <div className={newBatchIds?.has(ev.id) ? 'scale-in-ver-top' : cascadeDelayById?.has(ev.id) ? 'cascade-in' : undefined} style={{ position: 'relative', ...(cascadeDelayById?.has(ev.id) ? { animationDelay: `${cascadeDelayById.get(ev.id)}s` } : {}) }}>
                      <button type="button" onClick={() => handleEventTap(ev)} aria-label={`${localizedTitle(ev, lang) || 'Evento'}. ${fmtCardDate(ev)}`} className="event-list-card" style={{ display:'block', width:'100%', textAlign:'left', border:0, padding:0, background:'transparent', color:T.text, cursor:'pointer', fontFamily:'inherit' }}>
                        <div style={{ aspectRatio:'5 / 7', position:'relative', overflow:'hidden', background:dark ? '#23252b' : '#edf0f4' }}>
                          {/* La foto LLENA la tarjeta (cover, PR #153): sin
                              bandas ni fondo difuminado. Un póster vertical
                              apenas recorta en la tarjeta 5:7; una foto
                              apaisada recorta los lados, que es lo que
                              pidió Jonathan (la regla del PR #132 — contain
                              + fondo difuminado — queda anulada). */}
                          {imgSrc ? (
                            <OptimizedImage src={imgSrc} alt={localizedTitle(ev, lang) || 'Evento'} widthRequest={600} priority={index < 2} srcSetWidths={SRCSET_CARD} sizes="(max-width: 640px) 50vw, 300px" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:1 }} />
                          ) : <EventPosterFallback title={localizedTitle(ev, lang) || 'Evento'} radius={0} />}
                          <div style={{ position:'absolute', top:8, left:8, zIndex:2, borderRadius:999, padding:'4px 10px', fontSize:12, fontWeight:700, background:'rgba(0,0,0,0.55)', color:'#FFFFFF' }}>{fmtCardDate(ev)}</div>
                        </div>
                      </button>
                      <SaveHeartButton
                        isFav={isSaved}
                        onToggle={e => handleToggleSaveEvent(ev, e)}
                        size={25}
                        overlay
                        ariaLabel={isSaved ? t("eventos_quitar_guardados", "Quitar evento de guardados") : t("eventos_guardar_evento", "Guardar evento")}
                        buttonStyle={{ position: 'absolute', top: 6, right: 6, width: 44, height: 44, display: 'grid', placeItems: 'center', cursor: 'pointer', zIndex: 2, filter: 'none' }}
                      />
                      </div>
                    </article>
                  );
                      })}
                    </div>
                  </div>
                ))}
                {filteredEvents.length > visibleCount && (
                  <button onClick={() => { haptic(); pendingEventScrollRef.current = filteredEvents[visibleCount]?.id ?? null; setNewBatchFrom(visibleCount); setVisibleCount(c => c + PAGE_SIZE); }} className="press" style={{ width: "100%", minHeight: 48, background: T.green, color: dark ? "#18181B" : "#FFFFFF", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, cursor: "pointer", fontFamily: "inherit" }}>
                    {t("eventos_ver_mas_eventos", "Ver más eventos")} ({filteredEvents.length - visibleCount} {t("eventos_restantes", "restantes")})
                  </button>
                )}
              </div>
            )}
          </div>
        )}



      </div>

      <Footer />

      {/* ── TARJETA DE FILTROS (abre desde el botón del buscador) ── */}
      {/* PR #217: ya no es una hoja anclada abajo: es una tarjeta flotante
          centrada con las 4 esquinas redondeadas (mismo patrón que la
          tarjeta para compartir, PR #147). Sin tirador: es un affordance
          de bottom sheet. El panel entero anima con scale-in-center. */}
      {sheetOpen && (typeof document === 'undefined' || !document.body
        ? filterOverlay
        : createPortal(filterOverlay, document.body))}
    </div>
  );
}


