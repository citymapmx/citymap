// Toque «tap» en listas con scroll (27 nov 2026, selector de ciudad):
// en iOS, tocar una lista que aún se mueve por inercia solo detiene el
// scroll: no se dispara `click` y el primer toque se pierde. El
// `touchend` sí llega, así que la selección se hace ahí cuando el dedo
// apenas se movió. El clic sintético que sigue al toque se suprime para
// no seleccionar dos veces. Sin toque previo (ratón, teclado), el
// `onClick` de siempre sigue funcionando igual.

// Movimiento máximo del dedo para que siga siendo un toque, no un
// deslizamiento (scroll).
export const TOUCH_TAP_MAX_MOVE_PX = 10;

// Ventana en la que se ignora el clic que sigue a un toque ya atendido
// (el clic sintético de iOS llega con retraso tras el `touchend`).
export const TOUCH_TAP_CLICK_SUPPRESS_MS = 700;

// ¿El dedo se movió más de lo que cabe en un toque? (puro, testeable)
export function touchTapMoved(start, end, maxMovePx = TOUCH_TAP_MAX_MOVE_PX) {
  if (!start || !end) return true;
  return (
    Math.abs(end.x - start.x) > maxMovePx ||
    Math.abs(end.y - start.y) > maxMovePx
  );
}

// Rastreador por fila: guarda dónde empezó el toque, decide en
// `touchend` si fue un toque (selecciona) o un deslizamiento (scroll,
// no selecciona), y arma la supresión del clic que le sigue al toque.
export function createTouchTap() {
  let start = null;
  let suppressUntil = 0;
  return {
    touchStart(e) {
      const t = e?.touches?.[0];
      start = t ? { x: t.clientX, y: t.clientY } : null;
    },
    touchEnd(e) {
      const s = start;
      start = null;
      const t = e?.changedTouches?.[0];
      if (!s || !t) return false;
      if (touchTapMoved(s, { x: t.clientX, y: t.clientY })) return false;
      suppressUntil = Date.now() + TOUCH_TAP_CLICK_SUPPRESS_MS;
      return true;
    },
    touchCancel() {
      start = null;
    },
    shouldIgnoreClick(now = Date.now()) {
      return now < suppressUntil;
    },
  };
}
