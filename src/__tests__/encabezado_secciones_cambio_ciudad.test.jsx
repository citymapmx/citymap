import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { sectionPathForCity, isSectionCityPath } from '../lib/sectionRouting.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// 11 nov 2026 (Jonathan, con captura del inicio en Tepic): (1) la
// hamburguesa ☰ y el globo 🌐 del inicio también aparecen arriba en
// Revista, Mapa y Eventos, con el mismo aspecto y comportamiento; (2) al
// cambiar de ciudad estando en una de esas secciones se entra a esa MISMA
// sección con la ciudad nueva (Revista de Tepic → Revista de Guadalajara),
// en vez de ir al inicio de la ciudad nueva. La pantalla «Preparando
// {ciudad}» se conserva.
// Agregados el mismo día: (3) el precio sale de la barra fija de boletos
// del detalle de evento (ver detalle_evento_barra_fija.test.jsx); (4) la
// portada del menú usa el mismo encuadre que la ficha (recorte 4:3 +
// cover) porque con 800×340 se veía acercada. Desde el hallazgo #3
// (nov 2026) el menú pide 800×600 — mismo recorte 4:3, la mitad de
// peso — con prioridad alta; la ficha sigue en 1200×900.
describe('cambio de ciudad desde una sección: misma sección, ciudad nueva', () => {
  it('Revista: /revista/:ciudad y /revista/:ciudad/:artículo van a /revista/:nueva', () => {
    expect(sectionPathForCity('/revista/tepic', 'guadalajara')).toBe('/revista/guadalajara');
    expect(sectionPathForCity('/revista/tepic/mi-articulo', 'guadalajara')).toBe('/revista/guadalajara');
    expect(sectionPathForCity('/revista', 'guadalajara')).toBe('/revista/guadalajara');
    expect(sectionPathForCity('/experiencias/tepic', 'guadalajara')).toBe('/revista/guadalajara');
    expect(sectionPathForCity('/mis-planes', 'guadalajara')).toBe('/revista/guadalajara');
  });

  it('Eventos: /eventos y /explorar van a /eventos/:nueva', () => {
    expect(sectionPathForCity('/eventos/tepic', 'guadalajara')).toBe('/eventos/guadalajara');
    expect(sectionPathForCity('/eventos', 'guadalajara')).toBe('/eventos/guadalajara');
    expect(sectionPathForCity('/explorar/tepic', 'guadalajara')).toBe('/eventos/guadalajara');
  });

  it('Mapa: /mapa y /mapa/:ciudad van a /mapa/:nueva', () => {
    expect(sectionPathForCity('/mapa/tepic', 'guadalajara')).toBe('/mapa/guadalajara');
    expect(sectionPathForCity('/mapa', 'guadalajara')).toBe('/mapa/guadalajara');
  });

  it('el inicio, el detalle y el resto no son secciones: no hay ruta de sección', () => {
    expect(sectionPathForCity('/', 'guadalajara')).toBeNull();
    expect(sectionPathForCity('/tepic', 'guadalajara')).toBeNull();
    expect(sectionPathForCity('/tepic/el-tentempie', 'guadalajara')).toBeNull();
    expect(sectionPathForCity('/evento/tepic/x', 'guadalajara')).toBeNull();
    expect(sectionPathForCity('/favoritos', 'guadalajara')).toBeNull();
    expect(sectionPathForCity('/tepic/el-tentempie/menu', 'guadalajara')).toBeNull();
    expect(sectionPathForCity('/revista/tepic', '')).toBeNull();
  });

  it('isSectionCityPath solo acepta rutas de sección con ciudad', () => {
    expect(isSectionCityPath('/revista/guadalajara')).toBe(true);
    expect(isSectionCityPath('/eventos/guadalajara')).toBe(true);
    expect(isSectionCityPath('/mapa/guadalajara')).toBe(true);
    expect(isSectionCityPath('/experiencias/guadalajara')).toBe(true);
    expect(isSectionCityPath('/revista')).toBe(false);
    expect(isSectionCityPath('/eventos')).toBe(false);
    expect(isSectionCityPath('/mapa')).toBe(false);
    expect(isSectionCityPath('/tepic')).toBe(false);
    expect(isSectionCityPath('/')).toBe(false);
    expect(isSectionCityPath('')).toBe(false);
  });
});

