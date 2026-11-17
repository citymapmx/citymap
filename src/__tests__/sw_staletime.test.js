import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import middleware from '../../middleware.js';

// ── Revival del SW (nov 2026, parte B del «sin internet al abrir») ─────
// El SW estuvo muerto a conciencia (hallazgo #5): /sw.js servía el script
// autodestructivo de VitePWA y el cliente no lo registraba. Sin SW nada
// sirve el shell en un arranque en frío sin internet: el WebView falla
// antes de que arranque la web y no llegan a actuar ni la caché de
// localStorage (#382) ni LoadFailureView (#385). La causa del bucle de la
// #229 era selfDestroying (instalar → desinstalar → recargar → registrar);
// sin selfDestroying y con el registro de antes (onNeedRefresh NUNCA
// recarga), el bucle no puede volver. Lo que cambia:
//  1. /sw.js vuelve a ser el SW real de VitePWA (workbox + precache):
//     el SW autodestructivo de quien lo tenga se actualiza a él y el
//     resto lo instala en la primera visita con internet.
//  2. El cliente vuelve a registrar /sw.js (main.jsx).
//  3. navigateFallback: 'index.html' para que las rutas SPA sirvan el
//     shell precacheado sin red.
// Se mantienen las compensaciones del hallazgo #5: staleTime del menú de
// 30 min + prefetch de la ruta del menú al abrir la ficha.

const readSource = (rel) =>
  fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

const request = (path, host = 'citymap.mx') =>
  new Request(`https://${host}${path}`, {
    headers: { 'user-agent': 'Mozilla/5.0' },
  });

describe('middleware: /sw.js sigue pasando de largo (Vercel sirve dist/sw.js)', () => {
  it.each([
    'citymap.mx',
    'www.citymap.mx',
    'citymap.world',
    'www.citymap.world',
  ])('pasa de largo (undefined) en %s: Vercel sirve dist/sw.js con 200', async (host) => {
    // El middleware debe pasar de largo para que Vercel sirva el archivo
    // estático dist/sw.js (como ya hace con assetlinks.json). Antes del
    // revival servía el autodestructivo; ahora sirve el SW real.
    expect(await middleware(request('/sw.js', host))).toBeUndefined();
  });

  it('las páginas en www.citymap.mx y citymap.world SIGUEN redirigiendo 308', async () => {
    // La exención de /sw.js es solo para ese archivo: la canonicalización
    // de dominios no cambia para el resto de rutas.
    const mx = await middleware(request('/tepic', 'www.citymap.mx'));
    expect(mx.status).toBe(308);
    expect(mx.headers.get('location')).toBe('https://citymap.mx/tepic');
    const world = await middleware(request('/paris', 'citymap.world'));
    expect(world.status).toBe(308);
    expect(world.headers.get('location')).toBe(
      'https://www.citymap.world/paris',
    );
  });

  it('el middleware ya no contiene el kill switch del 404', () => {
    const src = readSource('../../middleware.js');
    expect(src).not.toContain('Service Worker Removed');
    expect(src).not.toContain("pathname === '/sw.js'");
    // (El 404 de /planes sigue: es otra cosa, una página eliminada.)
  });
});

