import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getAvailableSubcats } from '../lib/businessSubcats.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Subcategorías vacías (12 nov 2026, captura de Jonathan en
// /guadalajara/c/restaurantes): con "Mariscos" seleccionado salía
// "0 lugares" y "Sin negocios en Mariscos", aunque la píldora estaba
// visible. Causa: las píldoras se derivaban de `biz` (toda la lista
// filtrada por ciudad/categoría) pero los resultados se filtran sobre
// `displayList` (la lista ya paginada y cruzada con los ids del
// servidor): un negocio con esa subcategoría puede estar en `biz` sin
// estar en la lista visible. Arreglo: las píldoras salen de displayList,
// la misma lista que la vista ya filtra.
// Misma regla de coincidencia que finalDisplayList en HomeView.jsx.
const matchesSubcat = (b, subcat) => {
  const target = subcat.toLowerCase().trim();
  const sub = (b.subcategory || '').toLowerCase();
  const typ = (b.type || '').toLowerCase();
  const tags = Array.isArray(b.tags) ? b.tags.join(' ').toLowerCase() : (b.tags || '').toLowerCase();
  return sub.includes(target) || typ.includes(target) || tags.includes(target);
};

// Restaurantes en Guadalajara: la lista completa trae Mariscos
// (Campomar), pero la primera página visible no lo trae (está más allá
// del corte de paginación / fuera de los ids del servidor).
const bizCompleta = [
  { name: 'SSAM Comida Coreana', subcategory: 'Comida Coreana', type: null },
  { name: "L'entrecote Fantastique", subcategory: null, type: 'Restaurante Francés ' },
  { name: 'Campomar Punto Sur', subcategory: 'Mariscos', type: null },
  { name: 'Octo Restaurante', subcategory: null, type: null },
  { name: 'El Maltés', subcategory: null, type: null },
];
const listaVisible = bizCompleta.filter(b => b.name !== 'Campomar Punto Sur');

describe('subcategorías sin negocios: la píldora solo aparece si hay un negocio visible', () => {
  it('caso reportado: "Mariscos" está en la lista completa pero no en la visible, así que no aparece como píldora', () => {
    expect(getAvailableSubcats(bizCompleta)).toContain('Mariscos');
    expect(getAvailableSubcats(listaVisible)).not.toContain('Mariscos');
    expect(getAvailableSubcats(listaVisible)).toEqual(['Comida Coreana', 'Restaurante Francés']);
  });

  it('invariante: cada píldora derivada de la lista visible coincide con al menos un negocio visible', () => {
    const subcats = getAvailableSubcats(listaVisible);
    expect(subcats.length).toBeGreaterThan(0);
    subcats.forEach(sub => {
      expect(listaVisible.some(b => matchesSubcat(b, sub))).toBe(true);
    });
  });

  it('filtro posterior: si la lista visible se achica y una subcategoría queda en 0, su píldora desaparece', () => {
    expect(getAvailableSubcats(listaVisible)).toContain('Comida Coreana');
    const trasFiltro = listaVisible.filter(b => b.name !== 'SSAM Comida Coreana');
    expect(getAvailableSubcats(trasFiltro)).not.toContain('Comida Coreana');
    expect(getAvailableSubcats(trasFiltro)).toEqual(['Restaurante Francés']);
  });

  it('sin negocios visibles no hay píldoras de subcategoría', () => {
    expect(getAvailableSubcats([])).toEqual([]);
  });

  it('HomeView deriva las píldoras de displayList (la lista que la vista filtra), no de biz', () => {
    const home = read('../views/HomeView.jsx');
    expect(home).toContain('getAvailableSubcats(displayList)');
    expect(home).not.toContain('getAvailableSubcats(biz)');
  });

  it('la píldora "Todos" siempre se queda: se pinta en la barra fuera del mapa de subcategorías', () => {
    const home = read('../views/HomeView.jsx');
    const todosIdx = home.indexOf('t("home_todos", "Todos")');
    const mapIdx = home.indexOf('availableSubcats.map(sub => {');
    expect(todosIdx).toBeGreaterThan(-1);
    expect(mapIdx).toBeGreaterThan(-1);
    expect(todosIdx).toBeLessThan(mapIdx);
  });

  it('el estado vacío se conserva como respaldo (p. ej. URL directa): sigue existiendo "Sin negocios en" con su botón', () => {
    const home = read('../views/HomeView.jsx');
    expect(home).toContain('t("home_sin_negocios_en", "Sin negocios en")');
    expect(home).toContain('t("home_ver_todas_opciones", "Ver todas las opciones")');
    expect(home).toContain('selectedSubcat !== "todas"');
  });
});
