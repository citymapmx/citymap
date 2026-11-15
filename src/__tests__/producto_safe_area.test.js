// Margen de seguridad arriba en el detalle de producto (reportado por
// Jonathan 15 nov 2026 con captura: en la app el título «Personalizar»
// chocaba con la hora y la barra de estado del iPhone). El modal es una
// hoja a pantalla completa con su propio encabezado, así que el header
// principal de App.jsx no lo cubre. El carrito tenía el mismo problema
// en su encabezado y se arregla igual.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { safeAreaTop } from '../lib/safeArea.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('safe-area arriba en el detalle de producto', () => {
  it('safeAreaTop suma el inset a la altura base', () => {
    expect(safeAreaTop(52)).toBe('calc(env(safe-area-inset-top, 0px) + 52px)');
    expect(safeAreaTop(72)).toBe('calc(env(safe-area-inset-top, 0px) + 72px)');
  });

  it('ProductModal: el encabezado crece con el safe-area y baja el contenido', () => {
    const src = read('../components/store/ProductModal.jsx');
    expect(src).toContain("import { safeAreaTop } from '../../lib/safeArea.js';");
    expect(src).toContain('height: safeAreaTop(52)');
    expect(src).toContain("padding: 'env(safe-area-inset-top, 0px) 16px 0'");
  });

  it('ProductModal: el pie sigue con el safe-area de abajo', () => {
    const src = read('../components/store/ProductModal.jsx');
    expect(src).toContain("paddingBottom: 'max(14px, env(safe-area-inset-bottom))'");
  });

  it('CartDrawer: mismo arreglo en su encabezado', () => {
    const src = read('../components/store/CartDrawer.jsx');
    expect(src).toContain("import { safeAreaTop } from '../../lib/safeArea.js';");
    expect(src).toContain('height: safeAreaTop(72)');
    expect(src).toContain("padding: 'env(safe-area-inset-top, 0px) 20px 0'");
  });
});
