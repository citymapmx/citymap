import './EventWheel3D.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import OptimizedImage from '../ui/OptimizedImage.jsx';
import Icon from '../ui/Icon.jsx';
import EventPosterFallback from './EventPosterFallback.jsx';
import { faceBrightness, normalizeAngleDeg, springSettled, springStep } from '../../lib/spring.js';

// Rueda 3D de eventos para el inicio global, como el "Museo de eventos" de
// QuePlan: 5 pósters en un tambor que gira solo, con la ficha del evento al
// frente sincronizada. Se pausa al tocarlo o arrastrarlo.
//
// Idea 6 de motion.dev (Coverflow): el giro no es una transición CSS de
// cara en cara, sino un resorte físico — el tambor lleva velocidad e
// inercia, se puede lanzar con el dedo y se asienta con un leve sobrepaso.
// La cara del frente brilla más y las vecinas se apagan un poco, como en
// el Coverflow. La ficha cambia cuando el póster casi llegó al frente,
// no al arrancar el giro.
const MAX_FACES = 5;
const FACE_W = 190;
const AUTO_MS = 4000;
// La cara del frente se ve a ~219 px CSS y en el teléfono a 3x son ~660 px
// de dispositivo: a 400 px el póster se veía blando. A 800 px se ve nítido.
const WHEEL_IMG_W = 800;

