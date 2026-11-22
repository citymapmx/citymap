import React from "react";
import Icon from "../ui/Icon.jsx";
import { useTranslation } from "../../hooks/useTranslation.js";
import { useTypewriter, TYPEWRITER_CARET_STYLE } from "../../lib/useTypewriter.js";

// Frases del buscador, verificadas contra los datos reales: cada una devuelve
// resultados si se escribe tal cual (por eso van en singular: "pizza" da 6,
// "pizzas" solo 1; "taquerías" da 0). Se escriben con máquina de escribir:
// se escribe una, se espera unos segundos, se borra y sigue la siguiente.
// Los "..." del final son solo visuales: la frase animada nunca se convierte
// en la búsqueda, así que no afectan a los resultados.
const SEARCH_HINT_KEYS = [
  ['home_hint_tacos', 'Buscar tacos...'],
  ['home_hint_pizza', 'Buscar pizza...'],
  ['home_hint_cafe', 'Buscar café...'],
  ['home_hint_restaurantes', 'Buscar restaurantes...'],
  ['home_hint_lugares', 'Buscar lugares...'],
  ['home_hint_hotel', 'Buscar hotel...'],
  ['home_hint_bares', 'Buscar bares...'],
  ['home_hint_museo', 'Buscar museo...'],
];

export default function DebouncedSearchBar({ initialValue, onSearch, dark }) {
  const { t } = useTranslation();
  const [localSearch, setLocalSearch] = React.useState(initialValue || "");
  const [focusedPlaceholder, setFocusedPlaceholder] = React.useState(null);
  const lastSubmitted = React.useRef(initialValue || "");
  const pendingSearch = React.useRef(null);
  // La frase animada vive aquí, así el muro y las ciudades comparten el
  // mismo diseño y la animación solo vuelve a dibujar este buscador.
  // Sin frase fija: cuando la máquina de escribir borra una frase, el
  // buscador queda vacío en vez de mostrar un texto genérico.
  const SEARCH_HINTS = React.useMemo(
    () => SEARCH_HINT_KEYS.map(([key, fallback]) => t(key, fallback)),
    [t],
  );
  const animatedHint = useTypewriter(SEARCH_HINTS);

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
      <style>{TYPEWRITER_CARET_STYLE}</style>
      <input role="searchbox" aria-label={t("home_buscar_lugares_eventos", "Buscar lugares y eventos")} autoComplete="off" enterKeyHint="search"
        className="inp hero-search-input"
        style={{ width: "100%", minHeight: 40, boxSizing: "border-box", padding: "8px 48px 8px 44px", border: "none", borderRadius: 100, color: dark ? "#F4F4F5" : "#18181B", fontSize: 16, fontWeight: 500, gridArea:"1 / 1",height:"100%", textAlign: "left" }}
        placeholder="" value={localSearch}
        onFocus={() => setFocusedPlaceholder(animatedHint)} onBlur={() => setFocusedPlaceholder(null)}
        onChange={event => setLocalSearch(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); submit(event.currentTarget.value.trim()); } }}
      />
      {!localSearch && <span aria-hidden="true" style={{gridArea:'1 / 1',alignSelf:'center',minWidth:0,maxWidth:'100%',padding:'8px 16px 8px 44px',zIndex:4,pointerEvents:'none',fontSize:'clamp(14px, 3.8vw, 16px)',fontWeight:500,lineHeight:'20px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textAlign:'left',color:dark?'#A1A1AA':'#6B7280'}}>{focusedPlaceholder ?? animatedHint}<span className="typewriter-caret" aria-hidden="true">▏</span></span>}
      <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", zIndex: 5, pointerEvents: "none", display: "flex" }}>
        <Icon name="search" size={19} color={dark ? "#A1A1AA" : "#6B7280"} />
      </span>
      {localSearch && <button type="button" aria-label={t("home_borrar_busqueda", "Borrar búsqueda")} onClick={handleClear}
        style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: 0, borderRadius: "50%", background: "transparent", color: dark ? "#F4F4F5" : "#18181B", cursor: "pointer" }}>
        <Icon name="x" size={18} color="currentColor" />
      </button>}
    </div>
  );
}
