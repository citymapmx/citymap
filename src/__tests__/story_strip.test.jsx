import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

afterEach(() => {
  vi.restoreAllMocks();
});

// Tira tipo historias (PR #148) para «Lugares increíbles» y
// «Restaurantes que debes conocer» del inicio: un lugar a la vez, rota
// sola cada 4 s, barras de progreso, zoom lento y arranque al azar.
const T = { border: '#E5E7EB', text: '#0F1A14' };
const t = (k, fb) => fb;
const cityName = (slug) => ({ guadalajara: 'Guadalajara', tlaquepaque: 'Tlaquepaque', chapala: 'Chapala', tepic: 'Tepic' }[slug] || '');

function makeItems(n) {
  return Array.from({ length: n }, (_, k) => ({
    key: `p-${k}`,
    kind: 'lugares',
    title: `Lugar ${k}`,
    img: `https://ejemplo.com/foto-${k}.webp`,
    citySlug: ['guadalajara', 'tlaquepaque', 'chapala', 'tepic'][k % 4],
    raw: { id: k },
  }));
}

async function renderStrip(items, opts = {}) {
  const React = (await import('react')).default;
  const { renderToStaticMarkup } = await import('react-dom/server');
  const StoryStrip = (await import('../components/home/StoryStrip.jsx')).default;
  return renderToStaticMarkup(
    <StoryStrip
      items={items}
      T={T}
      t={t}
      onSelect={() => {}}
      isSaved={() => false}
      onToggleSave={() => {}}
      cityName={cityName}
      ratingFor={opts.ratingFor || (() => ({ rating: 4.5, count: 4569 }))}
    />,
  );
}

describe('tira tipo historias (PR #148)', () => {
  const strip = read('../components/home/StoryStrip.jsx');
  const css = read('../index.css');
  const global = read('../views/GlobalHomeView.jsx');

  it('pinta la tarjeta activa con su nombre, ciudad y calificación', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // índice 2 de 4
    const html = await renderStrip(makeItems(4));
    expect(html).toContain('Lugar 2');
    expect(html).toContain('Chapala');
    expect(html).toContain('★ 4.5 (4,569)');
    expect(html).toContain('https://ejemplo.com/foto-2.webp');
    // Solo se pinta la tarjeta activa, no toda la lista.
    expect(html).not.toContain('Lugar 0');
    expect(html).not.toContain('Lugar 1');
  });

  it('un segmento de progreso por lugar; el activo se llena en 4 s', async () => {
    const html = await renderStrip(makeItems(4));
    expect(html).toContain('Ir al lugar 1 de 4');
    expect(html).toContain('Ir al lugar 2 de 4');
    expect(html).toContain('Ir al lugar 3 de 4');
    expect(html).toContain('Ir al lugar 4 de 4');
    expect(html).toContain('story-progress-fill');
    expect(strip).toContain('STORY_MS = 4000');
    expect(css).toContain('@keyframes story-progress-fill');
    expect(css).toContain('animation: story-progress-fill 4s linear');
  });

  it('el índice inicial es aleatorio: otro arranque, otro lugar activo', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0); // índice 0 de 4
    expect(await renderStrip(makeItems(4))).toContain('Lugar 0');
    vi.spyOn(Math, 'random').mockReturnValue(0.99); // índice 3 de 4
    expect(await renderStrip(makeItems(4))).toContain('Lugar 3');
    expect(strip).toContain('Math.floor(Math.random() * total)');
  });

  it('flechas para avanzar/retroceder a mano sin abrir el detalle', async () => {
    const html = await renderStrip(makeItems(4));
    expect(html).toContain('Anterior');
    expect(html).toContain('Siguiente');
    expect(html).toContain('‹');
    expect(html).toContain('›');
    // Sin flechas con un solo lugar.
    expect(await renderStrip(makeItems(1))).not.toContain('Anterior');
  });

  it('el corazón de guardar sigue presente (mismo comportamiento)', async () => {
    const html = await renderStrip(makeItems(2));
    expect(html).toContain('Guardar');
    expect(strip).toContain('SaveHeartButton');
    expect(strip).toContain('onToggleSave');
  });

  it('auto-avance cada 4 s, pausado con pestaña oculta o movimiento reducido', () => {
    expect(strip).toContain('window.setTimeout');
    expect(strip).toContain('STORY_MS');
    expect(strip).toContain("document.addEventListener('visibilitychange', onVis)");
    expect(strip).toContain('prefersReducedMotion()');
    expect(strip).toContain('canAutoplay = total > 1 && !reduceMotion && !paused');
    // El CSS apaga el zoom y el llenado con movimiento reducido.
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('.story-kenburns');
    expect(reduced).toContain('.story-progress-fill');
  });

  it('zoom lento solo en la foto activa (kenburns 1 → 1.08 en 4 s)', () => {
    expect(strip).toContain('className="story-kenburns"');
    expect(css).toContain('@keyframes story-kenburns');
    const kb = css.slice(css.indexOf('@keyframes story-kenburns'));
    expect(kb).toContain('scale(1.08)');
    expect(css).toContain('animation: story-kenburns 4s linear');
  });

  it('la tira es más baja que la fila actual y topa el grupo a 12 lugares', async () => {
    // La fila medía 168 px de alto; la tarjeta panorámica está topada
    // (140 px en teléfono, 240 px como máximo en escritorio).
    expect(strip).toContain("height: 'clamp(140px, 36vw, 240px)'");
    // Con 15 lugares solo hay 12 segmentos (restaurantes son 128 en la
    // base: con todos, las barras serían ilegibles).
    const html = await renderStrip(makeItems(15));
    expect(html).toContain('Ir al lugar 12 de 12');
    expect(html).not.toContain('Ir al lugar 13 de');
    expect(strip).toContain('STORY_MAX_ITEMS = 12');
  });

  it('sin lugares no pinta nada; sin foto sale el marcador', async () => {
    expect(await renderStrip([])).toBe('');
    expect(await renderStrip(null)).toBe('');
    const noPhoto = await renderStrip([{ key: 'x', kind: 'lugares', title: 'Sin foto', img: null, citySlug: 'tepic', raw: {} }]);
    expect(noPhoto).toContain('Sin foto');
    expect(noPhoto).toContain('📍');
  });

  it('GlobalHomeView usa la tira en las dos secciones y quitó las filas', () => {
    expect(global).toContain("import StoryStrip from '../components/home/StoryStrip.jsx'");
    expect(global).toContain('<StoryStrip items={placesList}');
    expect(global).toContain('<StoryStrip items={restaurantsList}');
    expect(global).toContain('home_lugares_increibles');
    expect(global).toContain('home_restaurantes_conocer');
    // Las filas con scroll horizontal y su paginación ya no existen.
    expect(global).not.toContain('onRowScroll');
    expect(global).not.toContain('renderCard');
    expect(global).not.toContain('placesShown');
    expect(global).not.toContain('restShown');
    expect(global).not.toContain('SECTION_STEP');
  });
});
