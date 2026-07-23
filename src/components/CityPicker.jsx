import { useState, useMemo } from "react";
import Icon from "./ui/Icon.jsx";
import { useDataStore } from "../store/useDataStore.js";

function CityPicker({ current, cities = [], onSelect, onClose, onDetectCity, locating, T }) {
  const [q, setQ] = useState("");
  const mapPins = useDataStore(s => s.mapPins || []);

  const sortedCities = useMemo(() => {
    return [...cities].map(c => {
      const count = mapPins.filter(p => p.city_slug === "all" || (p.city_slug && p.city_slug.split(",").includes(c.slug))).length;
      return { ...c, count };
    }).sort((a, b) => b.count - a.count);
  }, [cities, mapPins]);

  const [recents, setRecents] = useState(() => {
    try { return JSON.parse(localStorage.getItem("cg_recent_cities") || "[]"); } catch { return []; }
  });

  const saveRecent = city => {
    const next = [city, ...recents.filter(c => c.slug !== city.slug)].slice(0, 4);
    setRecents(next);
    try { localStorage.setItem("cg_recent_cities", JSON.stringify(next)); } catch (e) {}
  };

  const pick = city => {
    saveRecent(city);
    onSelect(city);
    onClose();
  };

  const filtered = q.trim()
    ? sortedCities.filter(c =>
      c.name?.toLowerCase().includes(q.toLowerCase()) ||
      c.state?.toLowerCase().includes(q.toLowerCase())
    )
    : [];

  // Dividir entre sugeridas (top 3 o las que tienen más lugares) y el resto
  const suggestedCities = sortedCities.slice(0, 4);
  const otherCities = sortedCities.slice(4);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center" }} onClick={onClose}>
      <style>{`
        @keyframes slideDownFade {
          from { transform: translateY(-40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .city-pill {
          background: ${T.bg};
          border: 1px solid ${T.border};
          border-radius: 16px;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .city-pill:active { transform: scale(0.97); }
        .city-pill.active {
          background: ${T.greenL};
          border-color: ${T.green};
          box-shadow: 0 4px 12px ${T.green + "22"};
        }
        .city-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
        }
      `}</style>
      <div onClick={e => e.stopPropagation()} style={{ background: T.white, borderRadius: "0 0 28px 28px", width: "100%", maxWidth: 600, maxHeight: "90vh", display: "flex", flexDirection: "column", animation: "slideDownFade 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards", boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
        
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, color: T.text, margin: 0, fontWeight: 700, letterSpacing: "-0.5px" }}>Elige tu destino</h2>
            <p style={{ fontSize: 14, color: T.sub, marginTop: 4, margin: 0 }}>Encuentra joyas ocultas en tu ciudad</p>
          </div>
          <button type="button" onClick={onClose} style={{ background: T.bg, border: "none", borderRadius: "50%", width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Icon name="x" size={16} color={T.sub} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: "0 24px 16px", position: "relative" }}>
          <span style={{ position: "absolute", left: 40, top: "50%", transform: "translateY(-50%)" }}><Icon name="search" size={16} color={T.sub} /></span>
          <input
            autoFocus
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar ciudad…"
            style={{ width: "100%", padding: "14px 16px 14px 46px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: 20, fontSize: 16, color: T.text, fontFamily: "inherit", outline: "none", transition: "border-color 0.2s" }}
          />
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", padding: "0 24px 32px", flex: 1, scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}>

          {/* Usar Ubicacion Actual */}
          {!q.trim() && (
            <button type="button" className="press" onClick={onDetectCity} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "16px", background: "linear-gradient(135deg, #1e3a8a, #3b82f6)", color: "#fff", border: "none", borderRadius: 20, cursor: "pointer", fontWeight: 700, fontSize: 15, marginBottom: 28, boxShadow: "0 10px 25px rgba(59, 130, 246, 0.4)", transition: "transform 0.2s" }}>
              <Icon name="pin" size={18} color="#fff" />
              {locating ? "Localizando..." : "Usar mi ubicación actual"}
            </button>
          )}

          {/* Search results */}
          {q.trim() && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Resultados</div>
              {filtered.length > 0
                ? <div className="city-grid">
                    {filtered.map(c => <CityPill key={c.slug} city={c} current={current} onPick={pick} T={T} />)}
                  </div>
                : <div style={{ textAlign: "center", padding: "32px 0", color: T.sub }}>
                  <Icon name="search" size={32} color={T.border} />
                  <p style={{ fontSize: 15, marginTop: 12, fontWeight: 500 }}>No encontramos "{q}"</p>
                  <button type="button" onClick={() => pick({ name: q, slug: q.toLowerCase().replace(/\s+/g, "-"), state: "" })} style={{ marginTop: 16, padding: "10px 24px", background: T.greenL, border: `1px solid ${T.green}`, borderRadius: 100, fontSize: 14, fontWeight: 700, color: T.green, cursor: "pointer", fontFamily: "inherit" }}>
                    Explorar "{q}" de todos modos
                  </button>
                </div>
              }
            </div>
          )}

          {/* Popular (All active cities from DB) */}
          {!q.trim() && (
            <>
              {suggestedCities.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="star" size={14} color="#f59e0b" /> Populares
                  </div>
                  <div className="city-grid">
                    {suggestedCities.map(c => (
                      <CityPill key={c.slug} city={c} current={current} onPick={pick} T={T} />
                    ))}
                  </div>
                </div>
              )}

              {otherCities.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Otras ciudades</div>
                  <div className="city-grid">
                    {otherCities.map(c => (
                      <CityPill key={c.slug} city={c} current={current} onPick={pick} T={T} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CityPill({ city, current, onPick, T }) {
  const isActive = current === city.slug;
  return (
    <div 
      className={`city-pill ${isActive ? 'active' : ''}`}
      onClick={() => onPick(city)}
    >
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: isActive ? T.green + "33" : T.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name="map" size={16} color={isActive ? T.green : T.sub} />
      </div>
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: isActive ? T.green : T.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{city.name}</div>
        <div style={{ fontSize: 12, color: isActive ? T.green : T.sub, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
          {city.state && <span>{city.state}</span>}
        </div>
      </div>
    </div>
  );
}

export default CityPicker;
