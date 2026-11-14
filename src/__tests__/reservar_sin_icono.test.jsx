import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Botón «Reservar» sin icono (13 nov 2026, captura de Jonathan en la ficha
// de Eduardo Barber): el botón amarillo llevaba el icono de tenedor y
// cuchillo (utensilios de comida) y Jonathan pidió quitarlo porque no es
// comida — es una barbería. El botón queda solo con el texto «Reservar»,
// sin poner otro icono en su lugar.
describe('botón Reservar sin icono de utensilios', () => {
  const src = read('../views/DetailView.jsx');

  // Bloque del botón: desde su onClick (setShowBooking) hasta su cierre.
  const reservarBlock = (() => {
    const start = src.indexOf('setShowBooking(true)');
    const end = src.indexOf('</button>', start);
    return src.slice(start, end);
  })();

  it('el botón Reservar no lleva ningún svg', () => {
    expect(reservarBlock).not.toContain('<svg');
  });

  it('el botón Reservar no lleva el icono de tenedor y cuchillo', () => {
    expect(reservarBlock).not.toContain('M3 2v7c0');
    expect(reservarBlock).not.toContain('Utensils');
  });

  it('el botón Reservar sigue mostrando su texto', () => {
    expect(reservarBlock).toContain("detalle_reservar");
    expect(reservarBlock).toContain('Reservar');
  });

  it('no hay otro botón de reservación con el icono de utensilios', () => {
    // El único otro tenedor del archivo es el del botón VER MENÚ (no es
    // un botón de reservación) y la definición del icono en Icon.jsx.
    const forks = src.split('M3 2v7c0').length - 1;
    expect(forks).toBe(1);
    expect(src).toContain('VER MENÚ');
  });

  it('el botón Tarjeta Lealtad conserva su estrella', () => {
    expect(src).toContain('detalle_tarjeta_lealtad');
    expect(src).toContain('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>');
  });
});
