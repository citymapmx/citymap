import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

const storeSrc = fs.readFileSync(new URL('../components/store/BusinessStore.jsx', import.meta.url), 'utf8');
const drawerSrc = fs.readFileSync(new URL('../components/store/CartDrawer.jsx', import.meta.url), 'utf8');

// Arreglos rápidos del menú (nov 2026, revisión en vivo de El Pastor del
// Rica): cuadrícula sin hueco de foto, precio de línea del carrito con
// variantes, barra flotante que no tape el último renglón y título de
// sección que no quede tapado al saltar de categoría.
describe('Menú: arreglos rápidos', () => {
  it('en cuadrícula la foto solo se pinta si el producto tiene foto', () => {
    // El 93% de los productos no tiene foto: antes en cuadrícula se
    // pintaba siempre el hueco gris con icono de imagen.
    expect(storeSrc).not.toContain("product.image_url || viewMode === 'grid'");
    expect(storeSrc).toContain('{product.image_url && (');
  });

  it('la línea del carrito usa el precio con variantes (unitTotal), no el precio base', () => {
    // Con precio base 0 y precio en la variante, la línea salía $0.00
    // aunque el total sí era correcto.
    expect(drawerSrc).toContain('item.unitTotal ?? item.product.price');
    expect(drawerSrc).not.toContain('Number(item.product.price) * item.quantity');
  });

  it('el espacio bajo la lista deja libre la barra flotante del carrito', () => {
    // Medido en vivo (El Pastor del Rica, 26 nov 2026): la barra mide
    // 80 px y el relleno era 100 px (20 px de margen); con letra grande
    // la barra crece, así que el relleno con carrito sube a 120 px.
    expect(storeSrc).toContain('paddingBottom: cartCount > 0 ? 120 : 80');
  });

  it('al saltar a una categoría el título queda por debajo de la barra fija', () => {
    // Medido en vivo: la barra fija mide 112-113 px y el título caía a
    // 135 px con el margen de 130 px (22 px libres); con letra grande
    // la barra crece, así que el margen sube a 160 px, igual que el
    // salto de «Todos».
    expect(storeSrc).toContain("scrollMarginTop: '160px'");
    expect(storeSrc).not.toContain("scrollMarginTop: '130px'");
    expect(storeSrc).toContain('offsetTop - 160');
  });
});
