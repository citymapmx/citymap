import React, { useState, useEffect } from 'react';
import Icon from './ui/Icon.jsx';

const FLAG_MAP = {
  "México": "🇲🇽",
  "Estados Unidos": "🇺🇸",
  "España": "🇪🇸",
  "Canadá": "🇨🇦",
  "Argentina": "🇦🇷",
  "Colombia": "🇨🇴"
};

export default function TopSheetCityPicker({ cities, activeCity, onSelectCity, onDetectCity, locating, onClose, dark, mandatory = false }) {
  const [expandedCountry, setExpandedCountry] = useState(null);
  const [cityCounts, setCityCounts] = useState({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Para animación de entrada
    setMounted(true);
  }, []);

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
  
  const sortedCities = [...cities].map(city => ({
    ...city,
    country: city.slug === "los-angeles" ? "Estados Unidos" : (city.country || "México"),
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
  const currentCityObj = sortedCities.find(c => c.slug === activeCity);
  const currentCountry = currentCityObj ? currentCityObj.country : null;

  return (
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 99999,
      display: "flex",
      flexDirection: "column",
      pointerEvents: mounted ? "auto" : "none"
    }}>
      {/* Backdrop */}
      <div 
        onClick={mandatory ? undefined : onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: mandatory ? (dark ? "#0f172a" : "#f8fafc") : "rgba(0,0,0,0.5)",
          backdropFilter: mandatory ? "none" : "blur(4px)",
          WebkitBackdropFilter: mandatory ? "none" : "blur(4px)",
          opacity: mounted ? 1 : 0,
          transition: "opacity 0.4s ease"
        }}
      />
      
      {/* Top Sheet */}
      <div style={{
        position: "relative",
        background: dark ? "rgba(15, 23, 42, 0.95)" : "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        padding: "32px 20px 32px 20px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        transform: mounted ? "translateY(0)" : "translateY(-100%)",
        transition: "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        maxHeight: "85vh",
        overflowY: "auto"
      }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <h2 style={{ 
              margin: 0, 
              fontSize: 22, 
              fontWeight: 800, 
              color: dark ? "#fff" : "#0f172a",
              letterSpacing: "-0.02em"
            }}>
              ¿Dónde estás?
            </h2>
            {!mandatory && (
              <button
                onClick={onClose}
                style={{
                  background: dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)",
                  border: "none",
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: dark ? "#94a3b8" : "#64748b",
                  transition: "all 0.2s"
                }}
              >
                <Icon name="x" size={18} />
              </button>
            )}
          </div>

          <button
            onClick={onDetectCity}
            disabled={locating}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "16px",
              background: dark ? "rgba(56, 189, 248, 0.15)" : "rgba(2, 132, 199, 0.08)",
              border: `1px solid ${dark ? "rgba(56, 189, 248, 0.3)" : "rgba(2, 132, 199, 0.2)"}`,
              borderRadius: 16,
              cursor: locating ? "wait" : "pointer",
              color: dark ? "#38bdf8" : "#0284c7",
              fontSize: 16,
              fontWeight: 700,
              transition: "all 0.2s",
              marginBottom: 24,
              opacity: locating ? 0.7 : 1
            }}
          >
            {locating ? (
              <div style={{ width: 20, height: 20, border: `2px solid ${dark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.3)'}`, borderTop: `2px solid ${dark ? '#38bdf8' : '#0284c7'}`, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
            ) : (
              <Icon name="navigation" size={20} />
            )}
            <span>{locating ? "Buscando ubicación..." : "Usar mi ubicación actual"}</span>
          </button>

          <div style={{ fontSize: 13, fontWeight: 700, color: dark ? "#64748b" : "#94a3b8", textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>
            Selecciona una ciudad
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeCountryNames.map(country => {
              const isExpanded = expandedCountry === country || (!expandedCountry && currentCountry === country && activeCountryNames.length === 1) || activeCountryNames.length <= 2;
              const countryCities = activeCountriesMap[country] || [];
              
              return (
                <div key={country} style={{ 
                  background: dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  borderRadius: 16,
                  overflow: "hidden",
                  border: `1px solid ${dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
                }}>
                  <button 
                    onClick={() => setExpandedCountry(isExpanded ? null : country)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "16px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      color: dark ? "#f8fafc" : "#0f172a",
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 20 }}>{FLAG_MAP[country] || "🌍"}</span>
                      <span>{country} {currentCountry === country && <span style={{ color: dark ? "#38bdf8" : "#0284c7", fontSize: 12, fontWeight: 500 }}>(Actual)</span>}</span>
                    </div>
                    <Icon name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={dark ? "#64748b" : "#94a3b8"} />
                  </button>

                  {isExpanded && (
                    <div style={{ padding: "0 8px 12px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
                      {countryCities.map(city => {
                        const isSelected = city.slug === activeCity;
                        return (
                          <button
                            key={city.slug}
                            onClick={() => {
                              onSelectCity(city);
                              if (onClose) onClose();
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "12px 16px",
                              background: isSelected ? (dark ? "rgba(56, 189, 248, 0.15)" : "rgba(2, 132, 199, 0.1)") : "transparent",
                              border: "none",
                              borderRadius: 12,
                              cursor: "pointer",
                              color: isSelected ? (dark ? "#38bdf8" : "#0284c7") : (dark ? "#cbd5e1" : "#475569"),
                              fontSize: 15,
                              fontWeight: isSelected ? 700 : 500,
                              textAlign: "left",
                              transition: "all 0.2s"
                            }}
                          >
                            <span style={{ flex: 1, paddingRight: 8 }}>{city.name}</span>
                            {city.count > 0 && (
                              <span style={{ 
                                fontSize: 12, 
                                opacity: isSelected ? 0.8 : 0.5,
                                fontWeight: 500
                              }}>
                                {city.count} {city.count === 1 ? 'lugar' : 'lugares'}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

        </div>
        
        {/* Handle bar at the bottom to hint it's a sheet */}
        <div style={{
          position: "absolute",
          bottom: 12,
          left: "50%",
          transform: "translateX(-50%)",
          width: 40,
          height: 4,
          borderRadius: 2,
          background: dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)"
        }} />
      </div>
    </div>
  );
}