function fmtDate(d) {
  try {
    return new Date(`${d}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });
  } catch { return d; }
}

export default function EventWheel3D({ events, onSelect, onToggleSave, isSaved, cityName }) {
  const items = (events || []).slice(0, MAX_FACES);
  const n = items.length;
  const [index, setIndex] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [canHover] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches));
  const [reducedMotion] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  const indexRef = useRef(0);
  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const targetRef = useRef(null);
  const rafRef = useRef(null);
  const dragRef = useRef(null);
  const movedRef = useRef(false);

  const step = n >= 3 ? 360 / n : 0;
  const radius = n >= 3 ? Math.round((FACE_W / 2) / Math.tan(Math.PI / n)) : 0;

  const stopSpring = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  useEffect(() => stopSpring, [stopSpring]);

  // Bucle del resorte: integra hasta asentarse sobre la cara objetivo.
  const startSpring = useCallback(() => {
    if (rafRef.current || reducedMotion) return;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      const t = targetRef.current;
      if (!t) {
        rafRef.current = null;
        return;
      }
      const s = springStep(rotationRef.current, velocityRef.current, t.rotation, dt);
      rotationRef.current = s.x;
      velocityRef.current = s.v;
      setRotation(s.x);
      // La ficha cambia cuando el póster casi llegó al frente.
      if (Math.abs(s.x - t.rotation) < 8 && indexRef.current !== t.index) {
        indexRef.current = t.index;
        setIndex(t.index);
      }
      if (springSettled(s.x, s.v, t.rotation)) {
        rotationRef.current = t.rotation;
        velocityRef.current = 0;
        setRotation(t.rotation);
        if (indexRef.current !== t.index) {
          indexRef.current = t.index;
          setIndex(t.index);
        }
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [reducedMotion]);

  // Gira a la cara target por el camino más corto, desde donde esté el
  // tambor (puede ir a mitad de giro). v0 es la velocidad inicial en
  // grados por segundo: 0 en un paso normal, la del lanzamiento al soltar.
  const goTo = useCallback((target, v0 = 0) => {
    if (n < 3) return;
    const nextIndex = ((target % n) + n) % n;
    const currentTarget = targetRef.current;
    if (currentTarget && currentTarget.index === nextIndex && rafRef.current) return;
    const snapped = -nextIndex * step + 360 * Math.round((rotationRef.current + nextIndex * step) / 360);
    // Ya está ahí: solo se salta el resorte si el tambor ya está (casi) en
    // la rotación objetivo. Si quedó descentrado tras un arrastre corto,
    // el resorte lo vuelve al centro en vez de dejarlo torcido.
    if (!rafRef.current && Math.abs(snapped - rotationRef.current) < 0.5) return;
    targetRef.current = { index: nextIndex, rotation: snapped };
    // Si el resorte ya va en marcha, conserva su velocidad (el giro sigue
    // fluido al cambiar de objetivo); solo se fija v0 al arrancar parado.
    if (!rafRef.current) velocityRef.current = v0;
    if (reducedMotion) {
      rotationRef.current = snapped;
      velocityRef.current = 0;
      indexRef.current = nextIndex;
      setRotation(snapped);
      setIndex(nextIndex);
      return;
    }
    startSpring();
  }, [n, step, reducedMotion, startSpring]);

  // Avance automático, en pausa al tocar, arrastrar, pasar el mouse o
  // esconder la pestaña. Con reduced-motion no gira solo.
  useEffect(() => {
    if (n < 3 || paused || dragging || tabHidden || reducedMotion) return;
    const t = setInterval(() => goTo(((targetRef.current?.index ?? indexRef.current) + 1) % n), AUTO_MS);
    return () => clearInterval(t);
  }, [n, paused, dragging, tabHidden, reducedMotion, goTo]);

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const onPointerDown = (e) => {
    if (n < 3) return;
    stopSpring();
    targetRef.current = null;
    velocityRef.current = 0;
    dragRef.current = { x: e.clientX, rotation: rotationRef.current, t: performance.now(), v: 0 };
    movedRef.current = false;
    setDragging(true);
    setPaused(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const now = performance.now();
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 8) movedRef.current = true;
    const next = d.rotation + dx * 0.35;
    const dt = Math.max(now - d.t, 1);
    const instV = ((next - rotationRef.current) / dt) * 1000;
    d.v = d.v * 0.6 + instV * 0.4;
    d.t = now;
    rotationRef.current = next;
    setRotation(next);
  };

  const onPointerUp = (e) => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    setDragging(false);
    setPaused(false);
    if (!movedRef.current) {
      const el = typeof document !== 'undefined' ? document.elementFromPoint(e.clientX, e.clientY) : null;
      const face = el?.closest?.('[data-face]');
      if (face) {
        const i = Number(face.dataset.face);
        if (i === indexRef.current) onSelect?.(items[i]);
        else goTo(i);
      }
      return;
    }
    // Inercia: proyecta a dónde iría con la velocidad que lleva y cae en
    // la cara más cercana, con esa velocidad como arranque del resorte.
    const v0 = Math.max(-1400, Math.min(1400, d.v));
    const projected = rotationRef.current + v0 * 0.22;
    const target = ((Math.round(-projected / step) % n) + n) % n;
    goTo(target, v0);
  };

  if (n === 0) return null;

  // Con menos de 3 eventos no hay tambor: hilera simple con los pósters.
  if (n < 3) {
    return (
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 14px' }}>Próximos eventos</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          {items.map((item) => (
            <article key={item.key} onClick={() => onSelect?.(item)} style={{ flex: '0 0 170px', borderRadius: 16, overflow: 'hidden', background: '#111', cursor: 'pointer' }}>
              <div style={{ position: 'relative', aspectRatio: '3 / 4' }}>
                {item.img ? <OptimizedImage src={item.img} alt={item.title || ''} widthRequest={WHEEL_IMG_W} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <EventPosterFallback title={item.title} radius={0} />}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  const current = items[index];

  return (
    <section className="event-wheel" aria-label="Próximos eventos">
      <h2 className="event-wheel-title">Próximos eventos</h2>
      <div
        className={`event-wheel-viewport${dragging ? ' event-wheel-dragging' : ''}`}
        style={{ perspective: '1000px' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseEnter={() => { if (canHover) setPaused(true); }}
        onMouseLeave={() => { if (canHover) setPaused(false); }}
      >
        <div className="event-wheel-drum" style={{ transform: `rotateY(${rotation}deg)` }}>
          {items.map((item, i) => {
            const angle = normalizeAngleDeg(i * step + rotation);
            return (
              <div key={item.key} data-face={i} className="event-wheel-face" style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)`, filter: `brightness(${faceBrightness(angle).toFixed(2)})` }}>
                {item.img
                  ? <OptimizedImage src={item.img} alt={item.title || ''} widthRequest={WHEEL_IMG_W} priority={i === 0} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  : <EventPosterFallback title={item.title} radius={12} />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="event-wheel-nav">
        <div className="event-wheel-dots" role="tablist" aria-label="Eventos">
          {items.map((item, i) => (
            <button key={item.key} role="tab" aria-selected={i === index} aria-label={`Ir al evento ${i + 1}: ${item.title}`} onClick={() => goTo(i)} className={`event-wheel-dot${i === index ? ' event-wheel-dot--active' : ''}`} />
          ))}
        </div>
        <span className="event-wheel-counter">{String(index + 1).padStart(2, '0')}/{String(n).padStart(2, '0')}</span>
      </div>
      <article key={current.key} className="event-wheel-detail">
        <div className="event-wheel-detail-text">
          <span className="event-wheel-date">{fmtDate(current.date)}</span>
          <h3>{current.title}</h3>
          <p>{[current.raw?.venue_name, cityName?.(current.citySlug)].filter(Boolean).join(' · ')}</p>
        </div>
        <div className="event-wheel-detail-actions">
          <button aria-label="Guardar" onClick={(e) => onToggleSave?.(e, current)} className="event-wheel-heart">
            <Icon name={isSaved?.(current) ? 'heart_overlay_f' : 'heart_overlay'} size={26} color="none" />
          </button>
          <button onClick={() => onSelect?.(current)} className="event-wheel-cta">Ver detalles</button>
        </div>
      </article>
    </section>
  );
}
