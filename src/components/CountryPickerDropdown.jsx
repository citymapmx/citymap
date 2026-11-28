import {useDataStore} from '../store/useDataStore.js';
import {getT} from '../lib/constants.js';
import { useState, useRef, useEffect, useMemo } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import Icon from './ui/Icon.jsx';
import { useTypewriter, TYPEWRITER_CARET_STYLE } from '../lib/useTypewriter.js';
import { COUNTRY_NAMES, COUNTRY_FLAGS, citySelectionTarget } from '../lib/domain.js';
import { fuzzyMatch } from '../lib/utils.js';
import { safeAreaTop } from '../lib/safeArea.js';
import { createTouchTap } from '../lib/touchTap.js';

const FLAG_MAP = Object.fromEntries(
  Object.entries(COUNTRY_NAMES).map(([code, name]) => [name, COUNTRY_FLAGS[code] || '🌍'])
);

// Fila de ciudad (27 nov 2026): vive a nivel de módulo, no dentro del
// componente, para que su identidad no cambie en cada render: definida
// dentro, React la desmontaba y remontaba en cada tick de la máquina de
// escribir del buscador (cada 15–40 ms), y un toque que empieza sobre
// una fila y termina tras un remontaje pierde el `touchend` (y a veces
// hasta el `click`).
function CityRow({ city, selected, dark, T, onSelect }) {
  // Rastreador del toque (27 nov 2026, doble toque en iOS): la lista
  // solo tenía `onClick` y el toque que detiene el scroll con momentum
  // no dispara `click`, así que el primer toque se perdía. Al soltar
  // el dedo, si apenas se movió (~10 px), se selecciona aquí; si fue
  // un deslizamiento (scroll) no se selecciona; y el clic sintético
  // que sigue al toque se suprime para no seleccionar dos veces. Sin
  // toque previo (ratón, teclado), el `onClick` de siempre funciona.
  const tapRef = useRef(null);
  if (tapRef.current === null) tapRef.current = createTouchTap();
  const tap = tapRef.current;
  return (
    <button
      onClick={() => { if (tap.shouldIgnoreClick()) return; onSelect(city); }}
      onTouchStart={(e) => tap.touchStart(e)}
      onTouchEnd={(e) => { if (tap.touchEnd(e)) onSelect(city); }}
      onTouchCancel={() => tap.touchCancel()}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "11px 14px",
        background: selected ? (dark ? "#F4F4F5" : "#0F172A") : "transparent",
        border: "none",
        borderRadius: selected ? 10 : 0,
        cursor: "pointer",
        color: selected ? (dark ? "#18181B" : "#FFFFFF") : T.text,
        fontSize: 15,
        fontWeight: selected ? 700 : 600,
        textAlign: "left",
        transition: "all 0.15s",
        width: "100%"
      }}
      onMouseOver={e => { if (!selected) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"; }}
      onMouseOut={e => { if (!selected) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: 8 }}>
        {city.name}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {city.count > 0 && <span style={{ fontSize: 11, color: selected ? (dark ? "#52525B" : "rgba(255,255,255,0.8)") : T.sub, fontWeight: 500 }}>{city.count}</span>}
        <Icon name="chevron" size={14} color={selected ? (dark ? "#18181B" : "#FFFFFF") : T.sub} />
      </div>
    </button>
  );
}

// Conteos que ordenan Populares (27 nov 2026, doble toque): con la
// hoja abierta mandan los congelados al abrir; cerrada o sin congelar,
// los vivos. Puro, para poder probar el congelamiento sin montar nada.
export function orderCountsForPicker({ show, frozenCounts, liveCounts }) {
  return show && frozenCounts ? frozenCounts : liveCounts;
}

