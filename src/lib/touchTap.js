// Toque «tap» en listas con scroll (27 nov 2026, selector de ciudad):
// en iOS, tocar una lista que aún se mueve por inercia solo detiene el
// scroll: no se dispara `click` y el primer toque se pierde. El
// `touchend` sí llega, así que la selección se hace ahí cuando el dedo
// apenas se movió. El clic sintético que sigue al toque se suprime para
// no seleccionar dos veces. Sin toque previo (ratón, teclado), el
// `onClick` de siempre sigue funcionando igual.
//
// Reutilización (27 nov 2026, cacería de bugs nº 1): el mismo patrón
// vive en toda la app — menú, carruseles, antojos, búsqueda, /eventos —
// así que el tracker se cablea con `touchTapProps` / `useTouchTap` /
// `useTouchTapList` en vez de copiar los cuatro handlers a mano. Nada
// visible cambia: mismo handler, mismo orden, mismo aspecto.
import { useCallback, useRef } from 'react';

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

// ¿El toque empezó sobre un control anidado dentro de la fila (un
// botón `+`, el stepper de cantidad, un enlace…)? El `touchstart` y el
// `touchend` burbujean hasta la fila, así que sin esta guarda tocar el
// `+` de un producto abriría también el modal del producto. El propio
// elemento al que se atan las props (`currentTarget`) no cuenta: una
// tarjeta `<a>` o un botón-fila son ellos mismos el control.
// `data-touch-tap-ignore` marca un contenedor que no es botón pero
// tampoco debe activar la fila (p. ej. el stepper de cantidad).
function touchStartedOnNestedControl(e) {
  const hit = e?.target?.closest?.(
    'button, a, input, select, textarea, [data-touch-tap-ignore]',
  );
  return Boolean(hit) && hit !== e?.currentTarget;
}

// Props de toque para un control con su propio tracker: se esparcen
// sobre el elemento en lugar del `onClick` solo. `onActivate` es el
// mismo handler que antes llevaba el `onClick` (recibe el evento).
// Opciones:
// - `ignoreNestedControls`: no registrar el toque si empezó sobre un
//   control anidado (ver arriba). Para filas con botones dentro.
// - `preventDefaultOnSuppress`: en `<a href>` el clic suprimido también
//   debe llevar `preventDefault`, si no el navegador seguiría el `href`
//   con una carga completa en vez de la navegación SPA del `touchend`.
export function touchTapProps(tap, onActivate, opts = {}) {
  return {
    onClick: (e) => {
      if (tap.shouldIgnoreClick()) {
        if (opts.preventDefaultOnSuppress) e.preventDefault();
        return;
      }
      onActivate(e);
    },
    onTouchStart: (e) => {
      if (opts.ignoreNestedControls && touchStartedOnNestedControl(e)) return;
      tap.touchStart(e);
    },
    onTouchEnd: (e) => {
      if (tap.touchEnd(e)) onActivate(e);
    },
    onTouchCancel: () => tap.touchCancel(),
  };
}

// Hook para un solo control: devuelve las props de toque. El handler
// se lee siempre de un ref, así que la versión que corre en `touchend`
// es la del último render aunque el dedo lleve un rato apoyado.
export function useTouchTap(onActivate, opts) {
  const tapRef = useRef(null);
  if (tapRef.current === null) tapRef.current = createTouchTap();
  const latestRef = useRef(onActivate);
  latestRef.current = onActivate;
  return touchTapProps(tapRef.current, (e) => latestRef.current(e), opts);
}

// Hook para listas renderizadas con `.map()`: devuelve una función que
// da las props de toque de una fila identificada por `key` (un tracker
// por fila, guardado en un ref del padre). No se puede llamar a un hook
// dentro del `.map`, así que el tracker vive en este registro: sobrevive
// a los re-renders y a que la fila se remonte, igual que el de `CityRow`.
export function useTouchTapList() {
  const tapsRef = useRef(null);
  if (tapsRef.current === null) tapsRef.current = new Map();
  return useCallback((key, onActivate, opts) => {
    let tap = tapsRef.current.get(key);
    if (!tap) {
      tap = createTouchTap();
      tapsRef.current.set(key, tap);
    }
    return touchTapProps(tap, onActivate, opts);
  }, []);
}
