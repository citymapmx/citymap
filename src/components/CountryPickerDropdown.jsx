import React, { useState, useRef, useEffect } from 'react';
import Icon from './ui/Icon.jsx';
import { COUNTRY_NAMES, COUNTRY_FLAGS } from '../lib/domain.js';

const FLAG_MAP = Object.fromEntries(
  Object.entries(COUNTRY_NAMES).map(([code, name]) => [name, COUNTRY_FLAGS[code] || '🌍'])
);

export default function CountryPickerDropdown({ cities, activeCity, onSelectCity, onDetectCity, locating, onClose, dark, isWelcome }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCountry, setExpandedCountry] = useState(null);
  const [showAllCities, setShowAllCities] = useState(false);
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
    if (isWelcome && !expandedCountry) {
      setExpandedCountry("México");
    }
  }, [isWelcome]);

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

  const activeCountriesMap = {};
  
  // Sort cities globally by count first and filter by search query
  const sortedCities = [...cities]
  .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  .map(city => ({
    ...city,
    // Use country_code from DB; fall back to detecting known slugs
    country: COUNTRY_NAMES[city.country_code] || (city.country_code ? (COUNTRY_NAMES[city.country_code] || city.country_code) : "México"),
    count: cityCounts[city.slug] || 0
  })).sort((a, b) => b.count - a.count);

  sortedCities.forEach(city => {
    const country = city.country;
    if (!activeCountriesMap[country]) {
      activeCountriesMap[country] = [];
    }
    activeCountriesMap[country].push(city);
  });

  const activeCountryNames = Object.keys(activeCountriesMap);
  const comingSoonCountries = [];

  const currentCityObj = sortedCities.find(c => c.slug === activeCity);
  const currentCountry = currentCityObj ? currentCityObj.country : null;

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
        justifyContent: "center",
        padding: isWelcome ? 0 : 20
      }}
    >
      <div 
        ref={ref}
        style={{
        width: "100%",
        maxWidth: isWelcome ? 400 : 320,
        height: isWelcome ? "100vh" : "auto",
        background: isWelcome ? "transparent" : (dark ? "#1e293b" : "#ffffff"),
        borderRadius: isWelcome ? 0 : 20,
        boxShadow: isWelcome ? "none" : (dark ? "0 10px 40px rgba(0,0,0,0.5)" : "0 10px 40px rgba(0,0,0,0.1)"),
        border: isWelcome ? "none" : `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
        overflowY: "auto",
        maxHeight: isWelcome ? "100vh" : "85vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        padding: isWelcome ? "20px 20px 100px 20px" : 0,
        animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
      }}>
        <style>{`
          @keyframes scaleIn {
            from { transform: scale(0.95); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}</style>
      {isWelcome ? (
        <div style={{ padding: "0 0 24px 0", textAlign: "center", position: "relative" }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
            <img src="/citymap.mx.png" alt="CityMap" style={{ height: 40, filter: dark ? 'none' : 'brightness(0)' }} />
          </div>

          {/* Texts */}
          <div style={{ textAlign: 'center', padding: '0 32px', marginBottom: 24 }}>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: dark ? "#fff" : "#0f172a", lineHeight: 1.1, margin: '0 0 16px 0', letterSpacing: '-1px' }}>
              ¡Bienvenido a <br/>
              <span style={{ 
                background: 'linear-gradient(90deg, #3B82F6, #60A5FA)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                CityMap!
              </span>
            </h1>
            <p style={{ fontSize: 16, color: dark ? "#94a3b8" : "#475569", lineHeight: 1.5, margin: 0 }}>
              Selecciona tu ciudad o usa tu ubicación para descubrir lo mejor cerca de ti.
            </p>
          </div>
        </div>
      ) : (
        <div style={{
          padding: "16px 16px 8px 16px",
          display: "flex",
          alignItems: "center",
          position: "relative"
        }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              padding: 4,
              cursor: "pointer",
              color: dark ? "#94a3b8" : "#64748b",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              transition: "background 0.2s",
              position: "absolute",
              left: 12
            }}
            onMouseOver={(e) => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}
            onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
          >
            <Icon name="x" size={16} />
          </button>
          <span style={{
            flex: 1,
            textAlign: "center",
            fontSize: 10,
            fontWeight: 700,
            color: dark ? "#94a3b8" : "#64748b",
            letterSpacing: 1.2,
            textTransform: "uppercase"
          }}>
            Cambiar Destino
          </span>
        </div>
      )}
      
      <div style={{ padding: "0 12px 10px 12px" }}>
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <span style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
            display: "flex",
            alignItems: "center"
          }}>
            <Icon name="search" size={15} color="#64748b" />
          </span>
          <input 
            type="text" 
            placeholder="Buscar ciudad..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px 10px 34px",
              borderRadius: 10,
              border: "none",
              background: "#3d4455",
              color: "#f1f5f9",
              fontSize: 14,
              outline: "none",
              fontFamily: "inherit",
              caretColor: "#60a5fa"
            }}
          />
        </div>
      </div>
      
      <div style={{ padding: "0 8px 8px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
        
        {/* Detect location button */}
        <button
          onClick={onDetectCity}
          disabled={locating}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            background: dark ? "rgba(255, 255, 255, 0.05)" : "#ffffff",
            border: `1px solid ${dark ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0"}`,
            borderRadius: 10,
            cursor: locating ? "wait" : "pointer",
            color: dark ? "#f8fafc" : "#0f172a",
            boxShadow: dark ? "none" : "0 2px 4px rgba(0,0,0,0.02)",
            fontSize: 14,
            fontWeight: 600,
            textAlign: "left",
            transition: "all 0.2s",
            marginBottom: 4,
            opacity: locating ? 0.7 : 1
          }}
          onMouseOver={(e) => {
            if (!locating) e.currentTarget.style.background = dark ? "rgba(255, 255, 255, 0.08)" : "#f8fafc";
          }}
          onMouseOut={(e) => {
            if (!locating) e.currentTarget.style.background = dark ? "rgba(255, 255, 255, 0.05)" : "#ffffff";
          }}
        >
          {locating ? (
            <div style={{ width: 18, height: 18, border: `2px solid ${dark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'}`, borderTop: `2px solid ${dark ? '#fff' : '#000'}`, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
          ) : (
            <span style={{ fontSize: 16 }}>📍</span>
          )}
          <span>{locating ? "Buscando..." : "Encontrar lugares cerca de mí"}</span>
        </button>
        
        <div style={{
          background: dark ? "rgba(255,255,255,0.02)" : "#ffffff",
          borderRadius: 12,
          border: `1px solid ${dark ? "rgba(255,255,255,0.05)" : "#e2e8f0"}`,
          boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,0.02)",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: 4,
          marginTop: 8
        }}>
        {activeCountryNames.map(country => {
          const isExpanded = expandedCountry === country || (!expandedCountry && currentCountry === country && activeCountryNames.length === 1);
          const countryCities = activeCountriesMap[country] || [];
          
          return (
            <div key={country} style={{ display: 'flex', flexDirection: 'column' }}>
              <button 
                onClick={() => {
                  setExpandedCountry(isExpanded ? null : country);
                  setShowAllCities(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  background: "transparent",
                  border: "none",
                  borderRadius: 10,
                  cursor: "pointer",
                  color: dark ? "#f8fafc" : "#0f172a",
                  fontSize: 15,
                  fontWeight: 600,
                  textAlign: "left",
                  transition: "background 0.2s"
                }}
                onMouseOver={(e) => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)"}
                onMouseOut={(e) => e.currentTarget.style.background = "transparent"}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{FLAG_MAP[country] || "🌍"}</span>
                  <span>{country} {currentCountry === country && <span style={{ color: dark ? "#38bdf8" : "#0284c7", fontSize: 12, fontWeight: 500 }}>(Actual)</span>}</span>
                </div>
                <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={dark ? "#64748b" : "#94a3b8"} />
              </button>

              {isExpanded && (() => {
                const visibleCities = showAllCities ? countryCities : countryCities.slice(0, 5);
                return (
                <div style={{ padding: "4px 0", display: "flex", flexDirection: "column" }}>
                  {visibleCities.map((city, index) => {
                    const isSelected = city.slug === activeCity;
                    const isLast = index === visibleCities.length - 1;
                    return (
                      <button
                        key={city.slug}
                        onClick={() => {
                          onSelectCity(city);
                          onClose();
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          background: isSelected ? "#0f172a" : "transparent",
                          border: "none",
                          borderBottom: isSelected || isLast ? "none" : `1px solid ${dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                          borderRadius: isSelected ? 10 : 0,
                          cursor: "pointer",
                          color: isSelected ? "#ffffff" : (dark ? "#f8fafc" : "#1e293b"),
                          fontSize: 15,
                          fontWeight: isSelected ? 700 : 600,
                          textAlign: "left",
                          transition: "all 0.2s",
                          width: "100%"
                        }}
                        onMouseOver={(e) => {
                          if (!isSelected) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
                        }}
                        onMouseOut={(e) => {
                          if (!isSelected) e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <span style={{ 
                          flex: 1, 
                          textAlign: "left", 
                          whiteSpace: "nowrap", 
                          overflow: "hidden", 
                          textOverflow: "ellipsis",
                          paddingRight: 8
                        }}>
                          {city.name}
                        </span>
                        <Icon name="chevron" size={15} color={isSelected ? "#ffffff" : (dark ? "#64748b" : "#94a3b8")} />
                      </button>
                    )
                  })}
                  {!showAllCities && countryCities.length > 5 && (
                    <button
                      onClick={() => setShowAllCities(true)}
                      style={{
                        padding: "10px 12px",
                        background: dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        color: dark ? "#94a3b8" : "#64748b",
                        fontSize: 13,
                        fontWeight: 600,
                        marginTop: 4,
                        transition: "background 0.2s"
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}
                      onMouseOut={(e) => e.currentTarget.style.background = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"}
                    >
                      Ver {countryCities.length - 5} ciudades más...
                    </button>
                  )}
                </div>
                );
              })()}
            </div>
          )
        })}

        {activeCountryNames.length > 0 && comingSoonCountries.length > 0 && (
          <div style={{ height: 1, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", margin: "8px 12px" }} />
        )}

        {comingSoonCountries.map(country => (
          <div 
            key={country}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              color: dark ? "#64748b" : "#94a3b8",
              fontSize: 15,
              fontWeight: 500
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18, opacity: 0.6 }}>{FLAG_MAP[country] || "🌍"}</span>
              <span>{country} <span style={{ fontSize: 12, fontWeight: 400 }}>(Pronto)</span></span>
            </div>
          </div>
        ))}
        </div>
      </div>
    </div>
    </div>
  );
}
