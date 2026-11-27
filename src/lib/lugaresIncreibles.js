// Carrusel de «Lugares increíbles»: constantes y lógica pura de la
// selección del top (aquí, no en el componente, para no romper el
// fast refresh de React).
//
// REGLA DEL TOP (27 nov 2026, con datos reales): candidatos =
// businesses con categoría `lugares` en la ciudad activa, con
// `photos[0]` Y `rating` no nulo. Orden: `rating` DESC, desempate
// `review_count` DESC. Top 5. La sección NO se monta si hay menos de
// 3 candidatos (ej. Magdalena tiene 2: queda fuera). NO se deriva
// nada de la subcategoría (en Guadalajara 13 de 14 lugares no la
// tienen). Dato medido: 229 lugares en 40 ciudades; 222 con
// foto+rating; casi todas las ciudades tienen 5, Guadalajara 14,
// Kioto 14, Tepic 10, Tokio 10.
//
// El filtrado por ciudad NO vive aquí: quien monta el componente ya
// pasa solo los negocios de la ciudad activa (HomeView pasa
// `topLugares` del store).
export const LUGARES_AUTOPLAY_MS = 4500;
export const LUGARES_RESUME_AFTER_MS = 6000;
export const LUGARES_TOP_N = 5;
export const LUGARES_MIN_CANDIDATOS = 3;

// Avance automático: 4.5 s por tarjeta, en bucle.
export function nextLugaresIndex(current, count) {
  if (!count || count < 1) return 0;
  return (((current + 1) % count) + count) % count;
}

// Foto de la tarjeta: `photos[0]`. En la base es un objeto `{url}`;
// se acepta también el string directo por robustez.
export function lugarPhotoUrl(biz) {
  const photo = biz?.photos?.[0];
  if (!photo) return null;
  if (typeof photo === "string") return photo || null;
  return photo.url || null;
}

// `rating` de la fila (puede venir como string con coma decimal, como
// en `displayRating` de lib/googleRatings.js). Sin dato → null.
export function lugarRating(biz) {
  const rating = parseFloat(String(biz?.rating ?? "").replace(",", "."));
  return Number.isNaN(rating) ? null : rating;
}

// Top de lugares: categoría `lugares`, con foto y rating, ordenados
// por rating DESC y review_count DESC. Máximo LUGARES_TOP_N.
export function topLugaresIncreibles(businesses) {
  if (!businesses) return [];
  return businesses
    .filter((b) => typeof b?.category === "string" && b.category.trim().toLowerCase() === "lugares")
    .filter((b) => lugarPhotoUrl(b))
    .map((b) => ({ biz: b, rating: lugarRating(b) }))
    .filter(({ rating }) => rating !== null)
    .sort((a, b) => b.rating - a.rating || (Number(b.biz.review_count) || 0) - (Number(a.biz.review_count) || 0))
    .slice(0, LUGARES_TOP_N)
    .map(({ biz }) => biz);
}
