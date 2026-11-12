import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// 11 nov 2026 (Jonathan): el guardado de Calamaro desde la LISTA de
// eventos nunca llegó al servidor (tabla event_favorites verificada vacía
// 4 veces por SQL) aunque quitó y puso el corazón varias veces. Causa
// raíz: el corazón de la lista (EventsView.jsx, handleToggleSaveEvent)
// actualizaba savedEventIds + localStorage pero NO llamaba a
// toggleSaveEvent y NO sincronizaba a event_favorites. Solo lo hacían
// el toggleSaveEvent de App.jsx (muro global y, desde el #216, el detalle
// del evento) y el backfill al entrar. Este PR hace que la lista use ese
// mismo toggleSaveEvent, sin duplicar escrituras.
describe('lista de eventos: el corazón sincroniza con el servidor', () => {
  const listSrc = read('../views/EventsView.jsx');
  const appSrc = read('../App.jsx');
  // El cuerpo de toggleSaveEvent en App.jsx, para afirmar sobre él y no
  // sobre otra parte del archivo.
  const toggleFn = appSrc.slice(
    appSrc.indexOf('const toggleSaveEvent = (id, e) => {'),
    appSrc.indexOf('const homeHighlights'),
  );

  it('la lista saca toggleSaveEvent del contexto (el mismo del muro y el detalle)', () => {
    expect(listSrc).toContain('savedEventIds, toggleSaveEvent, events');
    expect(listSrc).toContain('} = ctx;');
  });

  it('el corazón de la lista delega en toggleSaveEvent', () => {
    const handler = listSrc.slice(
      listSrc.indexOf('const handleToggleSaveEvent'),
      listSrc.indexOf('return (', listSrc.indexOf('const handleToggleSaveEvent')),
    );
    expect(handler).toContain('toggleSaveEvent?.(ev.id, e)');
    // El corazón de la tarjeta sigue conectado a este handler.
    expect(listSrc).toContain('onToggle={e => handleToggleSaveEvent(ev, e)}');
    // Y sigue leyendo el mismo estado que el detalle y el muro.
    expect(listSrc).toContain('savedEventIds.includes(ev.id)');
  });

  it('sin doble escritura: la lista ya no escribe estado ni localStorage por su cuenta', () => {
    expect(listSrc).not.toContain('setSavedEventIds');
    expect(listSrc).not.toContain('cg_saved_ev');
    // (El nombre de la tabla sí aparece en el comentario del handler,
    // que documenta a dónde escribe el toggle de App.jsx.)
    expect(listSrc).not.toContain("sb.upsert");
    expect(listSrc).not.toContain("sb.delWhere2");
  });

  it('sin sesión, el toque pide iniciar sesión (el gate vive en toggleSaveEvent)', () => {
    // La lista ya no tiene su propio gate: lo pone el toggle de App.jsx.
    expect(listSrc).not.toContain('setShowAuth');
    expect(toggleFn).toMatch(/if \(!user\) \{ setShowAuth\(true\); return; \}/);
  });

  it('al guardar escribe en event_favorites y al quitar borra la fila', () => {
    expect(toggleFn).toContain("sb.upsert('event_favorites'");
    expect(toggleFn).toContain("sb.delWhere2('event_favorites'");
    // Y sigue actualizando el estado y localStorage (una sola vez, ahí).
    expect(toggleFn).toContain('setSavedEventIds(nw)');
    expect(toggleFn).toContain("localStorage.setItem('cg_saved_ev', JSON.stringify(nw))");
    expect(toggleFn).toContain("'Evento guardado'");
    expect(toggleFn).toContain("'Evento eliminado de guardados'");
  });

  it('el backfill al entrar sigue intacto (no se tocó en este PR)', () => {
    expect(appSrc).toContain('const loadSavedEvents = useCallback(async (uid) => {');
    expect(appSrc).toContain("sb.get('event_favorites'");
    expect(appSrc).toContain("const union = [...new Set([...serverIds, ...localIds])];");
  });
});
