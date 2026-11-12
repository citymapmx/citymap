import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { tourDurationLabel } from '../lib/tours.js';
import ToursView from '../components/ToursView.jsx';
import { AppContext } from '../context/AppContext.jsx';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(here, rel), 'utf8');

const T = { text: '#111', sub: '#666', bg: '#fff', border: '#ddd', card: '#fff', glassBg: '#fff', glassBorder: '#ddd', white: '#fff' };

function renderTours(tours) {
  return renderToStaticMarkup(
    <HelmetProvider>
      <MemoryRouter>
        <AppContext.Provider value={{ T, dark: false, navigate: () => {}, setShowPlans: () => {}, setShowAddBiz: () => {}, setShowAuth: () => {}, user: null }}>
          <ToursView T={T} dark={false} cities={[]} initialTours={tours} />
        </AppContext.Provider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const tourConDuracion = {
  id: 't1', title: 'Tour nocturno por París', city_slug: 'paris', price: 100,
  duration: '2 horas', gallery: ['https://example.com/a.jpg'], booking_config: {},
};
const tourSinDuracion = {
  id: 't2', title: 'Free tour por Mérida', city_slug: 'merida', price: 0,
  duration: '', gallery: ['https://example.com/b.jpg'], booking_config: {},
};
const tourSoloQuickFacts = {
  id: 't3', title: 'Excursión a Tequila', city_slug: 'guadalajara', price: 1881,
  duration: '', gallery: ['https://example.com/c.jpg'],
  booking_config: { quick_facts: ['⏱️ Tiempo: 6-8 hrs'] },
};

// 11 nov 2026 (Jonathan): las tarjetas de tours muestran la duración
// real cuando existe en la base y no inventan ninguna cuando falta; la
// valoración solo se muestra si es real (nunca «0 de 5 estrellas»).
describe('tours: duración real y sin valoración inventada', () => {
  it('tourDurationLabel: la columna duration manda', () => {
    expect(tourDurationLabel({ duration: '6 horas - 8 horas', booking_config: { quick_facts: ['⏱️ Tiempo: 6-8 hrs'] } })).toBe('6 horas - 8 horas');
    expect(tourDurationLabel({ duration: '  2 horas  ' })).toBe('2 horas');
  });

  it('tourDurationLabel: sin duration usa el «Tiempo:» de quick_facts', () => {
    expect(tourDurationLabel(tourSoloQuickFacts)).toBe('6-8 hrs');
    expect(tourDurationLabel({ duration: '', booking_config: { quick_facts: ['🚌 Recogida en el hotel', '⏱️ Tiempo: 4-5 hrs'] } })).toBe('4-5 hrs');
  });

  it('tourDurationLabel: sin duración en ningún lado devuelve null (no se inventa)', () => {
    expect(tourDurationLabel(tourSinDuracion)).toBeNull();
    expect(tourDurationLabel({ duration: '   ', booking_config: { quick_facts: ['🏊 Ideal p/ nadar'] } })).toBeNull();
    expect(tourDurationLabel(null)).toBeNull();
    expect(tourDurationLabel({})).toBeNull();
  });

  it('la tarjeta de /tours muestra la duración real', () => {
    const html = renderTours([tourConDuracion]);
    expect(html).toContain('⏱ 2 horas');
  });

  it('la tarjeta de /tours no muestra duración cuando no existe', () => {
    const html = renderTours([tourSinDuracion]);
    expect(html).not.toContain('⏱');
  });

  it('la tarjeta de /tours usa el «Tiempo:» de quick_facts si la columna está vacía', () => {
    const html = renderTours([tourSoloQuickFacts]);
    expect(html).toContain('⏱ 6-8 hrs');
  });

  it('las tarjetas del inicio global usan la misma regla de duración', () => {
    const home = read('../views/GlobalHomeView.jsx');
    expect(home).toContain('tourDurationLabel');
    expect(home).toContain('const duration = tourDurationLabel(tour);');
    expect(home).toContain('const duration = tourDurationLabel(exp);');
  });

  it('las tarjetas de la Revista usan la misma regla de duración', () => {
    const trips = read('../components/TripsView.jsx');
    expect(trips).toContain('tourDurationLabel');
    expect(trips).toContain('const duration = tourDurationLabel(exp);');
  });

  it('los imperdibles (Experiencias destacadas) ya NO muestran duración en la tarjeta', () => {
    // 12 nov 2026 (Jonathan, PR #237): la duración no va en estas
    // tarjetas (tampoco el número ni el ⏱); el detalle de la experiencia
    // sigue teniendo su duración, eso no se toca.
    const top = read('../components/home/TopImperdibles.jsx');
    expect(top).not.toContain('tourDurationLabel');
    expect(top).not.toContain('⏱');
  });

  it('el detalle del tour ya no pinta «0 de 5 estrellas» sin reseñas', () => {
    const viewer = read('../components/ExperienceViewer.jsx');
    // La valoración es el promedio real de las reseñas internas y solo
    // se pinta cuando hay al menos una (nunca estrellas en cero).
    expect(viewer).not.toContain('<StarRow n={0}');
    expect(viewer).toContain('reviewAvg');
    expect(viewer).toContain('{reviewAvg > 0 && <StarRow n={reviewAvg} size={16} />}');
  });
});