describe('encabezado global en Revista, Mapa y Eventos', () => {
  const app = read('../App.jsx');

  it('el encabezado ya no se oculta en /mapa, /eventos, /explorar, /revista, /experiencias ni /mis-planes', () => {
    const start = app.indexOf('GLOBAL GLASS NAVBAR');
    const block = app.slice(start, app.indexOf('position: "fixed"', start));
    expect(block).not.toContain('"/mapa"');
    expect(block).not.toContain('"/eventos"');
    expect(block).not.toContain('"/explorar"');
    expect(block).not.toContain('"/revista"');
    expect(block).not.toContain('"/experiencias"');
    expect(block).not.toContain('"/mis-planes"');
  });

  it('el encabezado sigue oculto en el resto (cuenta, admin, favoritos, detalle, menú)', () => {
    const start = app.indexOf('GLOBAL GLASS NAVBAR');
    const block = app.slice(start, app.indexOf('position: "fixed"', start));
    expect(block).toContain('"/cuenta"');
    expect(block).toContain('"/admin"');
    expect(block).toContain('"/favoritos"');
    expect(block).toContain('"/evento/"');
    expect(block).toContain('"/menu"');
  });

  it('el envoltorio de cambio de ciudad navega a la misma sección con la ciudad nueva', () => {
    expect(app).toContain('sectionPathForCity(location.pathname, s)');
    expect(app).toContain('routerNavigate(sectionPath, { replace: true, viewTransition: true })');
    // La navegación a la sección va antes de cambiar la ciudad en el
    // store, para que el splash «Preparando {ciudad}» se dispare.
    const navIdx = app.indexOf('routerNavigate(sectionPath');
    const setIdx = app.indexOf('setActiveCity(s); loadData(s);');
    expect(navIdx).toBeGreaterThan(-1);
    expect(setIdx).toBeGreaterThan(-1);
    expect(navIdx).toBeLessThan(setIdx);
  });

  it('el splash «Preparando {ciudad}» también se habilita en rutas de sección con ciudad', () => {
    const splashLine = app.split('\n').find((l) => l.includes('<CityArrivalSplash'));
    expect(splashLine).toContain('isSectionCityPath(location.pathname)');
    expect(splashLine).toContain('isHomePath(location.pathname)');
  });
});

describe('portada del menú: mismo encuadre que la ficha', () => {
  it('la portada del menú usa el mismo recorte 4:3 que la ficha, a 800×600 con prioridad', () => {
    const store = read('../components/store/BusinessStore.jsx');
    const bannerAt = store.indexOf('Banner Area');
    expect(bannerAt).toBeGreaterThan(-1);
    const bannerBlock = store.slice(bannerAt, store.indexOf('Gradient Overlay', bannerAt));
    // Mismo recorte 4:3 + cover que la ficha, pero a 800×600 (la mitad
    // de peso) y con prioridad alta: es el LCP del menú (hallazgo #3).
    expect(bannerBlock).toContain('<OptimizedImage');
    expect(bannerBlock).toContain('widthRequest={800}');
    expect(bannerBlock).toContain('heightRequest={600}');
    expect(bannerBlock).toContain('priority');
    expect(bannerBlock).toContain("objectFit: 'cover'");
    expect(bannerBlock).toContain("aspectRatio: '4 / 3'");
    // El viejo pedido 800×340 (recorte panorámico 2.35:1 en el servidor)
    // ya no existe en la portada: con él la foto se veía acercada.
    expect(bannerBlock).not.toContain('heightRequest={340}');
    expect(bannerBlock).not.toContain('1200, 900');
    const detail = read('../views/DetailView.jsx');
    expect(detail).toContain(
      'getThumbUrl(selected.photos?.find(photo => photo?.url)?.url || selected.banner_url || selected.logo_url, 1200, 900)',
    );
    expect(detail).toContain("objectFit: \"cover\"");
  });
});
