import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { smoothScrollIntoView, prefersReducedMotion } from '../lib/smoothScroll.js';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// "Ver más" brusco + pósters con bandas grises (nov 2026, capturas de
// Jonathan): al tocar "Ver 5 más" la lista crecía de 5 a 10 de golpe y la
// pantalla no se movía; en /eventos las tarjetas solo-imagen mostraban el
// póster completo con bandas grises arriba y abajo (contain a propósito:
// con cover se recortaba a 5:7 y se perdía el texto de los lados). PR
// #153 (10 nov, decisión de Jonathan con capturas): la foto LLENA la
// tarjeta con cover, sin fondo difuminado — la regla del PR #132
// (contain + fondo difuminado) queda anulada.
describe('desplazamiento suave al expandir', () => {
  it('smoothScrollIntoView desliza suave hasta el elemento', () => {
    const calls = [];
    const el = { scrollIntoView: (opts) => calls.push(opts) };
    smoothScrollIntoView(el);
    expect(calls).toEqual([{ behavior: 'smooth', block: 'nearest' }]);
    smoothScrollIntoView(el, 'start');
    expect(calls[1]).toEqual({ behavior: 'smooth', block: 'start' });
  });

  it('con "reducir movimiento" el desplazamiento es instantáneo', () => {
    const prevWindow = globalThis.window;
    globalThis.window = { matchMedia: () => ({ matches: true }) };
    try {
      expect(prefersReducedMotion()).toBe(true);
      const calls = [];
      smoothScrollIntoView({ scrollIntoView: (opts) => calls.push(opts) });
      expect(calls).toEqual([{ behavior: 'auto', block: 'nearest' }]);
    } finally {
      if (prevWindow === undefined) delete globalThis.window;
      else globalThis.window = prevWindow;
    }
  });

  it('sin elemento no hace nada (no rompe)', () => {
    expect(() => smoothScrollIntoView(null)).not.toThrow();
    expect(() => smoothScrollIntoView({})).not.toThrow();
  });

  it('HomeTopGrids desliza hasta la primera tarjeta nueva al expandir, no al contraer', () => {
    const src = read('../components/home/HomeTopGrids.jsx');
    // La 6ª tarjeta (índice 5) es la primera nueva al pasar de 5 a 10.
    expect(src).toContain('index === 5 ? firstNewFavRef');
    expect(src).toContain('if (index === 5) firstNewRatedRef.current = el;');
    // Solo al pasar de contraído a expandido: al contraer no se desplaza.
    expect(src).toContain('if (showMoreTopFavs && !prevShowMoreTopFavs.current)');
    expect(src).toContain('if (showMoreTopRated && !prevShowMoreTopRated.current)');
    expect(src).toContain("smoothScrollIntoView(firstNewFavRef.current, 'nearest')");
    expect(src).toContain("smoothScrollIntoView(firstNewRatedRef.current, 'nearest')");
  });

  it('la lista de categoría desliza con scrollToIndex hasta el primer índice nuevo', () => {
    const home = read('../views/HomeView.jsx');
    expect(home).toContain('ref={virtuosoRef}');
    expect(home).toContain("virtuosoRef.current?.scrollToIndex({ index: pending.index, align: 'start', behavior:");
    // El botón sigue cargando la siguiente tanda de 20 y guarda desde dónde.
    expect(home).toContain('categoryLoadMoreRef.current = { index: finalDisplayList.length, key: categoryListKey }');
    expect(home).toContain('loadPaginatedBiz(false)');
    // Sin autollenado al bajar (sigue siendo solo el botón).
    expect(home).not.toContain('endReached');
  });

  it('EventsView desliza hasta el primer evento nuevo al tocar "Ver más eventos"', () => {
    const src = read('../views/EventsView.jsx');
    expect(src).toContain('data-event-id={ev.id}');
    expect(src).toContain('pendingEventScrollRef.current = filteredEvents[visibleCount]?.id');
    expect(src).toContain('querySelector?.(`[data-event-id="${id}"]`)');
    expect(src).toContain("smoothScrollIntoView(el, 'nearest')");
    // La paginación no cambia: tandas de 20.
    expect(src).toContain('setVisibleCount(c => c + PAGE_SIZE)');
  });
});

describe('póster de evento llena la tarjeta (PR #153)', () => {
  it('la tarjeta ya no tiene capa de fondo difuminada', () => {
    const src = read('../views/EventsView.jsx');
    // Sin capa de fondo con la misma imagen: ni blur ni escala.
    expect(src).not.toContain("filter:'blur(24px) brightness(0.85)'");
    expect(src).not.toContain("transform:'scale(1.15)'");
    expect(src).not.toContain('getThumbUrl(imgSrc, 600)');
  });

  it('el póster llena la tarjeta con cover (sin bandas, sin contain)', () => {
    const src = read('../views/EventsView.jsx');
    expect(src).toContain("objectFit:'cover'");
    expect(src).not.toContain("objectFit:'contain'");
    // El póster queda por encima del fondo de la tarjeta.
    expect(src).toContain("objectFit:'cover', zIndex:1");
  });

  it('la píldora de fecha y el corazón siguen por encima, y sin imagen sigue el fallback', () => {
    const src = read('../views/EventsView.jsx');
    expect(src).toContain('EventPosterFallback');
    expect(src).toContain("top:8, left:8, zIndex:2");
    // El corazón está fuera del contenedor de la imagen, con zIndex 2
    // (ahora va en el buttonStyle de SaveHeartButton, con espacios).
    expect(src).toContain("top: 6, right: 6, width: 44, height: 44");
  });
});
