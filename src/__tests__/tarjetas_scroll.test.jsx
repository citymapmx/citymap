import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const homeView = fs.readFileSync(new URL('../views/HomeView.jsx', import.meta.url), 'utf8');
const businessCard = fs.readFileSync(new URL('../components/cards/BusinessCard.jsx', import.meta.url), 'utf8');
const progressiveImage = fs.readFileSync(new URL('../components/ProgressiveImage.jsx', import.meta.url), 'utf8');
const optimizedImage = fs.readFileSync(new URL('../components/ui/OptimizedImage.jsx', import.meta.url), 'utf8');

// Tarjetas que se borran y vuelven a cargar al bajar y subir (bug
// reportado en /:ciudad/c/:categoría): la lista virtualizaba con la
// ventana por defecto y cada tarjeta además dejaba de pintarse con
// content-visibility, así que al volver a subir se remontaban desde
// cero y se veían cargar de nuevo.
describe('Tarjetas de la lista: no se borran ni recargan al volver a subir', () => {
  it('el Virtuoso de la lista de categoría mantiene montadas las tarjetas vecinas', () => {
    // Margen en píxeles arriba y abajo del viewport: sin él, Virtuoso
    // desmonta las filas fuera de pantalla y al volver se remontan.
    const m = homeView.match(/increaseViewportBy=\{\{\s*top:\s*(\d+),\s*bottom:\s*(\d+)\s*\}\}/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeGreaterThanOrEqual(900);
    expect(Number(m[2])).toBeGreaterThanOrEqual(900);
  });

  it('la lista de categoría sigue virtualizada (no es un .map entero)', () => {
    expect(homeView).toContain('<Virtuoso');
    expect(homeView).toContain('useWindowScroll');
    // Clave estable por negocio: al crecer la lista no se remontan
    // las filas que ya estaban.
    expect(homeView).toContain('computeItemKey={(index, b) => b.id}');
  });

  it('las tarjetas no usan content-visibility: el navegador no deja de pintarlas fuera de vista', () => {
    expect(businessCard).not.toContain('contentVisibility');
    expect(businessCard).not.toContain('containIntrinsicSize');
  });

  it('una imagen ya cargada no vuelve a mostrar el esqueleto al remontarse la tarjeta', () => {
    // ProgressiveImage guarda las URLs cargadas en un Set a nivel de
    // módulo y la tarjeta remontada arranca ya cargada.
    expect(progressiveImage).toContain('const globalLoadedImages = new Set()');
    expect(progressiveImage).toContain('useState(() => globalLoadedImages.has(src))');
    expect(progressiveImage).toContain('globalLoadedImages.add(src)');
    // Lo mismo en OptimizedImage (logo de la variante featured).
    expect(optimizedImage).toContain('const globalLoadedImages = new Set()');
    expect(optimizedImage).toContain('globalLoadedImages.has(optimizedSrc)');
  });
});
