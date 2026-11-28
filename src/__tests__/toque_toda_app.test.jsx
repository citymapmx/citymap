import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import {
  createTouchTap,
  touchTapProps,
  useTouchTapList,
} from '../lib/touchTap.js';
import SearchSuggestions from '../components/home/SearchSuggestions.jsx';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Toque en toda la app (27 nov 2026, cacería de bugs nº 1): el patrón
// de `touchTap.js` de la #488 (selector de ciudad) se reutiliza en el
// menú, los carruseles del inicio, antojos, búsqueda, /eventos,
// favoritos, agenda y notificaciones. Mismo handler, mismo aspecto:
// solo cambia que el toque que detiene el scroll con momentum ya no se
// pierde en iOS.

// Eventos táctiles falsos con la misma forma que los del navegador.
// `target` simula dónde empezó el dedo; `currentTarget` es la fila.
const rowEl = {};
const nestedBtnEl = {};
const targetOnRow = { closest: () => null };
const targetOnNestedBtn = { closest: () => nestedBtnEl };
const touchStart = (x, y, target = targetOnRow) => ({
  touches: [{ clientX: x, clientY: y }],
  target,
  currentTarget: rowEl,
});
const touchEnd = (x, y, target = targetOnRow) => ({
  changedTouches: [{ clientX: x, clientY: y }],
  target,
  currentTarget: rowEl,
});
const clickEvent = () => ({ preventDefault: vi.fn() });

