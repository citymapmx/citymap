import { useCallback, useEffect, useRef, useState } from 'react';
import { getThumbUrl } from '../../lib/utils.js';
import { shortestDelta, springSettled, springStep } from '../../lib/spring.js';
import EventPosterFallback from './EventPosterFallback.jsx';

const AUTO_MS = 4000;

// Posición relativa de una tarjeta respecto a la seleccionada, con
// envoltura: con 8 eventos, la tarjeta 7 queda a -1 de la 0. Acepta una
// posición seleccionada decimal (a mitad de giro) para que el movimiento
// sea continuo.
function relativePositionFloat(index, floatSelected, count) {
  let offset = index - floatSelected;
  offset = ((offset % count) + count) % count;
  if (offset > count / 2) offset -= count;
  return offset;
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
}

function formatTagDate(value) {
  if (!value) return '';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '').toUpperCase();
}

function CoverflowPoster({ src, title, priority }) {
  const [ready, setReady] = useState(false);
  const [original, setOriginal] = useState(false);
  const [failed, setFailed] = useState(false);
  const source = original ? src : getThumbUrl(src, 400);
  return <>
    {!ready && <span className="event-coverflow-loading" aria-hidden="true">{title}</span>}
    {!failed && <img src={source} alt={title || 'Póster del evento'}
      loading={priority ? 'eager' : 'lazy'} fetchPriority={priority === 'center' ? 'high' : 'auto'}
      decoding="async" draggable="false"
      onLoad={async event => {
        const image = event.currentTarget;
        try { await image.decode(); } catch { /* Browsers can still display a loaded image. */ }
        if (image.isConnected) setReady(true);
      }}
      onError={() => { if (!original && source !== src) setOriginal(true); else setFailed(true); }}
    />}
  </>;
}

