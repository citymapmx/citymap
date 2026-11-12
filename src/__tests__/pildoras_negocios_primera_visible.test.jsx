import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getAvailableSubcats } from '../lib/businessSubcats.js';
import SlidingCategoryTrack from '../components/ui/SlidingCategoryTrack.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Píldoras cortadas en la sección de negocios (11 nov 2026, captura de
// Jonathan en /tlaquepaque/c/restaurantes): la primera píldora ("Todos")
// salía cortada por la izquierda. Causa raíz: Restaurantes en Tlaquepaque
// tiene exactamente 3 subcategorías, y la fila usaba
// `justifyContent: "center"` sobre un contenedor con scroll horizontal.
// Con "center" el contenido que desborda se centra y el sobrante izquierdo
// queda fuera del origen de scroll (scrollLeft no baja de 0): la primera
// píldora queda cortada y no hay forma de deslizarse hasta ella.
describe('píldoras de negocios: la primera ("Todos") siempre visible', () => {
  it('Restaurantes/Tlaquepaque tiene exactamente 3 subcategorías: cae en la rama que antes centraba', () => {
    const biz = [
      { name: 'SSAM Comida Coreana', subcategory: 'Comida Coreana', type: null },
      { name: "L'entrecote Fantastique", subcategory: null, type: 'Restaurante Francés ' },
      { name: 'Campomar Punto Sur', subcategory: 'Mariscos', type: null },
      { name: 'Octo Restaurante ', subcategory: null, type: null },
      { name: 'El Maltés ', subcategory: null, type: null },
    ];
    const subcats = getAvailableSubcats(biz);
    expect(subcats).toEqual(['Comida Coreana', 'Mariscos', 'Restaurante Francés']);
    expect(subcats.length).toBeLessThanOrEqual(3);
  });

  it('la fila de subcategorías usa "safe center" (centrada si cabe, flex-start si desborda), nunca "center" a secas', () => {
    const home = read('../views/HomeView.jsx');
    expect(home).toContain('availableSubcats.length <= 3 ? "safe center" : "flex-start"');
    expect(home).not.toContain('availableSubcats.length <= 3 ? "center"');
  });

  it('la fila sigue con desplazamiento horizontal y la primera píldora es "Todos"', () => {
    const html = renderToStaticMarkup(
      <SlidingCategoryTrack
        dark={false}
        selectedKey="todas"
        className="no-scrollbar"
        style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 14, justifyContent: 'safe center' }}
      >
        <button aria-pressed>Todos</button>
        <button aria-pressed={false}>Comida Coreana</button>
        <button aria-pressed={false}>Mariscos</button>
        <button aria-pressed={false}>Restaurante Francés</button>
      </SlidingCategoryTrack>
    );
    expect(html).toContain('justify-content:safe center');
    expect(html).toContain('overflow-x:auto');
    expect(html.indexOf('>Todos<')).toBeGreaterThan(-1);
    expect(html.indexOf('>Todos<')).toBeLessThan(html.indexOf('>Comida Coreana<'));
  });

  it('la fila del menú del negocio no se tocó: sigue con padding interno y centrado de la pestaña activa con tope en 0', () => {
    const store = read('../components/store/BusinessStore.jsx');
    expect(store).toContain("padding: '0 16px'");
    expect(store).toContain('tabsContainer.scrollTo({ left: scrollLeft');
  });
});
