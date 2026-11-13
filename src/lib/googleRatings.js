// Calificaciones de Google en caché (refresco mensual en el servidor).
// REGLA (decisión 12 nov 2026): las reseñas/calificaciones de Google
// SOLO se muestran en negocios de plan Destacado o Premium. Los
// gratuitos NO muestran el dato de Google (ni estrellas ni conteo con
// la G): usan su conteo propio de CityMap, como cualquier negocio sin
// dato en caché. Un plan null o distinto se trata como gratuito.
// El refresco del servidor tampoco les pide el dato (ver
// api/actualizar-calificaciones-google.js); si queda una fila vieja en
// caché para un gratuito, aquí simplemente no se usa (vence a 30 días).
export const GOOGLE_REVIEWS_PLANS = ['destacado', 'premium'];

export function businessShowsGoogleRating(biz) {
  return GOOGLE_REVIEWS_PLANS.includes(biz?.plan);
}

// La tarjeta y la ficha muestran el conteo de Google cuando el negocio
// es de pago y hay un dato vigente en caché; si no lo hay (sin
// place_id, sin refresco aún, dato vencido, o plan gratuito), usan el
// conteo propio de CityMap. Las reseñas propias de CityMap se
// conservan siempre: esto solo cambia el número que se muestra.
export function displayRating(biz, googleMap) {
  const g = businessShowsGoogleRating(biz) && biz?.id ? googleMap?.[biz.id] : null;
  if (g && typeof g.rating === "number" && typeof g.count === "number") {
    return { rating: g.rating, count: g.count, source: "google" };
  }
  const rating = parseFloat(String(biz?.rating ?? "").replace(",", "."));
  return {
    rating: Number.isNaN(rating) ? null : rating,
    count: Number(biz?.review_count) || 0,
    source: "citymap",
  };
}

// Conteo con separador de miles (8,824 en lugar de 8824).
export const formatReviewCount = (n) =>
  new Intl.NumberFormat("es-MX").format(Number(n) || 0);

// "Los más valorados": orden por la calificación que se muestra (Google en
// caché cuando hay, solo en negocios de pago; los gratuitos usan su conteo
// propio de CityMap), con mínimo de reseñas para entrar. Sin mínimo, un
// 5.0 con 2 reseñas quedaría en #1 por encima de un 4.7 con cientos (caso
// Café Drama: 5.0 interno con 2 reseñas, 2.5 en Google con 82). Si no hay
// 10 con el mínimo, se completa con los mejores restantes para que la lista
// no quede corta en ciudades chicas.
export const TOP_RATED_MIN_REVIEWS = 50;

export function rankTopRated(businesses, googleMap, minReviews = TOP_RATED_MIN_REVIEWS) {
  const scored = (businesses || [])
    .map((biz) => ({ biz, d: displayRating(biz, googleMap) }))
    .filter(({ d }) => typeof d.rating === "number" && (d.count ?? 0) > 0)
    .sort((x, y) => y.d.rating - x.d.rating || (y.d.count ?? 0) - (x.d.count ?? 0));
  const qualified = scored.filter(({ d }) => (d.count ?? 0) >= minReviews);
  const picked =
    qualified.length >= 10
      ? qualified
      : [...qualified, ...scored.filter((s) => (s.d.count ?? 0) < minReviews)];
  return picked.slice(0, 10).map(({ biz }) => biz);
}
