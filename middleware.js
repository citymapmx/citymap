import sitemap from './api/sitemap.xml.js';
import robots from './api/robots.txt.js';
import { seoSite, seoSegments } from './src/lib/seoRoutes.js';

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
  if (routeParts.length === 3 && routeParts[1] === 'c') {
    const destination = new URL(request.url);
    destination.pathname = pathname.replace('/c/', '/');
    return Response.redirect(destination, 308);
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

  // Rutas reservadas del sistema que no deben interpretarse como /:city/:slug
  const RESERVED_FIRST_SEGS = new Set([
    'experiencias', 'evento', 'mapa', 'planes', 'explorar', 'eventos',
    'mis-planes', 'revista', 'favoritos', 'explorer', 'cuenta', 'itinerarios',
    'itinerario', 'plan', 'about', 'privacy', 'terms', 'admin_notifs',
    'user_notifs', 'manage', 'stats', 'precios', 'lealtad', 'wallet', 'scan', 'admin'
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
  // /evento/:slug → og?ev=slug
  else if (seg1 === 'evento' && seg2) {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('ev', seg2);
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
  // /:city/:slug/menu → og?b=slug&city=city&menu=true
  else if (parts.length === 3 && seg3 === 'menu' && !RESERVED_FIRST_SEGS.has(seg1)) {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('b', seg2);
    ogUrl.searchParams.set('city', seg1);
    ogUrl.searchParams.set('menu', 'true');
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
      return new Response(html, {
        status: ogRes.status,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'x-og-served': '1',
          'x-robots-tag': ogRes.status === 404 ? 'noindex' : 'index, follow, max-image-preview:large'
        }
      });
    }
  }

  return;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|workbox).*)'],
};
