import './EventWheel3D.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import OptimizedImage from '../ui/OptimizedImage.jsx';
import Icon from '../ui/Icon.jsx';
import EventPosterFallback from './EventPosterFallback.jsx';

// Rueda 3D de eventos para el inicio global, como el "Museo de eventos" de
// QuePlan: 5 pósters en un tambor que gira solo, con la ficha del evento al
// frente sincronizada. Se pausa al tocarlo o arrastrarlo.
const MAX_FACES = 5;
const FACE_W = 190;
const AUTO_MS = 4000;

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
  const dragRef = useRef(null);
  const movedRef = useRef(false);

  const step = n >= 3 ? 360 / n : 0;
  const radius = n >= 3 ? Math.round((FACE_W / 2) / Math.tan(Math.PI / n)) : 0;

  // Gira a la cara target por el camino más corto, desde donde esté el tambor.
  const goTo = useCallback((target) => {
    if (n < 3 || target === indexRef.current) return;
    const snapped = -target * step + 360 * Math.round((rotationRef.current + target * step) / 360);
    rotationRef.current = snapped;
    indexRef.current = target;
    setRotation(snapped);
    setIndex(target);
  }, [n, step]);

  // Avance automático, en pausa al tocar, arrastrar, pasar el mouse o
  // esconder la pestaña. Con reduced-motion no gira solo.
  useEffect(() => {
    if (n < 3 || paused || dragging || tabHidden || reducedMotion) return;
    const t = setInterval(() => goTo((indexRef.current + 1) % n), AUTO_MS);
    return () => clearInterval(t);
  }, [n, paused, dragging, tabHidden, reducedMotion, goTo]);

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const onPointerDown = (e) => {
    if (n < 3) return;
    dragRef.current = { x: e.clientX, rotation: rotationRef.current };
    movedRef.current = false;
    setDragging(true);
    setPaused(true);
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) > 8) movedRef.current = true;
    const next = d.rotation + dx * 0.35;
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
    const target = ((Math.round(-rotationRef.current / step) % n) + n) % n;
    goTo(target);
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
                {item.img ? <OptimizedImage src={item.img} alt={item.title || ''} widthRequest={400} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <EventPosterFallback title={item.title} radius={0} />}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  const current = items[index];
  const drumTransition = reducedMotion || dragging ? 'none' : 'transform 1100ms cubic-bezier(.25,.7,.25,1)';

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
        <div className="event-wheel-drum" style={{ transform: `rotateY(${rotation}deg)`, transition: drumTransition }}>
          {items.map((item, i) => (
            <div key={item.key} data-face={i} className="event-wheel-face" style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)` }}>
              {item.img
                ? <OptimizedImage src={item.img} alt={item.title || ''} widthRequest={400} priority={i === 0} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                : <EventPosterFallback title={item.title} radius={12} />}
            </div>
          ))}
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
