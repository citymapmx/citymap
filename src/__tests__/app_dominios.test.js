import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import middleware from '../../middleware.js';

// ── App Android y los dos dominios (citymap.mx / citymap.world) ─────────────
// Reporte 14 nov 2026: al abrir una ciudad extranjera en la app, el WebView
// se salía y abría la ciudad en el navegador. Causa: `server.url` es
// https://citymap.mx y no había `server.allowNavigation`, así que Capacitor
// abría cualquier navegación fuera de .mx en el navegador externo
// (documentación de Capacitor: "By default, all external URLs are opened in
// the external browser (not the Web View)").
// El arreglo es de configuración nativa: permitir los 4 hosts en el WebView
// y declarar los App Links de .world en el manifest. El assetlinks.json ya
// se sirve en ambos dominios con el mismo contenido (lo verifica el test).

const readSource = (rel) =>
  fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

const request = (path, host = 'citymap.mx') =>
  new Request(`https://${host}${path}`, {
    headers: { 'user-agent': 'Mozilla/5.0' },
  });

// Hosts a los que la app puede navegar sin salirse al navegador: los dos
// dominios canónicos (citymap.mx y www.citymap.world) más sus variantes con
// y sin www, que son las que devuelven los 308 del middleware (middleware.js).
const APP_HOSTS = [
  'citymap.mx',
  'www.citymap.mx',
  'citymap.world',
  'www.citymap.world',
];

describe('capacitor.config.json: navegación entre dominios', () => {
  it('sigue cargando el sitio desde https://citymap.mx', () => {
    const config = JSON.parse(readSource('../../capacitor.config.json'));
    expect(config.server.url).toBe('https://citymap.mx');
  });

  it('permite navegar a los 4 hosts dentro del WebView (sin salir al navegador)', () => {
    const config = JSON.parse(readSource('../../capacitor.config.json'));
    expect(Array.isArray(config.server.allowNavigation)).toBe(true);
    for (const host of APP_HOSTS) {
      expect(config.server.allowNavigation).toContain(host);
    }
  });

  it('usa hosts exactos, sin comodines ni "*" (lista cerrada, solo lo nuestro)', () => {
    const config = JSON.parse(readSource('../../capacitor.config.json'));
    for (const host of config.server.allowNavigation) {
      expect(host).not.toContain('*');
      expect(host).not.toContain('://');
      expect(host).not.toContain('/');
    }
  });
});

describe('AndroidManifest.xml: App Links de los dos dominios', () => {
  it('declara App Links con autoVerify para citymap.world y www.citymap.world', () => {
    const manifest = readSource(
      '../../android/app/src/main/AndroidManifest.xml',
    );
    expect(manifest).toContain('android:autoVerify="true"');
    expect(manifest).toContain('android:host="citymap.world"');
    expect(manifest).toContain('android:host="www.citymap.world"');
  });

  it('mantiene los App Links de citymap.mx (con y sin www)', () => {
    const manifest = readSource(
      '../../android/app/src/main/AndroidManifest.xml',
    );
    expect(manifest).toContain('android:host="citymap.mx"');
    expect(manifest).toContain('android:host="www.citymap.mx"');
  });

  it('mantiene el deep link de login mx.citymap.app://login', () => {
    const manifest = readSource(
      '../../android/app/src/main/AndroidManifest.xml',
    );
    expect(manifest).toContain('android:scheme="mx.citymap.app"');
    expect(manifest).toContain('android:host="login"');
  });
});

describe('middleware: assetlinks.json nunca redirige (App Links)', () => {
  it.each([
    'citymap.mx',
    'www.citymap.mx',
    'citymap.world',
    'www.citymap.world',
  ])('sirve /.well-known/assetlinks.json sin 308 en %s', async (host) => {
    // Android pide el archivo en cada host exacto y no sigue redirecciones:
    // el middleware debe pasar de largo (undefined) para que Vercel sirva el
    // archivo estático con 200 y application/json. Antes de este arreglo,
    // citymap.world y www.citymap.mx devolvían 308 aquí (verificado en vivo).
    expect(
      await middleware(request('/.well-known/assetlinks.json', host)),
    ).toBeUndefined();
  });

  it('las páginas en www.citymap.mx y citymap.world SIGUEN redirigiendo 308', async () => {
    // La excepción es solo para assetlinks.json: la canonicalización de
    // dominios no cambia para el resto de rutas.
    const mx = await middleware(request('/tepic', 'www.citymap.mx'));
    expect(mx.status).toBe(308);
    expect(mx.headers.get('location')).toBe('https://citymap.mx/tepic');
    const world = await middleware(request('/paris', 'citymap.world'));
    expect(world.status).toBe(308);
    expect(world.headers.get('location')).toBe(
      'https://www.citymap.world/paris',
    );
  });
});

