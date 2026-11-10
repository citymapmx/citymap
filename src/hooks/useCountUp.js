import { useEffect, useRef, useState } from "react";
import { countUpValue } from "../lib/countUp.js";

export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Cuenta de 0 a `target` cuando `active` se vuelve true (una sola vez por
// carga, ~1 s con salida suave). Antes de activarse muestra `target` tal
// cual (nunca 0 ni vacío), y si `target` cambia después de animar, muestra
// el nuevo valor directo sin volver a animar. Con prefers-reduced-motion
// devuelve el valor final directo, sin animar.
export function useCountUp(target, active, durationMs = 1000) {
  const [value, setValue] = useState(target);
  const doneRef = useRef(false);
  const rafRef = useRef(0);

  useEffect(() => {
    if (doneRef.current) {
      setValue(target);
      return;
    }
    if (!active) return;
    if (prefersReducedMotion()) {
      doneRef.current = true;
      setValue(target);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const v = countUpValue(target, now - start, durationMs);
      setValue(v);
      if (v >= target) {
        doneRef.current = true;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [active, target, durationMs]);

  return value;
}
