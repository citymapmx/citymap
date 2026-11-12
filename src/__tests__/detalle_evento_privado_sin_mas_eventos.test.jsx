import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

// En los eventos privados no se muestra «Más eventos» abajo (Jonathan,
// nov 2026): ni la sección «Más eventos en {ciudad}» ni el botón
// «VER TODOS LOS EVENTOS». Los públicos quedan como hoy.
const MODAL_SRC = fs.readFileSync(
  new URL('../components/modals/EventDetailModal.jsx', import.meta.url),
  'utf8',
);

describe('detalle de evento privado: sin «Más eventos» abajo', () => {
  it('la sección de vigentes no se renderiza en privados', () => {
    expect(MODAL_SRC).toContain('{!isPast && !isPrivateEvent(ev) && upcoming.length > 0 && (');
  });
  it('la sección de pasados tampoco se renderiza en privados', () => {
    expect(MODAL_SRC).toContain('{isPast && !isPrivateEvent(ev) && upcoming.length > 0 && (');
  });
  it('no queda ningún bloque de próximos con upcoming sin el filtro de privado', () => {
    const withFilter = (MODAL_SRC.match(/!isPrivateEvent\(ev\) && upcoming\.length > 0/g) || []).length;
    const total = (MODAL_SRC.match(/upcoming\.length > 0/g) || []).length;
    expect(total).toBe(2);
    expect(withFilter).toBe(2);
  });
  it('el botón «Ver todos los eventos» queda dentro de los bloques filtrados', () => {
    // El botón solo existe dentro de las dos secciones de más eventos.
    const occurrences = (MODAL_SRC.match(/eventos_ver_todos/g) || []).length;
    expect(occurrences).toBe(2);
    const firstBlock = MODAL_SRC.indexOf('{!isPast && !isPrivateEvent(ev) && upcoming.length > 0 && (');
    const button = MODAL_SRC.indexOf('eventos_ver_todos', firstBlock);
    expect(button).toBeGreaterThan(firstBlock);
  });
  it('en públicos la sección sigue: la condición conserva upcoming.length > 0', () => {
    expect(MODAL_SRC).toContain('upcoming.length > 0');
    expect(MODAL_SRC).toContain('eventos_mas_eventos');
  });
  it('privado = visibility private', () => {
    const lib = fs.readFileSync(new URL('../lib/privateEvents.js', import.meta.url), 'utf8');
    expect(lib).toContain("event?.visibility === 'private'");
  });
});
