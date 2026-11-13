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

import { normalizeCitySlug } from './seoRoutes.js';

export function eventShortSlug(event) {
  const slug = String(event?.slug || '');
  const city = String(event?.city_slug || '');
  if (slug && city && slug.startsWith(city + '-')) return slug.slice(city.length + 1);
  return slug;
}

export function eventUrl(event, base = '') {
  const slug = String(event?.slug || event?.id || '');
  if (!slug) return `${base}/eventos`;
  const rawCity = String(event?.city_slug || '');
  const city = normalizeCitySlug(rawCity);
  // El slug puede llevar el prefijo de la ciudad en su forma vieja
  // (mayúsculas/tildes, antes del SQL de la Fase 3) o en la canónica:
  // se aceptan ambas, pero la URL que se emite siempre lleva la ciudad
  // normalizada.
  const prefix = rawCity && slug.startsWith(rawCity + '-') ? rawCity
    : (city && slug.startsWith(city + '-') ? city : null);
  if (prefix) {
    return `${base}/evento/${city}/${slug.slice(prefix.length + 1)}`;
  }
  return `${base}/evento/${slug}`;
}

export function eventFullSlug(city, short) {
  const c = String(city || '');
  const s = String(short || '');
  if (!c || !s) return s;
  return s.startsWith(c + '-') ? s : `${c}-${s}`;
}

// Slugs viejos que ya no existen en la base (erratas corregidas): se
// corrigen al slug actual ANTES de buscar el evento. App.jsx busca con el
// slug corregido y, al encontrarlo, reemplaza la dirección por la
// canónica (eventUrl), así la URL vieja sigue funcionando y se corrige
// sola — igual que las URLs viejas /evento/<slug-completo>. Se mapea la
// forma corta y la completa porque la app resuelve por ambas (la URL
// nueva /evento/:ciudad/:slug-corto y la vieja /evento/<slug-completo>).
// og.js usa el mismo mapa para que los enlaces compartidos sigan
// sirviendo su tarjeta.
export const EVENT_SLUG_REDIRECTS = {
  'eslabon-aramado-tour-el-amor-nocturno-en-guadalajara': 'eslabon-armado-tour-el-amor-nocturno-en-guadalajara',
  'guadalajara-eslabon-aramado-tour-el-amor-nocturno-en-guadalajara': 'guadalajara-eslabon-armado-tour-el-amor-nocturno-en-guadalajara',
};

export function resolveEventSlug(slug) {
  const s = String(slug || '');
  return EVENT_SLUG_REDIRECTS[s] || s;
}
