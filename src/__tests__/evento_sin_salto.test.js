// Salto al entrar al evento (reportado por Jonathan 15 nov 2026 con
// capturas: al abrir el detalle primero se veía la información y luego
// el salto brusco a la imagen). Dos causas: el scroll a arriba estaba
// en un useEffect (después de pintar, se alcanzaba a ver el cuadro con
// el scroll viejo) y el póster no reservaba su alto hasta que cargaba
// la imagen (el contenedor medía ~0 y al llegar empujaba todo).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('detalle del evento sin salto al abrir', () => {
  it('el scroll a arriba va en useLayoutEffect, antes de pintar', () => {
    const src = read('../components/modals/EventDetailModal.jsx');
    expect(src).toContain('useLayoutEffect');
    expect(src).toMatch(/useLayoutEffect\(\(\) => \{\s*dialog\.current\?\.scrollTo\(0, 0\);/);
    expect(src).toMatch(/dialog\.current\?\.scrollTo\(0, 0\);\s*\}, \[selectedEvent\?\.id\]\);/);
    // Un solo scrollTo: el del useEffect viejo ya no existe.
    expect(src.match(/scrollTo\(0, 0\)/g)).toHaveLength(1);
  });

  it('EventPoster reserva su espacio desde el primer pintado', () => {
    const src = read('../components/detail/EventPoster.jsx');
    expect(src).toContain('minHeight: 360');
    expect(src).toContain("background: dark ? '#232326' : '#E5E7EB'");
  });
});
