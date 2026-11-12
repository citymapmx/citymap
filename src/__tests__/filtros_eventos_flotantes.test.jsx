import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// PR #217: la tarjeta «Filtros de eventos» deja de ser una hoja anclada
// abajo y pasa a ser un modal flotante centrado con las 4 esquinas
// redondeadas (mismo patrón que la tarjeta para compartir, PR #147):
// el overlay la centra, el panel lleva fondo, borde y sombra, y anima
// con scale-in-center como una sola pieza. Sin tirador: es un affordance
// de bottom sheet. El contenido y el comportamiento no cambian.
describe('filtros de eventos flotantes', () => {
  const view = read('../views/EventsView.jsx');
  // El overlay vive en `const filterOverlay` (antes del return) y el
  // return solo decide si se monta con portal o en línea. El recorte
  // llega solo hasta el `return` del componente: más abajo hay un
  // `position: "sticky"` de la lista de eventos que no es la tarjeta.
  const sheetStart = view.indexOf('const filterOverlay = (');
  const sheetEnd = view.indexOf('\n  return (', sheetStart);
  const sheet = view.slice(sheetStart, sheetEnd);

  it('la tarjeta se monta con portal en document.body (centrada en la ventana)', () => {
    // Misma causa raíz que el detalle de la tarjeta de lealtad (12 nov
    // 2026): la raíz de EventsView lleva `...viewStyle` con
    // `transform: translateY(0)` persistente, así que el overlay fixed
    // se centraba en toda la página larga en vez de en la ventana.
    expect(view).toContain("import { createPortal } from 'react-dom'");
    expect(view).toContain('createPortal(filterOverlay, document.body)');
    // Sin document (SSR/pruebas) se pinta en línea, nunca se rompe.
    expect(view).toContain("typeof document === 'undefined'");
    // El overlay sigue siendo el fixed centrado de siempre; el portal
    // es lo que lo ancla a la ventana.
    expect(sheet).toContain('position: "fixed"');
    expect(sheet).toContain('alignItems: "center"');
    expect(sheet).toContain('justifyContent: "center"');
  });

  it('la tarjeta es un modal flotante centrado, no una hoja inferior', () => {
    // El overlay centra la tarjeta (antes la anclaba abajo con
    // position absolute + bottom: 0): el bloque del overlay es el que
    // tiene position fixed y centra en los dos ejes.
    expect(sheet).not.toContain('alignItems: "flex-end"');
    const overlay = sheet.match(/position: "fixed",[\s\S]{0,400}alignItems: "([^"]+)"/);
    expect(overlay).not.toBeNull();
    expect(overlay[1]).toBe('center');
    expect(sheet).toContain('justifyContent: "center"');
    // Padding horizontal para que la tarjeta flote sin tocar los bordes.
    expect(sheet).toContain('padding: "0 16px"');
    // El panel tiene las 4 esquinas redondeadas (antes solo las dos de
    // arriba, como bottom sheet) y ancho centrado con tope.
    expect(sheet).toContain('borderRadius: 24,');
    expect(sheet).not.toContain('borderRadius: "24px 24px 0 0"');
    expect(sheet).toContain('width: "calc(100vw - 32px)"');
    expect(sheet).toContain('maxWidth: 460,');
    // Sin anclaje abajo ni tirador de bottom sheet (la barrita de 40×4).
    expect(view).not.toContain('bottom: 0');
    expect(view).not.toContain('width: 40, height: 4');
    // La animación es scale-in-center, la de las tarjetas flotantes,
    // y va en el panel que lleva fondo, borde redondeado y sombra.
    expect(sheet).toContain('className="scale-in-center"');
    expect(view).not.toContain('sheetUp');
    // El panel sigue acotado en altura y con cierre por fuera (X y
    // tocar el fondo oscuro).
    expect(sheet).toContain('maxHeight: "92dvh"');
    expect(sheet).toContain('overflowY: "auto"');
    expect(sheet).toContain('boxShadow: "0 24px 48px rgba(0,0,0,0.2)"');
  });

  it('el contenido y el comportamiento no cambian', () => {
    // Mismos controles: fecha (con personalizada), precio y orden.
    expect(sheet).toContain('eventos_fecha');
    expect(sheet).toContain('eventos_fecha_personalizada');
    expect(sheet).toContain('eventos_precio');
    expect(sheet).toContain('eventos_ordenar_por');
    expect(sheet).toContain('DATE_FILTERS');
    expect(sheet).toContain('PRICE_FILTERS');
    // Botones: aplicar y limpiar, en flujo normal al final del panel
    // (nada fijo ni sticky: todo el panel hace scroll junto y los
    // botones nunca quedan cortados por el borde de la pantalla).
    expect(sheet).toContain('eventos_mostrar_eventos');
    expect(sheet).toContain('eventos_limpiar_filtros');
    expect(sheet).toContain('applySheet');
    expect(sheet).toContain('clearFilters');
    expect(sheet).not.toContain("position: 'sticky'");
    expect(sheet).not.toContain('position: "sticky"');
    // Cierre: botón X y tocar fuera del panel.
    expect(sheet).toContain('eventos_cerrar_filtros');
    expect(sheet).toContain('setSheetOpen(false)');
    expect(sheet).toContain('stopPropagation');
  });
});
