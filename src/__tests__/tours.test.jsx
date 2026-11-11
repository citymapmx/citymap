import { describe, it, expect } from 'vitest';
import { formatTourPrice, tourCardUrl, groupToursByCity, tourPriceLabel } from '../lib/tours.js';

describe('formatTourPrice', () => {
  it('formatea con separador de miles y "desde", siempre en pesos enteros', () => {
    expect(formatTourPrice(1475.1)).toBe('desde $1,475 MXN');
    expect(formatTourPrice(2332.39)).toBe('desde $2,332 MXN');
    expect(formatTourPrice(919.1)).toBe('desde $919 MXN');
    expect(formatTourPrice(785.33)).toBe('desde $785 MXN');
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

  it('casa la ciudad aunque el slug de la base traiga mayúsculas y acentos', () => {
    // La base guarda la ciudad como 'San-Pedro-Garza-García' y los tours
    // como 'san-pedro-garza-garcia': sin normalizar acentos la etiqueta
    // caía al slug crudo en minúsculas y con guiones.
    const spggCities = [{ slug: 'San-Pedro-Garza-García', name: 'San Pedro Garza García' }];
    const groups = groupToursByCity([{ city_slug: 'san-pedro-garza-garcia', title: 'Chipinque' }], spggCities);
    expect(groups[0]).toMatchObject({ slug: 'san-pedro-garza-garcia', name: 'San Pedro Garza García', count: 1 });
  });

  it('devuelve [] sin tours', () => {
    expect(groupToursByCity([], cities)).toEqual([]);
    expect(groupToursByCity(null, cities)).toEqual([]);
  });
});

describe('ToursView', () => {
  const T = { text: '#111', sub: '#666', bg: '#fff', border: '#ddd', card: '#f5f5f5' };
  const cities = [
    { slug: 'guadalajara', name: 'Guadalajara' },
    { slug: 'tepic', name: 'Tepic' },
  ];
  const initialTours = [
    { id: '1', title: 'Excursión a Guachimontones', city_slug: 'guadalajara', price: 1475.1, duration: '5–6 horas', gallery: ['https://ejemplo.com/guachi.webp'] },
    { id: '2', title: 'Tour de la cultura huichol', city_slug: 'tepic', price: 2130, duration: '10 horas 30 minutos', gallery: ['https://ejemplo.com/huichol.webp'] },
    { id: '3', title: 'Excursión a San Blas', city_slug: 'tepic', price: 2078, duration: '8 horas', gallery: [] },
  ];

  it('muestra los tours agrupados por ciudad con precio y botón ver más detalles', async () => {
    const React = (await import('react')).default;
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { HelmetProvider } = await import('react-helmet-async');
    const { MemoryRouter } = await import('react-router-dom');
    const { AppContext } = await import('../context/AppContext.jsx');
    const ToursView = (await import('../components/ToursView.jsx')).default;
    const html = renderToStaticMarkup(
      <HelmetProvider>
        <MemoryRouter>
          <AppContext.Provider value={{ T, dark: false, navigate: () => {} }}>
            <ToursView T={T} dark={false} navigate={() => {}} cities={cities} initialTours={initialTours} />
          </AppContext.Provider>
        </MemoryRouter>
      </HelmetProvider>
    );
    expect(html).toContain('3 tours en 2 ciudades');
    expect(html).toContain('Tepic (2)');
    expect(html).toContain('Guadalajara (1)');
    expect(html).toContain('Excursión a Guachimontones');
    expect(html).toContain('Tour de la cultura huichol');
    expect(html).toContain('desde $1,475 MXN');
    expect(html).toContain('Ver más detalles →');
    expect(html).not.toContain('Reservar →');
    // Cabecera estilo Revista: sin "← Inicio", sin título grande con emoji,
    // subtítulo con los conteos; tarjeta con fondo sólido (T.card) y píldora "TOUR".
    expect(html).not.toContain('← Inicio');
    expect(html).not.toContain('🗺️');
    expect(html).toContain('TOUR');
    expect(html).toContain('background:#f5f5f5');
    // Tarjeta compacta (opción A): sin ubicación ni duración, título a 2 líneas.
    expect(html).not.toContain('5–6 horas');
    expect(html).not.toContain('10 horas 30 minutos');
    expect(html).not.toContain('⏱');
    expect(html).toContain('-webkit-line-clamp:2');
  });

  it('tiene la cabecera con el logotipo y la etiqueta Viajes como Revista', async () => {
    const React = (await import('react')).default;
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { HelmetProvider } = await import('react-helmet-async');
    const { MemoryRouter } = await import('react-router-dom');
    const { AppContext } = await import('../context/AppContext.jsx');
    const ToursView = (await import('../components/ToursView.jsx')).default;
    const html = renderToStaticMarkup(
      <HelmetProvider>
        <MemoryRouter>
          <AppContext.Provider value={{ T, dark: false, navigate: () => {} }}>
            <ToursView T={T} dark={false} navigate={() => {}} cities={cities} initialTours={initialTours} />
          </AppContext.Provider>
        </MemoryRouter>
      </HelmetProvider>
    );
    expect(html).toContain('src="/citymap.mx.png"');
    expect(html).toContain('width="127"');
    expect(html).toContain('height="38"');
    expect(html).toContain('Viajes');
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

describe('groupToursByCity (mayúsculas en slugs)', () => {
  it('usa el nombre bonito aunque el slug de cities tenga mayúsculas', () => {
    const groups = groupToursByCity(
      [{ city_slug: 'barcelona', title: 'Sagrada Familia' }],
      [{ slug: 'Barcelona', name: 'Barcelona' }],
    );
    expect(groups[0].name).toBe('Barcelona');
  });
});

describe('tourPriceLabel', () => {
  it('con precio muestra "desde $X MXN"', () => {
    expect(tourPriceLabel({ price: 1200 })).toBe('desde $1,200 MXN');
  });

  it('sin precio y sin reserva muestra "Gratis" (senderismo)', () => {
    expect(tourPriceLabel({ price: 0, booking_config: {} })).toBe('Gratis');
    expect(tourPriceLabel({ price: null })).toBe('Gratis');
  });

  it('precio 0 explícito con reserva muestra "Gratis" (free tour)', () => {
    expect(tourPriceLabel({
      price: 0,
      booking_config: { externalLinks: [{ url: 'https://www.civitatis.com/es/x' }] },
    })).toBe('Gratis');
  });

  it('sin precio (null) pero con reserva devuelve null (la tarjeta dice "Precio no publicado")', () => {
    expect(tourPriceLabel({
      price: null,
      booking_config: { externalLinks: [{ url: 'https://www.civitatis.com/es/x' }] },
    })).toBeNull();
  });

  it('en inglés usa "from $X MXN" y "Free" (fase 1 i18n)', () => {
    expect(tourPriceLabel({ price: 1200 }, 'en')).toBe('from $1,200 MXN');
    expect(tourPriceLabel({ price: 0, booking_config: {} }, 'en')).toBe('Free');
    expect(tourPriceLabel({ price: null }, 'en')).toBe('Free');
    expect(formatTourPrice(1200, 'en')).toBe('from $1,200 MXN');
    expect(formatTourPrice(1200)).toBe('desde $1,200 MXN');
  });
});
