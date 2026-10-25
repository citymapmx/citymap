import React from "react";
import Icon from "../ui/Icon.jsx";

export default function DebouncedSearchBar({ initialValue, onSearch, placeholder = "¿Qué buscas?", dark }) {
  const [localSearch, setLocalSearch] = React.useState(initialValue || "");
  const [focusedPlaceholder, setFocusedPlaceholder] = React.useState(null);
  const lastSubmitted = React.useRef(initialValue || "");
  const pendingSearch = React.useRef(null);

  React.useEffect(() => {
    const value = initialValue || "";
    if (value !== lastSubmitted.current) {
      lastSubmitted.current = value;
      setLocalSearch(value);
    }
  }, [initialValue]);

  React.useEffect(() => {
    if (localSearch === lastSubmitted.current) return;
    pendingSearch.current = setTimeout(() => {
      lastSubmitted.current = localSearch;
      onSearch(localSearch);
    }, 300);
    return () => clearTimeout(pendingSearch.current);
  }, [localSearch, onSearch]);

  const submit = value => {
    clearTimeout(pendingSearch.current);
    lastSubmitted.current = value;
    setLocalSearch(value);
    onSearch(value);
  };
  const handleClear = () => submit("");

  return (
    <div style={{display:"grid",position:"relative",zIndex:3}}>
      <input role="searchbox" aria-label="Buscar lugares y eventos" autoComplete="off" enterKeyHint="search"
        className="inp hero-search-input"
        style={{ width: "100%", minHeight: 48, boxSizing: "border-box", padding: "12px 48px 12px 44px", border: "none", borderRadius: 100, color: dark ? "#F4F4F5" : "#18181B", fontSize: 16, fontWeight: 500, gridArea:"1 / 1",height:"100%" }}
        placeholder="" value={localSearch}
        onFocus={() => setFocusedPlaceholder(placeholder)} onBlur={() => setFocusedPlaceholder(null)}
        onChange={event => setLocalSearch(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); submit(event.currentTarget.value.trim()); } }}
      />
      {!localSearch && <span aria-hidden="true" style={{gridArea:'1 / 1',alignSelf:'center',minWidth:0,padding:'12px 16px 12px 44px',zIndex:4,pointerEvents:'none',fontSize:'clamp(14px, 3.8vw, 16px)',fontWeight:500,lineHeight:'20px',whiteSpace:'normal',overflowWrap:'anywhere',color:dark?'#A1A1AA':'#6B7280'}}>{focusedPlaceholder || placeholder}</span>}
      <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", zIndex: 5, pointerEvents: "none", display: "flex" }}>
        <Icon name="search" size={19} color={dark ? "#A1A1AA" : "#6B7280"} />
      </span>
      {localSearch && <button type="button" aria-label="Borrar búsqueda" onClick={handleClear}
        style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, border: 0, borderRadius: "50%", background: "transparent", color: dark ? "#F4F4F5" : "#18181B", cursor: "pointer" }}>
        <Icon name="x" size={18} color="currentColor" />
      </button>}
    </div>
  );
}
