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

  // ── 1. Legado: redirecciones de query params (old deep links) ─────────────
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

  // ── 2. Archivos estáticos y API: pasar de largo siempre ──────────────────
  if (pathname.startsWith('/api/') || pathname.startsWith('/assets/') ||
      pathname.startsWith('/_next/') || pathname.startsWith('/web-next/') ||
      pathname.includes('.')) {
    return;
  }

  // ── 3. Solo actuar si es bot social ──────────────────────────────────────
  if (!isSocialBot(ua)) return;

  // ── 4. Parsear ruta ───────────────────────────────────────────────────────
  const parts = pathname.split('/').filter(Boolean);
  const seg1 = parts[0] || '';
  const seg2 = parts[1] || '';
  const seg3 = parts[2] || '';

  let ogUrl = null;

  // /:city/:slug → og?b=slug&city=city
  if (parts.length === 2 && seg1 !== 'experiencias' && seg1 !== 'evento' && seg1 !== 'mapa') {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('b', seg2);
    ogUrl.searchParams.set('city', seg1);
  }
  // /:city/:slug/menu → og?b=slug&city=city&menu=true
  else if (parts.length === 3 && seg3 === 'menu') {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('b', seg2);
    ogUrl.searchParams.set('city', seg1);
    ogUrl.searchParams.set('menu', 'true');
  }
  // /evento/:slug → og?ev=slug
  else if (seg1 === 'evento' && seg2) {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('ev', seg2);
  }
  // /experiencias/:city/:slug → og?exp=slug&city=city
  else if (seg1 === 'experiencias' && seg2 && seg3) {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('exp', seg3);
    ogUrl.searchParams.set('city', seg2);
  }
  // /:city → og?city=city
  else if (parts.length === 1 && seg1) {
    ogUrl = new URL('/api/og', request.url);
    ogUrl.searchParams.set('city', seg1);
  }

  if (ogUrl) {
    // Llamar internamente a /api/og y devolver su HTML directo al bot
    // (sin redirect para evitar loops con la detección de bots en og.js)
    const ogRes = await fetch(ogUrl.toString(), {
      headers: {
        'user-agent': ua, // Pasar el UA del bot para que og.js sirva HTML
        'accept': 'text/html'
      }
    });
    if (ogRes.ok) {
      const html = await ogRes.text();
      return new Response(html, {
        status: 200,
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'public, s-maxage=3600, stale-while-revalidate=86400',
          'x-og-served': '1'
        }
      });
    }
  }

  return;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|workbox).*)'],
};
