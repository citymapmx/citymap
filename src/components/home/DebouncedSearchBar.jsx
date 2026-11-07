import React from "react";
import Icon from "../ui/Icon.jsx";

// Frases del buscador, verificadas contra los datos reales: cada una devuelve
// resultados si se escribe tal cual (por eso van en singular: "pizza" da 6,
// "pizzas" solo 1; "taquerías" da 0). Se escriben con máquina de escribir:
// se escribe una, se espera unos segundos, se borra y sigue la siguiente.
// Los "..." del final son solo visuales: la frase animada nunca se convierte
// en la búsqueda, así que no afectan a los resultados.
const SEARCH_HINTS = [
  'Buscar tacos...',
  'Buscar pizza...',
  'Buscar café...',
  'Buscar restaurantes...',
  'Buscar lugares...',
  'Buscar hotel...',
  'Buscar bares...',
  'Buscar museo...',
];

function useTypewriter(phrases) {
  const [text, setText] = React.useState('');
  React.useEffect(() => {
    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timer = null;
    let alive = true;
    const step = () => {
      if (!alive) return;
      const phrase = phrases[phraseIdx % phrases.length];
      if (!deleting) {
        charIdx += 1;
        setText(`${phrase.slice(0, charIdx)}▏`);
        if (charIdx >= phrase.length) { deleting = true; timer = setTimeout(step, 3500); }
        else timer = setTimeout(step, 75);
      } else {
        charIdx -= 1;
        setText(charIdx > 0 ? `${phrase.slice(0, charIdx)}▏` : '');
        if (charIdx <= 0) { deleting = false; phraseIdx = (phraseIdx + 1) % phrases.length; timer = setTimeout(step, 400); }
        else timer = setTimeout(step, 30);
      }
    };
    timer = setTimeout(step, 600);
    return () => { alive = false; clearTimeout(timer); };
  }, [phrases]);
  return text;
}

export default function DebouncedSearchBar({ initialValue, onSearch, dark }) {
  const [localSearch, setLocalSearch] = React.useState(initialValue || "");
  const [focusedPlaceholder, setFocusedPlaceholder] = React.useState(null);
  const lastSubmitted = React.useRef(initialValue || "");
  const pendingSearch = React.useRef(null);
  // La frase animada vive aquí, así el muro y las ciudades comparten el
  // mismo diseño y la animación solo vuelve a dibujar este buscador.
  // Sin frase fija: cuando la máquina de escribir borra una frase, el
  // buscador queda vacío en vez de mostrar un texto genérico.
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
      <input role="searchbox" aria-label="Buscar lugares y eventos" autoComplete="off" enterKeyHint="search"
        className="inp hero-search-input"
        style={{ width: "100%", minHeight: 40, boxSizing: "border-box", padding: "8px 48px 8px 44px", border: "none", borderRadius: 100, color: dark ? "#F4F4F5" : "#18181B", fontSize: 16, fontWeight: 500, gridArea:"1 / 1",height:"100%", textAlign: "left" }}
        placeholder="" value={localSearch}
        onFocus={() => setFocusedPlaceholder(animatedHint)} onBlur={() => setFocusedPlaceholder(null)}
        onChange={event => setLocalSearch(event.target.value)}
        onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); submit(event.currentTarget.value.trim()); } }}
      />
      {!localSearch && <span aria-hidden="true" style={{gridArea:'1 / 1',alignSelf:'center',minWidth:0,maxWidth:'100%',padding:'8px 16px 8px 44px',zIndex:4,pointerEvents:'none',fontSize:'clamp(14px, 3.8vw, 16px)',fontWeight:500,lineHeight:'20px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',textAlign:'left',color:dark?'#A1A1AA':'#6B7280'}}>{focusedPlaceholder ?? animatedHint}</span>}
      <span style={{ position: "absolute", left: 18, top: "50%", transform: "translateY(-50%)", zIndex: 5, pointerEvents: "none", display: "flex" }}>
        <Icon name="search" size={19} color={dark ? "#A1A1AA" : "#6B7280"} />
      </span>
      {localSearch && <button type="button" aria-label="Borrar búsqueda" onClick={handleClear}
        style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", zIndex: 5, display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, border: 0, borderRadius: "50%", background: "transparent", color: dark ? "#F4F4F5" : "#18181B", cursor: "pointer" }}>
        <Icon name="x" size={18} color="currentColor" />
      </button>}
    </div>
  );
}
