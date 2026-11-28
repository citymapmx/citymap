import React, { memo, useEffect, useState } from "react";
import { useTranslation } from "../../hooks/useTranslation.js";
import { ANTOJO_LABEL_KEYS, ANTOJO_SEARCH_TERMS, bizCanHaveMenu, bizPhotoUrl } from "../../lib/antojos.js";
import OptimizedImage from "../ui/OptimizedImage.jsx";
import { FONT_BIZ } from "../../lib/constants.js";
import { useTouchTapList } from "../../lib/touchTap.js";

// «¿Qué se te antoja?» — fila de círculos con foto (estilo historias) y,
// debajo, los lugares abiertos ahora del antojo seleccionado.
//
// `groups` ya viene filtrado: solo antojos con al menos un lugar abierto
// ahora y con foto (ver `deriveAntojos`). Sin grupos, la sección no se
// monta. La selección por defecto es el primer grupo (orden fijo de
// antojos); si al cambiar de ciudad el antojo elegido ya no existe, se
// vuelve al primero.
export default memo(function AntojosSection({ groups, T, cityName, onSelect, onSeeAll }) {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState(() => groups?.[0]?.id || null);
  // Toque en las filas con scroll (27 nov 2026, cacería nº 1): círculos
  // y lugares con solo `onClick` perdían el primer toque tras deslizar.
  const tapFor = useTouchTapList();

  const availableIds = (groups || []).map((g) => g.id).join(",");
  useEffect(() => {
    setSelectedId((prev) => {
      if (prev && (groups || []).some((g) => g.id === prev)) return prev;
      return groups?.[0]?.id || null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableIds]);

  if (!groups || groups.length === 0) return null;
  const selected = groups.find((g) => g.id === selectedId) || groups[0];
  if (!selected) return null;

  const selectedLabel = t(ANTOJO_LABEL_KEYS[selected.id], selected.id);
  const places = selected.places.slice(0, 6);

  return (
    <div style={{ padding: "12px 0 0" }}>
      <div style={{ padding: "0 20px", marginBottom: 4 }}>
        <h2 style={{ fontFamily: "var(--heading)", fontWeight: 900, fontSize: 22, color: T.text, letterSpacing: "-0.5px", textAlign: "center", margin: 0, textTransform: "uppercase" }}>{t("home_que_se_te_antoja", "¿Qué se te antoja?")}</h2>
        <p style={{ fontSize: 13, color: T.sub, textAlign: "center", margin: "6px 0 0" }}>{t("home_que_se_te_antoja_sub", "Toca un antojo y ve los lugares abiertos ahora")}</p>
      </div>

      {/* Fila de círculos con foto, estilo historias */}
      <div className="scroll-fade-x" style={{ display: "flex", gap: 14, overflowX: "auto", padding: "12px 20px 6px", scrollbarWidth: "none" }} role="tablist" aria-label={t("home_que_se_te_antoja", "¿Qué se te antoja?")}>
        {groups.map((g) => {
          const label = t(ANTOJO_LABEL_KEYS[g.id], g.id);
          const isSelected = g.id === selected.id;
          // Foto del círculo: la del primer lugar del antojo (el mejor
          // valorado: `groupAntojos` ya los ordena por calificación).
          const photo = bizPhotoUrl(g.places[0]);
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={isSelected}
              aria-label={label}
              {...tapFor(`antojo-${g.id}`, () => setSelectedId(g.id))}
              style={{ flexShrink: 0, width: 76, padding: 0, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}
            >
              <span style={{ display: "block", width: 72, height: 72, margin: "0 auto", borderRadius: "50%", overflow: "hidden", background: T.border, border: isSelected ? "3px solid #0ea5e9" : `2px solid ${T.border}`, boxSizing: "border-box" }}>
                {photo
                  ? <OptimizedImage src={photo} widthRequest={200} heightRequest={200} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", fontSize: 28 }}>🍽️</span>}
              </span>
              <span style={{ marginTop: 6, fontSize: 12, fontWeight: isSelected ? 800 : 600, color: T.text, textAlign: "center", lineHeight: 1.2, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Lugares abiertos ahora del antojo seleccionado */}
      <div style={{ padding: "8px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {places.map((b) => {
          const photo = bizPhotoUrl(b);
          const categoryLabel = b.category
            ? b.category.charAt(0).toUpperCase() + b.category.slice(1)
            : "";
          const subtitle = [categoryLabel, cityName].filter(Boolean).join(" · ");
          return (
            <div
              key={b.id}
              className="press"
              role="button"
              tabIndex={0}
              {...tapFor(`lugar-${b.id}`, () => onSelect?.(b))}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(b); } }}
              style={{ width: "100%", background: T.white, borderRadius: 16, padding: 12, display: "flex", alignItems: "center", gap: 14, boxShadow: T.shadow, cursor: "pointer", border: `1px solid ${T.border}` }}
            >
              <div style={{ width: 64, height: 64, borderRadius: 12, overflow: "hidden", background: T.border, flexShrink: 0, position: "relative" }}>
                {photo
                  ? <OptimizedImage src={photo} widthRequest={200} heightRequest={200} alt={b.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>📍</div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT_BIZ, fontWeight: 800, fontSize: 16, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.2 }}>{b.name}</div>
                {subtitle && <div style={{ fontSize: 13, color: T.sub, marginTop: 4, textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subtitle}</div>}
                <div style={{ fontSize: 13, fontWeight: 700, color: "#16A34A", marginTop: 4 }}>
                  <span aria-hidden="true">●</span> {t("home_abierto_ahora", "Abierto ahora")}
                  {/* «Ver menú» solo si el plan PUEDE tener menú (mismo
                      portón que la consulta hasMenu de la ficha). Abre la
                      ficha, donde el botón del menú aparece solo si el
                      negocio tiene menú de verdad. */}
                  {bizCanHaveMenu(b) && (
                    <> · <span style={{ textDecoration: "underline", textUnderlineOffset: 2 }}>{t("detalle_ver_menu_min", "Ver menú")}</span></>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {onSeeAll && (
          <button
            type="button"
            onClick={() => onSeeAll(ANTOJO_SEARCH_TERMS[selected.id] || selectedLabel)}
            style={{ alignSelf: "flex-start", padding: "4px 0", background: "none", border: "none", color: T.text, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            {t("home_ver_todos_antojo", "Ver todos los ${antojo} »", { antojo: selectedLabel.toLowerCase() })}
          </button>
        )}
      </div>
    </div>
  );
});
