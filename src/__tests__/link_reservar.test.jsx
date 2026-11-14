import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { isBookingPath, bookingModalApplies, bookingLinkFor } from '../lib/bookingLink.js';

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel) => readFileSync(join(here, rel), 'utf8');

// Link directo de reserva (13 nov 2026, Jonathan): un link limpio por
// negocio que abre la ficha con el modal de Reservar ya abierto, y que
// el dueño copia desde su panel de Reservaciones. Formato:
//   citymap.mx/<ciudad>/<slug-del-negocio>/reservar
// Sin UUIDs ni números raros. Si el negocio no tiene reserva, el link
// solo abre la ficha normal, sin error y sin modal.

// Datos reales de Eduardo Barber (Tepic): reserva nativa activada,
// Corte $150 y Corte y Barba $200 (verificado por PostgREST, 13 nov).
const eduardo = {
  id: 'dc66830f-b566-4ed8-bdb8-b09d3f566f59',
  slug: 'tepic-eduardo-barber',
  city_slug: 'tepic',
  booking_config: { enabled: true, type: 'native' },
};

describe('link limpio para reservar', () => {
  it('Eduardo Barber: citymap.mx/tepic/eduardo-barber/reservar, sin UUID', () => {
    const link = bookingLinkFor(eduardo);
    expect(link).toBe('https://citymap.mx/tepic/eduardo-barber/reservar');
    expect(link).not.toContain(eduardo.id);
    expect(link).not.toMatch(/[0-9a-f]{8}-[0-9a-f-]{27,}/);
  });

  it('el slug de la base trae el prefijo de ciudad y se limpia', () => {
    expect(bookingLinkFor({ slug: 'tepic-eduardo-barber', city_slug: 'tepic' }))
      .toBe('https://citymap.mx/tepic/eduardo-barber/reservar');
    // Slug ya limpio: no se duplica nada.
    expect(bookingLinkFor({ slug: 'eduardo-barber', city_slug: 'tepic' }))
      .toBe('https://citymap.mx/tepic/eduardo-barber/reservar');
  });

  it('sin ciudad o sin slug no hay link (null, nunca un link roto)', () => {
    expect(bookingLinkFor({ slug: 'tepic-eduardo-barber' })).toBeNull();
    expect(bookingLinkFor({ city_slug: 'tepic' })).toBeNull();
    expect(bookingLinkFor(null)).toBeNull();
    expect(bookingLinkFor({})).toBeNull();
  });
});

describe('detectar el link de reserva en la URL', () => {
  it('es link de reserva con el sufijo como tercer segmento', () => {
    expect(isBookingPath('/tepic/eduardo-barber/reservar')).toBe(true);
    expect(isBookingPath('/guadalajara/akami-sushi/reservar')).toBe(true);
  });

  it('un negocio llamado «reservar» no es link de reserva', () => {
    // /tepic/reservar son 2 segmentos: es la ficha de ese negocio.
    expect(isBookingPath('/tepic/reservar')).toBe(false);
    expect(isBookingPath('/reservar')).toBe(false);
  });

  it('la ficha normal y el menú no son link de reserva', () => {
    expect(isBookingPath('/tepic/eduardo-barber')).toBe(false);
    expect(isBookingPath('/tepic/eduardo-barber/menu')).toBe(false);
    expect(isBookingPath('/tepic')).toBe(false);
    expect(isBookingPath('/')).toBe(false);
    expect(isBookingPath('')).toBe(false);
  });
});

describe('cuándo abre el modal nativo de Reservar', () => {
  it('reserva nativa activada: sí', () => {
    expect(bookingModalApplies({ enabled: true, type: 'native' })).toBe(true);
    expect(bookingModalApplies({ enabled: true })).toBe(true);
  });

  it('sin reserva o desactivada: no', () => {
    expect(bookingModalApplies(null)).toBe(false);
    expect(bookingModalApplies(undefined)).toBe(false);
    expect(bookingModalApplies({})).toBe(false);
    expect(bookingModalApplies({ enabled: false })).toBe(false);
  });

  it('reserva externa: no abre el modal (abre la plataforma en otra pestaña)', () => {
    expect(bookingModalApplies({ enabled: true, type: 'external', externalUrl: 'https://reserva.ejemplo.com' })).toBe(false);
    expect(bookingModalApplies({ enabled: true, type: 'external', externalLinks: [{ url: 'https://a.com' }] })).toBe(false);
  });
});

describe('ruta /:ciudad/:slug/reservar registrada en el router', () => {
  it('AppRouter: isDetailPath e isHomePath reconocen el link de reserva', () => {
    const src = read('../router/AppRouter.jsx');
    expect(src).toContain("import { isBookingPath } from '../lib/bookingLink.js';");
    expect(src).toContain('if (isBookingPath(pathname)) return true;');
  });

  it('AppRouter: rutas de detalle para el sufijo /reservar (.mx y .world)', () => {
    const src = read('../router/AppRouter.jsx');
    expect(src).toContain('<Route path="/:city/:slug/reservar" element={<DetailView />} />');
    expect(src).toContain('<Route path="/:country/:city/:slug/reservar" element={<DetailView />} />');
  });

  it('el link de reserva no se confunde con una categoría', () => {
    const src = read('../router/AppRouter.jsx');
    // La categoría es /:ciudad/c/:categoria o /:ciudad/:categoria (2
    // segmentos); /reservar es tercer segmento, no «c».
    expect(src).toContain('if (isCategoryPath(segments)) return false;');
  });
});

