import { useState, useRef, useEffect } from 'react';
import Icon from './ui/Icon.jsx';
import { COUNTRY_NAMES, COUNTRY_FLAGS } from '../lib/domain.js';

const FLAG_MAP = Object.fromEntries(
  Object.entries(COUNTRY_NAMES).map(([code, name]) => [name, COUNTRY_FLAGS[code] || '🌍'])
);

export default function CountryPickerDropdown({ cities, activeCity, onSelectCity, onDetectCity, locating, onClose, dark, isWelcome }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCountry, setExpandedCountry] = useState(null);
  const [expandedStates, setExpandedStates] = useState({});
  const [cityCounts, setCityCounts] = useState({});
  const ref = useRef(null);

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
    onSelectCity(city);
    onClose();
  };

  // Sort all cities by business count
  const sortedCities = [...cities]
    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .map(city => ({
      ...city,
      country: COUNTRY_NAMES[city.country_code] || "México",
      count: cityCounts[city.slug] || 0
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

  const CityRow = ({ city, selected }) => (
    <button
      onClick={() => handleSelectCity(city)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "11px 14px",
        background: selected ? (dark ? "#1e3a5f" : "#0f172a") : "transparent",
        border: "none",
        borderRadius: selected ? 10 : 0,
        cursor: "pointer",
        color: selected ? "#ffffff" : (dark ? "#f8fafc" : "#1e293b"),
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
        {city.count > 0 && <span style={{ fontSize: 11, color: selected ? "rgba(255,255,255,0.6)" : (dark ? "#64748b" : "#94a3b8"), fontWeight: 500 }}>{city.count}</span>}
        <Icon name="chevron" size={14} color={selected ? "#ffffff" : (dark ? "#64748b" : "#94a3b8")} />
      </div>
    </button>
  );

  const SectionLabel = ({ label }) => (
    <div style={{ padding: "12px 14px 4px 14px", fontSize: 11, fontWeight: 700, color: dark ? "#475569" : "#94a3b8", textTransform: "uppercase", letterSpacing: 0.8 }}>
      {label}
    </div>
  );

  const cardStyle = {
    background: dark ? "rgba(255,255,255,0.02)" : "#ffffff",
    borderRadius: 12,
    border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#e2e8f0"}`,
    boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,0.02)",
    overflow: "hidden",
    marginBottom: 8
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: isWelcome ? (dark ? "#0f172a" : "#f8fafc") : "rgba(0,0,0,0.6)",
        backdropFilter: isWelcome ? "none" : "blur(4px)",
        WebkitBackdropFilter: isWelcome ? "none" : "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: isWelcome ? "center" : "flex-end",
      }}
    >
      <div
        ref={ref}
        style={{
          width: isWelcome ? "100%" : "85%",
          maxWidth: isWelcome ? 400 : 320,
          height: "100vh",
          background: isWelcome ? "transparent" : (dark ? "#0f172a" : "#ffffff"),
          borderRadius: 0,
          boxShadow: isWelcome ? "none" : (dark ? "-4px 0 24px rgba(0,0,0,0.5)" : "-4px 0 24px rgba(0,0,0,0.1)"),
          border: "none",
          overflowY: "auto",
          maxHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          padding: isWelcome ? "20px 20px 100px 20px" : 0,
          animation: isWelcome ? "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)" : "slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
      >
        <style>{`
          @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        `}</style>

        {isWelcome ? (
          <div style={{ padding: "0 0 24px 0", textAlign: "center", position: "relative" }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
              <img src="/citymap.mx.png" alt="CityMap" style={{ height: 40, filter: dark ? 'none' : 'brightness(0)' }} />
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
          <div style={{ padding: '24px 20px', borderBottom: `1px solid ${dark ? '#1E293B' : '#F1F5F9'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <img src="/citymap.mx.png" alt="CityMap" style={{ height: 32, filter: dark ? 'none' : 'invert(1)' }} />
            <button onClick={onClose} style={{ position: 'absolute', right: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: dark ? "#f8fafc" : "#0f172a" }}>
              <Icon name="x" size={24} color={dark ? "#f8fafc" : "#0f172a"} />
            </button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", padding: isWelcome ? 0 : "16px 0" }}>

          {/* Search */}
          <div style={{ padding: "0 16px 12px 16px" }}>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", display: "flex", alignItems: "center" }}>
                <Icon name="search" size={15} color="#64748b" />
              </span>
              <input
                type="text"
                placeholder="Buscar ciudad..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 10, border: "none", background: "#3d4455", color: "#f1f5f9", fontSize: 14, outline: "none", fontFamily: "inherit", caretColor: "#60a5fa" }}
              />
            </div>
          </div>

          <div style={{ padding: "0 8px", display: "flex", flexDirection: "column" }}>

            {/* Detect location */}
            <button
              onClick={onDetectCity}
              disabled={locating}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: dark ? "rgba(255,255,255,0.05)" : "#ffffff", border: `1px solid ${dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"}`, borderRadius: 10, cursor: locating ? "wait" : "pointer", color: dark ? "#f8fafc" : "#0f172a", boxShadow: dark ? "none" : "0 2px 4px rgba(0,0,0,0.02)", fontSize: 14, fontWeight: 600, textAlign: "left", transition: "all 0.2s", marginBottom: 12, opacity: locating ? 0.7 : 1 }}
              onMouseOver={e => { if (!locating) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.08)" : "#f8fafc"; }}
              onMouseOut={e => { if (!locating) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "#ffffff"; }}
            >
              {locating ? (
                <div style={{ width: 18, height: 18, border: `2px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`, borderTop: `2px solid ${dark ? '#fff' : '#000'}`, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
              ) : (
                <span style={{ fontSize: 16 }}>📍</span>
              )}
              <span>{locating ? "Buscando..." : "Encontrar lugares cerca de mí"}</span>
            </button>



            {/* Popular cities */}
            {!isSearching && (
              <div style={cardStyle}>
                <SectionLabel label="🔥 Populares" />
                {popularCities.map(city => (
                  <CityRow key={city.slug} city={city} selected={city.slug === activeCity} />
                ))}
              </div>
            )}

            {/* Search results OR country browse */}
            <div style={cardStyle}>
              {isSearching ? (
                <>
                  <SectionLabel label="Resultados" />
                  {sortedCities.length === 0 ? (
                    <div style={{ padding: "16px 14px", fontSize: 13, color: dark ? "#64748b" : "#94a3b8", textAlign: "center" }}>Sin resultados</div>
                  ) : (
                    sortedCities.map(city => <CityRow key={city.slug} city={city} selected={city.slug === activeCity} />)
                  )}
                </>
              ) : (
                <>
                  <SectionLabel label="Por país" />
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
                            <span>{country} {currentCountry === country && <span style={{ color: dark ? "#38bdf8" : "#0284c7", fontSize: 12, fontWeight: 500 }}>(Actual)</span>}</span>
                          </div>
                          <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={dark ? "#64748b" : "#94a3b8"} />
                        </button>

                        {isExpanded && (() => {
                          const statesMap = {};
                          countryCities.forEach(city => {
                            const s = city.state ? city.state.split(";")[0].trim() : "Otros";
                            if (!statesMap[s]) statesMap[s] = { state: s, cities: [], count: 0 };
                            statesMap[s].cities.push(city);
                            statesMap[s].count += city.count || 0;
                          });
                          const sortedStates = Object.values(statesMap).sort((a, b) => b.count - a.count);
                          return (
                            <div style={{ padding: "0 0 4px 12px", display: "flex", flexDirection: "column" }}>
                              {sortedStates.map((st, stIdx) => {
                                const stateKey = `${country}_${st.state}`;
                                const isStateExpanded = expandedStates[stateKey];
                                const isLastState = stIdx === sortedStates.length - 1;
                                return (
                                  <div key={st.state} style={{ display: "flex", flexDirection: "column", borderBottom: isLastState ? "none" : `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}` }}>
                                    <button
                                      onClick={() => setExpandedStates(prev => ({ ...prev, [stateKey]: !prev[stateKey] }))}
                                      style={{ padding: "10px 12px", fontSize: 14, fontWeight: 600, color: "#111827", background: "transparent", border: "none", borderRadius: 0, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", transition: "background 0.2s" }}
                                      onMouseOver={e => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"}
                                      onMouseOut={e => e.currentTarget.style.background = "transparent"}
                                    >
                                      <span>{st.state}</span>
                                      <Icon name="chevron" size={15} color={dark ? "#64748b" : "#94a3b8"} />
                                    </button>
                                    {isStateExpanded && st.cities.map(city => (
                                      <CityRow key={city.slug} city={city} selected={city.slug === activeCity} />
                                    ))}
                                  </div>
                                );
                              })}
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
      </div>
    </div>
  );
}
