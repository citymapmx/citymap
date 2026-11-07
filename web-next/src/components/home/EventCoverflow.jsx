import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { getThumbUrl } from '../../lib/utils.js';
import EventPosterFallback from './EventPosterFallback.jsx';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

function relativePosition(index, selected, count) {
  let offset = index - selected;
  if (offset > count / 2) offset -= count;
  if (offset < -count / 2) offset += count;
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

export default function EventCoverflow({ events = [], onOpen, T, label = 'Eventos destacados', heading, formatEventMeta, formatEventTag }) {
  const [selectedId, setSelectedId] = useState(null);
  const gesture = useRef(null);
  const stageRef = useRef(null);
  const frameRef = useRef(null);
  const animTimeoutRef = useRef(null);
  const isAnimating = useRef(false);
  const suppressClick = useRef(false);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(frameRef.current);
      clearTimeout(animTimeoutRef.current);
    };
  }, []);

  const selected = Math.max(0, events.findIndex(event => event.id === selectedId));
  const current = events[selected];

  useIsomorphicLayoutEffect(() => {
    if (stageRef.current) {
      stageRef.current.style.setProperty('--drag-progress', '0');
    }
    isAnimating.current = false;
  }, [selectedId]);

  if (!current) return null;

  const move = direction => {
    const next = (selected + direction + events.length) % events.length;
    setSelectedId(events[next].id);
  };

  const open = event => {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onOpen(event);
  };

  return (
    <div className="event-coverflow" role="region" aria-roledescription="carrusel" aria-label={label} onKeyDown={event => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        if (!isAnimating.current) move(event.key === 'ArrowRight' ? 1 : -1);
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
          -webkit-mask-image: linear-gradient(to right, transparent, #000 24px);
          mask-image: linear-gradient(to right, transparent, #000 24px);
          touch-action: pan-y pinch-zoom; 
          cursor: grab; 
          user-select: none;
          -webkit-user-select: none;
        }
        .event-coverflow-stage[data-dragging="true"] { cursor: grabbing; }
        .event-coverflow-stage[data-dragging="true"] .event-coverflow-card { transition: none !important; cursor: grabbing; }
        .event-coverflow-card {
          --position: calc(var(--offset) + var(--drag-progress, 0));
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
          transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease, z-index 200ms linear;
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
      {heading && <header style={{ margin: '0 20px 12px', textAlign: 'center' }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.text }}>{heading}</h2>
      </header>}
      <div className="event-coverflow-viewport" style={{ color: T.text, '--rail-icon-halo': T.dark ? 'rgba(0,0,0,.8)' : 'rgba(255,255,255,.9)' }}>
      <div className="event-coverflow-stage" ref={stageRef}
        onPointerDown={event => {
          if (event.button !== 0 || events.length < 2 || gesture.current || isAnimating.current) return;
          cancelAnimationFrame(frameRef.current);
          suppressClick.current = false;
          const width = event.currentTarget.querySelector('[aria-current="true"]')?.offsetWidth || 220;
          gesture.current = {
            x: event.clientX,
            y: event.clientY,
            time: event.timeStamp,
            step: width * 0.76,
            pointerId: event.pointerId,
            pointerType: event.pointerType,
            axis: null
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

          const stage = event.currentTarget;
          const progress = Math.max(-1.3, Math.min(1.3, dx / start.step));
          cancelAnimationFrame(frameRef.current);
          frameRef.current = requestAnimationFrame(() => {
            stage.style.setProperty('--drag-progress', String(progress));
          });
        }}
        onPointerUp={event => {
          const start = gesture.current;
          if (!start || start.pointerId !== event.pointerId) return;
          gesture.current = null;
          cancelAnimationFrame(frameRef.current);

          const stage = event.currentTarget;
          try {
            if (stage.hasPointerCapture(event.pointerId)) {
              stage.releasePointerCapture(event.pointerId);
            }
          } catch (_) { /* La captura del puntero es opcional; si falla, el gesto sigue. */ }

          if (start.axis !== 'x') {
            stage.removeAttribute('data-dragging');
            void stage.offsetWidth;
            stage.style.setProperty('--drag-progress', '0');
            return;
          }

          const dx = event.clientX - start.x;
          const dt = Math.max(1, event.timeStamp - start.time);
          const velocity = dx / dt;
          const progress = dx / start.step;

          // Highly responsive: 24px threshold or gentle 0.18px/ms flick
          let dir = 0;
          if (dx < -24 || progress < -0.12 || velocity < -0.18) {
            dir = 1; // Advance to next card
          } else if (dx > 24 || progress > 0.12 || velocity > 0.18) {
            dir = -1; // Return to previous card
          }

          // Restore CSS transitions before setting target progress so it NEVER snaps abruptly
          stage.removeAttribute('data-dragging');
          void stage.offsetWidth; // Force reflow so transition is guaranteed active

          if (dir !== 0) {
            const targetProgress = dir === 1 ? -1 : 1;
            stage.style.setProperty('--drag-progress', String(targetProgress));
            isAnimating.current = true;

            clearTimeout(animTimeoutRef.current);
            animTimeoutRef.current = setTimeout(() => {
              move(dir);
              if (stageRef.current) {
                stageRef.current.style.setProperty('--drag-progress', '0');
              }
              isAnimating.current = false;
            }, 200);
          } else {
            // Smoothly glide back to center with transition
            stage.style.setProperty('--drag-progress', '0');
          }

          setTimeout(() => {
            suppressClick.current = false;
          }, 60);
        }}
        onPointerCancel={event => {
          gesture.current = null;
          cancelAnimationFrame(frameRef.current);
          clearTimeout(animTimeoutRef.current);
          isAnimating.current = false;
          const stage = event.currentTarget;
          if (stage) {
            try {
              if (stage.hasPointerCapture(event.pointerId)) {
                stage.releasePointerCapture(event.pointerId);
              }
            } catch (_) { /* La captura del puntero es opcional; si falla, el gesto sigue. */ }
            stage.removeAttribute('data-dragging');
            void stage.offsetWidth;
            stage.style.setProperty('--drag-progress', '0');
          }
          setTimeout(() => {
            suppressClick.current = false;
          }, 60);
        }}
      >
        {events.map((event, index) => ({ event, index, offset: relativePosition(index, selected, events.length) }))
          .map(({ event, offset }) => {
            const isSelected = offset === 0;
            const image = event.img_url || event.img || event.poster_url;
            const tag = formatEventTag ? formatEventTag(event) : formatTagDate(event.date);
            return <button key={event.id} type="button" className="event-coverflow-card"
              aria-label={isSelected ? `Ver evento: ${event.title}` : `Mostrar evento: ${event.title}`}
              aria-current={isSelected ? 'true' : undefined}
              tabIndex={isSelected ? 0 : -1}
              aria-hidden={Math.abs(offset) > 2 ? 'true' : undefined}
              onClick={() => {
                if (isAnimating.current) return;
                if (isSelected) open(event);
                else if (!suppressClick.current) setSelectedId(event.id);
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
          onClick={() => { if (!isAnimating.current) move(direction); }}
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
