import React, { useState, useEffect, useRef } from "react";
import Icon from "../ui/Icon.jsx";
import useGMaps from "../map/useGMaps.js";

export default function SearchPlacesModal({ T, mapPins, experiences, onClose, onPlaceSelected, onCustomPlaceSelected, addingPlace }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  // Google Maps custom place state
  const mapsOk = useGMaps();
  const autocompleteRef = useRef(null);
  const inputRef = useRef(null);
  const [customName, setCustomName] = useState("");
  const [customAddress, setCustomAddress] = useState("");
  const [selectedGPlace, setSelectedGPlace] = useState(null);

  // Filter registered places
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const normalizeText = (text) => text ? text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    const q = normalizeText(searchQuery);
    const results = [...mapPins, ...experiences].filter(b => {
      const name = normalizeText(b.name || b.title);
      const cat = normalizeText(b.category);
      const tag = normalizeText(b.tagline);
      return name.includes(q) || cat.includes(q) || tag.includes(q);
    }).slice(0, 10);
    setSearchResults(results);
  }, [searchQuery, mapPins, experiences]);

  // Initialize Google Maps Autocomplete
  useEffect(() => {
    if (!mapsOk || !inputRef.current || autocompleteRef.current) return;

    // Make sure pac-container (dropdown) appears above fixed modal
    let styleEl = document.getElementById("pac-z-fix");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "pac-z-fix";
      styleEl.textContent = `.pac-container { z-index: 99999 !important; }`;
      document.head.appendChild(styleEl);
    }

    const init = () => {
      if (!inputRef.current) return;
      try {
        const ac = new window.google.maps.places.Autocomplete(inputRef.current, {
          fields: ["name", "formatted_address", "geometry", "place_id"],
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (place && place.geometry) {
            const addr = place.formatted_address || place.name || "";
            setSelectedGPlace({
              name: place.name || "",
              address: addr,
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              place_id: place.place_id || ""
            });
            setCustomAddress(addr);
            if (!customName.trim()) setCustomName(place.name || "");
          }
        });
        autocompleteRef.current = ac;
      } catch (e) {
        console.warn("Google Maps Autocomplete error:", e);
      }
    };

    // Small delay to ensure input is fully mounted in the DOM
    const timer = setTimeout(init, 100);
    return () => clearTimeout(timer);
  }, [mapsOk]);

  const canAddCustom = customName.trim() && (selectedGPlace || customAddress.trim());

  const handleAddCustom = () => {
    if (!canAddCustom) return;
    if (onCustomPlaceSelected) {
      onCustomPlaceSelected({
        name: customName.trim(),
        address: selectedGPlace?.address || customAddress.trim(),
        lat: selectedGPlace?.lat || null,
        lng: selectedGPlace?.lng || null,
        place_id: selectedGPlace?.place_id || null
      });
    }
  };

  const dark = T.bg === "#000" || T.bg?.startsWith("#0") || T.bg?.startsWith("#1");
  const panelBg = dark ? "rgba(255,255,255,0.05)" : "#f7f7f7";
  const inputBg = dark ? "rgba(255,255,255,0.08)" : "#fff";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", flexDirection: "column", background: T.bg }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", padding: "16px 20px", borderBottom: `1px solid ${T.border}`, background: T.white }}>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: T.text, padding: "8px 12px 8px 0", cursor: "pointer", display: "flex", alignItems: "center" }}>
          <Icon name="arrow_left" size={24} color={T.text} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 800, color: T.text }}>Añadir lugar</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 16px" }}>
        {addingPlace ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", marginTop: 60, gap: 16 }}>
            <div style={{ width: 32, height: 32, border: `3px solid ${T.border}`, borderTop: `3px solid ${T.text}`, borderRadius: "50%", animation: "spin .8s linear infinite" }} />
            <p style={{ color: T.sub, fontSize: 14, margin: 0 }}>Añadiendo lugar...</p>
          </div>
        ) : (
          <>
            {/* Panel 1: CityMap search */}
            <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 18, overflow: "hidden", marginBottom: 16 }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, background: panelBg, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>🗺️</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Buscar en CityMap</span>
              </div>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.border}` }}>
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Buscar restaurantes, hoteles, actividades..."
                  style={{ width: "100%", background: "transparent", border: "none", fontSize: 15, color: T.text, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ minHeight: 60, padding: searchResults.length > 0 ? 0 : 16 }}>
                {searchResults.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    {searchResults.map((b, idx) => (
                      <div
                        key={b.id}
                        onClick={() => onPlaceSelected(b)}
                        className="press"
                        style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                          borderBottom: idx < searchResults.length - 1 ? `1px solid ${T.border}` : "none",
                          cursor: "pointer"
                        }}
                      >
                        {b.photos?.[0] ? (
                          <div style={{ width: 44, height: 44, borderRadius: 10, backgroundImage: `url(${b.photos[0]?.url || b.photos[0]})`, backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0 }} />
                        ) : b.gallery?.[0] ? (
                          <div style={{ width: 44, height: 44, borderRadius: 10, backgroundImage: `url(${b.gallery[0]})`, backgroundSize: "cover", backgroundPosition: "center", flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 44, height: 44, borderRadius: 10, background: T.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Icon name="map" size={20} color={T.sub} />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.name || b.title}</div>
                          <div style={{ fontSize: 12, color: T.sub, marginTop: 2 }}>{b.category || b.tagline || ""}</div>
                        </div>
                        <Icon name="plus" size={20} color={T.text} />
                      </div>
                    ))}
                  </div>
                ) : searchQuery.trim() ? (
                  <p style={{ textAlign: "center", color: T.sub, fontSize: 13, margin: 0 }}>Sin resultados para "{searchQuery}"</p>
                ) : (
                  <p style={{ textAlign: "center", color: T.sub, fontSize: 13, margin: 0 }}>Escribe para buscar lugares registrados</p>
                )}
              </div>
            </div>

            {/* Panel 2: Google Maps custom */}
            <div style={{ background: T.white, border: `1px solid ${T.border}`, borderRadius: 18, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, background: panelBg, display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>📍</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: T.text }}>Agregar desde Google Maps</span>
              </div>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "block" }}>Dirección o nombre del lugar</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={customAddress}
                    onChange={e => { setCustomAddress(e.target.value); setSelectedGPlace(null); }}
                    placeholder="Ej. Playa del Amor, San Blas..."
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: 12,
                      border: `1.5px solid ${selectedGPlace ? "#22c55e" : T.border}`,
                      background: inputBg,
                      fontSize: 14, color: T.text, outline: "none",
                      boxSizing: "border-box",
                      transition: "border-color 0.2s"
                    }}
                  />
                  {selectedGPlace ? (
                    <div style={{ marginTop: 5, fontSize: 11, color: "#22c55e", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                      <Icon name="check" size={12} color="#22c55e" /> Ubicación confirmada por Google Maps
                    </div>
                  ) : (
                    <div style={{ marginTop: 5, fontSize: 11, color: T.sub, display: "flex", alignItems: "center", gap: 4 }}>
                      💡 Escribe y <strong>selecciona una sugerencia</strong> del menú que aparece
                    </div>
                  )}
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: T.sub, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6, display: "block" }}>Nombre del lugar en tu itinerario</label>
                  <input
                    type="text"
                    value={customName}
                    onChange={e => setCustomName(e.target.value)}
                    placeholder="Ej. Casa del abuelo, Playa secreta..."
                    style={{
                      width: "100%", padding: "12px 14px", borderRadius: 12,
                      border: `1.5px solid ${T.border}`, background: inputBg,
                      fontSize: 14, color: T.text, outline: "none",
                      boxSizing: "border-box"
                    }}
                  />
                </div>

                <button
                  className="press"
                  onClick={handleAddCustom}
                  disabled={!canAddCustom}
                  style={{
                    width: "100%", padding: "14px", borderRadius: 14,
                    background: canAddCustom ? T.text : T.border,
                    color: canAddCustom ? T.bg : T.sub,
                    border: "none", fontWeight: 800, fontSize: 15,
                    cursor: canAddCustom ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "background 0.2s, color 0.2s"
                  }}
                >
                  <Icon name="plus" size={16} color={canAddCustom ? T.bg : T.sub} />
                  Añadir al itinerario
                </button>
              </div>
            </div>

            <div style={{ height: 32 }} />
          </>
        )}
      </div>
    </div>
  );
}