describe('arranque: el link abre la ficha en carga en frío', () => {
  it('useAppInitialization resuelve el negocio del link como el detalle normal', () => {
    const src = read('../hooks/useAppInitialization.js');
    expect(src).toContain('segments[2] === "reservar"');
    expect(src).toContain('b = getIdFromSlug(segments[1]);');
    expect(src).toContain('if (b && currentCity && !b.startsWith(currentCity + "-")) b = currentCity + "-" + b;');
  });
});

describe('la ficha abre sola el modal de Reservar con el link', () => {
  it('DetailView auto-abre el modal solo con el sufijo /reservar y reserva nativa', () => {
    const src = read('../views/DetailView.jsx');
    expect(src).toContain("import { isBookingPath, bookingModalApplies } from \"../lib/bookingLink.js\";");
    expect(src).toContain('if (!isBookingPath(location.pathname)) return;');
    expect(src).toContain('bookingModalApplies(selected.booking_config)');
    expect(src).toContain('setShowBooking(true);');
    // Espera a saber si hay reserva: sin booking_config y sin la
    // consulta fullBusiness resuelta, no abre (ni rompe).
    expect(src).toContain('if (selected.booking_config === undefined && !selected._fullFetched) return;');
    // Solo una vez: si el visitante cierra el modal, no se reabre.
    expect(src).toContain('const bookingAutoOpened = useRef(false);');
    expect(src).toContain('if (bookingAutoOpened.current) return;');
  });

  it('al cerrar el modal la URL vuelve al detalle normal (sin /reservar)', () => {
    const src = read('../views/DetailView.jsx');
    expect(src).toContain('const closeBooking = () => {');
    expect(src).toContain("routerNavigate(location.pathname.replace(/\\/reservar$/, ''), { replace: true });");
    expect(src).toContain('<BookingModal biz={selected} onClose={closeBooking} />');
  });
});

describe('panel del dueño: fila «Link para reservar» con Copiar', () => {
  it('la fila existe con el mismo patrón de copiado del link del panel', () => {
    const src = read('../views/OwnerDashboardView.jsx');
    expect(src).toContain('Link para reservar');
    expect(src).toContain("import { bookingLinkFor, bookingModalApplies } from \"../lib/bookingLink.js\";");
    expect(src).toContain('navigator.clipboard.writeText(bookingLink);');
    expect(src).toContain('toast$("¡Enlace para reservar copiado!");');
  });

  it('la fila solo se muestra con reserva nativa activada', () => {
    const src = read('../views/OwnerDashboardView.jsx');
    expect(src).toContain('const bookingLink = bookingModalApplies(ownerView?.booking_config) ? bookingLinkFor(ownerView, cities) : null;');
    expect(src).toContain('{bookingLink && (');
  });
});

describe('«reservar» es palabra reservada en todas las listas de rutas', () => {
  it('NON_HOME_PREFIXES la incluye en AppRouter, App.jsx e initialRoute', () => {
    for (const file of ['../router/AppRouter.jsx', '../App.jsx', '../lib/initialRoute.js']) {
      const src = read(file);
      expect(src).toContain("'/reservar'");
    }
  });

  it('SYSTEM_ROUTES (arranque) e INVALID_CITY_SLUGS (ciudad guardada) la incluyen', () => {
    expect(read('../hooks/useAppInitialization.js')).toContain('"reservar"');
    expect(read('../store/useUIStore.js')).toContain('"reservar"');
  });

  it('las dos listas SEO de primeros segmentos coinciden en «reservar»', () => {
    expect(read('../lib/seoRoutes.js')).toContain("'reservar'");
    expect(read('../../middleware.js')).toContain("'reservar'");
  });
});

describe('SEO: el link de reserva no se indexa como página aparte', () => {
  it('el middleware sirve la vista previa de la ficha para /:ciudad/:slug/reservar', () => {
    const src = read('../../middleware.js');
    expect(src).toContain("seg3 === 'reservar'");
    expect(src).toContain("ogUrl.searchParams.set('b', seg2);");
    expect(src).toContain("ogUrl.searchParams.set('city', seg1);");
  });

  it('el sitemap NO lista URLs /reservar (la canónica sigue siendo la ficha)', () => {
    expect(read('../../api/sitemap.xml.js')).not.toContain('reservar');
  });

  it('el canonical de la ficha es el detalle limpio, sin /reservar', () => {
    const src = read('../hooks/useAppSEO.js');
    expect(src).toContain('canonical = BASE_URL + buildCityPath(bizCity, cities) + "/" + cleanedSlug;');
  });
});
