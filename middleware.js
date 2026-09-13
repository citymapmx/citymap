import { NextResponse } from 'next/server';

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

  if (vista) return NextResponse.redirect(new URL('/api/og?vista=' + vista, request.url));
  if (b || lugar) {
    const finalId = b || lugar.split('_').pop();
    return NextResponse.redirect(new URL('/api/og?b=' + finalId, request.url));
  }
  if (ev || evento) {
    const finalId = ev || evento.split('_').pop();
    return NextResponse.redirect(new URL('/api/og?ev=' + finalId, request.url));
  }

  // ── 2. Archivos estáticos y API: pasar de largo ───────────────────────────
  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/') ||
      pathname.startsWith('/assets/') || pathname.startsWith('/web-next/') ||
      pathname.includes('.')) {
    return NextResponse.next();
  }

  // ── 3. Parsear segmentos de la ruta ──────────────────────────────────────
  const parts = pathname.split('/').filter(Boolean);
  const seg1 = parts[0] || '';
  const seg2 = parts[1] || '';
  const seg3 = parts[2] || '';

  // ── 4. Raíz / → Next.js ──────────────────────────────────────────────────
  if (pathname === '/') {
    return NextResponse.rewrite(new URL('/web-next/', request.url));
  }

  // ── 5. Rutas de Vite → index.html ────────────────────────────────────────
  if (VITE_ROUTES.has(seg1)) {
    return NextResponse.rewrite(new URL('/index.html', request.url));
  }

  // ── 6. Mapa → Next.js ────────────────────────────────────────────────────
  if (seg1 === 'mapa') {
    const city = seg2 || 'tepic';
    return NextResponse.rewrite(new URL('/web-next/mapa/' + city, request.url));
  }

  // ── 7. Eventos → Next.js ─────────────────────────────────────────────────
  if (seg1 === 'evento' && seg2) {
    return NextResponse.rewrite(new URL('/web-next/evento/' + seg2, request.url));
  }

  // ── 8. Experiencias → Next.js ────────────────────────────────────────────
  if (seg1 === 'experiencias') {
    if (seg2 && seg3) {
      return NextResponse.rewrite(new URL('/web-next/experiencias/' + seg2 + '/' + seg3, request.url));
    }
    if (seg2) {
      return NextResponse.rewrite(new URL('/web-next/experiencias/' + seg2, request.url));
    }
  }

  // ── 9. /:city → Next.js (ciudad principal) ───────────────────────────────
  if (parts.length === 1) {
    return NextResponse.rewrite(new URL('/web-next/' + seg1, request.url));
  }

  // ── 10. /:city/:slug/menu → Next.js ──────────────────────────────────────
  if (parts.length === 3 && seg3 === 'menu') {
    return NextResponse.rewrite(new URL('/web-next/' + seg1 + '/' + seg2 + '/menu', request.url));
  }

  // ── 11. /:city/:slug → Next.js (perfil de negocio o categoría) ───────────
  if (parts.length === 2) {
    return NextResponse.rewrite(new URL('/web-next/' + seg1 + '/' + seg2, request.url));
  }

  // ── 12. Todo lo demás → Vite ─────────────────────────────────────────────
  return NextResponse.rewrite(new URL('/index.html', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
