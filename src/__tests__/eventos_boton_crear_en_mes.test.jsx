import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// PR #224: se quita el encabezado «Próximos eventos en {ciudad}» de la
// sección Eventos y el botón «+ Crear evento» baja a la fila del mes,
// a la derecha de «Noviembre 2026 • 47 eventos», como en la captura de
// Jonathan. Solo en el primer mes; los demás meses quedan como antes.
// Sin sesión el botón no aparece, igual que antes. Lo demás no cambia:
// subtítulo, buscador, categorías, tarjetas y «Ver más eventos».
describe('eventos: sin título «Próximos eventos» y botón Crear en el mes', () => {
  const view = read('../views/EventsView.jsx');
  const monthStart = view.indexOf('monthGroups.map(');
  const monthBlock = view.slice(monthStart);

  it('el encabezado «Próximos eventos en {ciudad}» ya no existe', () => {
    // Ni el h2 ni sus claves de traducción quedan en la vista. La única
    // aparición de «Próximos eventos» que se conserva es la opción de
    // orden del panel de filtros (eventos_orden_fecha), que no es el
    // encabezado.
    expect(view).not.toContain('eventos_proximos');
    expect(view).not.toContain('eventos_en", "en"');
    expect(view).not.toContain('eventos_total');
    expect(view).toContain('eventos_orden_fecha');
  });

  it('el botón «Crear evento» vive en el encabezado del primer mes', () => {
    // El botón está dentro del map de meses, a la derecha del título
    // del mes y su contador (fila con space-between), con el mismo
    // estilo de píldora y el mismo onClick que tenía arriba.
    expect(monthBlock).toContain('crear_evento');
    expect(monthBlock).toContain('setShowCreateEvent(true)');
    expect(monthBlock).toContain('justifyContent: "space-between"');
    expect(monthBlock).toContain('background: T.green');
    expect(monthBlock).toContain('borderRadius: 9999');
    expect(monthBlock).toContain('name="plus"');
    // Solo hay un botón que abre el modal de crear evento en toda la
    // vista: el del primer mes.
    expect(view.match(/setShowCreateEvent\(true\)/g)).toHaveLength(1);
  });

  it('el botón solo aparece en el primer mes y solo con sesión', () => {
    // La guarda es explícita: usuario con sesión Y primer grupo.
    expect(monthBlock).toContain('user && monthIndex === 0');
    expect(view).toContain('monthGroups.map((group, monthIndex)');
    // El título del mes y su contador siguen en la fila, a la izquierda.
    expect(monthBlock).toContain('{group.label}');
    expect(monthBlock).toContain('monthTotal.get(group.key)');
  });

  it('lo demás de la sección no cambia', () => {
    // Subtítulo con la ciudad, buscador, piedras de categorías,
    // tarjetas y «Ver más eventos» siguen ahí.
    expect(view).toContain('planes_subtitulo');
    expect(view).toContain('eventos_buscar_placeholder');
    expect(view).toContain('availableCategoryChips');
    expect(view).toContain('eventos_ver_mas_eventos');
    expect(view).toContain('event-list-grid');
  });
});
