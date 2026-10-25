export function seoSite(host = '') {
  const hostname = host.toLowerCase().split(':')[0];
  const isWorld = hostname === 'citymap.world' || hostname === 'www.citymap.world';
  return { isWorld, origin: isWorld ? 'https://www.citymap.world' : 'https://citymap.mx' };
}

export const SEO_COUNTRIES = new Set(['mx', 'us', 'es', 'ca', 'ar', 'co', 'fr', 'gb']);

export function seoSegments(pathname, isWorld) {
  const parts = pathname.split('/').filter(Boolean);
  if (isWorld && SEO_COUNTRIES.has(parts[0])) parts.shift();
  return parts;
}
