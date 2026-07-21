import React, { useState, useRef, useEffect } from 'react';
import Icon from './ui/Icon.jsx';

const FLAG_MAP = {
  "México": "🇲🇽",
  "Estados Unidos": "🇺🇸",
  "España": "🇪🇸",
  "Canadá": "🇨🇦",
  "Argentina": "🇦🇷",
  "Colombia": "🇨🇴"
};

export default function CountryPickerDropdown({ cities, activeCity, onSelectCity, onDetectCity, locating, onClose, dark }) {
  const [expandedCountry, setExpandedCountry] = useState(null);
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

  const activeCountriesMap = {};
  
  // Sort cities globally by count first
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
  const comingSoonCountries = ["Canadá", "España", "Argentina", "Colombia"].filter(c => !activeCountryNames.includes(c));

  const currentCityObj = sortedCities.find(c => c.slug === activeCity);
  const currentCountry = currentCityObj ? currentCityObj.country : null;

  return (
    <div 
      ref={ref}
      style={{
        position: "absolute",
        top: "100%",
        marginTop: 12,
        right: 0, // Align to right so it doesn't go off screen
        width: 240,
        background: dark ? "#1e293b" : "#ffffff",
        borderRadius: 16,
        boxShadow: dark ? "0 10px 40px rgba(0,0,0,0.5)" : "0 10px 40px rgba(0,0,0,0.1)",
        border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
        overflow: "hidden",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column"
      }}
    >
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
            background: dark ? "rgba(56, 189, 248, 0.1)" : "rgba(2, 132, 199, 0.05)",
            border: `1px solid ${dark ? "rgba(56, 189, 248, 0.2)" : "rgba(2, 132, 199, 0.1)"}`,
            borderRadius: 10,
            cursor: locating ? "wait" : "pointer",
            color: dark ? "#38bdf8" : "#0284c7",
            fontSize: 14,
            fontWeight: 600,
            textAlign: "left",
            transition: "all 0.2s",
            marginBottom: 4,
            opacity: locating ? 0.7 : 1
          }}
          onMouseOver={(e) => {
            if (!locating) e.currentTarget.style.background = dark ? "rgba(56, 189, 248, 0.15)" : "rgba(2, 132, 199, 0.08)";
          }}
          onMouseOut={(e) => {
            if (!locating) e.currentTarget.style.background = dark ? "rgba(56, 189, 248, 0.1)" : "rgba(2, 132, 199, 0.05)";
          }}
        >
          {locating ? (
            <div style={{ width: 18, height: 18, border: `2px solid ${dark ? 'rgba(56, 189, 248, 0.3)' : 'rgba(2, 132, 199, 0.3)'}`, borderTop: `2px solid ${dark ? '#38bdf8' : '#0284c7'}`, borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
          ) : (
            <Icon name="navigation" size={18} />
          )}
          <span>{locating ? "Buscando..." : "Usar mi ubicación"}</span>
        </button>
        
        {activeCountryNames.map(country => {
          const isExpanded = expandedCountry === country || (!expandedCountry && currentCountry === country && activeCountryNames.length === 1);
          const countryCities = activeCountriesMap[country] || [];
          
          return (
            <div key={country} style={{ display: 'flex', flexDirection: 'column' }}>
              <button 
                onClick={() => setExpandedCountry(isExpanded ? null : country)}
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

              {isExpanded && (
                <div style={{ padding: "4px 0 4px 36px", display: "flex", flexDirection: "column", gap: 2 }}>
                  {countryCities.map(city => {
                    const isSelected = city.slug === activeCity;
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
                          padding: "8px 12px",
                          background: isSelected ? (dark ? "rgba(56, 189, 248, 0.1)" : "rgba(2, 132, 199, 0.05)") : "transparent",
                          border: "none",
                          borderRadius: 8,
                          cursor: "pointer",
                          color: isSelected ? (dark ? "#38bdf8" : "#0284c7") : (dark ? "#cbd5e1" : "#475569"),
                          fontSize: 14,
                          fontWeight: isSelected ? 600 : 500,
                          textAlign: "left",
                          transition: "background 0.2s"
                        }}
                        onMouseOver={(e) => {
                          if (!isSelected) e.currentTarget.style.background = dark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
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
                        {city.count > 0 && (
                          <span style={{ 
                            fontSize: 12, 
                            opacity: 0.6,
                            whiteSpace: "nowrap",
                            flexShrink: 0,
                            textAlign: "right"
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
  );
}
