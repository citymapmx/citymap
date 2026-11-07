import React from "react";

// Infinito que cambia de forma (círculo ↔ ∞), como el efecto Morphing Infinity
// de loading-ui.com. Solo SVG + CSS, sin librerías.
//
// Las dos formas tienen la misma estructura (M + 4 curvas C + Z) para que la
// interpolación CSS de `d: path(...)` sea suave. En navegadores sin soporte
// para animar `d`, el SVG queda fijo en la primera forma (círculo).
const CIRCLE =
  "M 50 15 C 69.33 15 85 30.67 85 50 C 85 69.33 69.33 85 50 85 C 30.67 85 15 69.33 15 50 C 15 30.67 30.67 15 50 15 Z";
const INFINITY =
  "M 50 50 C 50 25 85 25 85 50 C 85 75 50 75 50 50 C 50 25 15 25 15 50 C 15 75 50 75 50 50 Z";

export const MORPHING_INFINITY_CIRCLE = CIRCLE;
export const MORPHING_INFINITY_SHAPE = INFINITY;

export default function MorphingInfinity({ size = 64, color = "currentColor", strokeWidth = 5 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      role="status"
      aria-label="Cargando"
      style={{ display: "block" }}
    >
      <style>{`
        @keyframes morphing-infinity-morph {
          0%, 100% { d: path("${CIRCLE}"); }
          50% { d: path("${INFINITY}"); }
        }
        .morphing-infinity-path { animation: morphing-infinity-morph 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .morphing-infinity-path { animation: none; }
        }
      `}</style>
      <path
        className="morphing-infinity-path"
        d={CIRCLE}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );
}
