// Rutas que deben ir a la SPA de Vite (index.html)
const VITE_ROUTES = new Set([
  'favoritos','cuenta','lealtad','wallet','mis-planes','planes',
  'precios','admin','manage','stats','itinerarios','about','privacy',
  'terms','lugar','scan'
]);

export default async function middleware(request) {
  const url = new URL(request.url);
  const { pathname, searchParams } = url;

  // ── 1. Legado: redirecciones de query params ──────────────────────────────
  const b = searchParams.get('b');
  const ev = searchParams.get('ev');
  const lugar = searchParams.get('lugar');
  const evento = searchParams.get('evento');
  const vista = searchParams.get('vista');

  if (vista) return Response.redirect(new URL('/api/og?vista=' + vista, request.url), 302);
  if (b || lugar) {
    const finalId = b || lugar.split('_').pop();
    return Response.redirect(new URL('/api/og?b=' + finalId, request.url), 302);
  }
  if (ev || evento) {
    const finalId = ev || evento.split('_').pop();
    return Response.redirect(new URL('/api/og?ev=' + finalId, request.url), 302);
  }

  // ── 2. Archivos estáticos, API y web-next interno: pasar de largo ─────────
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') ||
      pathname.startsWith('/assets/') || pathname.startsWith('/web-next/') ||
      pathname.includes('.')) {
    return; // pasar de largo al handler normal
  }

  // ── 3. Parsear segmentos de la ruta ──────────────────────────────────────
  const parts = pathname.split('/').filter(Boolean);
  const seg1 = parts[0] || '';
  const seg2 = parts[1] || '';
  const seg3 = parts[2] || '';

  // Helper para reescribir a Next.js (sub-app en /web-next/)
  const rewriteNext = (path) => {
    const newUrl = new URL('/web-next' + path, request.url);
    return fetch(newUrl, { headers: request.headers });
  };

  // ── 4. Raíz / → Next.js ──────────────────────────────────────────────────
  if (pathname === '/') {
    return rewriteNext('/');
  }

  // ── 5. Rutas de Vite → index.html ────────────────────────────────────────
  if (VITE_ROUTES.has(seg1)) {
    return fetch(new URL('/index.html', request.url), { headers: request.headers });
  }

  // ── 6. Mapa → Next.js ────────────────────────────────────────────────────
  if (seg1 === 'mapa') {
    const city = seg2 || 'tepic';
    return rewriteNext('/mapa/' + city);
  }

  // ── 7. Eventos → Next.js ─────────────────────────────────────────────────
  if (seg1 === 'evento' && seg2) {
    return rewriteNext('/evento/' + seg2);
  }

  // ── 8. Experiencias → Next.js ────────────────────────────────────────────
  if (seg1 === 'experiencias') {
    if (seg2 && seg3) return rewriteNext('/experiencias/' + seg2 + '/' + seg3);
    if (seg2) return rewriteNext('/experiencias/' + seg2);
  }

  // ── 9. /:city → Next.js ──────────────────────────────────────────────────
  if (parts.length === 1) {
    return rewriteNext('/' + seg1);
  }

  // ── 10. /:city/:slug/menu → Next.js ──────────────────────────────────────
  if (parts.length === 3 && seg3 === 'menu') {
    return rewriteNext('/' + seg1 + '/' + seg2 + '/menu');
  }

  // ── 11. /:city/:slug → Next.js ───────────────────────────────────────────
  if (parts.length === 2) {
    return rewriteNext('/' + seg1 + '/' + seg2);
  }

  // ── 12. Todo lo demás → Vite ─────────────────────────────────────────────
  return fetch(new URL('/index.html', request.url), { headers: request.headers });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sw.js|workbox).*)'],
};
