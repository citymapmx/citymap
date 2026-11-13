// Animista text-focus-in en el título del héroe del inicio (13 nov 2026,
// elegido por Jonathan en la página de propuestas, sección 09 Animista):
// el h1 del muro global (GlobalHomeView) y del inicio de ciudad (HomeHero)
// entra desenfocado y se enfoca en 1 s, una sola vez al cargar la vista.
// Solo CSS en src/index.css, sin librería. Las otras 4 propuestas de
// Animista (tracking-in-expand en títulos de sección, text-focus-in en
// detalle de negocio/evento, tracking-in-expand en /tours y /negocios,
// focus-in-expand en Mis Favoritos/Revista) NO van en este cambio.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('text-focus-in: keyframes reales de Animista en index.css', () => {
  const css = read('../index.css');

  it('define @keyframes text-focus-in de blur(12px)/opacidad 0 a blur(0)/opacidad 1', () => {
    expect(css).toContain('@keyframes text-focus-in');
    expect(css).toContain('@-webkit-keyframes text-focus-in');
    expect(css).toMatch(/@keyframes text-focus-in\s*\{[\s\S]*?0%\s*\{[^}]*blur\(12px\)[^}]*opacity:\s*0/);
    expect(css).toMatch(/@keyframes text-focus-in\s*\{[\s\S]*?100%\s*\{[^}]*blur\(0px\)[^}]*opacity:\s*1/);
  });

  it('la clase .text-focus-in anima 1 s, una sola vez (both, sin bucle)', () => {
    expect(css).toMatch(/\.text-focus-in\s*\{[^}]*animation:\s*text-focus-in 1s[^}]*both/);
    expect(css).not.toMatch(/\.text-focus-in\s*\{[^}]*infinite/);
  });

  it('con prefers-reduced-motion no se anima', () => {
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\.text-focus-in\s*\{[^}]*animation:\s*none/);
  });
});

describe('text-focus-in aplicado solo al h1 del héroe', () => {
  it('muro global: el h1 de GlobalHomeView lleva la clase, una sola vez', () => {
    const src = read('../views/GlobalHomeView.jsx');
    expect(src).toMatch(/<h1[^>]*className="text-focus-in"/);
    expect(src.match(/className="text-focus-in"/g)).toHaveLength(1);
  });

  it('inicio de ciudad: el h1 de HomeHero lleva la clase, una sola vez', () => {
    const src = read('../components/home/HomeHero.jsx');
    expect(src).toMatch(/<h1[^>]*className="text-focus-in"/);
    expect(src.match(/className="text-focus-in"/g)).toHaveLength(1);
  });

  it('ningún otro archivo de src/ usa text-focus-in (solo el héroe)', () => {
    const srcDir = fileURLToPath(new URL('../', import.meta.url));
    const hallados = [];
    const caminar = (dir) => {
      for (const nombre of readdirSync(dir)) {
        const ruta = path.join(dir, nombre);
        if (statSync(ruta).isDirectory()) {
          caminar(ruta);
        } else if (/\.(jsx?|css)$/.test(nombre)) {
          if (readFileSync(ruta, 'utf8').includes('text-focus-in')) {
            hallados.push(path.relative(srcDir, ruta));
          }
        }
      }
    };
    caminar(srcDir);
    expect(hallados.sort()).toEqual([
      '__tests__/animista_heroe.test.js',
      'components/home/HomeHero.jsx',
      'index.css',
      'views/GlobalHomeView.jsx',
    ]);
  });
});
