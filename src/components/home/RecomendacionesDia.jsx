import React, { memo } from "react";
import { useTranslation } from "../../hooks/useTranslation.js";
import { SRCSET_CARD } from "../../lib/utils.js";
import Icon from "../ui/Icon.jsx";
import OptimizedImage from "../ui/OptimizedImage.jsx";

// «Los 4 de hoy» (PR #238): cuadrícula de 2 columnas con las 4
// recomendaciones del día. Mismo lenguaje visual que la tarjeta grande del
// spotlight viejo (foto llena, degradado, nombre, categoría y calificación),
// adaptado al tamaño de la cuadrícula. El tap abre el detalle del negocio
// (handleCardTap). Sin foto, la tarjeta usa el placeholder con degradado.
export default memo(function RecomendacionesDia({ list, T, cityImg, handleCardTap }) {
  const { t } = useTranslation();
  if (!list || list.length === 0) return null;
  return (
    <div style={{ padding: "16px 20px 0 20px" }}>
      <h2 style={{ fontFamily: "var(--heading)", fontWeight: 900, fontSize: 22, color: T.text, letterSpacing: "-0.5px", textAlign: "center", margin: "0 0 12px 0", textTransform: "uppercase" }}>
        {t("home_recomendaciones_dia", "✨ Recomendaciones del día")}
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {list.map((biz) => {
          const src = (biz.photos && biz.photos[0]?.url) || biz.img1 || biz.img2 || biz.img3 || biz.img_url || cityImg;
          return (
            <div
              key={biz.id}
              className="press"
              onClick={() => handleCardTap(biz)}
              style={{
                position: "relative",
                height: 180,
                borderRadius: 20,
                background: T.bg,
                overflow: "hidden",
                cursor: "pointer",
                boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
              }}
            >
              {src ? (
                <OptimizedImage
                  src={src}
                  alt={biz.name}
                  widthRequest={400}
                  heightRequest={300}
                  srcSetWidths={SRCSET_CARD}
                  sizes="(max-width: 640px) 50vw, 400px"
                  style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 100%)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="image" size={40} color="#94A3B8" /></div>
              )}

              {/* Gradient Overlay for Text Readability */}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 100%)" }} />

              {/* Bottom Text Content */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 12px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 900, color: "#fff", lineHeight: 1.15, textShadow: "0 2px 8px rgba(0,0,0,0.5)", letterSpacing: "-0.5px", textAlign: "left" }}>
                  {biz.name}
                </h3>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  {biz.category ? (
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", fontWeight: 600, textTransform: "capitalize", textShadow: "0 1px 4px rgba(0,0,0,0.4)", textAlign: "left" }}>
                      {biz.category}
                    </span>
                  ) : <span />}

                  {biz.rating > 0 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 3, textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                      <span style={{ fontSize: 12, color: "#fff", fontWeight: 800 }}>{biz.rating}</span>
                      <span style={{ fontSize: 10 }}>⭐</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
