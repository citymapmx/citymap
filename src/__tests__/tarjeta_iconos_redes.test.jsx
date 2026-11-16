import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Iconos de redes en la tarjeta destacada (15 nov 2026): la PR #368
// puso los iconos de WhatsApp/Instagram/Facebook de SSAM en el ejemplo,
// pero en la verificación en vivo (navegador, 23:10) no se veían en la
// tarjeta: la fila inferior de la foto (calificación + Abierto + 3
// botones de 36 px + distancia) es más ancha que la tarjeta en el grid
// de 4 columnas, y la foto (overflow hidden) recortaba la derecha —
// tampoco se veía el «1.6 km» y la línea de calificación se veía
// cortada. La fila ahora envuelve: los botones y la distancia bajan a
// una segunda línea solo cuando hace falta.

describe('Fila inferior de la tarjeta destacada', () => {
  const src = read('../components/cards/BusinessCard.jsx');

  it('la fila con los botones de redes envuelve (flexWrap) con separación entre líneas', () => {
    expect(src).toContain('justifyContent: "space-between", flexWrap: "wrap", rowGap: 6');
  });

  it('los botones de redes siguen condicionados a los datos del negocio', () => {
    expect(src).toContain('{b.whatsapp && (');
    expect(src).toContain("(b.instagram || b.social_links?.instagram) && (");
    expect(src).toContain("(b.facebook || b.social_links?.facebook) && (");
  });

  it('la distancia sigue en la misma fila (baja con los botones si hace falta)', () => {
    expect(src).toContain('{distStr && (');
  });
});
