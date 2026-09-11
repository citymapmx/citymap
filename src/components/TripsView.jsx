import { useState, useEffect, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import Icon from "./ui/Icon.jsx";
import ExperienceViewer from "./ExperienceViewer.jsx";
import { useDataStore } from "../store/useDataStore.js";
import { useUIStore } from "../store/useUIStore.js";
import { useAppContext } from "../context/AppContext";
import { Helmet } from "react-helmet-async";
import { useTranslation } from "../hooks/useTranslation.js";
import { createSlug } from "../lib/utils.js";
import { getThumbUrl, METRO_ZONES, isNear } from "../lib/utils.js";
import CityEmptyState from "./CityEmptyState.jsx";
import * as dbService from "../services/dbService.js";

// Widget de Tiqets — se inyecta como script dinámico para evitar problemas con React
function TiqetsWidget({ T, dark }) {
  const { t } = useTranslation();
  const containerId = "tiqets-widget-cdmx";
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container || container.dataset.loaded) return;
    container.dataset.loaded = "true";
    const script = document.createElement("script");
    script.async = true;
    script.charset = "utf-8";
    script.src = "https://tpwdg.com/content?currency=USD&trs=555782&shmarker=757167.https%3A%2F%2Ftpmedia%2Fr%3Fmarker%3D757167%26trs%3D555782%26p%3D2074%26u%3Dhttps%253A%252F%252Fwww.tiqets.com%252Fes%252F&campaign_id%3D89&language=es&locale=74040&layout=full&cards=4&powered_by=true&campaign_id=89&promo_id=3947";
    container.appendChild(script);
    return () => { if (container) container.dataset.loaded = ""; };
  }, []);

  return (
    <div style={{ marginTop: 32, padding: "0 0 8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, textAlign: "center" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>
          {t("tours_populares_en", "Tours populares en ")}<span className="exp-city-anim">Ciudad de México</span>
        </h3>
      </div>
      <div id={containerId} style={{ borderRadius: 16, overflow: "hidden" }} />
    </div>
  );
}

// Widget de Viator — Puerto Vallarta
function ViatorWidgetPV({ T, dark }) {
  const { t } = useTranslation();
  const containerId = "viator-widget-pv";
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container || container.dataset.loaded) return;
    container.dataset.loaded = "true";
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.viator.com/orion/partner/widget.js";
    container.appendChild(script);
    return () => { if (container) container.dataset.loaded = ""; };
  }, []);

  return (
    <div style={{ marginTop: 32, padding: "0 0 8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, textAlign: "center" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>
          {t("tours_populares_en", "Tours populares en ")}<span className="exp-city-anim">Puerto Vallarta</span>
        </h3>
      </div>
      <div id={containerId} style={{ borderRadius: 16, overflow: "hidden" }}>
        <div data-vi-partner-id="U00845494" data-vi-widget-ref="W-f3da4858-a4be-4a0f-9bd8-65ce71caad9d"></div>
      </div>
    </div>
  );
}

// Widget de Viator — Los Ángeles
function ViatorWidgetLA({ T, dark }) {
  const { t } = useTranslation();
  const containerId = "viator-widget-la";
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container || container.dataset.loaded) return;
    container.dataset.loaded = "true";
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.viator.com/orion/partner/widget.js";
    container.appendChild(script);
    return () => { if (container) container.dataset.loaded = ""; };
  }, []);

  return (
    <div style={{ marginTop: 32, padding: "0 0 8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, textAlign: "center" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>
          {t("tours_populares_en", "Tours populares en ")}<span className="exp-city-anim">Los Ángeles</span>
        </h3>
      </div>
      <div id={containerId} style={{ borderRadius: 16, overflow: "hidden" }}>
        <div data-vi-partner-id="U00845494" data-vi-widget-ref="W-4d13c84f-067e-4ba8-a488-4ca3b8e708bf"></div>
      </div>
    </div>
  );
}

// Widget de Tiqets — Madrid
function TiqetsMadridWidget({ T, dark }) {
  const { t } = useTranslation();
  const containerId = "tiqets-widget-madrid";
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container || container.dataset.loaded) return;
    container.dataset.loaded = "true";
    const script = document.createElement("script");
    script.async = true;
    script.charset = "utf-8";
    script.src = "https://tpwdg.com/content?currency=EUR&trs=555782&shmarker=757167&language=es&locale=66254&layout=responsive&cards=10&powered_by=true&campaign_id=89&promo_id=3947";
    container.appendChild(script);
    return () => { if (container) container.dataset.loaded = ""; };
  }, []);

  return (
    <div style={{ marginTop: 32, padding: "0 0 8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, textAlign: "center" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>
          {t("tours_populares_en", "Tours populares en ")}<span className="exp-city-anim">Madrid</span>
        </h3>
      </div>
      <div id={containerId} style={{ borderRadius: 16, overflow: "hidden" }} />
    </div>
  );
}

// Widget de Tiqets — Madrid (compacto vertical, producto específico)
function TiqetsMadridWidget2({ T, dark }) {
  const { t } = useTranslation();
  const containerId = "tiqets-widget-madrid-2";
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container || container.dataset.loaded) return;
    container.dataset.loaded = "true";
    const script = document.createElement("script");
    script.async = true;
    script.charset = "utf-8";
    script.src = "https://tpwdg.com/content?currency=EUR&trs=555782&shmarker=757167&product=1128464&language=es&layout=compact&orientation=vertical&powered_by=true&campaign_id=89&promo_id=3984";
    container.appendChild(script);
    return () => { if (container) container.dataset.loaded = ""; };
  }, []);

  return (
    <div style={{ marginTop: 20, padding: "0 0 8px" }}>
      <div id={containerId} style={{ borderRadius: 16, overflow: "hidden" }} />
    </div>
  );
}

