// Return null outside category routes; preserve category IDs containing hyphens.
export function categoryFromUrl(pathname, search = '', categories = [], world = false) {
  const segments = pathname.split('/').filter(Boolean);
  const offset = world ? 1 : 0;
  const slug = segments.length === offset + 3 && segments[offset + 1] === 'c'
    ? segments[offset + 2]
    : new URLSearchParams(search).get('cat');
  if (!slug) return null;
  const normalized = slug.toLowerCase().replace(/\s+/g, '-');
  return categories.find(category => String(category.id).toLowerCase().replace(/\s+/g, '-') === normalized)?.id
    || slug.replace(/-/g, ' ');
}
