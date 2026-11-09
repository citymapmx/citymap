import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// SEO para Search Console (nov 2026): Google marcaba 194 páginas como
// "Rastreada: actualmente sin indexar". Causa: las 3 categorías que no
// estaban en CAT_SEO (antros-y-bares, servicios, mascotas) le servían a
// Googlebot la home genérica, y lo inexistente devolvía 200 con la home
// (soft 404) en vez de un 404 real.

const ALL_CATS = [
  'restaurantes', 'cafe', 'salud', 'belleza', 'fitness', 'compras', 'tech',
  'ocio', 'hoteles', 'educacion', 'antros-y-bares', 'servicios', 'mascotas',
];

describe('seo: categorías para bots', () => {
  const seoRoutes = read('../lib/seoRoutes.js');
  const og = read('../../api/og.js');
  const middleware = read('../../middleware.js');
  const sitemap = read('../../api/sitemap.xml.js');

  it('CATEGORY_SLUGS es la lista única con las 13 categorías de la app', () => {
    expect(seoRoutes).toContain('CATEGORY_SLUGS');
    for (const cat of ALL_CATS) {
      expect(seoRoutes).toContain(`'${cat}'`);
    }
  });

  it('CAT_SEO tiene las 3 categorías que faltaban, con título, descripción y etiqueta', () => {
    for (const cat of ['antros-y-bares', 'servicios', 'mascotas']) {
      expect(og).toContain(`"${cat}"`);
    }
    expect(og).toContain('Antros y Bares');
    expect(og).toContain('Servicios');
    expect(og).toContain('Mascotas');
  });

  it('la rama de categoría usa el marcado compartido renderCategoryPage', () => {
    expect(og).toContain('function renderCategoryPage');
    expect(og).toContain('renderCategoryPage({ title, desc, label: catInfo.label');
  });

  it('la lista de negocios tolera guiones/espacios/mayúscula de la base', () => {
    // La base guarda "antros y bares" y "Servicios"; la ruta usa
    // "antros-y-bares" y "servicios". Sin las variantes, la lista salía vacía.
    expect(og).toContain("category.replace(/-/g, ' ')");
    expect(og).toContain('in.(${variants.join');
  });

  it('una categoría sin negocios en la ciudad dice que aún no hay lugares', () => {
    expect(og).toContain('Aún no hay lugares de esta categoría en');
  });

  it('el sitemap usa la lista compartida (ya no la lista fija de 10)', () => {
    expect(sitemap).toContain('CATEGORY_SLUGS');
    expect(sitemap).not.toContain("const categories = ['restaurantes'");
  });

  it('el middleware importa CATEGORY_SLUGS de seoRoutes', () => {
    expect(middleware).toContain('CATEGORY_SLUGS');
    expect(middleware).toContain("from './src/lib/seoRoutes.js'");
  });
});

describe('seo: 404 real para lo que ya no existe', () => {
  const og = read('../../api/og.js');

  it('lo inexistente ya no redirige a la home con 302', () => {
    expect(og).not.toContain('status: 302, headers: { Location: BASE_URL }');
  });

  it('negocio, evento y artículo inexistentes devuelven 404 con noindex', () => {
    expect(og).toContain('notFoundResponse("Negocio no encontrado")');
    expect(og).toContain('notFoundResponse("Evento no encontrado")');
    expect(og).toContain('notFoundResponse("Artículo no encontrado")');
    expect(og).toContain("status: 404");
    expect(og).toContain('"X-Robots-Tag": "noindex"');
  });

  it('el redirect 302 a la SPA solo queda para usuarios reales (no bots)', () => {
    const idx = og.indexOf('status: 302');
    expect(idx).toBeGreaterThan(-1);
    expect(og.slice(Math.max(0, idx - 1200), idx)).toContain('Real user (not a bot)');
  });
});

describe('seo: subcategorías /:ciudad/c/:subcategoria', () => {
  const og = read('../../api/og.js');
  const middleware = read('../../middleware.js');

  it('el redirect /c/ solo se aplica a categorías de nivel superior', () => {
    expect(middleware).toContain('CATEGORY_SLUGS.includes(routeParts[2].toLowerCase())');
  });

  it('el middleware manda /:ciudad/c/:subcat a og con subcat=1', () => {
    expect(middleware).toContain("seg2 === 'c'");
    expect(middleware).toContain("searchParams.set('subcat', '1')");
  });

  it('og valida la subcategoría contra la base y sirve su página con lista', () => {
    expect(og).toContain('searchParams.get("subcat") === "1"');
    expect(og).toContain('isRealCategory(catValue)');
    expect(og).toContain("id.replace(/-/g, \" \")");
    expect(og).toContain('/c/${esc(id)}');
  });
});
