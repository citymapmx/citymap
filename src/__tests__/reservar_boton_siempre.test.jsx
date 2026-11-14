import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { bookingButtonState } from '../lib/bookingButtonState.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Botón «Reservar» intermitente (13 nov 2026, capturas de Jonathan en la
// ficha de Eduardo Barber): a las 22:08 el botón amarillo SÍ estaba y a
// las 22:09 ya NO, mismo teléfono, sin cambio de código.
//
// Causa raíz: el objeto del negocio que llega de la lista NO traía
// `booking_config` (la columna no estaba en el select de la lista de
// negocios) y la ficha dependía de la consulta `fullBusiness` para saber
// si hay reserva. Mientras esa consulta no resolvía —o fallaba con red
// floja, con solo 1 reintento y sin reintento al volver a la ventana—
// `selected.booking_config?.enabled` era falso y el botón simplemente no
// existía, aunque el resto de la ficha ya se veía cargada. El dato en la
// base estaba bien (Eduardo Barber: native, enabled, Corte $150 y Corte
// y Barba $200, verificado por PostgREST): el fallo era del cliente.
//
// La hipótesis del chunk lazy quedó descartada: el botón no depende del
// chunk del modal (solo su onClick lo abre) y el ErrorBoundary ya
// auto-recarga una vez ante un chunk obsoleto tras un despliegue
// (lib/loadRecovery.js).

// Objeto tal como lo devuelve la lista (sin booking_config): el caso que
// escondía el botón.
const BIZ_DE_LISTA = {
  id: 'dc66830f-b566-4ed8-bdb8-b09d3f566f59',
  name: 'Eduardo Barber',
  plan: 'premium',
};

describe('causa raíz: la lista trae booking_config desde el primer render', () => {
  it('todas las listas de columnas de negocios incluyen booking_config', () => {
    const src = read('../store/useDataStore.js');
    // Cada lista de columnas que pide negocios (carga inicial, carga
    // completa, búsqueda, destacados y pines del mapa) debe traer la
    // columna: sin ella la ficha no sabe si hay reserva hasta que
    // resuelve fullBusiness.
    const lists = src.match(/"(id,name,lat,lng[^"]*)"/g) || [];
    expect(lists.length).toBeGreaterThanOrEqual(5);
    for (const list of lists) {
      expect(list).toContain('booking_config');
    }
  });

  it('la lista NO depende de fullBusiness para mostrar el botón: con booking_config del objeto de lista, el estado es ready', () => {
    const state = bookingButtonState({
      bookingConfig: { type: 'native', enabled: true, services: [{ id: 's1', name: 'Corte' }] },
      fullPending: true,
      fullError: false,
    });
    expect(state.mode).toBe('ready');
  });
});

describe('reproducción del fallo: objeto de lista sin booking_config', () => {
  it('con la consulta fullBusiness pendiente el botón existe en modo cargando (antes: no existía)', () => {
    const state = bookingButtonState({
      bookingConfig: BIZ_DE_LISTA.booking_config,
      fullPending: true,
      fullError: false,
    });
    expect(state.mode).toBe('loading');
  });

  it('con la consulta fullBusiness fallida el botón existe en modo reintento (antes: no existía)', () => {
    const state = bookingButtonState({
      bookingConfig: BIZ_DE_LISTA.booking_config,
      fullPending: false,
      fullError: true,
    });
    expect(state.mode).toBe('retry');
  });
});

describe('bookingButtonState: resto de casos', () => {
  it('sin reserva (booking_config null) el botón se esconde', () => {
    expect(bookingButtonState({ bookingConfig: null, fullPending: false, fullError: false }).mode).toBe('hidden');
  });

  it('con reserva desactivada el botón se esconde', () => {
    expect(bookingButtonState({ bookingConfig: { enabled: false }, fullPending: false, fullError: false }).mode).toBe('hidden');
  });

  it('con reserva externa y enlaces el botón amarillo se esconde (sale la lista de plataformas)', () => {
    expect(
      bookingButtonState({
        bookingConfig: { enabled: true, type: 'external', externalLinks: [{ platform: 'otro', url: 'https://x.mx' }] },
        fullPending: false,
        fullError: false,
      }).mode
    ).toBe('hidden');
  });

  it('con reserva externa sin enlaces el botón amarillo sí sale', () => {
    expect(
      bookingButtonState({
        bookingConfig: { enabled: true, type: 'external', externalUrl: 'https://x.mx' },
        fullPending: false,
        fullError: false,
      }).mode
    ).toBe('ready');
  });

  it('desconocido y sin consulta en curso ni error, el botón se esconde (no hay nada que esperar)', () => {
    expect(bookingButtonState({ bookingConfig: undefined, fullPending: false, fullError: false }).mode).toBe('hidden');
  });
});

describe('DetailView: el botón nunca se esconde por no saber aún si hay reserva', () => {
  const src = read('../views/DetailView.jsx');

  it('la ficha decide el botón con bookingButtonState (no con booking_config?.enabled directo)', () => {
    expect(src).toContain('bookingButtonState({');
    expect(src).toContain("bookingBtn.mode === 'ready'");
    expect(src).toContain("bookingBtn.mode === 'loading'");
    expect(src).toContain("bookingBtn.mode === 'retry'");
  });

  it('la fila de botones se muestra cuando el botón no está en modo hidden (aunque booking_config aún sea undefined)', () => {
    expect(src).toContain("bookingBtn.mode !== 'hidden'");
  });

  it('el estado de la consulta fullBusiness se captura (isPending/isError/refetch)', () => {
    expect(src).toContain('const fullBusinessQuery = useQuery({');
    expect(src).toContain('fullBusinessQuery.isPending');
    expect(src).toContain('fullBusinessQuery.isError');
    expect(src).toContain('fullBusinessQuery.refetch()');
  });

  it('en modo cargando el botón amarillo sale deshabilitado con el texto Reservar', () => {
    const loadingAt = src.indexOf("bookingBtn.mode === 'loading'");
    const block = src.slice(loadingAt, src.indexOf('</button>', loadingAt));
    expect(block).toContain('disabled');
    expect(block).toContain('Reservar');
    expect(block).toContain('#FACC15');
  });

  it('en modo reintento tocar el botón vuelve a pedir el negocio y abre el modal al llegar la reserva', () => {
    const retryAt = src.indexOf("bookingBtn.mode === 'retry'");
    const block = src.slice(retryAt, src.indexOf('</button>', retryAt));
    expect(block).toContain('fullBusinessQuery.refetch()');
    expect(block).toContain('bookingRetryOpen.current = true');
    expect(block).toContain('Reservar');
    expect(src).toContain('bookingRetryOpen.current && selected?.booking_config?.enabled');
  });

  it('la precarga del chunk del modal al abrir la ficha sigue (el toque no espera al chunk)', () => {
    expect(src).toContain("import('../components/BookingModal.jsx').catch");
  });
});
