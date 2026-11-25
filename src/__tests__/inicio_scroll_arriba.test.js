import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');

// Bug 24 nov 2026 (reportado por Jonathan con capturas): estando abajo en
// la lista de Restaurantes, pulsar Inicio volvía al inicio pero dejaba la
// página abajo, en el pie. Causa: navigate("home") hacía un desplazamiento
// SUAVE a 0 y luego reseteaba la categoría a "explorar"; al desmontarse la
// lista larga (Virtuoso) la página se acortaba y el navegador clavaba el
// scroll en el nuevo final (el pie), cancelando el desplazamiento suave.

describe('Inicio vuelve arriba del todo', () => {
  it('el salto a 0 es instantáneo y ocurre ANTES de resetear la categoría', () => {
    const homeIdx = app.indexOf('else if (v === "home")');
    expect(homeIdx).toBeGreaterThan(-1);
    const scrollIdx = app.indexOf('window.scrollTo(0, 0);', homeIdx);
    const catIdx = app.indexOf('setActiveCat("explorar")', homeIdx);
    expect(scrollIdx).toBeGreaterThan(-1);
    expect(catIdx).toBeGreaterThan(-1);
    expect(scrollIdx).toBeLessThan(catIdx);
  });

  it('la rama de Inicio ya no usa desplazamiento suave', () => {
    const homeIdx = app.indexOf('else if (v === "home")');
    const detailIdx = app.indexOf('if (v === "detail")', homeIdx);
    expect(detailIdx).toBeGreaterThan(homeIdx);
    const branch = app.slice(homeIdx, detailIdx);
    expect(branch).not.toContain('behavior: "smooth"');
    expect(branch).not.toContain("behavior: 'smooth'");
    expect(branch).toContain('window.scrollTo(0, 0);');
  });

  it('las demás navegaciones siguen yendo arriba', () => {
    expect(app).toContain('window.scrollTo(0, 0);');
  });
});
