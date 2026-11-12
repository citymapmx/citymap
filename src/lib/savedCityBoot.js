// Arranque en "/" con ciudad guardada: sostener el splash de llegada
// hasta que la ciudad esté lista, para no mostrar el muro global un
// instante y luego el splash (el cambio se veía brusco).
// El arranque redirige a la ciudad guardada: entrada rápida con caché,
// o la "Segunda entrada" de la rama final tras cargar (el regreso de
// Google OAuth también llega ahí, porque parseOAuthHash limpia el hash
// antes de decidir la ruta). Mientras el arranque no termina
// (authChecked false) y seguimos en "/", el splash cubre la pantalla;
// en cuanto la ruta cambia a la ciudad, el splash normal toma el relevo
// con la misma ciudad, sin reiniciarse. Si el arranque termina sin
// redirigir (ciudad desconocida o borrada), la condición se apaga y se
// ve el muro como hoy: el splash nunca se queda atorado.
export function shouldHoldSplashForSavedCity({ pathname, citySlugIsDefault, authChecked }) {
  return pathname === "/" && !citySlugIsDefault && !authChecked;
}
