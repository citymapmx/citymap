import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Al abrir un artículo de Revista, la navbar global (fija, zIndex 998)
// se montaba encima del lector del artículo con la hamburguesa (abre el
// menú lateral) y el globo (selector de ciudad/región). Pedido por
// Jonathan con capturas (12 nov 2026): quitar los dos botones solo en la
// vista del artículo. El lector ya trae su propia barra con Volver y
// Compartir, que deben quedar intactos; la hamburguesa y el globo se
// conservan en todo lo demás (inicio, mapa, eventos, negocios, lista de
// Revista, etc.). El arreglo es esconder la navbar global en la ruta de
// detalle del artículo, igual que ya se hace en /evento/, /lugar/ y /menu.

describe('artículo sin hamburguesa ni globo', () => {
  it('App.jsx esconde la navbar global en el detalle del artículo', () => {
    const app = read('../App.jsx');
    expect(app).toContain("import { isRevistaArticlePath } from './lib/revistaRoute.js'");
    expect(app).toContain('!isRevistaArticlePath(location.pathname)');
  });

  it('la navbar global sigue teniendo la hamburguesa y el globo (no se borraron)', () => {
    const app = read('../App.jsx');
    expect(app).toContain('setShowSidebar(true)');
    expect(app).toContain('Icon name="menu"');
    expect(app).toContain('Icon name="globe"');
    expect(app).toContain('setShowCountryPicker');
  });

  it('el lector del artículo conserva Volver y Compartir', () => {
    const viewer = read('../components/ExperienceViewer.jsx');
    expect(viewer).toContain('Icon name="arrow_left"');
    expect(viewer).toContain('revista_volver');
    expect(viewer).toContain('Icon name="share"');
    expect(viewer).toContain('setShowShareSheet(true)');
  });

  it('el lector del artículo no trae botones de menú ni de ciudad propios', () => {
    const viewer = read('../components/ExperienceViewer.jsx');
    expect(viewer).not.toContain('setShowSidebar');
    expect(viewer).not.toContain('setShowCountryPicker');
    expect(viewer).not.toContain('Icon name="menu"');
    // El único globo del lector es el icono de la fila «Idiomas» del cuerpo
    // del artículo, que no es un botón y se queda.
    expect(viewer.match(/Icon name="globe"/g)).toHaveLength(1);
    expect(viewer).toContain('revista_idiomas');
  });
});
