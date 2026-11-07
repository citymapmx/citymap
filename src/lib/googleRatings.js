// Calificaciones de Google en caché (refresco mensual en el servidor).
// La tarjeta y la ficha muestran el conteo de Google cuando hay un dato
// vigente en caché; si no lo hay (sin place_id, sin refresco aún, o dato
// vencido), usan el conteo propio de CityMap. Las reseñas propias de
// CityMap se conservan siempre: esto solo cambia el número que se muestra.
export function displayRating(biz, googleMap) {
  const g = biz?.id ? googleMap?.[biz.id] : null;
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
