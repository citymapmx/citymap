// URLs canónicas de eventos: /evento/:ciudad/:slug-corto
// (p. ej. /evento/zapopan/zz-top en lugar de /evento/zapopan-zz-top).
//
// El slug guardado en la base es `<ciudad>-<titulo>`; la URL nueva separa
// la ciudad como segmento. Las URLs viejas (/evento/<slug-completo>) siguen
// resolviendo: al cargar el evento la app reemplaza la dirección por la
// canónica, y el sitemap y las etiquetas de Google ya apuntan al formato
// nuevo, así no se pierde tráfico.
//
// El recorte del prefijo es el mismo que `cleanCityPrefix` en utils.js,
// repetido aquí para que el módulo no dependa de nada del cliente y lo
// puedan importar también las funciones de /api (sitemap, og).

export function eventShortSlug(event) {
  const slug = String(event?.slug || '');
  const city = String(event?.city_slug || '');
  if (slug && city && slug.startsWith(city + '-')) return slug.slice(city.length + 1);
  return slug;
}

export function eventUrl(event, base = '') {
  const slug = String(event?.slug || event?.id || '');
  if (!slug) return `${base}/eventos`;
  const city = String(event?.city_slug || '');
  if (city && slug.startsWith(city + '-')) {
    return `${base}/evento/${city}/${slug.slice(city.length + 1)}`;
  }
  return `${base}/evento/${slug}`;
}

export function eventFullSlug(city, short) {
  const c = String(city || '');
  const s = String(short || '');
  if (!c || !s) return s;
  return s.startsWith(c + '-') ? s : `${c}-${s}`;
}
