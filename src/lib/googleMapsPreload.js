import { GMAPS_KEY } from './supabase.js';

// El script de Google Maps, en UN solo lugar (M18, 21 nov 2026): lo usan
// tanto la precarga como los dos useGMaps (el mapa principal y el del
// admin). Mismo id (#gms) y misma URL, así que el segundo que llega
// encuentra el script ya creado y no descarga nada dos veces.
//
// La URL es la que necesita el mapa principal: `libraries=places,marker`
// y `v=weekly` (el `marker` lo usan los pines del mapa; sin él, si la
// precarga creara el script con solo `places`, el mapa montaría sin la
// librería de marcadores). La copia del admin solo pedía `places`, que
// va incluida, así que el cambio es un superconjunto para ella.
export function ensureGoogleMapsScript(doc = document) {
  const existing = doc.getElementById('gms');
  if (existing) return existing;
  const el = doc.createElement('script');
  el.id = 'gms';
  el.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&libraries=places,marker&v=weekly`;
  el.async = true;
  doc.head.appendChild(el);
  return el;
}

// Inyecta el script de Google Maps en segundo plano, cuando el navegador
// está en reposo (o a los 2 s como tope), para que el mapa abra casi al
// instante la primera vez que se toca. No calienta tiles (dependen del
// viewport) ni los logos de los pines. Costo: la descarga ocurre aunque
// el usuario nunca abra el mapa; el script queda cacheado entre
// sesiones, así que en visitas repetidas es casi gratis.
export function scheduleGoogleMapsPreload(win = window, doc = document) {
  let idle;
  const timer = win.setTimeout(() => {
    if (win.requestIdleCallback) idle = win.requestIdleCallback(() => ensureGoogleMapsScript(doc), { timeout: 2000 });
    else ensureGoogleMapsScript(doc);
  }, 2000);
  return () => {
    win.clearTimeout(timer);
    if (idle !== undefined) win.cancelIdleCallback?.(idle);
  };
}
