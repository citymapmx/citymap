import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { filterAdminEvents, countEventsWithoutImage, eventHasImage } from '../lib/adminEventFilters.js';
import AdminEventFilters from '../components/admin/AdminEventFilters.jsx';
import AdminEventsTab from '../components/admin/AdminEventsTab.jsx';

// useGMaps lee window.google al montar y useUIStore lee localStorage y
// window.location al importar; en Node no existen.
if (typeof globalThis.window === "undefined") {
  globalThis.window = { location: { hostname: "citymap.mx", pathname: "/" } };
}
if (typeof globalThis.localStorage === "undefined") {
  globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
}

const ev = (overrides) => ({
  id: Math.random(),
  title: 'Evento',
  venue_name: 'Auditorio Telmex',
  event_category: 'Concierto',
  city_slug: 'guadalajara',
  date: '2099-06-15',
  time: '20:00',
  status: 'approved',
  active: true,
  img_url: null,
  img: null,
  ...overrides,
});

const fixtures = [
  ev({ id: 1, title: 'Concierto GDL sin foto', city_slug: 'guadalajara' }),
  ev({ id: 2, title: 'Concierto GDL con foto', city_slug: 'guadalajara', date: '2099-06-16', img_url: 'https://x/img.jpg' }),
  ev({ id: 3, title: 'Feria Tepic sin foto', city_slug: 'tepic', date: '2099-07-01', img_url: '' }),
  ev({ id: 4, title: 'Obra pasada sin foto', city_slug: 'guadalajara', date: '2020-01-10' }),
  ev({ id: 5, title: 'Teatro multi-ciudad con foto', city_slug: 'guadalajara,zapopan', date: '2099-08-01', img: 'https://x/img2.jpg' }),
  ev({ id: 6, title: 'Show GDL sin foto', city_slug: 'guadalajara', venue_name: 'Teatro Diana', date: '2099-09-01' }),
];

const cities = [
  { slug: 'guadalajara', name: 'Guadalajara' },
  { slug: 'tepic', name: 'Tepic' },
];

describe('eventHasImage', () => {
  it('sin imagen es nulo o cadena vacía en img_url e img', () => {
    expect(eventHasImage(ev({}))).toBe(false);
    expect(eventHasImage(ev({ img_url: '' }))).toBe(false);
    expect(eventHasImage(ev({ img_url: 'https://x/a.jpg' }))).toBe(true);
    expect(eventHasImage(ev({ img: 'https://x/b.jpg' }))).toBe(true);
  });
});

describe('filterAdminEvents', () => {
  it('sin filtros devuelve los mismos eventos que hoy', () => {
    expect(filterAdminEvents(fixtures, {})).toHaveLength(6);
  });

  it('Sin imagen deja solo los que no tienen imagen en ningún campo', () => {
    const ids = filterAdminEvents(fixtures, { noImageOnly: true }).map(e => e.id);
    expect(ids).toEqual([1, 3, 4, 6]);
  });

  it('ciudad + Sin imagen se combinan', () => {
    const ids = filterAdminEvents(fixtures, { city: 'guadalajara', noImageOnly: true }).map(e => e.id);
    expect(ids).toEqual([1, 4, 6]);
    expect(filterAdminEvents(fixtures, { city: 'tepic', noImageOnly: true }).map(e => e.id)).toEqual([3]);
  });

  it('buscador + Sin imagen se combinan', () => {
    const ids = filterAdminEvents(fixtures, { search: 'teatro', noImageOnly: true }).map(e => e.id);
    expect(ids).toEqual([6]);
  });

  it('la ciudad multi-ciudad sigue coincidiendo como hoy', () => {
    expect(filterAdminEvents(fixtures, { city: 'zapopan' }).map(e => e.id)).toEqual([5]);
  });

  it('el filtro de estado sigue funcionando', () => {
    expect(filterAdminEvents(fixtures, { status: 'upcoming' }).map(e => e.id)).toEqual([1, 2, 3, 5, 6]);
    expect(filterAdminEvents(fixtures, { status: 'past' }).map(e => e.id)).toEqual([4]);
  });
});

describe('countEventsWithoutImage', () => {
  it('cuenta los sin imagen de la lista ya filtrada por ciudad/buscador', () => {
    expect(countEventsWithoutImage(fixtures)).toBe(4);
    expect(countEventsWithoutImage(filterAdminEvents(fixtures, { city: 'tepic' }))).toBe(1);
  });
});

const noop = () => {};
const filtersEl = (overrides = {}) => (
  <AdminEventFilters
    cities={cities}
    cityFilter="all"
    onCityFilterChange={noop}
    noImageOnly={false}
    onNoImageOnlyChange={noop}
    noImageCount={2}
    showFilters={false}
    onShowFiltersChange={noop}
    {...overrides}
  />
);

describe('AdminEventFilters (render)', () => {
  it('cerrado: se ven Todas, Filtros y Sin imagen con su conteo, sin el muro de ciudades', () => {
    const html = renderToStaticMarkup(filtersEl());
    expect(html).toContain('Todas');
    expect(html).toContain('Filtros');
    expect(html).toContain('Sin imagen (2)');
    expect(html).not.toContain('>Guadalajara</button>');
    expect(html).not.toContain('>Tepic</button>');
    expect(html).not.toContain('Cerrar');
  });

  it('abierto: el panel muestra todas las ciudades y el botón Cerrar', () => {
    const html = renderToStaticMarkup(filtersEl({ showFilters: true }));
    expect(html).toContain('Ciudad');
    expect(html).toContain('Cerrar');
    expect(html).toContain('>Guadalajara</button>');
    expect(html).toContain('>Tepic</button>');
  });

  it('con ciudad elegida se ve el chip con su nombre y no el resto de ciudades', () => {
    const html = renderToStaticMarkup(filtersEl({ cityFilter: 'guadalajara' }));
    expect(html).toContain('Guadalajara');
    expect(html).toContain('Todas');
    expect(html).not.toContain('>Tepic</button>');
  });
});

describe('AdminEventsTab (render de la lista)', () => {
  it('la vista principal ya no trae el muro de ciudades y muestra Sin imagen con conteo', () => {
    const data = { events: fixtures.slice(0, 3), cities };
    const html = renderToStaticMarkup(
      <AdminEventsTab data={data} sb={{}} load={async () => {}} onToast={noop} />
    );
    expect(html).toContain('3 eventos');
    expect(html).toContain('Filtros');
    expect(html).toContain('Sin imagen (2)');
    expect(html).toContain('Concierto GDL sin foto');
    expect(html).not.toContain('>Guadalajara</button>');
    expect(html).toContain('Vigentes');
    expect(html).toContain('Buscar evento por nombre, lugar o categoría...');
  });
});
