import { CITY_TZ } from './constants.js';
import { eventDayKey, selectHomeEvents } from './homeEventSelection.js';
import { getThumbSrcSet, getThumbUrl, isNear, SRCSET_CARD } from './utils.js';

// Tamaño que la rueda muestra: el mismo srcset y sizes que EventWheel3D
// usa en la cara del frente, para que la precarga y el <img> pidan el
// mismo candidato y el navegador no descargue la imagen dos veces.
export const WHEEL_IMG_W = 800;
export const WHEEL_PRELOAD_SIZES = '(max-width: 640px) 50vw, 300px';

// La primera cara de la rueda, con la misma selección que HomeEvents:
// eventos de la ciudad (o su zona metropolitana), ordenados por fecha.
// Sin coordenadas del usuario — el store no las tiene y en el primer
// render de la rueda tampoco están — así que isNear filtra solo por ciudad.
export function firstWheelEvent(events, citySlug, today = eventDayKey(new Date(), CITY_TZ[citySlug])) {
  const list = (events || []).filter((ev) => isNear(ev, null, citySlug));
  const { featured, seasonal } = selectHomeEvents(list, today);
  const all = [...featured, ...seasonal].sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')));
  return all[0] || null;
}

export function wheelFirstImageUrl(events, citySlug, today) {
  const first = firstWheelEvent(events, citySlug, today);
  if (!first) return null;
  const img = first.img_url || first.img || first.poster_url;
  return typeof img === 'string' && img ? img : null;
}

// ─── Caras diferidas de la rueda ─────────────────────────────────────────────
// La rueda es el LCP de la página de ciudad y sus 10 caras pedían la imagen
// a 800 px nada más montar (474 KB en Tepic con 6 pósteres; a 400 px son
// 185 KB). Las caras de atrás no se ven — van giradas y apagadas — así que
// solo montan su <img> las cercanas al frente: la del frente y 2 a cada
// lado. Las demás esperan a que el giro las acerque (el auto-avance les da
// ~8 s) y una vez cargadas ya no se desmontan, para que el póster no
// parpadee al volver a pasar por el frente.
export const WHEEL_NEAR_RADIUS = 2;

// Índice de la cara del frente a partir de la rotación del tambor
// (grados; step = 360 / n). Con rotation 0 la cara 0 está al frente; al
// avanzar, rotation baja (-step por cara).
export function wheelFrontIndex(rotation, step, n) {
  if (!n || n < 1 || !step) return 0;
  return (((-Math.round(rotation / step)) % n) + n) % n;
}

// Caras a menos de `radius` pasos circulares del frente (incluido él).
export function wheelNearFaces(front, n, radius = WHEEL_NEAR_RADIUS) {
  if (!n || n < 1) return [];
  const out = [];
  for (let k = -radius; k <= radius; k++) out.push(((front + k) % n + n) % n);
  return out;
}
// que React pinte la rueda. Con imagesrcset/imagesizes iguales a los del
// <img>, la precarga se reutiliza y no hay doble descarga. Si ya hay un
// enlace para otra imagen (cambio de ciudad), se reemplaza; si ya no hay
// primera imagen (sin eventos próximos), se quita. Sin document (pruebas
// sin DOM) no hace nada. Devuelve true si dejó el enlace puesto.
export function preloadWheelFirstImage(events, citySlug, doc = typeof document !== 'undefined' ? document : null, today) {
  if (!doc || !doc.head || typeof doc.createElement !== 'function') return false;
  const existing = doc.head.querySelector('link[data-wheel-preload]');
  const img = wheelFirstImageUrl(events, citySlug, today);
  if (!img) {
    if (existing) existing.remove();
    return false;
  }
  if (existing) {
    if (existing.getAttribute('data-wheel-preload') === img) return true;
    existing.remove();
  }
  const srcSet = getThumbSrcSet(img, SRCSET_CARD);
  const link = doc.createElement('link');
  link.setAttribute('rel', 'preload');
  link.setAttribute('as', 'image');
  link.setAttribute('fetchpriority', 'high');
  link.setAttribute('data-wheel-preload', img);
  link.setAttribute('href', getThumbUrl(img, WHEEL_IMG_W));
  if (srcSet) {
    link.setAttribute('imagesrcset', srcSet);
    link.setAttribute('imagesizes', WHEEL_PRELOAD_SIZES);
  }
  doc.head.appendChild(link);
  return true;
}
