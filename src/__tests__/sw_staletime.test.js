import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import middleware from '../../middleware.js';

// ── Hallazgo #5 (nov 2026): el SW está muerto a conciencia ────────────────
// Variante chica y segura: NO se revive el SW. Lo que cambia:
//  1. /sw.js deja de dar 404 (kill switch de la #229) y sirve el script
//     autodestructivo que genera VitePWA (dist/sw.js): el SW viejo se
//     actualiza a él, se desinstala y recarga una sola vez.
//  2. El cliente ya NO registra /sw.js (main.jsx): registrar el
//     autodestructivo en cada carga recrearía el bucle de recarga de la
//     #229 (instalar → activar → desinstalar → recargar → registrar…).
//  3. Se compensa sin SW: staleTime del menú de 5 a 30 min + prefetch de
//     la ruta del menú al abrir la ficha.

const readSource = (rel) =>
  fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

const request = (path, host = 'citymap.mx') =>
  new Request(`https://${host}${path}`, {
    headers: { 'user-agent': 'Mozilla/5.0' },
  });

describe('middleware: /sw.js ya no da 404, sirve el autodestructivo', () => {
  it.each([
    'citymap.mx',
    'www.citymap.mx',
    'citymap.world',
    'www.citymap.world',
  ])('pasa de largo (undefined) en %s: Vercel sirve dist/sw.js con 200', async (host) => {
    // El middleware debe pasar de largo para que Vercel sirva el archivo
    // estático dist/sw.js (como ya hace con assetlinks.json). Antes, el
    // kill switch devolvía 404 aquí.
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

describe('dist/sw.js: el autodestructivo que genera VitePWA', () => {
  it('existe y desinstala el SW viejo (skipWaiting + unregister + borra cachés)', () => {
    // dist/ lo genera el build (VitePWA selfDestroying: true); no se
    // sube al repo, pero el build local lo tiene y la prueba lo verifica.
    const sw = readSource('../../dist/sw.js');
    expect(sw).toContain('skipWaiting');
    expect(sw).toContain('registration.unregister()');
    expect(sw).toContain('caches.delete');
    expect(sw).not.toContain('workbox');
    expect(sw).not.toContain('precache');
  });

  it('vite.config.js sigue con selfDestroying y NO revive el SW', () => {
    const config = readSource('../../vite.config.js');
    expect(config).toContain('selfDestroying: true');
    // registerType no cambia: no se toca la configuración del SW.
    expect(config).toContain("registerType: 'autoUpdate'");
  });
});

describe('main.jsx: el cliente ya NO registra /sw.js', () => {
  it('no importa virtual:pwa-register ni llama a registerSW', () => {
    const src = readSource('../../src/main.jsx');
    expect(src).not.toContain('virtual:pwa-register');
    expect(src).not.toContain('registerSW({');
    // La decisión queda documentada en el propio archivo (por qué no se
    // registra: el bucle de la #229).
    expect(src).toContain('Sin registro del Service Worker, a conciencia');
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