// Widget de Tiqets — París
function TiqetsParisWidget({ T, dark }) {
  const { t } = useTranslation();
  const containerId = "tiqets-widget-paris";
  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container || container.dataset.loaded) return;
    container.dataset.loaded = "true";
    const script = document.createElement("script");
    script.async = true;
    script.charset = "utf-8";
    script.src = "https://tpwdg.com/content?currency=EUR&trs=555782&shmarker=757167&language=en&locale=66746&layout=horizontal&cards=20&powered_by=true&campaign_id=89&promo_id=3947";
    container.appendChild(script);
    return () => { if (container) container.dataset.loaded = ""; };
  }, []);

  return (
    <div style={{ marginTop: 32, padding: "0 0 8px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, textAlign: "center" }}>
        <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: T.text }}>
          {t("tours_populares_en", "Tours populares en ")}<span className="exp-city-anim">París</span>
        </h3>
      </div>
      <div id={containerId} style={{ borderRadius: 16, overflow: "hidden" }} />
    </div>
  );
}

function TravelHub({ T, dark }) {
  const { t } = useTranslation();
  const links = [
    { id: 'vuelos', emoji: '✈️', title: t("vuelos_baratos", "Vuelos Baratos"), desc: t("vuelos_baratos_desc", "Rutas al mejor precio"), url: 'https://expedia.com/affiliate/G4ETQnX' },
    { id: 'hospedaje', emoji: '🏨', img: '/booking.png', title: t("hospedaje_ideal", "Hospedaje Ideal"), desc: t("hospedaje_ideal_desc", "Reserva tu estancia"), url: 'https://booking.stay22.com/citymapmx/MQbyFZdMFZ' },
    { id: 'autos', emoji: '🚗', title: t("renta_autos", "Renta de Autos"), desc: t("renta_autos_desc", "Muévete a tu ritmo"), url: 'https://expedia.com/affiliate/DTtL3D8' },
    { id: 'tours', emoji: '🎟️', img: '/getyourguide.png', title: t("tours_tickets", "Tours y Tickets"), desc: t("tours_tickets_desc", "Asegura tu lugar"), url: 'https://getyourguide.stay22.com/citymapmx/594Wk5DWwJ' }
  ];

  return (
    <div style={{ marginTop: 24, padding: "0 4px", display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
      <h3 style={{ margin: "0 0 4px 0", fontFamily: "var(--heading)", fontWeight: 900, fontSize: 19, color: T.text, lineHeight: 1.1, letterSpacing: "-0.5px" }}>{t("arma_viaje_ideal", "Arma tu viaje ideal")}</h3>
      <p style={{ fontSize: 13, color: T.sub, margin: "0 0 20px 0", lineHeight: 1.4 }}>{t("arma_viaje_ideal_desc", "Reserva todo lo que necesitas para tu siguiente aventura.")}</p>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, width: "100%" }}>
        {links.map(l => (
          <div key={l.id} onClick={() => window.open(l.url, '_blank')} className="press" style={{ cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{ width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", background: dark ? "rgba(255,255,255,0.05)" : "#F3F4F6", borderRadius: 14 }}>
              {l.img ? <img src={l.img} alt={l.title} style={{ width: 26, height: 26, objectFit: "contain", borderRadius: 4 }} /> : <span style={{ fontSize: 24, lineHeight: 1 }}>{l.emoji}</span>}
            </div>
            <div style={{ fontWeight: 800, fontSize: 11, color: T.text, lineHeight: 1.2, width: "100%", padding: "0 2px" }}>{l.title}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const DISCOVER_FILTERS = [
  { id: "all", label: "✨ Todos" },
  { id: "tour", label: "🗺️ Tours" },
  { id: "senderismo", label: "🥾 Senderismo" },
  { id: "evento", label: "🎟️ Eventos" },
  { id: "parque", label: "🎡 Parques" },
  { id: "experiencia", label: "🌟 Experiencias" },
  { id: "show", label: "🎭 Shows" },
  { id: "obra", label: "🎬 Teatro" },
  { id: "clase", label: "🎨 Clases" },
  { id: "gastronómica", label: "🌮 Gastronomía" },
  { id: "urbana", label: "🏙️ Urbana" },
  { id: "playa", label: "🏖️ Playa" },
  { id: "aventura", label: "🧗 Aventura" },
  { id: "retiro", label: "🧘‍♀️ Bienestar" },
];

function ExperienceCard({ exp, href, onClick, isSaved, onToggleSave, T, dark }) {
  const { t } = useTranslation();
  const photos = Array.isArray(exp.gallery) ? exp.gallery : [];
  const priceFormatted = exp.price > 0 ? `$${exp.price} MXN` : t("gratis", "Gratis");

  const showGrid = photos.length >= 2;

  return (
    <a href={href} onClick={(e) => { e.preventDefault(); onClick(); }} className="press" style={{ display: "block", textDecoration: "none", background: dark ? "rgba(255,255,255,0.03)" : "#fff", borderRadius: 20, overflow: "hidden", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", border: `1px solid ${T.border}`, position: "relative" }}>
      <div style={{ display: showGrid ? "grid" : "block", gridTemplateColumns: showGrid ? "1.5fr 1fr" : "none", gridTemplateRows: showGrid ? "1fr 1fr" : "none", aspectRatio: "21/9", width: "100%", gap: 3, position: "relative" }}>
        <div style={{ gridRow: showGrid ? "1 / 3" : "auto", height: showGrid ? "auto" : "100%", background: dark ? "#222" : "#E5E7EB", position: "relative", overflow: "hidden" }}>
          {photos[0] && <img src={getThumbUrl(photos[0], 600)} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
        </div>
        {showGrid && (
          <>
            <div style={{ background: dark ? "#333" : "#D1D5DB", position: "relative", overflow: "hidden" }}>
              {photos[1] && <img src={getThumbUrl(photos[1], 400)} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            </div>
            <div style={{ background: dark ? "#444" : "#9CA3AF", position: "relative", overflow: "hidden" }}>
              {photos[2] && <img src={getThumbUrl(photos[2], 400)} alt="" loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
            </div>
          </>
        )}
        {/* Gradient removed as per user request */}
        
        <div style={{ position: "absolute", top: 10, left: 10, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(8px)", color: "#fff", padding: "2px 8px", borderRadius: 12, fontSize: 9, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, border: "1px solid rgba(255,255,255,0.2)" }}>
          {t(exp.activity_type || "EXPERIENCIA", exp.activity_type || "EXPERIENCIA")}
        </div>
        
        <button 
          onClick={e => { e.preventDefault(); e.stopPropagation(); onToggleSave(); }}
          style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", cursor: "pointer", width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", zIndex: 10, filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.6))" }}
        >
          <Icon name={isSaved ? "heart_overlay_f" : "heart_overlay"} size={26} color="none" />
        </button>
        
        <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, display: "flex", gap: 12, zIndex: 10 }}>
          {exp.duration && (
            <span style={{ fontSize: 12, color: "#fff", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
              <Icon name="clock" size={12} color="#fff" /> {exp.duration}
            </span>
          )}
          {exp.people && (
            <span style={{ fontSize: 12, color: "#fff", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
              <Icon name="user" size={12} color="#fff" /> {exp.people}
            </span>
          )}
          <span style={{ fontSize: 12, color: "#fff", fontWeight: 600, display: "flex", alignItems: "center", gap: 4, textShadow: "0 1px 3px rgba(0,0,0,0.8)" }}>
            <Icon name="heart" size={12} color="#fff" /> {exp.id ? (exp.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 350 + 24) : 120}
          </span>
        </div>
        
      </div>

      <div style={{ padding: "14px 16px", textAlign: "center" }}>
        <h3 style={{ margin: 0, fontFamily: "var(--heading)", fontWeight: 900, fontSize: 19, color: T.text, lineHeight: 1.1, letterSpacing: "-0.5px" }}>
          {exp.title}
        </h3>
      </div>
    </a>
  );
}

export default function TripsView({ T, dark, navigate, mapPins = [], activeCity = "", cities = [], user, userCoords = null, profile, initialPlanId, initialJoinToken, onInitialPlanOpened }) {
  const { t, lang } = useTranslation();
  const ctx = useAppContext();
  const isAdmin = ctx?.isAdmin || false;
  const savedExpIds = ctx?.savedExpIds || [];
  const setSavedExpIds = ctx?.setSavedExpIds || (() => {});
  
  const { experiences, dbReady } = useDataStore();
  const selectedExpSlug = useUIStore(s => s.selectedExpSlug);
  const setSelectedExpSlug = useUIStore(s => s.setSelectedExpSlug);

  const [isViewing, setIsViewing] = useState(false);
  const [viewingPlan, setViewingPlan] = useState(null);
  
  const [publicPlans, setPublicPlans] = useState([]);
  
  const handleAdminDeletePlan = async (planId, e) => {
    e.stopPropagation();
    if (!window.confirm(t("confirm_delete_plan", "¿Seguro que deseas eliminar este plan público? (Acción de administrador)"))) return;
    try {
      await dbService.deleteItinerary(planId);
      setPublicPlans(prev => prev.filter(p => p.id !== planId));
    } catch (err) {
      alert(t("error_delete_plan", "Error al eliminar plan: ") + err.message);
    }
  };
  
  useEffect(() => {
     
    dbService.getPublicItineraries().then(res => setPublicPlans(res));
  }, []);
  
  // Auto-open experience from URL
  useEffect(() => {
    if (selectedExpSlug && experiences.length > 0 && !isViewing) {
      const match = experiences.find(e => e.id === selectedExpSlug || createSlug(e.title) === selectedExpSlug);
      if (match) {
         
        setViewingPlan(match);
         
        setIsViewing(true);
      }
    }
  }, [selectedExpSlug, experiences, isViewing]);

  // Keep URL in sync with active city (base /experiencias/:city URL)
  useEffect(() => {
    if (activeCity && !isViewing) {
      const target = `/experiencias/${activeCity}`;
      if (window.location.pathname !== target && !window.location.pathname.startsWith(`/experiencias/${activeCity}/`)) {
        window.history.replaceState({}, '', target);
      }
    }
  }, [activeCity, isViewing]);
  
  const [discoverFilter, setDiscoverFilter] = useState("all");
  const [searchQ, setSearchQ] = useState("");
  const [visibleCount, setVisibleCount] = useState(6);
  
  useEffect(() => {
     
    setVisibleCount(6);
  }, [discoverFilter, searchQ]);

  const cityName = cities.find(c => c.slug === activeCity)?.name || (activeCity ? activeCity.charAt(0).toUpperCase() + activeCity.slice(1) : t("tu_ciudad", "tu ciudad"));

  const toggleSaveExp = (exp) => {
    const isSaved = savedExpIds.includes(exp.id);
    const nw = isSaved ? savedExpIds.filter(x => x !== exp.id) : [...savedExpIds, exp.id];
    setSavedExpIds(nw);
    localStorage.setItem("cg_saved_exp", JSON.stringify(nw));
  };

  const filteredDiscover = useMemo(() => {
    let filtered = experiences.filter(e => isNear(e, userCoords, activeCity));
    
    if (discoverFilter && discoverFilter !== "all" && discoverFilter !== "trending") {
      filtered = filtered.filter(p => p.activity_type && p.activity_type.toLowerCase().includes(discoverFilter));
    }
    
    if (searchQ) {
      const q = searchQ.toLowerCase();
      filtered = filtered.filter(p => 
        (p.title && p.title.toLowerCase().includes(q)) || 
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.activity_type && p.activity_type.toLowerCase().includes(q))
      );
    }
    
    // Sort by publication date (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
  }, [experiences, searchQ, activeCity, discoverFilter, userCoords]);

  const availableFilters = useMemo(() => {
    const cityExps = experiences.filter(e => isNear(e, userCoords, activeCity));
    const validIds = new Set(["all", "trending"]);
    DISCOVER_FILTERS.forEach(f => {
      if (f.id === "all" || f.id === "trending") return;
      if (cityExps.some(p => p.activity_type && p.activity_type.toLowerCase().includes(f.id))) {
        validIds.add(f.id);
      }
    });
    return DISCOVER_FILTERS.filter(f => validIds.has(f.id));
  }, [experiences, activeCity, userCoords]);

  const shortCity = cityName.split(",")[0];

  // Si la ciudad no tiene lugares registrados (y por ende ni experiencias), mostramos el empty state global.
  if (dbReady && mapPins.length === 0) {
    return (
      <div style={{ paddingBottom: 84, minHeight: "100vh", display: "flex", flexDirection: "column", background: dark ? "#0a0a0a" : "#F7F8F6" }}>
        <div style={{ padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <h1 style={{ fontFamily: "var(--heading)", letterSpacing: 0.5, fontSize: 32, color: T.text, margin: 0, lineHeight: 1.15 }}>{t("experiencias", "Experiencias")}</h1>
        </div>
        <CityEmptyState activeCity={activeCity} userCoords={userCoords} cities={cities} T={T} dark={dark} />
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 100, minHeight: "100vh", background: T.bg, fontFamily: "inherit" }}>
      {/* ── Hero Header ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 40, background: T.glassBg, backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)", borderBottom: `1px solid ${T.glassBorder}` }}>
        <style>{`
          @keyframes expGradientFlow {
            0% { background-position: 100% center; }
            100% { background-position: 0% center; }
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
        <div style={{ padding: "calc(env(safe-area-inset-top, 0px) + 10px) 20px 6px", textAlign: "center" }}>
          <img
            src="/citymap.mx.png"
            alt="CityMap"
            style={{ height: 44, objectFit: "contain", filter: dark ? "none" : "brightness(0)", marginBottom: 4, display: "block", margin: "0 auto 4px" }}
          />
          <p className="exp-subtitle-anim" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.sub, lineHeight: 1.4 }}>
            {t("descubre_actividades", "Descubre actividades increíbles en ")}<span className="exp-city-anim">{shortCity}</span>
          </p>
        </div>
        <style>{`
          @keyframes pillGradientFlow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animated-pill {
            background: #0f172a !important;
            border-color: #0f172a !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.25) !important;
            animation: none !important;
          }
        `}</style>
        {availableFilters.length > 1 && (
          <div style={{ display: "flex", gap: 8, padding: "4px 20px 14px", overflowX: "auto", scrollbarWidth: "none" }}>
            {availableFilters.map(f => {
              const isActive = discoverFilter === f.id;
              const transLabels = {
                all: t("todos_filter", "✨ Todos"),
                tour: t("tours_filter", "🗺️ Tours"),
                senderismo: t("senderismo_filter", "🥾 Senderismo"),
                evento: t("eventos_filter", "🎟️ Eventos"),
                parque: t("parques_filter", "🎡 Parques"),
                experiencia: t("experiencias_filter", "🌟 Experiencias"),
                show: t("shows_filter", "🎭 Shows"),
                obra: t("teatro_filter", "🎬 Teatro"),
                clase: t("clases_filter", "🎨 Clases"),
                gastronómica: t("gastronomia_filter", "🌮 Gastronomía"),
                urbana: t("urbana_filter", "🏙️ Urbana"),
                playa: t("playa_filter", "🏖️ Playa"),
                aventura: t("aventura_filter", "🧗 Aventura"),
                retiro: t("bienestar_filter", "🧘‍♀️ Bienestar")
              };
              const fLabel = transLabels[f.id] || f.label;
              return (
                <button key={f.id} onClick={() => setDiscoverFilter(f.id)} className={isActive ? "animated-pill press" : "press"} style={{ padding: "8px 16px", background: dark ? "rgba(255,255,255,0.05)" : T.white, color: isActive ? "#fff" : T.sub, border: `1px solid ${T.border}`, borderRadius: 20, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.2s" }}>
                  {fLabel}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ padding: "16px 20px" }}>
        <div style={{ position: "relative", marginBottom: 0 }}>
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: T.sub }}><Icon name="search" size={18} /></div>
          <input type="text" placeholder={t("buscar_exp_placeholder", "Buscar experiencias, tours, gastronomía...")} value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ width: "100%", padding: "14px 14px 14px 42px", background: dark ? "rgba(255,255,255,0.05)" : T.white, border: `1px solid ${T.border}`, borderRadius: 16, fontSize: 15, color: T.text, outline: "none", boxSizing: "border-box" }} />
        </div>
        
        {/* Hub Planifica tu Viaje al inicio */}
        <div style={{ marginBottom: 24 }}>
          <TravelHub T={T} dark={dark} />
        </div>

        {/* Planes de la Comunidad */}
        {publicPlans.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <h3 style={{ margin: "0 0 12px 0", fontFamily: "var(--heading)", fontWeight: 900, fontSize: 19, color: T.text, lineHeight: 1.1, letterSpacing: "-0.5px" }}>
              {t("planes_comunidad", "Planes de la Comunidad 🗺️")}
            </h3>
            <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 16, scrollbarWidth: "none" }}>
              {publicPlans.map(plan => (
                <div 
                  key={plan.id}
                  onClick={() => navigate(`plan_${plan.share_token}`)}
                  className="press"
                  style={{ width: 220, flexShrink: 0, background: dark ? "rgba(255,255,255,0.03)" : "#fff", borderRadius: 20, border: `1px solid ${T.border}`, cursor: "pointer", boxShadow: "0 4px 16px rgba(0,0,0,0.04)", overflow: "hidden", display: "flex", flexDirection: "column", position: "relative" }}
                >
                  {isAdmin && (
                    <button 
                      onClick={(e) => handleAdminDeletePlan(plan.id, e)}
                      style={{ position: "absolute", top: 8, right: 8, zIndex: 10, background: "rgba(239, 68, 68, 0.9)", border: "none", color: "white", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Icon name="trash" size={14} />
                    </button>
                  )}
                  {plan.cover_image ? (
                    <img src={plan.cover_image} alt="" style={{ width: "100%", height: 120, objectFit: "cover" }} loading="lazy" />
                  ) : (
                    <div style={{ height: 120, background: `linear-gradient(135deg, ${T.text} 0%, ${T.sub} 100%)` }} />
                  )}
                  <div style={{ padding: "12px 16px 16px", flex: 1, display: "flex", flexDirection: "column", textAlign: "left", gap: 10 }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                      {plan.title || t("plan_sin_titulo", "Plan sin título")}
                    </h4>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: T.sub, fontWeight: 600, marginTop: "auto" }}>
                      <div style={{ width: 20, height: 20, borderRadius: "50%", background: T.border, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon name="user" size={12} color={T.sub} />
                      </div>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {plan.author_name || t("comunidad", "Comunidad")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {filteredDiscover.length > 0 ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {filteredDiscover.slice(0, visibleCount).map(exp => {
                const href = `/experiencias/${activeCity}/${createSlug(exp.title)}`;
                return (
                <ExperienceCard 
                  key={exp.id} 
                  exp={exp} 
                  href={href}
                  onClick={() => { 
                    setViewingPlan(exp); 
                    setIsViewing(true); 
                    setSelectedExpSlug(createSlug(exp.title));
                    window.history.pushState({}, '', href);
                  }} 
                  isSaved={savedExpIds.includes(exp.id)} 
                  onToggleSave={() => toggleSaveExp(exp)} 
                  T={T} 
                  dark={dark} 
                />
                );
              })}
            </div>
            {visibleCount < filteredDiscover.length && (
              <div style={{ display: "flex", justifyContent: "center", marginTop: 24, marginBottom: 8 }}>
                <button 
                  onClick={() => setVisibleCount(prev => prev + 6)}
                  className="press"
                  style={{ padding: "14px 28px", background: dark ? "#333" : "#fff", border: `1px solid ${T.border}`, borderRadius: 24, color: T.text, fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
                >
                  {t("cargar_mas_planes", "Cargar más planes")}
                </button>
              </div>
            )}
          </>
        ) : (
          // Solo mostrar el empty state si la ciudad NO tiene widgets propios
          ![ "ciudad-de-mexico", "puerto-vallarta", "los-angeles", "madrid", "paris"].includes(activeCity) && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: T.sub }}>
              <span style={{ fontSize: 48 }}>🌅</span>
              <h3 style={{ marginTop: 16, fontWeight: 800, color: T.text }}>{searchQ ? t("no_resultados", "No hay resultados") : t("pronto_experiencias", "Pronto habrá experiencias")}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.6 }}>{searchQ ? t("buscar_otras_palabras", "Intenta buscando con otras palabras.") : `${t("preparando_experiencias", "Estamos preparando las mejores experiencias en")} ${cityName}.`}</p>
            </div>
          )
        )}
        
        {/* Banner Final CTA */}
        {/* Tiqets widget — solo en Ciudad de México */}
        {activeCity === "ciudad-de-mexico" && <TiqetsWidget T={T} dark={dark} />}
        {/* Viator widget — solo en Puerto Vallarta */}
        {activeCity === "puerto-vallarta" && <ViatorWidgetPV T={T} dark={dark} />}
        {/* Viator widget — solo en Los Ángeles */}
        {activeCity === "los-angeles" && <ViatorWidgetLA T={T} dark={dark} />}
        {/* Tiqets widgets — solo en Madrid */}
        {activeCity === "madrid" && <TiqetsMadridWidget T={T} dark={dark} />}
        {activeCity === "madrid" && <TiqetsMadridWidget2 T={T} dark={dark} />}
        {/* Tiqets widget — solo en París */}
        {activeCity === "paris" && <TiqetsParisWidget T={T} dark={dark} />}
      </div>
      <AnimatePresence>
        {isViewing && (
          <ExperienceViewer 
            exp={viewingPlan} 
            T={T} 
            dark={dark} 
            onClose={() => { 
              setIsViewing(false); 
              setViewingPlan(null); 
              setSelectedExpSlug(null);
              window.history.pushState({}, '', `/experiencias/${activeCity}`);
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
