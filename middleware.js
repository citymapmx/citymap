import sitemap from './api/sitemap.xml.js';
import robots from './api/robots.txt.js';
import { seoSite, seoSegments, CATEGORY_SLUGS, SYSTEM_FIRST_SEGMENTS, normalizeCitySlug } from './src/lib/seoRoutes.js';

// Bots sociales que necesitan OG tags pre-renderizados
const SOCIAL_BOTS = [
  "facebookexternalhit","whatsapp","twitterbot","linkedinbot",
  "telegrambot","applebot","discordbot","slackbot","pinterest",
  "vkshare","viber","skype","w3c_validator",
  "googlebot","bingbot","yandexbot","duckduckbot","slurp",
  "curl","python-requests","bot","spider","crawler"
];

function isSocialBot(ua) {
  const l = (ua || "").toLowerCase();
  return SOCIAL_BOTS.some(b => l.includes(b));
}

export default async function middleware(request) {
  const url = new URL(request.url);
  const { pathname, searchParams } = url;
  const ua = request.headers.get("user-agent") || "";
  const { isWorld, origin } = seoSite(url.hostname);
  if (url.hostname === 'www.citymap.mx' || url.hostname === 'citymap.world') {
    return Response.redirect(new URL(url.pathname + url.search, origin), 308);
  }
  // Run before static-file handling so build artifacts cannot shadow SEO endpoints.
  if (pathname === '/sitemap.xml') return sitemap(request);
  if (pathname === '/robots.txt') return robots(request);
  const routeParts = seoSegments(pathname, isWorld);
  // The legacy "Planes" section was removed: /planes and /planes/* answer a real 404 (no redirect).
  if (routeParts[0] === 'planes') {
    return new Response(
      '<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="robots" content="noindex"><meta name="viewport" content="width=device-width,initial-scale=1"><title>404 — Página no encontrada | CityMap</title></head><body style="font-family:system-ui,sans-serif;text-align:center;padding:20vh 24px"><h1>404</h1><p>Página no encontrada</p><p><a href="/">Ir al inicio</a></p></body></html>',
      { status: 404, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' } }
    );
  }
  // /:ciudad/c/:categoria (p. ej. /guadalajara/c/restaurantes) es la forma
  // legada de la categoría: se normaliza a /:ciudad/:categoria (308).
  // Pero /:ciudad/c/:subcategoria (p. ej. /guadalajara/c/unidad-deportiva)
  // es una vista real de la app y NO se redirige: la SPA la resuelve como
  // categoría y los bots la reciben por la rama de subcategoría de abajo.
  if (routeParts.length === 3 && routeParts[1] === 'c' && CATEGORY_SLUGS.includes(routeParts[2].toLowerCase())) {
    const destination = new URL(request.url);
    destination.pathname = pathname.replace('/c/', '/');
    return Response.redirect(destination, 308);
  }

  // Slugs de ciudad viejos (mayúsculas/tildes, p. ej.
  // /San-Pedro-Garza-García) → canónicos en minúsculas sin tildes (308).
  // Cubre la ciudad en cualquier posición: /:ciudad, /:ciudad/...,
  // /eventos/:ciudad, /revista/:ciudad/..., /evento/:ciudad/:slug,
  // /mapa/:ciudad y /explorar/:ciudad. En citymap.world el prefijo de
  // país no se toca. Es para todos los visitantes (no solo bots): sin
  // él, la URL vieja dejaría de resolver en cuanto el SQL de la Fase 3
  // corrija cities.slug. El pathname llega codificado (la í de García
  // es %C3%AD), así que se decodifica antes de comparar.
  const decodePart = part => { try { return decodeURIComponent(part); } catch { return part; } };
  const decodedParts = routeParts.map(decodePart);
  const citySegIndex = (() => {
    if (!decodedParts.length) return -1;
    const first = decodedParts[0].toLowerCase();
    if (!SYSTEM_FIRST_SEGMENTS.has(first)) return 0;
    if (['eventos', 'explorar', 'mapa', 'revista', 'experiencias', 'mis-planes'].includes(first)) {
      return decodedParts.length >= 2 ? 1 : -1;
    }
    if (first === 'evento') return decodedParts.length === 3 ? 1 : -1;
    return -1;
  })();
  if (citySegIndex >= 0) {
    const rawCity = decodedParts[citySegIndex];
    const normalizedCity = normalizeCitySlug(rawCity);
    if (normalizedCity !== rawCity) {
      const rawParts = decodePart(pathname).split('/').filter(Boolean);
      const offset = rawParts.length - decodedParts.length;
      rawParts[citySegIndex + offset] = normalizedCity;
      const destination = new URL(request.url);
      destination.pathname = '/' + rawParts.join('/') + (pathname.endsWith('/') ? '/' : '');
      return Response.redirect(destination, 308);
    }
  }

  // ── 0. KILL SWITCH PARA SERVICE WORKER VIEJO ──────────────────────────────
  // Si el navegador pide sw.js, devolvemos 404. Esto hace que el navegador 
  // desinstale el Service Worker silenciosamente sin disparar el evento "updatefound"
  // que causa el bucle de recarga en el cliente viejo.
  if (pathname === '/sw.js') {
    return new Response('Service Worker Removed', { status: 404 });
  }

  // ── 1. Archivos estáticos y API: pasar de largo siempre ──────────────────
  if (pathname.startsWith('/api/') || pathname.startsWith('/assets/') ||
      pathname.startsWith('/_next/') || pathname.startsWith('/web-next/') ||
      (pathname.includes('.') && pathname !== '/sw.js')) {
    return;
  }

  // ── 2. Legado: redirecciones de query params (old deep links) ─────────────
  const bParam = searchParams.get('b');
  const evParam = searchParams.get('ev');
  const lugarParam = searchParams.get('lugar');
  const eventoParam = searchParams.get('evento');
  const vistaParam = searchParams.get('vista');

  if (vistaParam) return Response.redirect(new URL('/api/og?vista=' + vistaParam, request.url), 302);
  if (bParam || lugarParam) {
    const finalId = bParam || lugarParam.split('_').pop();
    return Response.redirect(new URL('/api/og?b=' + finalId, request.url), 302);
  }
  if (evParam || eventoParam) {
    const finalId = evParam || eventoParam.split('_').pop();
    return Response.redirect(new URL('/api/og?ev=' + finalId, request.url), 302);
  }

  // ── 3. Solo actuar si es bot social ──────────────────────────────────────
  if (!isSocialBot(ua)) return;

  // ── 4. Parsear ruta ───────────────────────────────────────────────────────
  const parts = routeParts;
  const seg1 = parts[0] || '';
  const seg2 = parts[1] || '';
  const seg3 = parts[2] || '';

  let ogUrl = null;

  // Rutas reservadas del sistema que no deben interpretarse como /:city/:slug.
  // /tours y /negocios son secciones de nivel superior (están en el
  // sitemap): sin ellas aquí el middleware las trataba como ciudades y
  // devolvía 404 a los bots. /login es página de acceso (noindex).
  const RESERVED_FIRST_SEGS = new Set([
    'experiencias', 'evento', 'mapa', 'planes', 'explorar', 'eventos',
    'mis-planes', 'revista', 'favoritos', 'explorer', 'cuenta', 'itinerarios',
    'itinerario', 'plan', 'about', 'privacy', 'terms', 'admin_notifs',
    'user_notifs', 'manage', 'stats', 'precios', 'lealtad', 'wallet', 'scan', 'admin',
    'tours', 'negocios', 'login'
  ]);

  // /explorar o /explorar/:city → og?vista=eventos&city=:city
  if (seg1 === 'explorar') {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('vista', 'eventos');
    if (seg2) ogUrl.searchParams.set('city', seg2);
  }
  // /eventos o /eventos/:city → og?vista=eventos&city=:city
  else if (seg1 === 'eventos') {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('vista', 'eventos');
    if (seg2) ogUrl.searchParams.set('city', seg2);
  }
  // /mapa o /mapa/:city → og?vista=mapa&city=:city
  else if (seg1 === 'mapa') {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('vista', 'mapa');
    if (seg2) ogUrl.searchParams.set('city', seg2);
  }
  // /mis-planes → og?vista=mis-planes&city=:city
  else if (seg1 === 'mis-planes') {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('vista', 'mis-planes');
    if (seg2) ogUrl.searchParams.set('city', seg2);
  }
  // /evento/:slug (viejo) → og?ev=slug
  // /evento/:ciudad/:slug (nuevo) → og?ev=slug&city=ciudad
  else if (seg1 === 'evento' && seg2) {
    ogUrl = new URL('/api/og', request.url);
    if (seg3) {
      ogUrl.searchParams.set('ev', seg3);
      ogUrl.searchParams.set('city', seg2);
    } else {
      ogUrl.searchParams.set('ev', seg2);
    }
  }
  // /revista/:city/:slug o /experiencias/:city/:slug → og?exp=slug&city=city
  else if ((seg1 === 'revista' || seg1 === 'experiencias') && seg2 && seg3) {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('exp', seg3);
    ogUrl.searchParams.set('city', seg2);
  }
  // /revista o /revista/:city o /experiencias o /experiencias/:city
  else if (seg1 === 'revista' || seg1 === 'experiencias') {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('vista', 'revista');
    if (seg2) ogUrl.searchParams.set('city', seg2);
  }
  // /:ciudad/:slug/menu → og?b=slug&city=ciudad&menu=true
  else if (parts.length === 3 && seg3 === 'menu' && !RESERVED_FIRST_SEGS.has(seg1)) {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('b', seg2);
    ogUrl.searchParams.set('city', seg1);
    ogUrl.searchParams.set('menu', 'true');
  }
  // /:ciudad/c/:subcategoria → og?b=subcat&city=ciudad&subcat=1
  // (la subcategoría es un valor de businesses.category; og la valida)
  else if (parts.length === 3 && seg2 === 'c' && !RESERVED_FIRST_SEGS.has(seg1)) {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('b', seg3);
    ogUrl.searchParams.set('city', seg1);
    ogUrl.searchParams.set('subcat', '1');
  }
  // /:city/:slug → og?b=slug&city=city
  else if (parts.length === 2 && !RESERVED_FIRST_SEGS.has(seg1)) {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('b', seg2);
    ogUrl.searchParams.set('city', seg1);
  }
  // /:city → og?city=city
  else if (parts.length === 1 && seg1 && !RESERVED_FIRST_SEGS.has(seg1)) {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('city', seg1);
  }
  // Otras secciones del sistema con 1 segmento (cuenta, favoritos, etc.)
  else if (parts.length === 1 && RESERVED_FIRST_SEGS.has(seg1)) {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('vista', seg1);
  }

  if (ogUrl) {
    // Add _bot=1 escape hatch to force og.js to return HTML instead of a 302 redirect
    ogUrl.searchParams.set('_bot', '1');
    // Llamar internamente a /api/og y devolver su HTML directo al bot
    // (sin redirect para evitar loops con la detección de bots en og.js)
    const ogRes = await fetch(ogUrl.toString(), {
      headers: {
        'user-agent': ua, // Pasar el UA del bot para que og.js sirva HTML
        'accept': 'text/html'
      }
    });
    if (ogRes.ok || ogRes.status === 404) {
      const html = await ogRes.text();
      // /login es página de acceso: se sirve con 200 pero no se indexa.
      const robotsTag = ogRes.status === 404 || ogUrl.searchParams.get('vista') === 'login'
        ? 'noindex'
        : 'index, follow, max-image-preview:large';
      return new Response(html, {
        status: ogRes.status,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'x-og-served': '1',
          'x-robots-tag': robotsTag
        }
      });
    }
  }

  return;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|workbox).*)'],
};
