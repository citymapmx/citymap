import React from 'react';
import Icon from '../ui/Icon';

// Fila de filtros siempre visible + panel desplegable con las ciudades.
// Componente presentacional: el estado vive en AdminEventsTab.

const pillStyle = (active) => ({
  padding: "6px 12px",
  border: `1.5px solid ${active ? "#1A7A5E" : "#E4E8E4"}`,
  borderRadius: 20,
  fontSize: 12,
  fontWeight: 700,
  background: active ? "#EAF4F0" : "#fff",
  color: active ? "#1A7A5E" : "#5A6872",
  cursor: "pointer",
  fontFamily: "inherit",
});

export default function AdminEventFilters({
  cities = [],
  cityFilter = "all",
  onCityFilterChange,
  noImageOnly = false,
  onNoImageOnlyChange,
  noImageCount = 0,
  showFilters = false,
  onShowFiltersChange,
}) {
  const selectedCity = cityFilter !== "all" ? cities.find(c => c.slug === cityFilter) : null;
  const cityLabel = selectedCity ? selectedCity.name : cityFilter;
  const pickCity = (slug) => { onCityFilterChange(slug); onShowFiltersChange(false); };
  const filtersActive = showFilters || cityFilter !== "all";

  return (
    <>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
        <button type="button" onClick={() => onCityFilterChange("all")} style={pillStyle(cityFilter === "all")}>Todas</button>
        {cityFilter !== "all" && (
          <button type="button" onClick={() => onCityFilterChange("all")} title="Quitar filtro de ciudad" style={{ ...pillStyle(true), display: "flex", alignItems: "center", gap: 5 }}>{cityLabel} <Icon name="x" size={12} color="#1A7A5E" /></button>
        )}
        <button type="button" onClick={() => onShowFiltersChange(!showFilters)} style={{ ...pillStyle(filtersActive), display: "flex", alignItems: "center", gap: 5 }}>
          <Icon name="sliders" size={12} color={filtersActive ? "#1A7A5E" : "#5A6872"} /> Filtros
        </button>
        <button type="button" onClick={() => onNoImageOnlyChange(!noImageOnly)} style={pillStyle(noImageOnly)}>Sin imagen ({noImageCount})</button>
      </div>
      {showFilters && (
        <div style={{ background: "#fff", border: "1.5px solid #E4E8E4", borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span className="text-xs" style={{ fontWeight: 700, color: "#5A6872", textTransform: "uppercase", letterSpacing: .8 }}>Ciudad</span>
            <button type="button" onClick={() => onShowFiltersChange(false)} style={{ background: "transparent", border: "none", color: "#5A6872", fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 4 }}><Icon name="x" size={12} color="#5A6872" /> Cerrar</button>
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button type="button" onClick={() => pickCity("all")} style={pillStyle(cityFilter === "all")}>Todas</button>
            {cities.map(c => (
              <button key={c.slug} type="button" onClick={() => pickCity(c.slug)} style={pillStyle(cityFilter === c.slug)}>{c.name}</button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