describe('assetlinks.json: cubre a la app en los dos dominios', () => {
  it('declara delegate_permission/common.handle_all_urls para mx.citymap.app', () => {
    // El mismo archivo estático se sirve en citymap.mx y en citymap.world;
    // Android lo evalúa por host, así que con este contenido basta para
    // que los enlaces .world abran en la app (verificado en vivo: 200 en
    // https://www.citymap.world/.well-known/assetlinks.json).
    const links = JSON.parse(
      readSource('../../public/.well-known/assetlinks.json'),
    );
    expect(Array.isArray(links)).toBe(true);
    const entry = links.find(
      (l) => l.target?.package_name === 'mx.citymap.app',
    );
    expect(entry).toBeDefined();
    expect(entry.relation).toContain(
      'delegate_permission/common.handle_all_urls',
    );
    expect(entry.target.namespace).toBe('android_app');
    expect(entry.target.sha256_cert_fingerprints.length).toBeGreaterThan(0);
  });
});

describe('middleware: /<cc>/<ciudad> en .mx no deja ciudad fantasma', () => {
  // 20 nov 2026: al cambiar de ciudad a una extranjera, la app caía en la
  // ciudad fantasma del código de país («us», «es»): saludo «¡Linda noche!
  // Us» y muro vacío. La URL /us/los-angeles en .mx no redirigía a ningún
  // lado y la SPA tomaba «us» como ciudad. Ahora el middleware la manda a
  // su canónica en .world (o le quita el prefijo si la ciudad es mexicana).
  it.each([
    ['/us/los-angeles', 'https://www.citymap.world/us/los-angeles'],
    ['/es/barcelona', 'https://www.citymap.world/es/barcelona'],
    ['/es/madrid', 'https://www.citymap.world/es/madrid'],
    ['/fr/paris', 'https://www.citymap.world/fr/paris'],
    ['/ca/vancouver', 'https://www.citymap.world/ca/vancouver'],
    ['/ar/buenos-aires', 'https://www.citymap.world/ar/buenos-aires'],
    ['/co/bogota', 'https://www.citymap.world/co/bogota'],
    ['/gb/londres', 'https://www.citymap.world/gb/londres'],
    ['/us/los-angeles/restaurantes', 'https://www.citymap.world/us/los-angeles/restaurantes'],
    ['/mx/guadalajara', 'https://citymap.mx/guadalajara'],
  ])('redirige %s en .mx a %s', async (path, location) => {
    const res = await middleware(request(path, 'citymap.mx'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe(location);
  });

  it('un código de país solo (/us) no redirige: la SPA ya no lo toma como ciudad', async () => {
    expect(await middleware(request('/us', 'citymap.mx'))).toBeUndefined();
    expect(await middleware(request('/es', 'citymap.mx'))).toBeUndefined();
  });
});

describe('middleware: Nueva York vive en .world (C2)', () => {
  // 21 nov 2026: Nueva York no estaba en WORLD_CITIES, así que el
  // selector (por country_code) la mandaba a .world/us/new-york pero el
  // salto en cliente la devolvía a .mx/new-york: doble salto y muro
  // vacío. Ahora es ciudad world como las demás internacionales.
  it.each([
    ['/new-york', 'https://www.citymap.world/us/new-york'],
    ['/us/new-york', 'https://www.citymap.world/us/new-york'],
    ['/new-york/restaurantes', 'https://www.citymap.world/us/new-york/restaurantes'],
    ['/evento/new-york/new-york-911-memorial', 'https://www.citymap.world/evento/new-york/new-york-911-memorial'],
  ])('redirige %s en .mx a %s', async (path, location) => {
    const res = await middleware(request(path, 'citymap.mx'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe(location);
  });

  it('en .world /us/new-york ya es su canónica: no redirige', async () => {
    expect(await middleware(request('/us/new-york', 'www.citymap.world'))).toBeUndefined();
  });

  it('en .world /new-york sin prefijo canonicaliza a /us/new-york', async () => {
    const res = await middleware(request('/new-york', 'www.citymap.world'));
    expect(res.status).toBe(308);
    expect(res.headers.get('location')).toBe('https://www.citymap.world/us/new-york');
  });

  it('en .world la ruta plana /evento/new-york/... ya no se devuelve a .mx', async () => {
    expect(await middleware(request('/evento/new-york/new-york-911-memorial', 'www.citymap.world'))).toBeUndefined();
  });
});
