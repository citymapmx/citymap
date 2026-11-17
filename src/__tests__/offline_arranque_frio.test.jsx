// Arranque en frío sin internet (nov 2026, parte B del «sin internet al
// abrir»): con caché, la app debe mostrar lo último guardado (muro y
// fichas) en vez de cualquier pantalla de error; sin caché (primera vez),
// la pantalla «Sin conexión» de la #385, sin inventar contenido.
//
// La cadena completa es: el SW sirve el shell (index.html + JS) sin red
// → la app arranca → loadData restaura el muro de localStorage antes de
// pedir nada → los fetches fallidos no pisan la caché ni tumban el
// arranque → el splash sale. Antes de esta PR la cadena se rompía en el
// primer eslabón: el SW estaba muerto (hallazgo #5) y el WebView fallaba
// antes de que arrancara la web.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('arranque en frío sin internet: el SW sirve el shell', () => {
  it('vite.config.js revive el SW y define el fallback de navegación', () => {
    const config = read('../../vite.config.js');
    // La opción autodestructiva está quitada (el comentario la nombra
    // para explicar por qué, así que se afirma la línea, no la palabra).
    expect(config).not.toMatch(/selfDestroying:\s*true/);
    // Las rutas SPA sirven el index.html precacheado sin red.
    expect(config).toContain("navigateFallback: 'index.html'");
    // El shell (html) va en el precache; los chunks JS se cachean en
    // runtime (NetworkFirst) en la primera visita con internet.
    expect(config).toContain("globPatterns: ['**/*.{css,html,ico,png,svg,webp,jpg,jpeg,otf}']");
    expect(config).toContain("handler: 'NetworkFirst'");
    expect(config).toContain("cacheName: 'assets-cache'");
  });

  it('main.jsx registra el SW (sin el bucle de la #229)', () => {
    const src = read('../../src/main.jsx');
    expect(src).toContain('virtual:pwa-register');
    expect(src).toContain('registerSW({');
    expect(src).not.toContain('Sin registro del Service Worker, a conciencia');
  });
});

describe('arranque en frío sin internet: con caché se ve lo último', () => {
  it('loadData restaura el muro de localStorage antes de pedir a la red', () => {
    const src = read('../../src/store/useDataStore.js');
    // Restauración síncrona antes de cualquier fetch.
    expect(src).toContain('const cached = localStorage.getItem(cacheKey)');
    expect(src).toContain('homeCacheAvailable: true');
    // Un fetch fallido devuelve null, no []: no pisa la caché con vacíos.
    expect(src).toContain('Un fetch fallido devuelve null, no []');
    expect(src).toContain('Solo se guarda lo que llegó bien');
  });

  it('el arranque nunca se atora: loadData resuelve aunque todo falle', () => {
    const src = read('../../src/store/useDataStore.js');
    // El catch final deja dbReady en true para que el splash salga.
    expect(src).toContain('set({ dbError: true, dbReady: true,homeCoreError:true })');
    // refreshCities tampoco rechaza: devuelve las ciudades que haya.
    expect(src).toContain("return get().cities;");
  });

  it('la ficha y el menú también se sirven de la caché sin red', () => {
    const biz = read('../../src/services/dbService.js');
    expect(biz).toContain('readBizCache(bizId)');
    const menu = read('../../src/lib/storeCategories.js');
    expect(menu).toContain('readMenuCache(businessId)');
  });
});

describe('arranque en frío sin internet: sin caché se ve «Sin conexión»', () => {
  it('el muro global muestra LoadFailureView cuando no hay nada y no hay red', () => {
    const src = read('../../src/views/GlobalHomeView.jsx');
    expect(src).toContain("import LoadFailureView from '../components/LoadFailureView.jsx'");
    expect(src).toContain("import { isOnline } from '../lib/loadRecovery.js'");
    // La condición: terminó de cargar, sin error previo, sin internet y
    // con todas las listas vacías (no se inventa contenido).
    expect(src).toContain('const offlineEmpty = !loading && !error && !isOnline()');
    expect(src).toContain('allCities.length === 0 && biz.length === 0 && events.length === 0 && experiences.length === 0');
    expect(src).toContain('{offlineEmpty && !isSearching && <LoadFailureView />}');
    // Y el contenido normal no se dibuja vacío encima.
    expect(src).toContain('{!loading && !error && !isSearching && !offlineEmpty && (');
  });
});
