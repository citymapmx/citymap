import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { categoryFromUrl, isDirectCategoryPath } from '../lib/categoryRouting.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Carga directa de /:ciudad/:categoria (nov 2026): la página mostraba las
// tarjetas pero NADA del contenido central respondía (tarjetas, píldoras,
// "Ver más") y el conteo variaba entre cargas ("965 lugares" una vez,
// "44 lugares" otra). Causa raíz: el router trataba la forma directa como
// detalle de negocio (/:ciudad/:slug) y renderizaba la HomeView dentro de
// un <div inert>, así que ningún clic llegaba; el conteo es biz.length
// (filteredBiz) y en carga directa la categoría nunca se re-derivaba de la
// URL, así que dependía de qué estado transitorio ganara la carrera del
// arranque. Además el "Ver más" era casi imposible de pulsar: al bajar, el
// Virtuoso autollenaba (endReached) y el botón se desplazaba antes del clic.
describe('carga directa de /:ciudad/:categoria', () => {
  it('la forma directa es una ruta de categoría, no un detalle', () => {
    expect(isDirectCategoryPath('/guadalajara/restaurantes')).toBe(true);
    expect(isDirectCategoryPath('/guadalajara/antros-y-bares')).toBe(true);
    expect(isDirectCategoryPath('/mx/guadalajara/restaurantes', true)).toBe(true);
  });

  it('un slug de negocio sigue sin ser categoría', () => {
    expect(isDirectCategoryPath('/guadalajara/kava')).toBe(false);
    expect(isDirectCategoryPath('/guadalajara')).toBe(false);
    expect(isDirectCategoryPath('/guadalajara/restaurantes/extra')).toBe(false);
    expect(categoryFromUrl('/guadalajara/kava')).toBeNull();
  });

  it('el router no trata la categoría directa como detalle (no inert)', () => {
    const router = read('../router/AppRouter.jsx');
    // isCategoryPath reconoce la forma directa y isDetailPath ya devuelve
    // false cuando es categoría: con showDetail en false la HomeView no
    // lleva inert y el overlay de DetailView no se monta.
    expect(router).toContain('isDirectCategorySegments');
    expect(router).toContain('if (isCategoryPath(segments)) return false;');
  });

  it('el arranque y el router comparten la misma lista de categorías', () => {
    const boot = read('../hooks/useAppInitialization.js');
    expect(boot).toContain('CATEGORY_SLUGS');
    expect(boot).not.toContain('const validCats = [');
  });

  it('la lista de categoría ya no se autollena al bajar', () => {
    const home = read('../views/HomeView.jsx');
    // Sin endReached, la paginación es solo con el botón "Ver más": el
    // botón se queda donde está y se puede pulsar.
    expect(home).not.toContain('endReached');
  });

  it('el botón "Ver más" sigue presente y carga la siguiente página', () => {
    const home = read('../views/HomeView.jsx');
    expect(home).toContain('ver_mas');
    expect(home).toContain('onClick={() => loadPaginatedBiz(false)}');
  });
});
