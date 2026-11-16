import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Menú no disponible en Akami Sushi (15 nov 2026, Jonathan con captura):
// la página del menú decía «Menú no disponible» aunque el negocio tiene
// 158 productos y plan fideliza activo. Causa: la migración de planes
// (#364) renombró premium→fideliza y destacado→pro, pero el gate de la
// página del menú (MenuView) seguía con las claves viejas
// (destacado/premium/pro) y dejaba FUERA a elite (Ventas) y fideliza
// (Fideliza). Ventas y Fideliza deben tener el menú 100% funcional como
// antes; Presencia conserva el acceso que ya tenía.

describe('Menú disponible para Ventas y Fideliza', () => {
  const menuView = read('../views/MenuView.jsx');
  const noMenu = read('../components/store/NoMenuLanding.jsx');
  const detail = read('../views/DetailView.jsx');

  it('MenuView deja pasar a elite y fideliza (y conserva pro)', () => {
    expect(menuView).toContain("['pro', 'elite', 'fideliza', 'destacado', 'premium'].includes(biz.plan)");
    expect(menuView).not.toContain("biz.plan === 'destacado' || biz.plan === 'premium' || biz.plan === 'pro'");
  });

  it('la lista de «menús cercanos» incluye a Ventas y Fideliza', () => {
    expect(noMenu).toContain('plan=in.(pro,elite,fideliza,destacado,premium)');
    expect(noMenu).not.toContain('plan=in.(destacado,premium,pro)');
  });

  it('la galería del menú en PDF vale para cualquier plan de pago', () => {
    expect(detail).toContain("['pro', 'elite', 'fideliza', 'destacado', 'premium'].includes(selected.plan) && selected.menu_pdf_url");
    expect(detail).not.toContain("selected.plan === 'destacado' && selected.menu_pdf_url");
  });

  it('la ficha sigue mostrando el menú para Ventas y Fideliza', () => {
    // Estos gates ya estaban bien tras la #364; que no se rompan.
    expect(detail).toContain('["premium", "elite", "fideliza"].includes(selected.plan) && hasMenu');
  });
});
