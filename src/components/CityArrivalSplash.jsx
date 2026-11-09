import { getHomeVisualState, shouldExitSplash } from "../lib/homeReadiness.js";
import BrandSplash from "./ui/BrandSplash.jsx";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

// Splash al llegar o cambiar de ciudad: la vista de marca (fondo negro, logo
// oficial e infinito en blanco). Se queda hasta que la ciudad está lista de
// verdad (datos + contenido visible) y como mínimo 600 ms, así la ciudad
// aparece directo con todo cargado. Pero nunca más de ~3 s por las fotos:
// pasado el tope la ciudad se muestra igual y las fotos terminan de cargar
// progresivamente; una foto rota o lenta no muestra el error ni el
// reintentar (eso queda solo para un error real de carga de datos).
export default function CityArrivalSplash({
  enabled,
  waitingForCity = false,
  citySlug,
  cityName,
  ready,
  error = false,
  onRetry = () => window.location.reload(),
}) {
  const [phase, setPhase] = useState(() => (enabled && citySlug ? "enter" : "idle"));
  const [name, setName] = useState(cityName || "");
  const [issue, setIssue] = useState(false);
  const [slow, setSlow] = useState(false);
  const previousCity = useRef(null);
  const startedAt = useRef(Date.now());
  const [reducedMotion] = useState(
    () =>
      typeof window !== "undefined" &&
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches),
  );

  useLayoutEffect(() => {
    if (!enabled) {
      if (!waitingForCity) previousCity.current = citySlug;
      setPhase("idle");
      return;
    }
    if (citySlug && previousCity.current !== citySlug) {
      previousCity.current = citySlug;
      startedAt.current = Date.now();
      setIssue(false);
      setSlow(false);
      setName(cityName || "");
      setPhase("enter");
    } else if (cityName) {
      setName(cityName);
    }
  }, [enabled, waitingForCity, citySlug, cityName]);

  useEffect(() => {
    if (phase !== "enter" || !enabled) return;
    let exitTimer;
    let closing = false;
    const inspect = () => {
      const elapsed = Date.now() - startedAt.current;
      setSlow(elapsed > 12000);
      const visual = ready
        ? getHomeVisualState(document, citySlug, {
            width: window.innerWidth,
            height: window.innerHeight,
          })
        : "loading";
      setIssue(Boolean(error));
      if (!closing && shouldExitSplash({ready, error, visual, elapsedMs: elapsed})) {
        closing = true;
        exitTimer = setTimeout(() => setPhase("exit"), 100);
      }
    };
    inspect();
    const interval = setInterval(inspect, 150);
    return () => {
      clearInterval(interval);
      clearTimeout(exitTimer);
    };
  }, [phase, ready, error, enabled, citySlug]);

  useEffect(() => {
    if (phase !== "exit") return;
    const timer = setTimeout(() => setPhase("idle"), reducedMotion ? 100 : 620);
    return () => clearTimeout(timer);
  }, [phase, reducedMotion]);

  if (!enabled || phase === "idle" || !citySlug) return null;
  const message = issue
    ? "No pudimos completar la carga del inicio."
    : slow
      ? "La conexión está tardando un poco más."
      : null;
  return (
    <BrandSplash
      zIndex={1000001}
      fading={phase === "exit"}
      message={message}
      showRetry={issue || slow}
      onRetry={onRetry}
      ariaLabel={`Preparando ${name || "tu ciudad"}`}
    />
  );
}
