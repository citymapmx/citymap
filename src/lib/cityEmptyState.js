// Criterio único para mostrar el estado vacío de una ciudad.
//
// Una ciudad solo está "vacía" cuando no tiene ningún tipo de contenido:
// ni negocios, ni experiences (tours/artículos), ni eventos aprobados,
// ni widget de Civitatis. Antes el criterio solo miraba los negocios
// (mapPins), así que ciudades nuevas con tours —como Bogotá o Londres—
// mostraban "¡Ups! … está vacía" aunque tuvieran contenido.
export function shouldShowCityEmptyState({
  hasBusinesses = false,
  hasExperiences = false,
  hasEvents = false,
  hasWidget = false,
} = {}) {
  return !hasBusinesses && !hasExperiences && !hasEvents && !hasWidget;
}

// ¿Mostrar la tarjeta de categoría vacía en la página de categoría?
//
// La página de categoría (/:ciudad/c/:categoria) tiene su propio bloque de
// lista vacía. Cuando la categoría completa está vacía (sin subcategoría
// elegida), ese bloque es la tarjeta CityEmptyState con la categoría; pero
// solo si la tarjeta genérica de "ciudad vacía" NO se muestra ya arriba,
// para que nunca se vean las dos a la vez.
export function shouldShowCategoryEmptyState({
  selectedSubcat,
  categoryLabel,
  showGenericEmpty,
} = {}) {
  return selectedSubcat === "todas" && !showGenericEmpty && Boolean(categoryLabel);
}
