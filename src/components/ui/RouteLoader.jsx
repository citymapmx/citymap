import React from "react";
import ThreeDots from "./ThreeDots.jsx";

// Carga ligera para las rutas (navegación): tres puntos centrados sobre el
// fondo de la página, SIN la pantalla negra de marca. La pantalla negra
// (BrandSplash) queda solo para el arranque de la app y el cambio de
// ciudad (CityArrivalSplash). Al navegar, el Suspense del router muestra
// esto mientras carga el pedazo de la ruta: la pantalla anterior se
// mantiene visible cuando la navegación es una transición, y si no, se ve
// el fondo de la página con los puntos, nunca negro.
export default function RouteLoader({ ariaLabel = "Cargando" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      <ThreeDots size={10} gap={8} color="#9CA3AF" />
    </div>
  );
}
