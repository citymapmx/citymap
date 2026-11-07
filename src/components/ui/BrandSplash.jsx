import React, { useState } from "react";
import MorphingInfinity from "./MorphingInfinity.jsx";

// Pantalla de carga de marca: fondo negro, logo oficial centrado y el
// infinito morphing en blanco debajo. Es la vista que se ve al entrar a la
// app y al cambiar de ciudad, para que la carga no se note: la ciudad aparece
// directo con todo cargado. `message` y `showRetry` solo se usan cuando la
// carga tarda o falla (nunca en el caso normal).
export default function BrandSplash({
  zIndex = 9999,
  fading = false,
  message = null,
  showRetry = false,
  onRetry = () => window.location.reload(),
  ariaLabel = "Cargando CityMap",
}) {
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
  );
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        color: "#fff",
        overflow: "hidden",
        touchAction: "none",
        opacity: fading ? 0 : 1,
        transition: `opacity ${reducedMotion ? 100 : 620}ms cubic-bezier(.22,1,.36,1)`,
        pointerEvents: fading ? "none" : "auto",
      }}
    >
      <img
        src="/logo-brand.png"
        alt="CityMap"
        width={200}
        style={{ width: 200, maxWidth: "60%", objectFit: "contain", display: "block" }}
      />
      <div style={{ height: 24 }} aria-hidden="true" />
      <MorphingInfinity size={64} color="#fff" strokeWidth={6} />
      {message ? (
        <p
          style={{
            margin: "22px 0 0",
            fontSize: 13,
            lineHeight: 1.6,
            color: "#A9B1BD",
            textAlign: "center",
            padding: "0 24px",
            maxWidth: 320,
          }}
        >
          {message}
        </p>
      ) : null}
      {showRetry ? (
        <button
          type="button"
          onClick={onRetry}
          style={{
            marginTop: 18,
            padding: "11px 22px",
            borderRadius: 999,
            border: 0,
            background: "#F5F5F7",
            color: "#17202D",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Reintentar
        </button>
      ) : null}
    </div>
  );
}
