// Rutas de la sección Revista (TripsView): /revista, /experiencias y /mis-planes.
// La vista se mantiene montada una vez visitada (keep-alive en AppRouter),
// así que al salir de la sección y volver no se remontan las tarjetas ni
// se vuelven a pedir las fotos. Este parseo extrae ciudad y artículo de la
// URL porque TripsView ya no vive dentro de un <Route> (useParams no aplica).

export function parseRevistaPath(pathname) {
  if (pathname === '/mis-planes') return { city: '', slug: '' };
  const m = pathname.match(/^\/(?:revista|experiencias)(?:\/([^/]+)(?:\/([^/]+))?)?\/?$/);
  if (!m) return null;
  return { city: m[1] || '', slug: m[2] || '' };
}

export function isRevistaPath(pathname) {
  return parseRevistaPath(pathname) !== null;
}