export default function CountryPickerDropdown({ show, cities, activeCity, onSelectCity, onDetectCity, locating, onClose, dark, isWelcome }) {
  const T = getT(dark);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedPlaceholder, setFocusedPlaceholder] = useState(null);
  const [expandedCountry, setExpandedCountry] = useState(null);
  const [expandedStates, setExpandedStates] = useState({});
  const [cityCounts, setCityCounts] = useState({});
  // Orden de Populares congelado mientras la hoja está abierta (27 nov
  // 2026, doble toque): al abrir, los conteos son 0 y ~1 s después
  // resuelve la consulta y la lista se reordena bajo el dedo. Se congela
  // el orden al abrir con los conteos ya conocidos; al volver a abrir
  // se actualiza. La consulta de conteos es una sola por sesión.
  const [frozenCounts, setFrozenCounts] = useState(null);
  const cityCountsRef = useRef(cityCounts);
  useEffect(() => { cityCountsRef.current = cityCounts; });
  useEffect(() => {
    if (show) setFrozenCounts(cityCountsRef.current);
    else setFrozenCounts(null);
  }, [show]);
  const ref = useRef(null);

  // Máquina de escribir (22 nov 2026): el buscador de ciudad escribe los
  // nombres de TODAS las ciudades registradas, con el mismo efecto del
  // buscador del inicio. Orden ALEATORIO (se baraja una vez por lista) y
  // más rápido que el inicio. Si aún no hay ciudades, la frase fija.
  const cityPhrases = useMemo(() => {
    const shuffled = [...(cities || [])];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const phrases = shuffled.map(c => `Buscar ${c.name}...`);
    return phrases.length ? phrases : ['Buscar ciudad...'];
  }, [cities]);
  const animatedHint = useTypewriter(cityPhrases, { typeMs: 40, pauseMs: 1800, deleteMs: 15, gapMs: 250, startMs: 300 });

  useEffect(()=>{
    if(show) void useDataStore.getState().refreshCities();
  },[show]);

  useEffect(() => {
    if (show) {
      const prevOverflow = document.body.style.overflow;
      const prevOverscroll = document.body.style.overscrollBehavior;
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehavior = "none";
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.overscrollBehavior = prevOverscroll;
      };
    }
  }, [show]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  useEffect(() => {
    import('../lib/supabase.js').then(({ sb }) => {
      sb.get("businesses", "?select=city_slug&status=eq.approved").then(res => {
        if (Array.isArray(res)) {
          const counts = {};
          res.forEach(r => {
            counts[r.city_slug] = (counts[r.city_slug] || 0) + 1;
          });
          setCityCounts(counts);
        }
      });
    }).catch(() => {});
  }, []);

  const handleSelectCity = (city) => {
    // Salto de dominio (nov 2026, Jonathan): el selector muestra las
    // 33 ciudades en los dos dominios; elegir una del otro dominio
    // salta a su URL canónica en ese dominio. La sesión se pierde al
    // cambiar de dominio (igual que con los 308); no se sincroniza aquí.
    const target = citySelectionTarget(city?.slug, cities);
    if (target.crossDomain) {
      onClose();
      window.location.href = target.url;
      return;
    }
    onSelectCity(city);
    onClose();
  };

  // El selector muestra TODAS las ciudades en los dos dominios (nov
  // 2026, Jonathan): las 33, agrupadas por país, sin filtro por host
  // (la lista que llega por props es la completa de la tienda).
  // Sort all cities by business count
  // La búsqueda ignora acentos (20 nov 2026: «Los Angeles» no encontraba
  // «Los Ángeles» porque el filtro comparaba el texto tal cual).
  const countsForOrder = orderCountsForPicker({ show, frozenCounts, liveCounts: cityCounts });
  const sortedCities = [...(cities || [])]
    .filter(c => !searchQuery.trim() || fuzzyMatch(searchQuery, c.name))
    .map(city => ({
      ...city,
      country: COUNTRY_NAMES[city.country_code] || "México",
      count: countsForOrder[city.slug] || 0
    }))
    .sort((a, b) => b.count - a.count);

  // Top popular cities (up to 5, only when not searching)
  const popularCities = sortedCities.slice(0, 5);



  // Group by country for the "explore" section
  const activeCountriesMap = {};
  sortedCities.forEach(city => {
    const country = city.country;
    if (!activeCountriesMap[country]) activeCountriesMap[country] = [];
    activeCountriesMap[country].push(city);
  });

  const activeCountryNames = Object.keys(activeCountriesMap).sort((a, b) => {
    const order = { "México": 1, "España": 2, "Estados Unidos": 3 };
    return (order[a] || 99) - (order[b] || 99) || a.localeCompare(b);
  });

  const currentCityObj = sortedCities.find(c => c.slug === activeCity);
  const currentCountry = currentCityObj ? currentCityObj.country : null;

  const isSearching = searchQuery.trim().length > 0;

  // La frase animada se parte en dos: «Buscar » en gris y el nombre de la
  // ciudad en azul, para que resalte (22 nov 2026).
  const hintText = focusedPlaceholder ?? animatedHint;

  const renderSectionLabel = (label) => (
    <div style={{ padding: "12px 14px 4px 14px", fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 0.8 }}>
      {label}
    </div>
  );

  const cardStyle = {
    background: T.white,
    borderRadius: 12,
    border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#e2e8f0"}`,
    boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,0.02)",
    overflow: "hidden",
    marginBottom: 8
  };

  // Trazo visible del buscador y de la fila «Cerca de mí» (22 nov 2026,
  // Jonathan): el mismo borde de las tarjetas del panel en claro
  // (#e2e8f0); en oscuro un poco más marcado que el de las tarjetas
  // para que se vea sobre el fondo oscuro.
  const fieldBorder = `1px solid ${dark ? "rgba(255,255,255,0.14)" : "#e2e8f0"}`;

  return (
    <AnimatePresence>
      {show && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: isWelcome ? "center" : "flex-end",
            overscrollBehavior: "contain",
          }}
        >
          {/* Backdrop */}
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            onTouchMove={e => e.preventDefault()}
            style={{
              position: "absolute",
              inset: 0,
              background: isWelcome ? (dark ? T.bg : "#f8fafc") : "rgba(0,0,0,0.6)",
              backdropFilter: isWelcome ? "none" : "blur(4px)",
              WebkitBackdropFilter: isWelcome ? "none" : "blur(4px)",
            }}
          />

          <m.div
            ref={ref}
            initial={isWelcome ? { opacity: 0, scale: 0.95 } : { x: '100%' }}
            animate={isWelcome ? { opacity: 1, scale: 1 } : { x: 0 }}
            exit={isWelcome ? { opacity: 0, scale: 0.95 } : { x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            onTouchMove={e => e.stopPropagation()}
            style={{
              position: "relative",
              width: isWelcome ? "100%" : "85%",
              maxWidth: isWelcome ? 400 : 320,
              height: "100dvh",
              maxHeight: "100dvh",
              boxSizing: "border-box",
              background: isWelcome ? "transparent" : (dark ? T.bg : "#ffffff"),
              borderRadius: 0,
              boxShadow: isWelcome ? "none" : (dark ? "-4px 0 24px rgba(0,0,0,0.5)" : "-4px 0 24px rgba(0,0,0,0.1)"),
              border: "none",
              overflow: isWelcome ? "auto" : "hidden",
              overscrollBehavior: "contain",
              WebkitOverflowScrolling: "touch",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-start",
              padding: isWelcome ? "calc(env(safe-area-inset-top, 0px) + clamp(32px, 6dvh, 56px)) 20px calc(env(safe-area-inset-bottom, 0px) + 24px)" : 0,
            }}
          >

        {isWelcome ? (
          <div style={{ padding: "0 0 24px 0", textAlign: "center", position: "relative", flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
              <img src="/citymap.mx.png" alt="CityMap" width={133} height={40} style={{ height: 40, width: 133, filter: dark ? 'brightness(0) invert(1)' : 'brightness(0)' }} />
            </div>
            <div style={{ textAlign: 'center', padding: '0 32px', marginBottom: 24 }}>
              <h1 style={{ fontSize: 32, fontWeight: 900, color: dark ? "#fff" : "#0f172a", lineHeight: 1.1, margin: '0 0 16px 0', letterSpacing: '-1px' }}>
                ¡Bienvenido a <br/>
                <span style={{ background: 'linear-gradient(90deg, #3B82F6, #06B6D4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  CityMap!
                </span>
              </h1>
              <p style={{ fontSize: 16, color: dark ? "#94a3b8" : "#475569", lineHeight: 1.5, margin: 0 }}>
                Selecciona tu ciudad o usa tu ubicación para descubrir lo mejor cerca de ti.
              </p>
            </div>
          </div>
        ) : (
          <div onTouchMove={e => e.preventDefault()} style={{ padding: `${safeAreaTop(24)} 20px 24px`, borderBottom: `1px solid ${dark ? T.border : '#F1F5F9'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
            <img src="/citymap.mx.png" alt="CityMap" width={107} height={32} style={{ height: 32, width: 107, filter: dark ? 'brightness(0) invert(1)' : 'brightness(0)' }} />
            <button onClick={onClose} style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: dark ? "#f8fafc" : "#0f172a" }}>
              <Icon name="x" size={24} color={dark ? "#f8fafc" : "#0f172a"} />
            </button>
          </div>
        )}

        <div style={{ flex: isWelcome ? "0 0 auto" : 1, minHeight: 0, overflowY: isWelcome ? "visible" : "auto", overscrollBehavior: "contain", WebkitOverflowScrolling: "touch", padding: isWelcome ? 0 : "16px 0" }}>

          {/* Search: la frase animada es un texto encima del input (mismo
          patrón que el buscador del inicio): el placeholder nativo queda
          vacío para que no se duplique el texto, y al escribir se esconde
          la animación. Al enfocar, la frase se congela. */}
          <div style={{ padding: "0 16px 12px 16px" }}>
            <style>{TYPEWRITER_CARET_STYLE}</style>
            <div style={{ position: "relative", display: "grid" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex", alignItems: "center", zIndex: 5 }}>
                <Icon name="search" size={15} color={dark ? "#A1A1AA" : "#64748b"} />
              </span>
              <input
                type="text"
                placeholder=""
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => setFocusedPlaceholder(animatedHint)}
                onBlur={() => setFocusedPlaceholder(null)}
                style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 100, border: fieldBorder, background: dark ? "#2D2D31" : "#FFFFFF", color: T.text, fontSize: 14, outline: "none", fontFamily: "inherit", caretColor: T.text, gridArea: "1 / 1" }}
              />
              {!searchQuery && (
                <span aria-hidden="true" style={{ gridArea: "1 / 1", alignSelf: "center", minWidth: 0, maxWidth: "100%", padding: "10px 12px 10px 34px", zIndex: 4, pointerEvents: "none", fontSize: 14, fontWeight: 400, lineHeight: "20px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textAlign: "left", color: dark ? "#A1A1AA" : "#64748b" }}>
                  {hintText.slice(0, 7)}<span style={{ color: dark ? "#60A5FA" : "#2563EB" }}>{hintText.slice(7)}</span><span className="typewriter-caret" aria-hidden="true">▏</span>
                </span>
              )}
            </div>
          </div>

          <div style={{ padding: "0 8px", display: "flex", flexDirection: "column" }}>

            {/* Fila de ubicación con trazo visible (22 nov 2026, Jonathan):
                «Cerca de mí» con borde como el buscador, título igual y
                subtítulo «Descubre cosas increíbles». La fila «Todas las
                ciudades» (inicio global) se quitó el 22 nov 2026 a
                petición de Jonathan: el muro global se alcanza desde el
                inicio. El cableado de ubicación (onDetectCity) queda
                intacto. */}
            <div style={{ marginBottom: 12 }}>
              <button
                onClick={onDetectCity}
                disabled={locating}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "transparent", border: fieldBorder, borderRadius: 12, cursor: locating ? "wait" : "pointer", color: dark ? "#f8fafc" : "#0f172a", fontSize: 15, fontWeight: 600, textAlign: "left", transition: "background 0.2s", width: "100%", opacity: locating ? 0.7 : 1 }}
                onMouseOver={e => { if (!locating) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"; }}
                onMouseOut={e => { if (!locating) e.currentTarget.style.background = "transparent"; }}
              >
                {locating ? (
                  <div style={{ width: 18, height: 18, border: `2px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`, borderTop: `2px solid ${dark ? '#fff' : '#000'}`, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
                ) : (
                  <span style={{ fontSize: 18 }}>📍</span>
                )}
                <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
                  <span>{locating ? "Buscando..." : "Cerca de mí"}</span>
                  <span style={{ fontSize: 12, fontWeight: 400, color: T.sub }}>Descubre cosas increíbles</span>
                </span>
                <Icon name="chevron" size={14} color={T.sub} />
              </button>
            </div>

            {/* Popular cities */}
            {!isSearching && (
              <div style={cardStyle}>
                {renderSectionLabel("🔥 Populares")}
                {popularCities.map(city => (
                  <CityRow key={city.slug} city={city} selected={city.slug === activeCity} dark={dark} T={T} onSelect={handleSelectCity} />
                ))}
              </div>
            )}

            {/* Search results OR country browse */}
            <div style={cardStyle}>
              {isSearching ? (
                <>
                  {renderSectionLabel("Resultados")}
                  {sortedCities.length === 0 ? (
                    <div style={{ padding: "16px 14px", fontSize: 13, color: T.sub, textAlign: "center" }}>Sin resultados</div>
                  ) : (
                    sortedCities.map(city => <CityRow key={city.slug} city={city} selected={city.slug === activeCity} dark={dark} T={T} onSelect={handleSelectCity} />)
                  )}
                </>
              ) : (
                <>
                  {renderSectionLabel("Por país")}
                  {activeCountryNames.map(country => {
                    const isExpanded = expandedCountry === country;
                    const countryCities = activeCountriesMap[country] || [];

                    return (
                      <div key={country} style={{ display: 'flex', flexDirection: 'column' }}>
                        <button
                          onClick={() => setExpandedCountry(isExpanded ? null : country)}
                          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", color: dark ? "#f8fafc" : "#0f172a", fontSize: 15, fontWeight: 600, textAlign: "left", transition: "background 0.2s", width: "100%" }}
                          onMouseOver={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"}
                          onMouseOut={e => e.currentTarget.style.background = "transparent"}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: 18 }}>{FLAG_MAP[country] || "🌍"}</span>
                            <span>{country} {currentCountry === country && <span style={{ color: T.sub, fontSize: 12, fontWeight: 500 }}>(Actual)</span>}</span>
                          </div>
                          <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={T.sub} />
                        </button>

                        {isExpanded && (() => {
                          const statesMap = {};
                          const directCities = [];
                          countryCities.forEach(city => {
                            const raw = city.state ? city.state.split(";")[0].trim() : "";
                            const s = (raw && raw.toLowerCase() !== "otros") ? raw : "";
                            if (s) {
                              if (!statesMap[s]) statesMap[s] = { state: s, cities: [], count: 0 };
                              statesMap[s].cities.push(city);
                              statesMap[s].count += city.count || 0;
                            } else {
                              directCities.push(city);
                            }
                          });
                          const sortedStates = Object.values(statesMap).sort((a, b) => b.count - a.count);
                          return (
                            // Al expandir un país, su lista de estados entra
                            // con scale-in-ver-top (se desenrolla desde
                            // arriba). El contenedor se monta nuevo en cada
                            // expansión, así que la animación se repite
                            // siempre. No toca la animación propia del panel
                            // lateral (el m.div con spring x:'100%'→0).
                            <div className="scale-in-ver-top" style={{ padding: "0 0 4px 12px", display: "flex", flexDirection: "column" }}>
                              {sortedStates.map((st, stIdx) => {
                                const stateKey = `${country}_${st.state}`;
                                const isStateExpanded = expandedStates[stateKey];
                                const isLastState = stIdx === sortedStates.length - 1 && directCities.length === 0;
                                return (
                                  <div key={st.state} style={{ display: "flex", flexDirection: "column", borderBottom: isLastState ? "none" : `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
                                    <button
                                      onClick={() => setExpandedStates(prev => ({ ...prev, [stateKey]: !prev[stateKey] }))}
                                      style={{ padding: "10px 12px", fontSize: 14, fontWeight: 600, color: dark ? "#f8fafc" : "#111827", background: "transparent", border: "none", borderRadius: 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", transition: "background 0.2s" }}
                                      onMouseOver={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"}
                                      onMouseOut={e => e.currentTarget.style.background = "transparent"}
                                    >
                                      <span>{st.state}</span>
                                      <Icon name="chevron" size={15} color={T.sub} />
                                    </button>
                                    {isStateExpanded && (
                                      <div className="scale-in-ver-top" style={{ display: "flex", flexDirection: "column" }}>
                                        {st.cities.map(city => (
                                          <CityRow key={city.slug} city={city} selected={city.slug === activeCity} dark={dark} T={T} onSelect={handleSelectCity} />
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                              {directCities.map(city => (
                                <CityRow key={city.slug} city={city} selected={city.slug === activeCity} dark={dark} T={T} onSelect={handleSelectCity} />
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
