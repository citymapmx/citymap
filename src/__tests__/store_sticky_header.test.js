import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const src = fs.readFileSync(new URL('../components/store/BusinessStore.jsx', import.meta.url), 'utf8');

describe('Encabezado sticky del menú (buscador + categorías)', () => {
  it('tiene el encabezado de búsqueda y categorías como sticky arriba', () => {
    expect(src).toContain('{/* Sticky Header: Search + Tabs. Con estilo, fondo sólido');
    expect(src).toContain("position: 'sticky', top: 0, zIndex: 100");
  });

  it('en la página completa (inline) el contenedor no usa overflow hidden, para que el sticky se quede anclado al bajar', () => {
    // Con overflow 'hidden' en el contenedor, el encabezado sticky deja de
    // quedarse fijo y las categorías se van con la página al bajar (bug
    // reportado en el menú de Carrito La Paz). En el modal se mantiene
    // 'hidden' porque ahí el scroll lo hace la tarjeta (overflowY auto).
    expect(src).toContain("overflow: inline ? 'visible' : 'hidden'");
    expect(src).not.toMatch(/justifyContent: inline \? 'normal' : 'center',\s*\n\s*overflow: 'hidden'/);
  });
});
