import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// PR #141: lo que queda en PageSpeed /tepic móvil tras el #140
// (Rendimiento 68): la hero de Chapala (393,5 KiB servida a 800×468 para
// mostrarse a ~209×123; 293,8 KiB de ahorro) y el JS sin usar (158 KiB).
// Sin bajar la calidad visible y sin cambiar el diseño.
//
// 1) La hero era la única imagen del inicio sin srcset: TopImperdibles
// ("Los 5 imperdibles") servía gallery[0] a 800w fijo en un <img> crudo.
// El resto del inicio ya lo tenía por el #140.
// 2) El JS sin usar estaba en el bundle inicial por dos vías: el
// manualChunks de Vite casaba 'node_modules/react' a secas y metía
// react-easy-crop, react-qr-code (y react-virtuoso) en el chunk 'react'
// precargado; y Firebase (app + messaging + installations + idb) vivía
// en el chunk App aunque el registro push solo corre con el permiso ya
// concedido o cuando el usuario acepta el aviso.
describe('hero y js: PageSpeed tras el PR #140', () => {
  const topImperdibles = read('../components/home/TopImperdibles.jsx');
  const app = read('../App.jsx');
  const main = read('../main.jsx');
  const viteConfig = read('../../vite.config.js');
  const useWebPush = read('../hooks/useWebPush.js');
  const firebaseLib = read('../lib/firebase.js');
  const mapView = read('../views/MapView.jsx');
  const appRouter = read('../router/AppRouter.jsx');

  it('TopImperdibles: la foto del artículo lleva srcset (mismo recorte, menos bytes)', () => {
    expect(topImperdibles).toContain('getThumbSrcSet');
    expect(topImperdibles).toContain('SRCSET_CARD');
    expect(topImperdibles).toContain('srcSet={imgSrcSet}');
    expect(topImperdibles).toContain('sizes="(max-width: 640px) 100vw, 800px"');
    // El candidato mayor sigue siendo 800w: ningún dispositivo descarga
    // más que antes; el recorte (cover) y el lazy no cambian.
    expect(topImperdibles).toContain('getThumbUrl(exp.gallery[0], 800)');
    expect(topImperdibles).toContain('objectFit: "cover"');
    expect(topImperdibles).toContain('loading="lazy"');
    expect(topImperdibles).toContain('decoding="async"');
  });

  it('mapa: GMap y MapView se cargan bajo demanda, no en el inicio', () => {
    expect(app).toContain("const GMap = lazy(() => import('./components/GMap.jsx'))");
    expect(app).toContain('const MapView = lazy(() => import("./views/MapView.jsx"))');
    // Sin import estático del mapa en App.jsx.
    expect(app).not.toMatch(/^import\s+.*GMap.*from/m);
    expect(app).not.toMatch(/^import\s+.*MapView.*from/m);
  });

  it('mapa: GMap y MapView se siguen montando (el lazy no los eliminó)', () => {
    // MapView se monta en la ruta /mapa y GMap dentro de MapView, ambos
    // con estado de carga (Suspense + LoaderFallback), no pantalla en blanco.
    expect(appRouter).toContain('<Route path="/mapa"');
    expect(appRouter).toContain('<MapView />');
    expect(mapView).toContain('<Suspense fallback={<LoaderFallback/>}><GMap');
  });

  it('admin: AdminPanel es lazy en la app y /admin carga su propio bundle', () => {
    expect(app).toContain('const AdminPanel = lazy(() => import("./components/AdminPanel.jsx"))');
    expect(app).not.toMatch(/^import\s+.*AdminPanel.*from/m);
    // La ruta /admin ni siquiera carga la app principal.
    expect(main).toContain("import('./AdminApp.jsx')");
    expect(main).toContain("window.location.pathname === '/admin'");
  });

  it('admin: el panel se sigue montando cuando el admin lo abre', () => {
    expect(app).toContain('<Suspense fallback={<LoaderFallback/>}><AdminPanel');
    expect(app).toContain('showAdmin &&');
  });

  it('manualChunks: solo react y react-dom exactos, no los react-*', () => {
    // La forma vieja ('node_modules/react' sin barra final) también
    // casaba con react-virtuoso, react-easy-crop y react-qr-code.
    expect(viteConfig).toContain("includes('node_modules/react/')");
    expect(viteConfig).toContain("includes('node_modules/react-dom/')");
    expect(viteConfig).not.toContain("includes('node_modules/react')");
    expect(viteConfig).not.toContain("includes('node_modules/react-dom')");
    // Comportamiento real de la función extraída de la config.
    const body = viteConfig.match(/manualChunks\(id\) \{([\s\S]*?)\n {8}\}/)?.[1];
    expect(body).toBeTruthy();
    const fn = new Function('id', body);
    expect(fn('/x/node_modules/react/index.js')).toBe('react');
    expect(fn('/x/node_modules/react-dom/cjs/react-dom-client.production.js')).toBe('react');
    expect(fn('/x/node_modules/react-virtuoso/dist/index.mjs')).toBeUndefined();
    expect(fn('/x/node_modules/react-easy-crop/index.module.mjs')).toBeUndefined();
    expect(fn('/x/node_modules/react-qr-code/lib/index.mjs')).toBeUndefined();
    expect(fn('/x/node_modules/react-router/index.js')).toBeUndefined();
  });

  it('firebase: no se importa estático en el inicio; solo al registrar push', () => {
    // useWebPush es el único que importa lib/firebase.js: ya no en la
    // cabecera del módulo, solo dentro de register() con import dinámico.
    expect(useWebPush).not.toMatch(/^import\s+.*from '\.\.\/lib\/firebase\.js'/m);
    expect(useWebPush).toContain("await import('../lib/firebase.js')");
    // El registro sigue existiendo y sigue pidiendo el permiso primero.
    expect(useWebPush).toContain('Notification.requestPermission()');
    expect(useWebPush).toContain('getMessaging(app)');
    // La librería no cambia: mismo singleton y mismas funciones.
    expect(firebaseLib).toContain('export { app, getMessaging, getToken, onMessage }');
  });
});
