import React from "react";
import Icon from "../ui/Icon.jsx";

export default function DebouncedSearchBar({ initialValue, onSearch, placeholders, phIdx, locating, detectCity }) {
  const [localSearch, setLocalSearch] = React.useState(initialValue);
  const [displayedPlaceholder, setDisplayedPlaceholder] = React.useState("");
  
  React.useEffect(() => {
    setLocalSearch(initialValue);
  }, [initialValue]);

  React.useEffect(() => {
    const t = setTimeout(() => onSearch(localSearch), 300);
    return () => clearTimeout(t);
  }, [localSearch, onSearch]);

  React.useEffect(() => {
    const targetText = placeholders[phIdx] || "";
    let i = 0;
    setDisplayedPlaceholder("|"); // Start with cursor
    
    let interval;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        setDisplayedPlaceholder(targetText.slice(0, i + 1) + (i < targetText.length - 1 ? "|" : ""));
        i++;
        if (i >= targetText.length) {
          clearInterval(interval);
          setDisplayedPlaceholder(targetText);
        }
      }, 50);
    }, phIdx === 0 ? 500 : 100);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [phIdx, placeholders]);

  return (
    <>
      <input 
        className="inp hero-search-input" 
        style={{ width: "100%", padding: "12px 16px 12px 44px", border: "none", borderRadius: 100, color: "#fff", fontSize: 15, fontWeight: 600, outline: "none", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)" }} 
        placeholder={displayedPlaceholder} 
        value={localSearch} 
        onChange={e => setLocalSearch(e.target.value)} 
      />
      <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", zIndex: 5, pointerEvents: "none", display: "flex" }}>
        <Icon name="search" size={18} color="rgba(255,255,255,0.8)" sw={2} />
      </span>
      {localSearch ? (
        <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", zIndex: 5, display: "flex" }}>
          <button aria-label="Borrar búsqueda" className="press" onClick={() => setLocalSearch("")} style={{ background: "rgba(255,255,255,0.15)", borderRadius: "50%", width: 28, height: 28, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
            <Icon name="x" size={14} color="#fff" sw={3} />
          </button>
        </div>
      ) : (
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", zIndex: 5, display: "flex" }}>
          <button aria-label="Actualizar ubicación" className="press" onClick={() => { localStorage.removeItem("cg_manual_city"); if (!locating) detectCity({ showToast: true }); }} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 8, animation: locating ? "pulse 1.5s infinite" : "none" }} title="Actualizar GPS">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="2" x2="12" y2="5"></line><line x1="12" y1="19" x2="12" y2="22"></line><line x1="2" y1="12" x2="5" y2="12"></line><line x1="19" y1="12" x2="22" y2="12"></line></svg>
          </button>
        </div>
      )}
    </>
  );
}