export default function EventCoverflow({ events = [], onOpen, T, label = 'Eventos destacados', heading, subheading, formatEventMeta, formatEventTag }) {
  const [selectedId, setSelectedId] = useState(null);
  // Posición seleccionada continua: 0, 1, 2… pero a mitad de giro puede
  // ser 1.4. Es lo que anima el carrusel; el índice entero se confirma
  // cuando el resorte casi llega a su objetivo.
  const [floatPos, setFloatPos] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [canHover] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches));
  const [reducedMotion] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  const gesture = useRef(null);
  const stageRef = useRef(null);
  const rafRef = useRef(null);
  const floatRef = useRef(0);
  const velocityRef = useRef(0);
  const targetRef = useRef(null);
  const suppressClick = useRef(false);
  const eventsRef = useRef(events);
  eventsRef.current = events;
  const selectedIdRef = useRef(null);
  selectedIdRef.current = selectedId;

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const selected = Math.max(0, events.findIndex(event => event.id === selectedId));
  const current = events[selected];

  // Al cambiar la lista (otra ciudad), vuelve a la primera tarjeta.
  const firstId = events[0]?.id;
  useEffect(() => {
    floatRef.current = 0;
    velocityRef.current = 0;
    targetRef.current = null;
    setFloatPos(0);
  }, [firstId]);

  const stopSpring = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  // Bucle del resorte: integra hasta asentarse sobre la tarjeta objetivo.
  // La selección se confirma cuando el póster casi llegó al frente.
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
      const s = springStep(floatRef.current, velocityRef.current, t.float, dt);
      floatRef.current = s.x;
      velocityRef.current = s.v;
      setFloatPos(s.x);
      if (Math.abs(s.x - t.float) < 0.08) {
        const id = eventsRef.current[t.index]?.id;
        if (id && id !== selectedIdRef.current) setSelectedId(id);
      }
      if (springSettled(s.x, s.v, t.float)) {
        floatRef.current = t.float;
        velocityRef.current = 0;
        setFloatPos(t.float);
        const id = eventsRef.current[t.index]?.id;
        if (id && id !== selectedIdRef.current) setSelectedId(id);
        rafRef.current = null;
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [reducedMotion]);

  // Ir a la tarjeta target por el camino más corto, desde donde esté el
  // carrusel (puede ir a mitad de giro). v0 es la velocidad inicial en
  // tarjetas por segundo: 0 en un paso normal, la del lanzamiento al soltar.
  const goToIndex = useCallback((target, v0 = 0) => {
    const list = eventsRef.current;
    const n = list.length;
    if (n < 2) return;
    const nextIndex = ((target % n) + n) % n;
    const currentTarget = targetRef.current;
    if (currentTarget && currentTarget.index === nextIndex && rafRef.current) return;
    if (!rafRef.current && nextIndex === selected) return;
    // Delta envuelto más corto: de la 7 a la 0 es +1, no -7. Se mide desde
    // la posición decimal actual, no desde la tarjeta redondeada, para no
    // quedarse parado a mitad de paso si el objetivo cambia en pleno giro.
    const targetFloat = floatRef.current + shortestDelta(nextIndex, floatRef.current, n);
    targetRef.current = { index: nextIndex, float: targetFloat };
    // Si el resorte ya va en marcha, conserva su velocidad; solo se fija
    // v0 al arrancar parado.
    if (!rafRef.current) velocityRef.current = v0;
    if (reducedMotion) {
      floatRef.current = targetFloat;
      velocityRef.current = 0;
      setFloatPos(targetFloat);
      const id = list[nextIndex]?.id;
      if (id) setSelectedId(id);
      return;
    }
    startSpring();
  }, [selected, reducedMotion, startSpring]);

  // Avance automático: se mueve solo cada 4 s. En pausa al arrastrar,
  // al pasar el mouse (escritorio) o al esconder la pestaña. Con
  // reduced-motion no gira solo.
  useEffect(() => {
    if (events.length < 2 || paused || dragging || tabHidden || reducedMotion) return;
    const t = setInterval(() => {
      const base = targetRef.current?.index ?? selected;
      goToIndex(base + 1);
    }, AUTO_MS);
    return () => clearInterval(t);
  }, [events.length, paused, dragging, tabHidden, reducedMotion, selected, goToIndex]);

  useEffect(() => {
    const onVis = () => setTabHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const move = direction => {
    const base = targetRef.current?.index ?? selected;
    goToIndex(base + direction);
  };

  const open = event => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onOpen(event);
  };

  if (!current) return null;

  return (
    <div className="event-coverflow" role="region" aria-roledescription="carrusel" aria-label={label} onKeyDown={event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        move(event.key === 'ArrowRight' ? 1 : -1);
      }
    }}>
      <style>{`
        .event-coverflow { padding: 0 0 4px; position: relative; }
        .event-coverflow-date-tag {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 5;
          padding: 5px 9px;
          border-radius: 999px;
          background: rgba(0,0,0,0.78);
          border: 1px solid rgba(255,255,255,0.28);
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .4px;
          line-height: 1;
          white-space: nowrap;
          pointer-events: none;
        }
        .event-coverflow-viewport { position: relative; }
        .event-coverflow-arrow {
          position: absolute;
          top: calc(50% - 4px);
          transform: translateY(-50%);
          z-index: 110;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 48px;
          padding: 0;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: inherit;
          cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .event-coverflow-arrow svg { filter: drop-shadow(0 1px 2px var(--rail-icon-halo, rgba(255,255,255,.9))); }
        .event-coverflow-arrow:focus-visible { outline: 2px solid currentColor; outline-offset: -4px; }
        .event-coverflow-stage {
          position: relative;
          height: clamp(240px, 70vw, 326px);
          perspective: 1000px;
          overflow: clip;
          touch-action: pan-y pinch-zoom;
          cursor: grab;
          user-select: none;
          -webkit-user-select: none;
        }
        .event-coverflow-stage[data-dragging="true"] { cursor: grabbing; }
        .event-coverflow-card {
          --position: var(--offset);
          --distance: max(var(--position), calc(-1 * var(--position)));
          opacity: min(clamp(0, calc(2 - var(--distance)), 1), clamp(0, calc(1 + var(--position) * .35), 1));
          z-index: calc(100 - var(--distance) * 10);
          transform: translateX(calc(-50% + var(--position) * 76%)) translateZ(calc(var(--distance) * -90px)) rotateY(calc(var(--position) * -23deg)) scale(clamp(.76, calc(1 - var(--distance) * .12), 1));
        }
        .event-coverflow-card {
          position: absolute;
          top: 0;
          left: 50%;
          width: clamp(170px, 54%, 245px);
          height: 100%;
          box-sizing: border-box;
          padding: 6px 0 12px;
          border: 0;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transform-origin: center;
          touch-action: pan-y pinch-zoom;
          -webkit-tap-highlight-color: transparent;
        }
        .event-coverflow-card img {
          display: block;
          width: auto;
          height: auto;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 14px;
          filter: drop-shadow(0 3px 4px rgba(0,0,0,.12));
          user-select: none;
          -webkit-user-drag: none;
          pointer-events: none;
        }
        .event-coverflow-loading {
          position: absolute;
          inset: 6px 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
          border-radius: 14px;
          background: #111;
          color: #fff;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.4;
          text-align: center;
          pointer-events: none;
        }
        .event-coverflow-card:focus-visible { outline: 3px solid #1A7A5E; outline-offset: -3px; border-radius: 16px; }
        @media (prefers-reduced-motion: reduce) { .event-coverflow-card { transition: none; } }
      `}</style>
      {heading && <header style={{ margin: '0 20px 16px', textAlign: 'center' }}>
        <h2 style={{ margin: subheading ? '0 0 5px' : 0, fontSize: 16, fontWeight: 800, color: T.text }}>{heading}</h2>
        {subheading && <p style={{ margin: 0, fontSize: 13, lineHeight: 1.4, color: T.sub }}>{subheading}</p>}
      </header>}
      <div className="event-coverflow-viewport" style={{ color: T.text, '--rail-icon-halo': T.dark ? 'rgba(0,0,0,.8)' : 'rgba(255,255,255,.9)' }}>
      <div className="event-coverflow-stage" ref={stageRef}
        onMouseEnter={() => { if (canHover) setPaused(true); }}
        onMouseLeave={() => { if (canHover) setPaused(false); }}
        onPointerDown={event => {
          if (event.button !== 0 || events.length < 2 || gesture.current) return;
          stopSpring();
          targetRef.current = null;
          velocityRef.current = 0;
          suppressClick.current = false;
          const width = event.currentTarget.querySelector('[aria-current="true"]')?.offsetWidth || 220;
          gesture.current = {
            x: event.clientX,
            y: event.clientY,
            time: event.timeStamp,
            step: width * 0.76,
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            axis: null,
            float: floatRef.current,
            v: 0
          };
        }}
        onPointerMove={event => {
          const start = gesture.current;
          if (!start || start.pointerId !== event.pointerId) return;

          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          const absX = Math.abs(dx);
          const absY = Math.abs(dy);

          if (!start.axis) {
            const isMouse = start.pointerType === 'mouse';
            const moveThreshold = isMouse ? 4 : 8;

            if (absX < moveThreshold && absY < moveThreshold) {
              return;
            }

            // If vertical movement dominates: this is a page scroll!
            if (!isMouse && absY >= absX) {
              start.axis = 'y';
              gesture.current = null; // Yield completely to native page scrolling
              return;
            }

            // If horizontal movement clearly dominates: this is a carousel swipe!
            if (isMouse || absX > absY * 1.3) {
              start.axis = 'x';
              suppressClick.current = true;
              setDragging(true);
              setPaused(true);
              const stage = event.currentTarget;
              stage.dataset.dragging = 'true';
              try {
                if (!stage.hasPointerCapture(event.pointerId)) {
                  stage.setPointerCapture(event.pointerId);
                }
              } catch (_) { /* La captura del puntero es opcional; si falla, el gesto sigue. */ }
            } else {
              return;
            }
          }

          if (start.axis !== 'x') return;

          const now = event.timeStamp;
          const next = start.float - dx / start.step;
          const dt = Math.max(1, now - start.time);
          // Velocidad en tarjetas por segundo (suavizada): es la inercia
          // con la que el carrusel sigue al soltar.
          const instV = ((next - floatRef.current) / dt) * 1000;
          start.v = start.v * 0.6 + instV * 0.4;
          start.time = now;
          floatRef.current = next;
          setFloatPos(next);
        }}
        onPointerUp={event => {
          const start = gesture.current;
          if (!start || start.pointerId !== event.pointerId) return;
          gesture.current = null;

          const stage = event.currentTarget;
          try {
            if (stage.hasPointerCapture(event.pointerId)) {
              stage.releasePointerCapture(event.pointerId);
            }
          } catch (_) { /* La captura del puntero es opcional; si falla, el gesto sigue. */ }

          if (start.axis !== 'x') {
            stage.removeAttribute('data-dragging');
            return;
          }

          setDragging(false);
          setPaused(false);
          const dx = event.clientX - start.x;

          // Con un lanzamiento, el carrusel sigue por inercia y cae en la
          // tarjeta más cercana; sin él, vuelve a la tarjeta actual.
          const v0 = Math.max(-10, Math.min(10, start.v));
          let target = Math.round(floatRef.current);
          if (Math.abs(dx) > 24 || Math.abs(start.v) > 1.5) {
            const projected = floatRef.current + v0 * 0.22;
            target = Math.round(projected);
          }
          stage.removeAttribute('data-dragging');
          goToIndex(target, v0);

          setTimeout(() => {
            suppressClick.current = false;
          }, 60);
        }}
        onPointerCancel={event => {
          gesture.current = null;
          stopSpring();
          const stage = event.currentTarget;
          if (stage) {
            try {
              if (stage.hasPointerCapture(event.pointerId)) {
                stage.releasePointerCapture(event.pointerId);
              }
            } catch (_) { /* La captura del puntero es opcional; si falla, el gesto sigue. */ }
            stage.removeAttribute('data-dragging');
          }
          setDragging(false);
          setPaused(false);
          setTimeout(() => {
            suppressClick.current = false;
          }, 60);
        }}
      >
        {events.map((event, index) => ({ event, index, offset: relativePositionFloat(index, floatPos, events.length) }))
          .map(({ event, offset }) => {
            const isSelected = Math.abs(offset) < 0.5;
            const image = event.img_url || event.img || event.poster_url;
            const tag = formatEventTag ? formatEventTag(event) : formatTagDate(event.date);
            return <button key={event.id} type="button" className="event-coverflow-card"
              aria-label={isSelected ? `Ver evento: ${event.title}` : `Mostrar evento: ${event.title}`}
              aria-current={isSelected ? 'true' : undefined}
              tabIndex={isSelected ? 0 : -1}
              aria-hidden={Math.abs(offset) > 2 ? 'true' : undefined}
              onClick={() => {
                if (isSelected) open(event);
                else if (!suppressClick.current) goToIndex(events.findIndex(e => e.id === event.id));
              }}
              style={{ '--offset': offset, pointerEvents: Math.abs(offset) > 1 ? 'none' : 'auto' }}>
              {image ? <CoverflowPoster key={image} src={image} title={event.title} priority={isSelected ? 'center' : Math.abs(offset) <= 1} /> : <EventPosterFallback title={event.title} />}
              {tag && <span aria-hidden="true" className="event-coverflow-date-tag">{tag}</span>}
            </button>;
          })}


      </div>
      {events.length > 1 && [-1, 1].map(direction => (
        <button key={direction} type="button" className="event-coverflow-arrow"
          aria-label={direction === -1 ? 'Mostrar evento anterior' : 'Mostrar evento siguiente'}
          onClick={() => { move(direction); }}
          style={direction === -1 ? { left: 4 } : { right: 4 }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={direction === -1 ? 'M14 6l-6 6 6 6' : 'M10 6l6 6-6 6'} />
          </svg>
        </button>
      ))}
      </div>

      {/* Título y fecha del evento seleccionado, solo para lectores de pantalla: abajo del carrusel ya no se muestra nada. */}
      <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap' }}>
        <span>{current.title}</span>{' · '}
        <span>{formatEventMeta ? formatEventMeta(current) : [formatDate(current.date), current.venue_name].filter(Boolean).join(' · ')}</span>
      </div>
    </div>
  );
}
