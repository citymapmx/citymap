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
