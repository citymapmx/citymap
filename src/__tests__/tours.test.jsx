import { describe, it, expect } from 'vitest';
import { formatTourPrice, tourCardUrl, groupToursByCity } from '../lib/tours.js';

describe('formatTourPrice', () => {
  it('formatea con separador de miles y "desde"', () => {
    expect(formatTourPrice(1475.1)).toBe('desde $1,475.1 MXN');
    expect(formatTourPrice(2332.39)).toBe('desde $2,332.39 MXN');
    expect(formatTourPrice(790)).toBe('desde $790 MXN');
    expect(formatTourPrice('1075')).toBe('desde $1,075 MXN');
  });
  it('devuelve null sin precio válido', () => {
    expect(formatTourPrice(0)).toBeNull();
    expect(formatTourPrice(null)).toBeNull();
    expect(formatTourPrice(undefined)).toBeNull();
    expect(formatTourPrice('')).toBeNull();
  });
});

describe('tourCardUrl', () => {
  it('apunta al artículo de la Revista', () => {
    expect(tourCardUrl({ city_slug: 'guadalajara', title: 'Excursión a Guachimontones' }))
      .toBe('/revista/guadalajara/excursion-a-guachimontones');
    expect(tourCardUrl({ city_slug: 'tepic', title: 'Tour de la cultura huichol' }))
      .toBe('/revista/tepic/tour-de-la-cultura-huichol');
  });
});

describe('groupToursByCity', () => {
  const cities = [
    { slug: 'guadalajara', name: 'Guadalajara' },
    { slug: 'tepic', name: 'Tepic' },
    { slug: 'merida', name: 'Mérida' },
  ];
  const tours = [
    { city_slug: 'guadalajara', title: 'Tequila' },
    { city_slug: 'tepic', title: 'Huichol' },
    { city_slug: 'tepic', title: 'San Blas' },
    { city_slug: 'merida', title: 'Homún' },
  ];

  it('agrupa y ordena por cantidad', () => {
    const groups = groupToursByCity(tours, cities);
    expect(groups.map((g) => g.slug)).toEqual(['tepic', 'guadalajara', 'merida']);
    expect(groups[0]).toMatchObject({ name: 'Tepic', count: 2 });
    expect(groups[0].tours).toHaveLength(2);
    expect(groups[1]).toMatchObject({ name: 'Guadalajara', count: 1 });
  });

  it('usa el slug como nombre si la ciudad no está en la lista', () => {
    const groups = groupToursByCity([{ city_slug: 'paris', title: 'Louvre' }], cities);
    expect(groups[0]).toMatchObject({ slug: 'paris', name: 'paris', count: 1 });
  });

  it('devuelve [] sin tours', () => {
    expect(groupToursByCity([], cities)).toEqual([]);
    expect(groupToursByCity(null, cities)).toEqual([]);
  });
});

describe('ToursView', () => {
  const T = { text: '#111', sub: '#666', bg: '#fff', border: '#ddd' };
  const cities = [
    { slug: 'guadalajara', name: 'Guadalajara' },
    { slug: 'tepic', name: 'Tepic' },
  ];
  const initialTours = [
    { id: '1', title: 'Excursión a Guachimontones', city_slug: 'guadalajara', price: 1475.1, duration: '5–6 horas', gallery: ['https://ejemplo.com/guachi.webp'] },
    { id: '2', title: 'Tour de la cultura huichol', city_slug: 'tepic', price: 2130, duration: '10 horas 30 minutos', gallery: ['https://ejemplo.com/huichol.webp'] },
    { id: '3', title: 'Excursión a San Blas', city_slug: 'tepic', price: 2078, duration: '8 horas', gallery: [] },
  ];

  it('muestra los tours agrupados por ciudad con precio y botón de reserva', async () => {
    const React = (await import('react')).default;
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { HelmetProvider } = await import('react-helmet-async');
    const { AppContext } = await import('../context/AppContext.jsx');
    const ToursView = (await import('../components/ToursView.jsx')).default;
    const html = renderToStaticMarkup(
      <HelmetProvider>
        <AppContext.Provider value={{ T, dark: false, navigate: () => {} }}>
          <ToursView T={T} dark={false} navigate={() => {}} cities={cities} initialTours={initialTours} />
        </AppContext.Provider>
      </HelmetProvider>
    );
    expect(html).toContain('Tours');
    expect(html).toContain('3 tours en 2 ciudades');
    expect(html).toContain('Tepic (2)');
    expect(html).toContain('Guadalajara (1)');
    expect(html).toContain('Excursión a Guachimontones');
    expect(html).toContain('Tour de la cultura huichol');
    expect(html).toContain('desde $1,475.1 MXN');
    expect(html).toContain('Reservar →');
  });
});

describe('TravelAffiliateRow', () => {
  it('el botón Tours lleva a /tours dentro del sitio, no a Civitatis', async () => {
    const React = (await import('react')).default;
    const { renderToStaticMarkup } = await import('react-dom/server');
    const TravelAffiliateRow = (await import('../components/home/TravelAffiliateRow.jsx')).default;
    const T = { text: '#111', border: '#ddd' };
    const html = renderToStaticMarkup(<TravelAffiliateRow T={T} dark={false} navigate={() => {}} />);
    expect(html).toContain('href="/tours"');
    expect(html).not.toContain('civitatis.com');
    expect(html).toContain('Autos');
    expect(html).toContain('Hoteles');
    expect(html).toContain('Vuelos');
  });
});
