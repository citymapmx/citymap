// Espacio muerto en la ficha del negocio (nov 2026, El Tentempié):
// entre el botón «VER MENÚ» y la fila de redes («Sitio web») quedaban
// ~64 px de blanco. La causa era BusinessStore incrustado en la ficha:
// con el carrito vacío y el modal del menú cerrado renderizaba un
// envoltorio vacío con 24 (margen superior del contenedor) + 16
// (margen superior interno) + 24 (margen inferior) px de márgenes.
// Ahora ese envoltorio solo existe cuando hay productos en el carrito,
// que es lo único que muestra en la ficha; el resto del menú vive en
// el modal o en la página /menu (inline) y no se toca.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('ficha sin espacio muerto con el carrito vacío', () => {
  it('el envoltorio del carrito solo se renderiza con productos', () => {
    const src = read('../components/store/BusinessStore.jsx');
    // La rama incrustada (modal cerrado, no inline) está guardada por
    // cartCount: con el carrito vacío no renderiza nada, ni márgenes.
    const branch = src.split('{!showMenuModal && !inline ? (')[1];
    expect(branch).toBeDefined();
    const head = branch.split("<div style={{ margin: '0 16px', marginBottom: 24 }}>")[0];
    expect(head).toContain('cartCount > 0 && (');
    // El viejo patrón (envoltorio siempre + solo la fila guardada) ya no existe.
    expect(src).not.toContain("marginTop: inline ? 0 : 24");
  });

  it('el contenedor solo reserva margen superior cuando se ve la fila', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain("marginTop: (!inline && !showMenuModal && cartCount > 0) ? 24 : 0");
  });

  it('la fila del carrito sigue existiendo cuando hay productos', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain('Tienes productos en tu carrito');
    expect(src).toContain('Vaciar');
    // El modal del menú y la página /menu (inline) no se tocaron.
    expect(src).toContain('<AnimatePresence>');
  });
});
