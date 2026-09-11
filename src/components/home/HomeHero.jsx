import React from 'react';
import DebouncedSearchBar from './DebouncedSearchBar.jsx';
import { Sk } from '../ui/Skeleton.jsx';

export default function HomeHero({
  dark, T, t, search, setSearch, localizedPlaceholders, phIdx, 
  locating, detectCity, userCoords, dbReady, cats, activeCat, setActiveCat, 
  activeCity, city, haptic, detectedTown, cities
}) {
  const cityName = detectedTown || (city || "").split(",")[0] || "tu ciudad";

  

  const getGreeting = () => {
    const h = new Date().getHours();
    const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const day = days[new Date().getDay()];
    if (h >= 5 && h < 12) return `¡Buen ${day}!`;
    if (h >= 12 && h < 19) return `¡Excelente ${day}!`;
    return `¡Linda noche!`;
  };


  return (
    <div style={{ position: "relative", padding: "8px 20px 0px", minHeight: search ? "auto" : 220, display: "flex", flexDirection: "column", background: "transparent" }}>

      {/* Contenido Header (Por encima del fondo) */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
        

        {/* ── Fila 2: Título Hero ── */}
        {!search && (() => {
          return (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", marginBottom: 0, paddingTop: 10, paddingLeft: 10, paddingRight: 10, textAlign: "center", position: "relative", zIndex: 10 }}>
              <div className="hero-title-anim" style={{ marginBottom: 4 }}>
                <img 
                  src="/citymap.mx.png" 
                  alt="CityMap" 
                  style={{ height: 40, objectFit: "contain", filter: dark ? "none" : "invert(1)" }} 
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
              <h1 className="hero-title-anim" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 800, lineHeight: 1.1, margin: 0, letterSpacing: "-0.5px", color: dark ? "#fff" : T.text }}>
                {getGreeting()} <span className="animated-city">{cityName}</span>
              </h1>
            </div>
          );
        })()}

        {/* ── Fila 3: Search Bar ── */}
        <div style={{ position: "relative", width: "100%", marginTop: search ? 76 : 8, zIndex: 10 }}>
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
                background: ${dark ? 'rgba(15, 23, 42, 0.8)' : '#F3F4F6'};
                backdrop-filter: blur(24px);
                -webkit-backdrop-filter: blur(24px);
                box-shadow: ${dark ? 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.05), 0 2px 8px rgba(0,0,0,0.04)'};
                z-index: 2;
                border: ${dark ? 'none' : '1px solid #E5E7EB'};
              }
              .hero-search-input {
                position: relative;
                z-index: 3;
                -webkit-appearance: none !important;
                appearance: none !important;
                background: transparent !important;
                color: ${dark ? '#fff' : '#111'} !important;
              }
              .hero-search-input::placeholder {
                color: ${dark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(17, 17, 17, 0.5)'} !important;
                -webkit-text-fill-color: ${dark ? 'rgba(255, 255, 255, 0.85)' : 'rgba(17, 17, 17, 0.5)'} !important;
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
            <DebouncedSearchBar initialValue={search} onSearch={setSearch} placeholders={localizedPlaceholders} phIdx={phIdx} locating={locating} detectCity={detectCity} userCoords={userCoords} dark={dark} />
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
          <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", paddingTop: 8, paddingBottom: 8, paddingLeft: 20, paddingRight: 20, gap: 14, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            {!dbReady ? [1, 2, 3, 4, 5].map(i => <Sk key={i} w={56} h={56} r={28} dark={true} style={{ flexShrink: 0 }} />)
              : [{id: "explorar", label: t("explorar", "Explorar")}, ...cats.map(c => ({ ...c, label: t(c.label, c.label) }))].map((c) => {
                const isActive = activeCat === c.id
                const catSlug = (c.id || "").replace(/\s+/g, '-').toLowerCase();
                const catUrl = `/${(activeCity || city || "").split(",")[0]}${c.id === "explorar" ? "" : "/" + catSlug}`;
                
                let emojiVal = c.id === "explorar" ? "🌎" : (c.icon === "❤️" ? "🤍" : (c.emoji || c.icon || "✨"));
                let cleanEmoji = typeof emojiVal === 'string' ? emojiVal.trim() : emojiVal;
                let isImage = typeof cleanEmoji === 'string' && (cleanEmoji.toLowerCase().endsWith('.svg') || cleanEmoji.toLowerCase().endsWith('.png'));

                return (
                  <a href={catUrl} key={c.id} onClick={(e) => { e.preventDefault(); haptic("light"); setActiveCat(c.id); window.history.pushState(null, "", catUrl); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textDecoration: "none", flexShrink: 0, width: 64 }}>
                    <div style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", transition: isActive ? "none" : "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", transform: isActive ? "translateY(-4px) scale(1.1)" : "none", animation: isActive ? "catHeartbeat 2s ease-in-out infinite" : "none" }}>
                      {isImage ? (
                        <img src={`/${cleanEmoji}`} alt={c.label} style={{ width: 26, height: 26, objectFit: "contain" }} />
                      ) : (
                        <span style={{ fontSize: 26, lineHeight: 1 }}>{cleanEmoji}</span>
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
  );
}
