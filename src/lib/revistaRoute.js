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

// Detalle de un artículo de Revista (/revista/:ciudad/:slug o
// /experiencias/:ciudad/:slug, con ciudad Y artículo). El lector del
// artículo (ExperienceViewer) ya trae su propia barra con Volver y
// Compartir, así que la navbar global (hamburguesa + globo) se esconde
// ahí para no taparla. La lista de Revista (/revista o /revista/:ciudad)
// NO es detalle y conserva la navbar.
export function isRevistaArticlePath(pathname) {
  const route = parseRevistaPath(pathname);
  return Boolean(route && route.city && route.slug);
}
