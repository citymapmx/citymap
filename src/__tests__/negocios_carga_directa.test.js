import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../App.jsx', import.meta.url), 'utf8');

describe('Carga directa de /negocios (sin redirigir a la ciudad guardada)', () => {
  it('la cadena de initialVistaParam deja pasar "negocios" junto a "tours" y "login" (DO NOTHING, let AppRouter handle it)', () => {
    // Abrir /negocios directo pone vista="negocios" en initialVistaParam. Si
    // la cadena no tiene rama para "negocios", cae en el `else navigate("home")`
    // final y la landing salta a la ciudad guardada (/tepic) tras unos segundos.
    expect(src).toContain('else if (v === "tours") { /* DO NOTHING, let AppRouter handle it */ }');
    expect(src).toContain('else if (v === "login") { /* DO NOTHING, let AppRouter handle it */ }');
    expect(src).toContain('else if (v === "negocios") { /* DO NOTHING, let AppRouter handle it */ }');
  });

  it('la rama de "negocios" aparece antes del `else navigate("home")` de esa cadena', () => {
    const chainStart = src.indexOf('else if (initialVistaParam.current)');
    expect(chainStart).toBeGreaterThan(-1);
    const chain = src.slice(chainStart);
    const negociosIdx = chain.indexOf('else if (v === "negocios")');
    const toursIdx = chain.indexOf('else if (v === "tours")');
    const elseHomeIdx = chain.indexOf('else navigate("home");');
    expect(negociosIdx).toBeGreaterThan(-1);
    expect(toursIdx).toBeGreaterThan(-1);
    expect(elseHomeIdx).toBeGreaterThan(-1);
    expect(negociosIdx).toBeLessThan(elseHomeIdx);
    expect(toursIdx).toBeLessThan(elseHomeIdx);
  });
});
