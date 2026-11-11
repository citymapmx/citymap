// Desvanecido en filas horizontales (PR #190): la verificación en vivo
// del #189 encontró dos filas que se seguían cortando a media palabra
// sin desvanecido — la fila de categorías de /tepic («Punt») y la 4.ª
// tarjeta de cada sección por ciudad en /tours — porque el
// `.scroll-fade-x` del #189 no las cubría. Estas pruebas fijan que la
// clase esté en esas dos filas y en el resto de filas horizontales
// de contenido de la app, con el mismo patrón del #189.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const count = (src, needle) => src.split(needle).length - 1;

describe('desvanecido .scroll-fade-x', () => {
  it('la clase existe en index.css con el velo de 48 px', () => {
    const css = read('../index.css');
    expect(css).toContain('.scroll-fade-x');
    expect(css).toContain('calc(100% - 48px)');
  });

  it('la fila de categorías de /tepic lleva el desvanecido (el defecto 1)', () => {
    const src = read('../components/home/HomeHero.jsx');
    expect(src).toContain('home-category-track scroll-fade-x');
  });

  it('las filas de tarjetas por ciudad de /tours llevan el desvanecido (el defecto 2)', () => {
    const src = read('../components/ToursView.jsx');
    // 2 usos: la fila de píldoras de ciudad (del #189) y la fila de
    // tarjetas por ciudad (este PR).
    expect(count(src, 'scroll-fade-x')).toBe(2);
  });

  it('las filas de inicio llevan el desvanecido', () => {
    const home = read('../views/HomeView.jsx');
    // Eventos de búsqueda, barra de subcategorías, sorteos y cupones.
    expect(count(home, 'scroll-fade-x')).toBe(4);
    // La barra de subcategorías solo lleva el velo cuando puede
    // desbordar: con 3 o menos va centrada y no hay nada que deslizar.
    expect(home).toContain('availableSubcats.length > 3 ? "no-scrollbar scroll-fade-x" : "no-scrollbar"');
    const global = read('../views/GlobalHomeView.jsx');
    // 3 filas del #189 + 4 esqueletos + fila de ciudades.
    expect(count(global, 'scroll-fade-x')).toBe(8);
  });

  it('las filas de detalle, mapa y viajes llevan el desvanecido', () => {
    expect(count(read('../views/DetailView.jsx'), 'scroll-fade-x')).toBe(3);
    expect(read('../views/MapView.jsx')).toContain('scroll-fade-x');
    expect(read('../components/TripsView.jsx')).toContain('scroll-fade-x');
    expect(read('../components/ExperienceViewer.jsx')).toContain('scroll-fade-x');
    expect(read('../components/modals/EventDetailModal.jsx')).toContain('scroll-fade-x');
    expect(read('../components/BookingModal.jsx')).toContain('scroll-fade-x');
    expect(read('../App.jsx')).toContain('scroll-fade-x');
  });

  it('las filas de tienda y la tira de miniaturas llevan el desvanecido', () => {
    expect(read('../components/store/BusinessStore.jsx')).toContain('scroll-fade-x');
    expect(read('../components/store/StorePromotions.jsx')).toContain('scroll-fade-x');
    expect(read('../components/store/NoMenuLanding.jsx')).toContain('scroll-fade-x');
    // La tira de miniaturas de la galería solo lleva el velo cuando
    // desborda: con 5 o menos va centrada.
    const gallery = read('../components/Gallery.jsx');
    expect(gallery).toContain('total > 5 ? "scroll-fade-x" : undefined');
  });
});
