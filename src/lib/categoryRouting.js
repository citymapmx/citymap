import { CATEGORY_SLUGS } from './seoRoutes.js';

// La forma directa /:ciudad/:categoria es una ruta de categoría, no el
// detalle de un negocio: el sitemap la emite así (`/guadalajara/restaurantes`)
// y el arranque (useAppInitialization) ya la resuelve como categoría. El
// router, en cambio, la trataba como detalle (/:ciudad/:slug) y dejaba la
// vista de categoría inerte: se veía pero ningún clic respondía.
export function isDirectCategorySegments(segments, world = false) {
  const offset = world ? 1 : 0;
  return segments.length === offset + 2 && CATEGORY_SLUGS.includes(segments[offset + 1].toLowerCase());
}

export function isDirectCategoryPath(pathname, world = false) {
  return isDirectCategorySegments(pathname.split('/').filter(Boolean), world);
}

// Return null outside category routes; preserve category IDs containing hyphens.
export function categoryFromUrl(pathname, search = '', categories = [], world = false) {
  const segments = pathname.split('/').filter(Boolean);
  const offset = world ? 1 : 0;
  const slug = segments.length === offset + 3 && segments[offset + 1] === 'c'
    ? segments[offset + 2]
    : isDirectCategorySegments(segments, world)
      ? segments[offset + 1]
      : new URLSearchParams(search).get('cat');
  if (!slug) return null;
  const normalized = slug.toLowerCase().replace(/\s+/g, '-');
  return categories.find(category => String(category.id).toLowerCase().replace(/\s+/g, '-') === normalized)?.id
    || slug.replace(/-/g, ' ');
}
