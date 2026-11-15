// Hallazgo #6 (fluidez, 13 nov 2026): el modal de producto y el carrito
// no deben viajar en el primer pintado del menú. Antes eran imports
// estáticos de BusinessStore y pesaban ~15-20 KB del chunk aunque nunca
// se abrieran. Ahora son lazy() y el carrito solo se monta tras abrirlo
// una vez (con el lazy() solo no bastaba: CartDrawer se renderizaba
// siempre, oculto, y su chunk igual se descargaba).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const src = read('../components/store/BusinessStore.jsx');

describe('menú ligero: ProductModal y CartDrawer con lazy()', () => {
  it('los dos se importan con lazy(), no con import estático', () => {
    expect(src).toContain("const ProductModal = lazy(() => import('./ProductModal.jsx'))");
    expect(src).toContain("const CartDrawer = lazy(() => import('./CartDrawer.jsx'))");
    expect(src).not.toContain("import ProductModal from './ProductModal.jsx'");
    expect(src).not.toContain("import CartDrawer from './CartDrawer.jsx'");
    expect(src).toContain('lazy, Suspense');
  });

  it('los dos usos van dentro de Suspense', () => {
    expect(src).toMatch(/<Suspense fallback=\{null\}>\s*<ProductModal/);
    expect(src).toMatch(/<Suspense fallback=\{null\}>\s*<CartDrawer/);
  });

  it('el modal de producto sigue abriéndose solo al tocar un producto', () => {
    expect(src).toMatch(/\{selectedProduct && \(\s*<Suspense/);
  });

  it('el carrito solo se monta tras abrirlo una vez y luego queda montado', () => {
    // La puerta es cartMounted, que se enciende con cartIsOpen y nunca
    // se apaga: así el nombre, la dirección y las notas escritos se
    // conservan al cerrar y reabrir, como antes.
    expect(src).toMatch(/const \[cartMounted, setCartMounted\] = useState\(false\)/);
    expect(src).toMatch(/useEffect\(\(\) => \{ if \(cartIsOpen\) setCartMounted\(true\); \}, \[cartIsOpen\]\)/);
    expect(src).toMatch(/\{cartMounted && \(\s*<Suspense/);
    expect(src).toContain('isOpen: cartIsOpen');
  });

  it('CartDrawer sigue devolviendo null cuando está cerrado', () => {
    const drawer = read('../components/store/CartDrawer.jsx');
    expect(drawer).toContain('if (!isOpen) return null;');
  });
});
