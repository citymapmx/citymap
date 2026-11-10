import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Corazón al guardar (demo #1) + entrada en cascada del lote inicial
// (demo #2) de "15 animaciones para citymap", elegidas por Jonathan, nov
// 2026. La #1 es el pop único + el estallido pequeño de 10 chispitas de
// la demo; NO el confeti grande de celebración de la #15 (Jonathan:
// «No el 15»). El diseño actual no cambia: solo se añaden animaciones.
describe('corazon al guardar + cascada del lote inicial', () => {
  const css = read('../index.css');
  const heart = read('../components/ui/SaveHeartButton.jsx');
  const saveBurst = read('../hooks/useSaveBurst.js');
  const cascade = read('../lib/cascade.js');
  const card = read('../components/cards/BusinessCard.jsx');
  const events = read('../views/EventsView.jsx');
  const detail = read('../views/DetailView.jsx');
  const global = read('../views/GlobalHomeView.jsx');
  const home = read('../views/HomeView.jsx');
  const grids = read('../components/home/HomeTopGrids.jsx');
  const trips = read('../components/TripsView.jsx');

  it('heart pop: single pop 0.4 -> 1.35 -> 1 in 0.45 s, only on save', () => {
    // Animista heartbeat late en bucle infinito; aquí el pop es UNA sola
    // vez al guardar, con los valores de la demo.
    const pop = css.slice(css.indexOf('@keyframes heart-pop-once'));
    expect(pop).toContain('transform: scale(0.4)');
    expect(pop).toContain('transform: scale(1.35)');
    expect(pop).toContain('transform: scale(1)');
    expect(css).toContain('animation: heart-pop-once 0.45s');
    expect(css).not.toContain('heart-pop-once 0.45s ease-in-out infinite');
    // La clave del estallido solo cambia en la transición
    // no-guardado -> guardado; al quitar no cambia nada.
    expect(saveBurst).toContain('if (!prevRef.current && isFav) setBurstKey');
    expect(heart).toContain('className={burstKey ? "heart-pop-once" : undefined}');
  });

  it('heart burst: 10 sparks (0.65 s) and NO big #15 confetti', () => {
    const sparks = heart.slice(heart.indexOf('const SPARK_COLORS = ['), heart.indexOf('];', heart.indexOf('const SPARK_COLORS = [')));
    expect(sparks.split(',').length).toBe(10);
    expect(heart).toContain('className="heart-spark"');
    expect(css).toContain('@keyframes heart-spark-fly');
    expect(css).toContain('animation: heart-spark-fly 0.65s');
    // Jonathan: «No el 15» — nada del confeti grande de celebración:
    // ni piezas de confeti en el componente ni su CSS.
    expect(heart).not.toContain('heart-confetti');
    expect(heart).not.toContain('CONFETTI');
    expect(css).not.toContain('heart-confetti');
    expect(css).not.toContain('heart-confetti-fly');
    // El estallido no mueve el layout: capa absoluta sin eventos.
    expect(css).toContain('.heart-burst');
    expect(css).toContain('pointer-events: none');
  });

  it('all save hearts use the shared SaveHeartButton', () => {
    expect(card).toContain('SaveHeartButton');
    expect(events).toContain('SaveHeartButton');
    expect(detail).toContain('SaveHeartButton');
    expect(global).toContain('SaveHeartButton');
    // La ficha ya no salta con resorte al quitar: el pop es solo al guardar.
    expect(detail).not.toContain("key={favIds.includes(selected.id) ? 'fav' : 'unfav'}");
  });

  it('cascade: fade-in-bottom keyframes + staggered delay with cap', () => {
    expect(css).toContain('.cascade-in');
    const keyframes = css.slice(css.indexOf('@keyframes cascade-in'));
    expect(keyframes).toContain('transform: translateY(22px)');
    expect(keyframes).toContain('transform: translateY(0)');
    expect(keyframes).toContain('opacity: 0');
    expect(keyframes).toContain('opacity: 1');
    expect(css).toContain('animation: cascade-in 0.55s cubic-bezier(0.390, 0.575, 0.565, 1.000) both');
    // Retraso escalonado ~0.13 s por tarjeta, tope 0.6 s.
    expect(cascade).toContain('CASCADE_STEP_S = 0.13');
    expect(cascade).toContain('CASCADE_MAX_DELAY_S = 0.6');
    expect(home).toContain('cascadeDelayS(index)');
    expect(events).toContain('cascadeDelayS(i)');
    expect(grids).toContain('cascadeDelayS(index)');
    expect(trips).toContain('cascadeDelayS(idx)');
  });

  it('cascade: only the initial batch; the "Ver más" batch keeps scale-in-ver-top', () => {
    // El ternario pone scale-in-ver-top primero: el lote nuevo nunca
    // entra en cascada.
    expect(home).toContain("isNewBatch ? 'scale-in-ver-top' : isInitialBatch ? 'cascade-in' : undefined");
    expect(home.split("isNewBatch ? 'scale-in-ver-top'").length - 1).toBe(2); // Virtuoso + búsqueda
    expect(events).toContain("newBatchIds?.has(ev.id) ? 'scale-in-ver-top' : cascadeDelayById?.has(ev.id) ? 'cascade-in' : undefined");
    expect(grids).toContain("freshFavs && index >= 5 ? 'scale-in-ver-top' : cascadeActive && index < 5 ? 'cascade-in' : undefined");
    expect(grids).toContain("freshRated && index >= 5 ? 'scale-in-ver-top' : cascadeActive && index < 5 ? 'cascade-in' : undefined");
    expect(trips).toContain("newBatchFrom !== null && idx >= newBatchFrom ? 'scale-in-ver-top' : cascadeActive && idx < 6 ? 'cascade-in' : undefined");
    // La cascada solo cubre el lote inicial de cada lista (20 / 20 / 5 / 6).
    expect(home).toContain('cascadeActive && index < 20');
    expect(events).toContain('renderedEvents.slice(0, PAGE_SIZE)');
    expect(grids).toContain('cascadeActive && index < 5');
    expect(trips).toContain('cascadeActive && idx < 6');
  });

  it('cascade and heart respect prefers-reduced-motion', () => {
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('.cascade-in');
    expect(reduced).toContain('.heart-pop-once');
    expect(reduced).toContain('.heart-spark');
    expect(reduced).toContain('animation: none');
    // El estallido ni se monta con movimiento reducido (además del guarda CSS).
    expect(heart).toContain("matchMedia?.(\"(prefers-reduced-motion: reduce)\")");
  });

  it('no TDZ: the cascade helpers are declared AFTER the lists they read', () => {
    // Lección del PR #137: leer una variable antes de su const tumbó /eventos.
    const renderedAt = events.indexOf('const renderedEvents = useMemo');
    const cascadeAt = events.indexOf('const cascadeDelayById = useMemo');
    expect(renderedAt).toBeGreaterThan(-1);
    expect(cascadeAt).toBeGreaterThan(-1);
    expect(cascadeAt).toBeGreaterThan(renderedAt);
    const filteredAt = trips.indexOf('const filteredDiscover = useMemo');
    const effectAt = trips.indexOf('filteredDiscover.length === 0');
    expect(filteredAt).toBeGreaterThan(-1);
    expect(effectAt).toBeGreaterThan(-1);
    expect(effectAt).toBeGreaterThan(filteredAt);
  });
});
