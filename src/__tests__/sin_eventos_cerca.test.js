// Sin fallback de «eventos cerca» (decisión de Jonathan, 12 Nov 2026):
// en el inicio de una ciudad sin eventos no aparece ninguna
// recomendación — solo el mensaje de que todavía no hay eventos.
// Se eliminaron selectNearbyEvents, NearbyEventsList, loadNearbyEvents y
// las claves i18n del fallback. «Más eventos en [ciudad]» del detalle
// (EventDetailModal + eventListing.js) NO se toca: filtra estricto por
// ciudad y es otro camino.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('Sin fallback de eventos cerca', () => {
  const files = [
    '../components/home/HomeEvents.jsx',
    '../views/EventsView.jsx',
    '../views/HomeView.jsx',
    '../store/useDataStore.js',
    '../lib/i18n.js',
    '../lib/i18n-en.js',
  ];

  it('ningún archivo referencia el fallback de cercanos', () => {
    for (const file of files) {
      const src = read(file);
      expect(src).not.toContain('NearbyEventsList');
      expect(src).not.toContain('loadNearbyEvents');
      expect(src).not.toContain('nearbyEvents');
      expect(src).not.toContain('onRequestNearbyEvents');
      expect(src).not.toContain('eventos_cerca_de');
      expect(src).not.toContain('eventos_ciudad_vacia_desc');
    }
  });

  it('los archivos del fallback ya no existen', () => {
    expect(() => read('../lib/nearbyEvents.js')).toThrow();
    expect(() => read('../components/home/NearbyEventsList.jsx')).toThrow();
  });

  it('EventsView sin eventos muestra solo el título, sin descripción de cerca', () => {
    const view = read('../views/EventsView.jsx');
    expect(view).not.toContain('eventos_ciudad_vacia_desc');
    // La descripción solo sale con filtros activos o con eventos en la ciudad.
    expect(view).toContain('(hasActiveFilters || visibleEvents.length > 0)');
  });

  it('el detalle de evento y su listado no se tocaron', () => {
    const modal = read('../components/modals/EventDetailModal.jsx');
    expect(modal).toContain('upcomingEvents');
    const listing = read('../lib/eventListing.js');
    expect(listing).toContain('upcomingEvents');
  });
});