describe('dist/sw.js: el SW real de VitePWA (workbox + precache)', () => {
  it('existe y es un SW de verdad, no el autodestructivo', () => {
    // dist/ lo genera el build (VitePWA, sin selfDestroying); no se
    // sube al repo, pero el build local lo tiene y la prueba lo verifica.
    const sw = readSource('../../dist/sw.js');
    expect(sw).toContain('workbox');
    expect(sw).toContain('precache');
    expect(sw).not.toContain('registration.unregister()');
    expect(sw).not.toContain('caches.delete');
  });

  it('vite.config.js ya NO tiene selfDestroying y define navigateFallback', () => {
    const config = readSource('../../vite.config.js');
    // La opción autodestructiva está quitada (el comentario la nombra
    // para explicar por qué, así que se afirma la línea, no la palabra).
    expect(config).not.toMatch(/selfDestroying:\s*true/);
    // Las rutas SPA sirven el index.html precacheado sin red: sin esto
    // el SW no puede atender la navegación inicial en frío.
    expect(config).toContain("navigateFallback: 'index.html'");
    // registerType no cambia: no se toca la configuración del SW.
    expect(config).toContain("registerType: 'autoUpdate'");
    // El shell (html) sigue en el precache; los chunks JS se cachean
    // en runtime (NetworkFirst) en la primera visita con internet.
    expect(config).toContain("globPatterns: ['**/*.{css,html,ico,png,svg,webp,jpg,jpeg,otf}']");
  });
});

describe('main.jsx: el cliente vuelve a registrar /sw.js', () => {
  it('importa virtual:pwa-register y llama a registerSW', () => {
    const src = readSource('../../src/main.jsx');
    expect(src).toContain('virtual:pwa-register');
    expect(src).toContain('registerSW({');
    // La decisión queda documentada en el propio archivo (por qué el
    // bucle de la #229 no puede volver: sin selfDestroying).
    expect(src).toContain('Service Worker REVIVIDO');
    expect(src).not.toContain('Sin registro del Service Worker, a conciencia');
  });

  it('onNeedRefresh NUNCA recarga: la actualización es silenciosa', () => {
    const src = readSource('../../src/main.jsx');
    // El cuerpo de onNeedRefresh es solo un log: ni reload() ni
    // updateSW(true) — forzar una recarga al actualizar causaba el
    // bucle infinito. (El comentario de arriba nombra «recarga» para
    // advertirlo, así que se revisa el cuerpo, no todo el archivo.)
    const body = src.split('onNeedRefresh()')[1].split('onRegistered')[0];
    expect(body).toContain('Silently accept');
    expect(body).not.toContain('reload(');
    expect(body).not.toContain('updateSW');
  });

  it('el SW de push sigue intacto (otro registro aparte)', () => {
    const src = readSource('../../src/hooks/useWebPush.js');
    expect(src).toContain("register('/firebase-messaging-sw.js'");
  });
});

describe('MenuView: staleTime del menú subido (5 → 30 min)', () => {
  it('define 30 min de frescura y 60 min de retención', () => {
    const src = readSource('../../src/views/MenuView.jsx');
    expect(src).toContain('MENU_STALE_TIME = 30 * 60 * 1000');
    expect(src).toContain('MENU_GC_TIME = 60 * 60 * 1000');
  });

  it('las dos consultas del menú usan los nuevos valores', () => {
    const src = readSource('../../src/views/MenuView.jsx');
    expect(src.match(/staleTime: MENU_STALE_TIME/g)).toHaveLength(2);
    expect(src.match(/gcTime: MENU_GC_TIME/g)).toHaveLength(2);
    expect(src).not.toContain('staleTime: 5 * 60 * 1000');
  });

  it('el resto de consultas no cambia (el global sigue en 5 min)', () => {
    const main = readSource('../../src/main.jsx');
    expect(main).toContain('staleTime: 5 * 60 * 1000');
    const detail = readSource('../../src/views/DetailView.jsx');
    expect(detail).toContain('staleTime: 5 * 60 * 1000');
  });
});

describe('DetailView: prefetch de la ruta del menú al abrir la ficha', () => {
  it('precarga MenuView en idle (mismo módulo que el lazy de AppRouter)', () => {
    const src = readSource('../../src/views/DetailView.jsx');
    expect(src).toContain("import('../views/MenuView.jsx')");
    expect(src).toContain('requestIdleCallback');
  });

  it('mantiene el prefetch del modal de reserva (precedente)', () => {
    const src = readSource('../../src/views/DetailView.jsx');
    expect(src).toContain("import('../components/BookingModal.jsx')");
  });
});
