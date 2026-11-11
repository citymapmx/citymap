// Rutas de las secciones que dependen de una ciudad (Revista, Mapa y
// Eventos). Al cambiar de ciudad estando en una de ellas se entra a la
// MISMA sección con la ciudad nueva (Revista de Tepic → Revista de
// Guadalajara), en vez de ir al inicio de la ciudad nueva. El inicio y
// el muro global se quedan como están (buildCityPath).

// Mapa de sección: Revista vive en /revista, /experiencias y /mis-planes
// (todas pintan TripsView); Eventos en /eventos y /explorar (EventsView);
// Mapa en /mapa (MapView). Si se está en un artículo (/revista/:ciudad/
// :slug) se vuelve al inicio de la sección con la ciudad nueva: el
// artículo pertenece a la ciudad vieja.
export function sectionPathForCity(pathname, citySlug) {
  if (!pathname || !citySlug) return null;
  if (
    pathname.startsWith('/revista') ||
    pathname.startsWith('/experiencias') ||
    pathname.startsWith('/mis-planes')
  ) {
    return `/revista/${citySlug}`;
  }
  if (pathname.startsWith('/eventos') || pathname.startsWith('/explorar')) {
    return `/eventos/${citySlug}`;
  }
  if (pathname.startsWith('/mapa')) {
    return `/mapa/${citySlug}`;
  }
  return null;
}

// Ruta de sección con ciudad en la URL: /revista/:ciudad,
// /eventos/:ciudad, /mapa/:ciudad (también /experiencias y /explorar).
// Sirve para que el splash «Preparando {ciudad}» también salga al
// cambiar de ciudad desde una sección (en el inicio ya salía).
export function isSectionCityPath(pathname) {
  return /^\/(revista|experiencias|eventos|explorar|mapa)\/[^/]+/.test(
    pathname || '',
  );
}
