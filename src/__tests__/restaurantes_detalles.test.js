import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { getAvailableSubcats } from '../lib/businessSubcats.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

describe('getAvailableSubcats: filtros de subtipo, no nombres de negocios', () => {
  it('excluye un type que es el propio nombre del negocio ("Cristina")', () => {
    const biz = [
      { name: 'Cristina', category: 'restaurantes', subcategory: null, type: 'Cristina' },
      { name: 'Campomar Punto Sur', category: 'restaurantes', subcategory: 'Mariscos', type: null },
      { name: 'SSAM Comida Coreana', category: 'restaurantes', subcategory: 'Comida Coreana', type: null },
      { name: "L'entrecote Fantastique", category: 'restaurantes', subcategory: null, type: 'Restaurante Francés ' },
    ];
    expect(getAvailableSubcats(biz)).toEqual(['Comida Coreana', 'Mariscos', 'Restaurante Francés']);
  });

  it('devuelve [] sin negocios y no duplica subtipos', () => {
    expect(getAvailableSubcats([])).toEqual([]);
    expect(getAvailableSubcats(null)).toEqual([]);
    const biz = [
      { name: 'A', subcategory: 'Mariscos', type: null },
      { name: 'B', subcategory: 'mariscos', type: null },
      { name: 'C', subcategory: null, type: null },
    ];
    expect(getAvailableSubcats(biz)).toEqual(['Mariscos']);
  });
});

describe('detalles chicos de la auditoría del 9 nov', () => {
  it('los pines de evento llevan su título y nunca "undefined"', () => {
    const gmap = read('../components/GMap.jsx');
    expect(gmap).toContain('new HTMLMarker(new window.google.maps.LatLng(ev.lat, ev.lng), content, ev.title)');
    expect(gmap).toContain('this.div.title = title || ""');
  });

  it('las rutas /tours, /precios y /negocios tienen título propio y ninguna categoría activa los tapa', () => {
    const seo = read('../hooks/useAppSEO.js');
    expect(seo).toContain('isTopLevelRoute');
    expect(seo).toContain('location.pathname.startsWith("/tours")');
    expect(seo).toContain('Tours y actividades por ciudad');
    expect(seo).toContain('location.pathname.startsWith("/precios")');
    expect(seo).toContain('Precios y planes para tu negocio');
    expect(seo).toContain('location.pathname.startsWith("/negocios")');
    expect(seo).toContain('CityMap para negocios');
  });

  it('al volver a la Revista se compensa el encabezado fijo', () => {
    const trips = read('../components/TripsView.jsx');
    expect(trips).toContain('scrollMarginTop: 140');
    expect(trips).toContain('revista-card-${id}');
    expect(trips).toContain("scrollIntoView({ block: \"nearest\" })");
  });

  it('las tarjetas de eventos muestran el póster completo (contain, no cover)', () => {
    const events = read('../views/EventsView.jsx');
    expect(events).toContain("objectFit:'contain'");
    expect(events).not.toContain("objectFit:'cover'");
  });
});
