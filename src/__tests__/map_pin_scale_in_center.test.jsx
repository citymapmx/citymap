import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

// Ventana de detalle del mapa con scale-in-center de Animista (ejemplo 6
// de la demo de 10 animaciones, elegido por Jonathan, nov 2026): al
// presionar un negocio o un evento en el mapa, su ventana entra creciendo
// desde el centro (scale 0 → 1, 0.5 s, easeOutQuad, sin fade). Lo mismo
// para la tarjeta flotante "¿Qué hay cerca?".
describe('map pin detail: scale-in-center entrance', () => {
  const css = read('../index.css');
  const src = read('../views/MapView.jsx');
  // Bloques de cada tarjeta flotante.
  const gps = src.slice(src.indexOf('GPS Overlay'), src.indexOf('Map Pin Card — Evento Centrado'));
  const ev = src.slice(src.indexOf('Map Pin Card — Evento Centrado'), src.indexOf('Map Pin Card — Negocio Centrado'));
  const biz = src.slice(src.indexOf('Map Pin Card — Negocio Centrado'), src.indexOf('CERCA DE TI en Mapa'));

  it('defines the exact Animista scale-in-center keyframes in index.css', () => {
    expect(css).toContain('@keyframes scale-in-center');
    expect(css).toContain('.scale-in-center');
    const keyframes = css.slice(css.indexOf('@keyframes scale-in-center'));
    expect(keyframes).toContain('transform: scale(0)');
    expect(keyframes).toContain('transform: scale(1)');
    expect(keyframes).toContain('opacity: 1');
    expect(css).toContain('animation: scale-in-center 0.5s cubic-bezier(0.250, 0.460, 0.450, 0.940) both');
  });

  it('applies scale-in-center to the event pin card', () => {
    expect(ev).toContain('className="scale-in-center"');
  });

  it('applies scale-in-center to the business pin card', () => {
    expect(biz).toContain('className="scale-in-center"');
  });

  it('applies scale-in-center to the "¿Qué hay cerca?" floating card', () => {
    expect(gps).toContain('className="scale-in-center"');
  });

  it('animates the WHOLE visible card: the scale-in-center element carries the card visuals (regression)', () => {
    // 9 Nov 2026 (captura de Jonathan): la clase estaba en un envoltorio
    // interior sin estilos y la tarjeta blanca (fondo, bordes, sombra)
    // aparecía de golpe; solo el contenido crecía. El elemento animado
    // debe ser la ÚNICA tarjeta visual: si los estilos volvieran al
    // exterior, aparecerían antes de la clase o duplicados.
    const count = (block, s) => block.split(s).length - 1;
    for (const [block, radius, shadow] of [
      [ev, 'borderRadius: 24', 'boxShadow: "0 16px 40px rgba(0,0,0,0.3)"'],
      [biz, 'borderRadius: 24', 'boxShadow: "0 16px 40px rgba(0,0,0,0.3)"'],
      [gps, 'borderRadius: 20', 'boxShadow: "0 12px 32px rgba(0,0,0,0.2)"'],
    ]) {
      const animAt = block.indexOf('className="scale-in-center"');
      expect(animAt).toBeGreaterThan(-1);
      expect(count(block, 'background: T.white')).toBe(1);
      expect(block.indexOf('background: T.white')).toBeGreaterThan(animAt);
      expect(block.indexOf(radius)).toBeGreaterThan(animAt);
      expect(count(block, shadow)).toBe(1);
      expect(block.indexOf(shadow)).toBeGreaterThan(animAt);
    }
    expect(count(ev, 'borderRadius: 24')).toBe(1);
    expect(count(biz, 'borderRadius: 24')).toBe(1);
  });

  it('replays on every open: each pin card remounts with a key per pin', () => {
    expect(ev).toContain('key={"ev_" + mapPin.id}');
    expect(biz).toContain('key={"biz_" + mapPin.id}');
  });

  it('does not fight the old spring entrance: pin cards have no motion entrance', () => {
    // La entrada es la clase CSS del envoltorio interior; el exterior de
    // framer-motion solo centra (x) y anima la salida. Si quedara el
    // initial con scale 0.95 + y -20, habría dos animaciones de entrada.
    for (const block of [ev, biz]) {
      expect(block).toContain('initial={false}');
      expect(block).not.toContain('initial={{ opacity: 0, scale: 0.95');
      expect(block).not.toContain('animate={{ opacity: 1, scale: 1');
    }
  });

  it('keeps the centering transform on the motion wrapper, not on the animated element', () => {
    // El keyframe CSS (solo scale) sobrescribiría un translate del mismo
    // elemento: el centrado vive en el exterior (x:"-50%") y la animación
    // en el envoltorio interior.
    for (const block of [ev, biz]) {
      expect(block).toContain('x: "-50%"');
    }
    expect(gps).toContain('transform: "translate(-50%, -50%)"');
  });

  it('keeps the close button and the exit animation on the pin cards', () => {
    for (const block of [ev, biz]) {
      expect(block).toContain('exit=');
      expect(block).toContain('setMapPin(null)');
    }
  });

  it('respects prefers-reduced-motion: no CSS animation and no motion exit', () => {
    // La clase se apaga sola por CSS.
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('.scale-in-center');
    expect(reduced).toContain('animation: none');
    // Y la salida de framer-motion se acorta a duración 0.
    expect(src).toContain('import { prefersReducedMotion } from "../lib/smoothScroll.js";');
    expect(src).toContain('const reduceMotion = prefersReducedMotion();');
    expect(src).toContain('transition={reduceMotion ? { duration: 0 }');
  });
});
