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
// cortada. La fila ahora envuelve: los botones bajan a una segunda línea
// solo cuando hace falta.
//
// Distancia (22 nov 2026): la distancia era el último hijo de la fila y
// en el teléfono, con 3 botones de redes, caía sola a la segunda línea
// («11.0km» huérfano en SSAM). Ahora va pegada al horario dentro del
// mismo bloque sin corte («Abierto · 11.0km») y baja con él, nunca sola.

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

  it('la distancia va pegada al horario y nunca queda sola en una línea', () => {
    // «Abierto · 11.0km» es un solo bloque sin corte; la distancia ya no
    // es el último hijo suelto de la fila.
    expect(src).toContain('{distStr && (');
    expect(src).toContain('whiteSpace: "nowrap", flexShrink: 0');
    expect(src).not.toContain('display: "flex", alignItems: "center", marginLeft: 6');
  });

  it('la calificación también envuelve: el horario baja con su «·» si la línea no cabe', () => {
    // Four Seasons: «★ 4.8 (3,766) · 45 · Abierto» se pasaba ~7 px y la
    // «o» quedaba recortada aunque los iconos ya bajaran de línea.
    expect(src).toContain('gap: 6, flexWrap: "wrap", rowGap: 2');
    expect(src).toContain('<span style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", flexShrink: 0 }}>');
  });
});
