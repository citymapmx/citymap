import { claimSplashAutoRetry, clearSplashAutoRetry, getHomeVisualState, shouldExitSplash, SPLASH_AUTO_RETRY_DELAY_MS } from "../lib/homeReadiness.js";
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
  const autoRetried = useRef(false);
  const onRetryRef = useRef(onRetry);
  onRetryRef.current = onRetry;
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
      autoRetried.current = false;
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

  // Si la carga salió bien, un fallo posterior vuelve a tener su reintento.
  useEffect(() => {
    if (!ready) return;
    autoRetried.current = false;
    clearSplashAutoRetry();
  }, [ready]);

  // Reintento automático UNA sola vez cuando la carga falla: el mensaje de
  // error ya se muestra con botón manual, pero si nadie lo toca la app se
  // queda en el splash. Se espera 1,5 s para que el mensaje se alcance a
  // leer; si el reintento vuelve a fallar, queda el mensaje con el botón y
  // no se reintenta más (la marca en sessionStorage sobrevive a la recarga).
  useEffect(() => {
    if (phase !== "enter" || !issue || autoRetried.current) return;
    if (!claimSplashAutoRetry()) {
      autoRetried.current = true;
      return;
    }
    autoRetried.current = true;
    const timer = setTimeout(() => {
      onRetryRef.current();
    }, SPLASH_AUTO_RETRY_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase, issue]);

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