describe('touchTapProps: el toque quieto activa y el clic posterior no duplica', () => {
  it('touchend con el dedo quieto activa una sola vez; el clic sintético que sigue se ignora', () => {
    const onActivate = vi.fn();
    const props = touchTapProps(createTouchTap(), onActivate);
    props.onTouchStart(touchStart(100, 200));
    props.onTouchEnd(touchEnd(100, 200));
    expect(onActivate).toHaveBeenCalledTimes(1);
    props.onClick(clickEvent());
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('la ventana de supresión caduca: a los 800 ms el clic ya no se ignora', () => {
    const onActivate = vi.fn();
    const tap = createTouchTap();
    const props = touchTapProps(tap, onActivate);
    props.onTouchStart(touchStart(100, 200));
    props.onTouchEnd(touchEnd(100, 200));
    expect(onActivate).toHaveBeenCalledTimes(1);
    // El clic inmediato se ignora…
    props.onClick(clickEvent());
    expect(onActivate).toHaveBeenCalledTimes(1);
    // …pero pasada la ventana (700 ms) el mismo clic ya pasaría: la
    // supresión no es permanente (el clic sin toque previo activa, ver
    // el test siguiente).
    expect(tap.shouldIgnoreClick(Date.now() + 800)).toBe(false);
  });

  it('sin toque previo, el clic activa (ratón y teclado)', () => {
    const onActivate = vi.fn();
    const props = touchTapProps(createTouchTap(), onActivate);
    props.onClick(clickEvent());
    expect(onActivate).toHaveBeenCalledTimes(1);
  });
});

describe('touchTapProps: el deslizamiento no activa', () => {
  it('deslizar más de 10 px (scroll) no activa y no suprime el clic siguiente', () => {
    const onActivate = vi.fn();
    const tap = createTouchTap();
    const props = touchTapProps(tap, onActivate);
    props.onTouchStart(touchStart(100, 200));
    props.onTouchEnd(touchEnd(100, 260));
    expect(onActivate).not.toHaveBeenCalled();
    expect(tap.shouldIgnoreClick()).toBe(false);
    props.onClick(clickEvent());
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('deslizar en horizontal tampoco activa', () => {
    const onActivate = vi.fn();
    const props = touchTapProps(createTouchTap(), onActivate);
    props.onTouchStart(touchStart(100, 200));
    props.onTouchEnd(touchEnd(160, 200));
    expect(onActivate).not.toHaveBeenCalled();
  });
});

describe('touchTapProps: controles anidados y anclas', () => {
  it('un toque que empieza sobre un botón anidado no activa la fila (el + del producto no abre el modal)', () => {
    const onActivate = vi.fn();
    const tap = createTouchTap();
    const props = touchTapProps(tap, onActivate, { ignoreNestedControls: true });
    props.onTouchStart(touchStart(100, 200, targetOnNestedBtn));
    props.onTouchEnd(touchEnd(100, 200, targetOnNestedBtn));
    expect(onActivate).not.toHaveBeenCalled();
  });

  it('sin la opción, el toque sobre la fila en sí sí activa', () => {
    const onActivate = vi.fn();
    const props = touchTapProps(createTouchTap(), onActivate, { ignoreNestedControls: true });
    props.onTouchStart(touchStart(100, 200));
    props.onTouchEnd(touchEnd(100, 200));
    expect(onActivate).toHaveBeenCalledTimes(1);
  });

  it('en un <a>, el clic suprimido también lleva preventDefault (si no, el navegador seguiría el href)', () => {
    const onActivate = vi.fn((e) => e.preventDefault());
    const props = touchTapProps(createTouchTap(), onActivate, { preventDefaultOnSuppress: true });
    props.onTouchStart(touchStart(100, 200));
    const touchEv = touchEnd(100, 200);
    touchEv.preventDefault = vi.fn();
    props.onTouchEnd(touchEv);
    expect(onActivate).toHaveBeenCalledTimes(1);
    const clickEv = clickEvent();
    props.onClick(clickEv);
    expect(onActivate).toHaveBeenCalledTimes(1);
    expect(clickEv.preventDefault).toHaveBeenCalled();
  });
});

describe('useTouchTapList: un tracker por fila que sobrevive a los re-renders', () => {
  it('el hook devuelve props con los cuatro handlers y no se rompe al renderizar', () => {
    let captured = null;
    function Probe() {
      const tapFor = useTouchTapList();
      captured = tapFor('fila-1', () => {});
      return <div />;
    }
    renderToStaticMarkup(<Probe />);
    expect(typeof captured.onClick).toBe('function');
    expect(typeof captured.onTouchStart).toBe('function');
    expect(typeof captured.onTouchEnd).toBe('function');
    expect(typeof captured.onTouchCancel).toBe('function');
  });

  it('dos filas distintas tienen trackers distintos: tocar una no suprime el clic de la otra', () => {
    // Dentro de un mismo registro, cada key tiene su propio tracker:
    // el toque en A suprime solo el clic de A; el clic de B pasa.
    const calls = { a: 0, b: 0 };
    function Probe() {
      const tapFor = useTouchTapList();
      const pa = tapFor('fila-a', () => { calls.a += 1; });
      const pb = tapFor('fila-b', () => { calls.b += 1; });
      pa.onTouchStart(touchStart(100, 200));
      pa.onTouchEnd(touchEnd(100, 200));
      pa.onClick(clickEvent());
      pb.onClick(clickEvent());
      return <div />;
    }
    renderToStaticMarkup(<Probe />);
    // A se activa UNA vez (por el touchend); el clic que sigue se
    // suprime y no suma. Sin supresión serían 2. B se activa por su
    // clic, sin que el toque en A le afecte.
    expect(calls.a).toBe(1);
    expect(calls.b).toBe(1);
  });
});

// Cableado: cada sitio del alcance usa el helper compartido, sin
// duplicarlo, y el `onClick` solo ya no está en la fila.
const sites = [
  ['menú: fila de producto', '../components/store/BusinessStore.jsx', 'tapFor(`${cat.id}:${product.id}`, openProduct, { ignoreNestedControls: true })'],
  ['menú: pestaña de categoría', '../components/store/BusinessStore.jsx', 'tapFor(`tab-${cat.id}`, activateTab)'],
  ['inicio: tarjeta cuadrada', '../components/home/SquareCarousel.jsx', 'tapFor(b.id, () => handleCardTap(b))'],
  ['inicio: círculo de antojo', '../components/home/AntojosSection.jsx', 'tapFor(`antojo-${g.id}`, () => setSelectedId(g.id))'],
  ['inicio: fila de lugar de antojo', '../components/home/AntojosSection.jsx', 'tapFor(`lugar-${b.id}`, () => onSelect?.(b))'],
  ['inicio: tarjeta TopImperdibles', '../components/home/TopImperdibles.jsx', 'preventDefaultOnSuppress: true'],
  ['inicio: tarjeta TopLugaresIncreibles', '../components/home/TopLugaresIncreibles.jsx', 'preventDefaultOnSuppress: true'],
  ['búsqueda: sugerencia', '../components/home/SearchSuggestions.jsx', 'tapFor(business.id, () => onSelect(business))'],
  ['eventos: tarjeta de /eventos', '../views/EventsView.jsx', 'tapFor(ev.id, () => handleEventTap(ev))'],
  ['muro: tarjeta de ciudad', '../views/GlobalHomeView.jsx', 'tapFor(`ciudad-${city.slug}`, () => navigate(`/${city.slug}`))'],
  ['muro: tarjeta de tour', '../views/GlobalHomeView.jsx', 'tapFor(`tour-${tour.id}`'],
  ['muro: tarjeta de guía', '../views/GlobalHomeView.jsx', 'tapFor(`guia-${exp.id}`'],
  ['favoritos: tarjeta de colección', '../views/FavsView.jsx', 'ignoreNestedControls: true'],
  ['favoritos: tarjeta de agenda', '../components/favoritos/AgendaEventos.jsx', 'tapFor(ev.id, () => onOpen(ev), { ignoreNestedControls: true })'],
  ['notificaciones: fila', '../components/UserNotifs.jsx', 'tapFor(n.id, () => handleTap(n), { ignoreNestedControls: true })'],
];

describe('cableado: todos los sitios usan el helper compartido', () => {
  it('touchTap.js exporta el helper y no hay un segundo createTouchTap en el repo', () => {
    const helper = read('../lib/touchTap.js');
    expect(helper).toContain('export function touchTapProps');
    expect(helper).toContain('export function useTouchTap(');
    expect(helper).toContain('export function useTouchTapList');
    expect(helper.match(/function createTouchTap/g)).toHaveLength(1);
  });

  it.each(sites)('%s usa useTouchTapList', (_label, path, snippet) => {
    const src = read(path);
    expect(src).toContain("useTouchTapList");
    expect(src).toContain(snippet);
  });

  it('el menú no abre el modal al tocar el stepper: el contenedor lleva data-touch-tap-ignore', () => {
    const src = read('../components/store/BusinessStore.jsx');
    expect(src).toContain('data-touch-tap-ignore');
  });

  it('ninguna fila tocada conserva su onClick solo original', () => {
    expect(read('../components/home/SquareCarousel.jsx')).not.toContain('onClick={() => handleCardTap(b)}');
    expect(read('../components/home/AntojosSection.jsx')).not.toContain('onClick={() => setSelectedId(g.id)}');
    expect(read('../components/home/AntojosSection.jsx')).not.toContain('onClick={() => onSelect?.(b)}');
    expect(read('../components/home/SearchSuggestions.jsx')).not.toContain('onClick={() => onSelect(business)}');
    expect(read('../views/EventsView.jsx')).not.toContain('onClick={() => handleEventTap(ev)}');
    expect(read('../components/favoritos/AgendaEventos.jsx')).not.toContain('onClick={() => onOpen(ev)}');
    expect(read('../components/UserNotifs.jsx')).not.toContain('onClick={() => handleTap(n)}');
  });
});

describe('SearchSuggestions: se sigue pintando igual', () => {
  it('las 5 sugerencias se pintan con su nombre y categoría', () => {
    const T = { border: '#eee', white: '#fff', card: '#fff', text: '#111', sub: '#666' };
    const results = [
      { id: '1', name: 'Café Benito', category: 'café', photos: [], lat: 20.6, lng: -103.4 },
      { id: '2', name: 'Tacos Luis', category: 'tacos', photos: [], lat: 20.7, lng: -103.3 },
    ];
    const html = renderToStaticMarkup(
      <SearchSuggestions results={results} cats={[]} userCoords={{ lat: 20.6, lng: -103.4 }} onSelect={() => {}} onViewAll={() => {}} T={T} />,
    );
    expect(html).toContain('Café Benito');
    expect(html).toContain('Tacos Luis');
  });
});
