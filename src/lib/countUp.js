// ─── Conteo animado (count-up) ─────────────────────────────────────────────
// El número sube de 0 a su valor cuando la tarjeta entra en pantalla.
// Funciones puras (probables sin DOM) para que el hook sea fino.

// Arranca rápido y se asienta suave al final (la referencia de Jonathan:
// "el número sube de 0 a 4.9").
export function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

// Valor entero que muestra el conteo a los `elapsedMs` de haber empezado:
// 0 al empezar, `target` al terminar (durationMs ~1000). Fuera de rango se
// limita, y con duración 0 devuelve el valor final directo.
export function countUpValue(target, elapsedMs, durationMs = 1000) {
  if (durationMs <= 0) return target;
  const p = Math.min(Math.max(elapsedMs / durationMs, 0), 1);
  return Math.round(target * easeOutCubic(p));
}
