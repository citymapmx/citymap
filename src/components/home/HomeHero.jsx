import { useNavigate } from 'react-router-dom';
import { buildCityPath } from '../../lib/domain.js';
import SlidingCategoryTrack from '../ui/SlidingCategoryTrack.jsx';
import {getCityDisplayName} from '../../hooks/useGeolocation.js';
import React, { useEffect, memo } from 'react';
import DebouncedSearchBar from './DebouncedSearchBar.jsx';
import OptimizedImage from '../ui/OptimizedImage.jsx';
import { SRCSET_CARD } from '../../lib/utils.js';
import { Sk } from '../ui/Skeleton.jsx';
import { getHeroSubtitle } from '../../lib/heroSubtitle.js';

export default memo(function HomeHero({
  dark, T, t, search, setSearch, localizedPlaceholders, phIdx, 
  locating, detectCity, userCoords, dbReady, cats, activeCat, setActiveCat, 
  activeCity, city, haptic, detectedTown, cities, onSurprise, navigate, cityImg
}) {
  const routerNavigate = useNavigate();
  const cityName = getCityDisplayName(activeCity, cities, city || detectedTown).split(",")[0];
  // Fondo con la foto de la ciudad (la misma que sube Jonathan, bg_image):
  // solo cuando la ciudad tiene foto; las demás se quedan como hoy.
  const hasBg = Boolean(cityImg);

  const heroRef = React.useRef(null);
  const bgImgRef = React.useRef(null);
  const contentRef = React.useRef(null);

  // Idea 8 de motion.dev: parallax suave en el hero de ciudad. Al bajar,
  // la foto se mueve más despacio que el contenido (se retrasa ~22 px) y
  // el saludo se desvanece un poco. Solo con foto de ciudad y sin
  // prefers-reduced-motion. Solo transform y opacidad.
  useEffect(() => {
    if (!hasBg) return;
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const heroEl = heroRef.current;
    const imgEl = bgImgRef.current;
    const contentEl = contentRef.current;
    if (!heroEl || !imgEl) return;
    let raf = 0;
    let ticking = false;
    const update = () => {
      ticking = false;
      const h = heroEl.offsetHeight || 1;
      const progress = Math.max(0, Math.min(1, window.scrollY / h));
      imgEl.style.transform = `translate3d(0, ${(progress * 22).toFixed(1)}px, 0)`;
      if (contentEl) {
        contentEl.style.opacity = String(1 - progress * 0.3);
        contentEl.style.transform = `translate3d(0, ${(-progress * 6).toFixed(1)}px, 0)`;
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
      imgEl.style.transform = '';
      if (contentEl) {
        contentEl.style.opacity = '';
        contentEl.style.transform = '';
      }
    };
  }, [hasBg]);

  const getGreeting = () => {
    const h = new Date().getHours();
    const days = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
    const dayKeys = ["home_dia_domingo", "home_dia_lunes", "home_dia_martes", "home_dia_miercoles", "home_dia_jueves", "home_dia_viernes", "home_dia_sabado"];
    const dayIdx = new Date().getDay();
    const day = t(dayKeys[dayIdx], days[dayIdx]);
    if (h >= 5 && h < 12) return `${t("home_saludo_buen", "¡Buen")} ${day}!`;
    if (h >= 12 && h < 19) return `${t("home_saludo_excelente", "¡Excelente")} ${day}!`;
    return t("home_saludo_linda_noche", "¡Linda noche!");
  };

  // Subtítulo por franja horaria (src/lib/heroSubtitle.js): de noche
  // (22:00–05:59) nunca habla de desayuno/brunch; la frase rota por día,
  // estable dentro del día, sin aleatorio en cada render.
  const contextMessage = React.useMemo(() => getHeroSubtitle(t), [t]);



  return (
    <>
    <div ref={heroRef} style={{ position: "relative", padding: "calc(env(safe-area-inset-top, 0px) + 10px) 20px 20px", display: "flex", flexDirection: "column", background: "transparent" }}>

      {/* Foto de la ciudad como fondo, optimizada a este espacio (800 px WebP),
          con degradado oscuro para que el saludo y el buscador se lean.
          La foto vive en un marco un 18% más alto que el hero para que el
          parallax no deje huecos en los bordes. */}
      {hasBg && (
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
          <div ref={bgImgRef} style={{ position: "absolute", left: 0, right: 0, top: "-9%", height: "118%" }}>
            <OptimizedImage src={cityImg} alt="" widthRequest={800} priority srcSetWidths={SRCSET_CARD} sizes="100vw" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.20) 45%, rgba(0,0,0,0.55) 100%)" }} />
        </div>
      )}

      {/* Contenido Header (Por encima del fondo) */}
      <div ref={contentRef} style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", flex: 1 }}>
        

        {/* ── Fila 2: Título Hero ── */}
        {!search && (() => {
          return (
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", marginBottom: 0, paddingTop: 0, paddingLeft: 10, paddingRight: 10, textAlign: "center", position: "relative", zIndex: 10 }}>
              <div style={{ marginBottom: 4 }}>
                <img 
                  src="/citymap.mx.png" 
                  alt="CityMap" 
                  width={127}
                  height={38}
                  style={{ height: 38, width: 127, objectFit: "contain", filter: (dark || hasBg) ? "brightness(0) invert(1)" : "brightness(0)", display: "block", margin: "0 auto" }} 
                />
              </div>
              <style>{`
                @keyframes heroGradientFlow {
                  0% { background-position: 0% center; }
                  50% { background-position: 100% center; }
                  100% { background-position: 0% center; }
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
                  animation: heroGradientFlow 8s ease-in-out infinite;
                }
                
              `}</style>
              <h1 className="text-focus-in" style={{ fontFamily: "'Montserrat', sans-serif", fontSize: "clamp(22px, 5.5vw, 28px)", fontWeight: 800, lineHeight: 1.1, margin: 0, letterSpacing: "-0.5px", color: (dark || hasBg) ? "#fff" : T.text }}>
                {getGreeting()} <span className={hasBg ? undefined : "animated-city"}>{cityName}</span>

              </h1>
              <p style={{ margin: "6px 0 0 0", fontSize: 14, fontWeight: 600, color: hasBg ? "rgba(255,255,255,0.85)" : (dark ? "rgba(255,255,255,0.7)" : "#6B7280") }}>
                {contextMessage}
              </p>
            </div>
          );
        })()}

        {/* ── Fila 3: Search Bar ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%', marginTop: search ? 76 : 10, zIndex: 10 }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
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
                background: ${dark ? '#2D2D31' : '#F8FAFC'};
                backdrop-filter: blur(24px);
                -webkit-backdrop-filter: blur(24px);
                box-shadow: ${dark ? 'inset 0 1px 1px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.1)' : 'inset 0 1px 2px rgba(0,0,0,0.03), 0 2px 6px rgba(0,0,0,0.02)'};
                z-index: 2;
                border: ${dark ? '1px solid #3F3F46' : '1px solid #ECEFF2'};
              }
              .hero-search-input {
                position: relative;
                z-index: 3;
                -webkit-appearance: none !important;
                appearance: none !important;
                background: transparent !important;
                color: ${dark ? '#F4F4F5' : '#111'} !important;
              }
              .hero-search-input::placeholder {
                color: ${dark ? '#A1A1AA' : '#6B7280'} !important;
                -webkit-text-fill-color: ${dark ? '#A1A1AA' : '#6B7280'} !important;
                opacity: 1;
                letter-spacing: 0.2px;
              }
              .hero-search-input:focus {
                outline: 2px solid ${dark ? '#A1A1AA' : '#71717A'} !important;
                outline-offset: 2px;
                box-shadow: none !important;
              }
            `}</style>
            <div className="hero-search-magic-container">
              <div className="hero-search-magic-inner"></div>
            </div>
            <DebouncedSearchBar initialValue={search} onSearch={setSearch} dark={dark} />
        </div>

        {!search && onSurprise && <button type="button" aria-label={t("home_sorprendeme", "Sorpréndeme")} title={t("home_sorprendeme", "Sorpréndeme")} onClick={onSurprise}
          style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, background: 'transparent', border: 0, borderRadius: 12, cursor: 'pointer', fontSize: 23 }}>🎲</button>}
        </div>

      </div>
    </div>

    {/* Categorías debajo de la foto, sobre el fondo de la página */}
    {!search && <div style={{ margin: "0" }}>
          <SlidingCategoryTrack dark={dark} selectedKey={activeCat} variant="dot" className="home-category-track scroll-fade-x" style={{ display: "flex", alignItems: "stretch", overflowX: "auto", paddingTop: 8, paddingBottom: 2, paddingLeft: 20, paddingRight: 20, gap: 24, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>
            <style>{`.home-category-track > .sliding-category-indicator { display: none; }`}</style>
            {!dbReady ? [1, 2, 3, 4, 5].map(i => <Sk key={i} w={76} h={16} r={4} dark={dark} style={{ flexShrink: 0, marginTop: 14, marginBottom: 14 }} />)
              : [{id: "explorar", label: t("explorar", "Explorar")}, ...(cats || []).map(c => ({ ...c, label: t(c.label, c.label) }))].map((c) => {
                const isActive = activeCat === c.id;
                const catSlug = (c.id || "").replace(/\s+/g, '-').toLowerCase();
                const catUrl = `${buildCityPath(activeCity, cities)}${c.id === "explorar" ? "" : "/c/" + catSlug}`;
                
                return (
                  <a 
                    href={catUrl}
                    aria-current={isActive ? "page" : undefined} 
                    key={c.id} 
                    onClick={(e) => { 
                      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                      e.preventDefault(); 
                      haptic?.("light"); 
                      setActiveCat?.(c.id);
                      routerNavigate(catUrl);
                      if (c.id === "explorar") {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }
                    }} 
                    style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textDecoration: "none", flexShrink: 0, minHeight: 44, boxSizing: "border-box", padding: "10px 0", borderBottom: `2px solid ${isActive ? (dark ? "#FFFFFF" : "#000000") : "transparent"}`, color: isActive ? (dark ? "#FFFFFF" : "#000000") : (dark ? "#C2C7D1" : "#788496"), fontSize: 14, fontWeight: isActive ? 700 : 500, lineHeight: "20px", whiteSpace: "nowrap", transition: "color 180ms ease, border-color 180ms ease" }}
                  >
                    {c.label}
                  </a>
                );
              })}
          </SlidingCategoryTrack>
        </div>}
    </>
  );
});
