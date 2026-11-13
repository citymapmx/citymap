import './EventWheel3D.css';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import OptimizedImage from '../ui/OptimizedImage.jsx';
import { getThumbSrcSet, getThumbUrl, SRCSET_CARD, SRCSET_THUMB } from '../../lib/utils.js';
import {
  WHEEL_BASE_SIZES,
  WHEEL_BASE_W,
  WHEEL_IMG_W,
  WHEEL_PRELOAD_SIZES,
  prefetchWheelFaces,
  wheelFrontIndex,
  wheelNearFaces,
} from '../../lib/wheelPreload.js';
import {
  WHEEL_AUTO_RESUME_MS,
  WHEEL_FACE_W,
  WHEEL_FACE_W_MOBILE,
  wheelAutoStep,
  wheelFaceRadius,
  wheelShouldAutoRotate,
} from '../../lib/wheelMotion.js';
import EventPosterFallback from './EventPosterFallback.jsx';
import { faceBrightness, normalizeAngleDeg, springSettled, springStep } from '../../lib/spring.js';
import { useTranslation } from '../../hooks/useTranslation.js';

// Rueda 3D de eventos para el inicio global y las páginas de ciudad,
// opción #5 elegida por Jonathan (PR #192): un cilindro con tarjetas de
// SOLO IMAGEN — el póster completo, sin título, fecha ni precio encima —
// casi pegadas entre sí, que gira solo de forma continua y fluida (una
// vuelta en ~33 s). Debajo de la rueda van los puntos y el nombre del
// evento de enfrente en mayúsculas. Sin chevrones (PR #194): se navega
// con los puntos, el giro automático o el arrastre. El giro se pausa al
// pasar el mouse, al tocar o al esconder la pestaña, y se reanuda solo
// unos segundos después de un salto manual (punto o lanzamiento
// con el dedo). Con prefers-reduced-motion no gira solo.
//
// El giro continuo lo mueve un bucle requestAnimationFrame (el tambor
// avanza a velocidad constante); los saltos manuales y los lanzamientos
// siguen usando el resorte físico de antes, que se asienta con un leve
// sobrepaso. La cara del frente brilla más y las vecinas se apagan un
// poco con un velo negro de opacidad, como en el Coverflow — nunca con
// `filter`, que parpadeaba en el teléfono (PR #194).
const MAX_FACES = 10;

// Con pocos eventos no hay tambor: de 1 a 3 van en una fila horizontal
// deslizable con las tarjetas a tamaño completo (opción B elegida por
// Jonathan, 13 Nov 2026: con 3 o menos, la rueda se veía chica con mucho
// hueco vacío); con 4 o más queda la rueda 3D. Umbral con nombre para
// ajustarlo fácil después.
export const WHEEL_ROW_MAX_EVENTS = 3;

// Placeholder de una cara mientras su póster carga (nunca una tarjeta
// negra vacía): fondo claro u oscuro según el tema + el shimmer del repo
// (.skel-shimmer) + el título del evento. Va DEBAJO del <img> (que lo
// tapa al cargar, con su fundido de opacidad) y encima del fondo #111 de
// la cara. El título es solo texto: en el tambor las tarjetas son solo
// imagen, sin píldora de ciudad ni fecha.
function WheelFacePlaceholder({ title, dark }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: dark ? '#232326' : '#e8ecf0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflow: 'hidden' }}>
      <div className="skel-shimmer" />
      <span style={{ position: 'relative', color: dark ? '#fff' : '#333', fontSize: 15, fontWeight: 800, lineHeight: 1.35, textAlign: 'center', overflowWrap: 'anywhere' }}>{title}</span>
    </div>
  );
}

export default function EventWheel3D({ events, onSelect, cityName, pillLabel, heading, T = {} }) {
  const { t } = useTranslation();
  // Título por defecto en t(): el llamador puede pasar su propio heading
  // (la página de ciudad pasa el suyo); si no, se traduce aquí. Sin
  // subtítulo (PR #196): el encabezado es solo el título de sección, con
  // el mismo tamaño y estilo que los demás títulos de la página.
  const headingText = heading ?? t('home_proximos_eventos', 'Próximos eventos');
  const items = (events || []).slice(0, MAX_FACES);
  const n = items.length;
  const [rotation, setRotation] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [paused, setPaused] = useState(false);
  const [held, setHeld] = useState(false);
  const [tabHidden, setTabHidden] = useState(false);
  const [canHover] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(hover: hover) and (pointer: fine)').matches));
  const [reducedMotion] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches));
  // Formato corto de la tarjeta: nominal 162 px en escritorio, 140 px en
  // teléfono (la perspectiva la magnifica a ~216 px y ~178 px al frente).
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(max-width: 640px)').matches));
  useEffect(() => {
    const mq = typeof window !== 'undefined' ? window.matchMedia?.('(max-width: 640px)') : null;
    if (!mq) return;
    const onChange = () => setIsMobile(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  const faceW = isMobile ? WHEEL_FACE_W_MOBILE : WHEEL_FACE_W;
  const indexRef = useRef(0);
  const rotationRef = useRef(0);
  const velocityRef = useRef(0);
  const targetRef = useRef(null);
  const rafRef = useRef(null);
  const dragRef = useRef(null);
  const movedRef = useRef(false);
  const resumeTimerRef = useRef(null);
  const holdUntilRef = useRef(0);
  // Espejos en refs de lo que el bucle de animación necesita leer sin
  // quedarse con un cierre viejo.
  const pausedRef = useRef(false);
  const draggingRef = useRef(false);
  const tabHiddenRef = useRef(false);
  const nRef = useRef(n);
  const stepRef = useRef(0);
  const reducedMotionRef = useRef(reducedMotion);

  const step = n >= 3 ? 360 / n : 0;
  // Cilindro cerrado: la apotema del polígono deja las caras tocándose en
  // los bordes (casi pegadas, sin hueco entre tarjetas).
  const radius = wheelFaceRadius(faceW, n);

  useEffect(() => {
    nRef.current = n;
    stepRef.current = step;
    reducedMotionRef.current = reducedMotion;
  }, [n, step, reducedMotion]);

  // Caras con <img> montada: las cercanas al frente ahora (la del frente y
  // 3 a cada lado, wheelNearFaces) más las que ya estuvieron cerca
  // (loadedFacesRef): una vez cargada, la cara no se desmonta para que el
  // póster no parpadee en cada giro. Las caras de atrás no montan imagen
  // hasta que el giro las acerca (ver wheelPreload.js). La base que se
  // monta es de 400 px (WHEEL_BASE_W); la cara del frente lleva además
  // una segunda imagen a 800 px encima (ver el render), que se funde al
  // cargar sin tapar nunca la base.
  const frontIdx = n >= 3 ? wheelFrontIndex(rotation, step, n) : 0;
  const nearFaces = n >= 3 ? wheelNearFaces(frontIdx, n) : [];
  const loadedFacesRef = useRef(new Set());
  // Las imágenes que van a entrar se precargan por adelantado (la nítida
  // de las vecinas y la base de las siguientes): el efecto lee los items
  // por ref para no re-dispararse en cada fotograma del giro.
  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; });
  useEffect(() => {
    const s = loadedFacesRef.current;
    wheelNearFaces(frontIdx, n).forEach((i) => s.add(i));
    prefetchWheelFaces(itemsRef.current, frontIdx);
  }, [frontIdx, n]);

  const setPausedBoth = useCallback((v) => {
    pausedRef.current = v;
    setPaused(v);
  }, []);
  const setDraggingBoth = useCallback((v) => {
    draggingRef.current = v;
    setDragging(v);
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  }, []);

  // Un solo bucle: integra el resorte si hay un salto en marcha; si no,
  // avanza el giro continuo; si no hay nada que animar, se para (lo vuelve
  // a arrancar el efecto de abajo o el temporizador de reanudación).
  const ensureLoop = useCallback(() => {
    if (rafRef.current || typeof window === 'undefined') return;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      // Sin tambor no hay nada que girar (fila de pocos eventos): el
      // bucle se para en vez de re-renderizar a 60 fps sin hacer nada.
      if (nRef.current <= WHEEL_ROW_MAX_EVENTS) {
        rafRef.current = null;
        return;
      }
      const target = targetRef.current;
      if (target) {
        const s = springStep(rotationRef.current, velocityRef.current, target.rotation, dt);
        rotationRef.current = s.x;
        velocityRef.current = s.v;
        setRotation(s.x);
        // La cara del frente se confirma cuando el póster casi llegó.
        if (Math.abs(s.x - target.rotation) < 8 && indexRef.current !== target.index) {
          indexRef.current = target.index;
        }
        if (springSettled(s.x, s.v, target.rotation)) {
          rotationRef.current = target.rotation;
          velocityRef.current = 0;
          setRotation(target.rotation);
          if (indexRef.current !== target.index) {
            indexRef.current = target.index;
          }
          targetRef.current = null;
          // El giro solo se reanuda tras la pausa: si el bucle se para
          // aquí, el temporizador lo vuelve a arrancar.
          holdUntilRef.current = performance.now() + WHEEL_AUTO_RESUME_MS;
          setHeld(true);
          if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
          resumeTimerRef.current = setTimeout(() => {
            setHeld(false);
            ensureLoop();
          }, WHEEL_AUTO_RESUME_MS);
          rafRef.current = null;
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      if (wheelShouldAutoRotate({
        paused: pausedRef.current,
        dragging: draggingRef.current,
        tabHidden: tabHiddenRef.current,
        reducedMotion: reducedMotionRef.current,
        hasTarget: false,
        heldUntil: holdUntilRef.current,
        now,
      })) {
        rotationRef.current = wheelAutoStep(rotationRef.current, dt);
        // La rotación se mantiene en una vuelta para que el número no
        // crezca sin límite (360° es múltiplo del paso: mismo ángulo).
        if (rotationRef.current <= -360) rotationRef.current += 360;
        const front = nRef.current >= 3 ? wheelFrontIndex(rotationRef.current, stepRef.current, nRef.current) : 0;
        if (front !== indexRef.current) indexRef.current = front;
        setRotation(rotationRef.current);
        rafRef.current = requestAnimationFrame(tick);
        return;
      }
      rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Arranca (o reanuda) el giro al montar y cada vez que cambia algo que
  // lo pausa; al desmontar se cancela el bucle y el temporizador. Sin
  // tambor (fila de pocos eventos) no se arranca: no hay nada que girar.
  useEffect(() => {
    if (n > WHEEL_ROW_MAX_EVENTS) ensureLoop();
  }, [paused, dragging, tabHidden, reducedMotion, n, ensureLoop]);
  useEffect(() => () => {
    stopLoop();
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
  }, [stopLoop]);

  // Gira a la cara target por el camino más corto, desde donde esté el
  // tambor (puede ir a mitad de giro). v0 es la velocidad inicial en
  // grados por segundo: 0 en un paso normal, la del lanzamiento al soltar.
  const goTo = useCallback((target, v0 = 0) => {
    if (n <= WHEEL_ROW_MAX_EVENTS) return;
    const nextIndex = ((target % n) + n) % n;
    const currentTarget = targetRef.current;
    if (currentTarget && currentTarget.index === nextIndex && rafRef.current) return;
    const snapped = -nextIndex * step + 360 * Math.round((rotationRef.current + nextIndex * step) / 360);
    // Ya está ahí: solo se salta el resorte si el tambor ya está (casi) en
    // la rotación objetivo. Si quedó descentrado tras un arrastre corto,
    // el resorte lo vuelve al centro en vez de dejarlo torcido.
    if (!rafRef.current && Math.abs(snapped - rotationRef.current) < 0.5) return;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    setHeld(false);
    targetRef.current = { index: nextIndex, rotation: snapped };
    // Si el resorte ya va en marcha, conserva su velocidad (el giro sigue
    // fluido al cambiar de objetivo); solo se fija v0 al arrancar parado.
    if (!rafRef.current) velocityRef.current = v0;
    if (reducedMotion) {
      rotationRef.current = snapped;
      velocityRef.current = 0;
      indexRef.current = nextIndex;
      targetRef.current = null;
      setRotation(snapped);
      return;
    }
    ensureLoop();
  }, [n, step, reducedMotion, ensureLoop]);

  // Salto manual (punto): resorte a esa cara; el giro solo se
  // reanuda solo tras la pausa (ver el bucle).
  const jumpTo = useCallback((target) => goTo(target), [goTo]);

  useEffect(() => {
    const onVis = () => {
      tabHiddenRef.current = document.hidden;
      setTabHidden(document.hidden);
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const onPointerDown = (e) => {
    if (n <= WHEEL_ROW_MAX_EVENTS) return;
    stopLoop();
    targetRef.current = null;
    velocityRef.current = 0;
    if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    dragRef.current = { x: e.clientX, rotation: rotationRef.current, t: performance.now(), v: 0 };
    movedRef.current = false;
    setDraggingBoth(true);
    setPausedBoth(true);
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
    setDraggingBoth(false);
    setPausedBoth(false);
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

  // Encabezado: solo el título de sección, mismo tamaño (22 px) y estilo
  // que los demás títulos de la página (PR #196): mayúsculas y centrado.
  const header = (
    <header style={{ margin: '0 20px 16px', textAlign: 'center' }}>
      <h2 style={{ margin: 0, fontFamily: 'var(--heading)', fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', textTransform: 'uppercase', color: T.text }}>{headingText}</h2>
    </header>
  );

  // Etiqueta discreta al pie del póster: solo en la hilera simple (menos
  // de 3 eventos, sin tambor): la ciudad (inicio global) o la fecha del
  // evento (página de ciudad, vía pillLabel). En el tambor las tarjetas
  // son solo imagen, sin texto encima.
  const pill = (item) => {
    const label = pillLabel ? pillLabel(item) : cityName?.(item.citySlug);
    if (!label) return null;
    return <span className="event-wheel-city" aria-hidden="true">{label}</span>;
  };

  if (n === 0) return null;

  // Con pocos eventos no hay tambor: fila horizontal deslizable con las
  // tarjetas a tamaño completo. El scroll con snap es el indicador (sin
  // puntos de la rueda): se ve una tarjeta casi entera y un pico de la
  // siguiente, como las demás filas del inicio (TopImperdibles). La
  // tarjeta mide min(78%, 300px): a 300 px CSS y 3x en teléfono son
  // ~900 px de dispositivo, así que el póster va a 800 px (SRCSET_CARD),
  // no a 400 px: a 400 se veía blando, igual que le pasaba a la cara del
  // frente de la rueda (PR #264).
  if (n <= WHEEL_ROW_MAX_EVENTS) {
    return (
      <section style={{ marginBottom: 32 }}>
        {header}
        <div className="event-wheel-row scroll-fade-x" style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', margin: '0 -20px', padding: '0 20px 16px' }}>
          {items.map((item) => (
            <article key={item.key} onClick={() => onSelect?.(item)} style={{ flex: '0 0 min(78%, 300px)', scrollSnapAlign: 'start', borderRadius: 16, overflow: 'hidden', background: '#111', cursor: 'pointer' }}>
              <div style={{ position: 'relative', aspectRatio: '3 / 4' }}>
                {item.img ? (<><WheelFacePlaceholder title={item.title} dark={T.dark} /><OptimizedImage src={item.img} alt={item.title || ''} widthRequest={WHEEL_IMG_W} srcSetWidths={SRCSET_CARD} sizes="(max-width: 640px) 78vw, 300px" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'relative' }} /></>) : <EventPosterFallback title={item.title} radius={0} />}
                {pill(item)}
              </div>
            </article>
          ))}
        </div>
      </section>
    );
  }

  const frontItem = items[frontIdx];

  return (
    <section className="event-wheel" aria-label={headingText}>
      {header}
      <div
        className={`event-wheel-viewport${dragging ? ' event-wheel-dragging' : ''}`}
        style={{ perspective: '1000px' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onMouseEnter={() => { if (canHover) setPausedBoth(true); }}
        onMouseLeave={() => { if (canHover) setPausedBoth(false); }}
      >
        <div className="event-wheel-drum" style={{ transform: `rotateY(${rotation}deg)` }}>
          {items.map((item, i) => {
            const angle = normalizeAngleDeg(i * step + rotation);
            // Sin imagen montada hasta que la cara se acerca al frente:
            // la cara muestra el placeholder (shimmer + título), nunca
            // el fondo oscuro vacío. La base es de 400 px y la cara del
            // frente lleva encima la versión nítida a 800 px, que se
            // funde al cargar sin tapar nunca la base (si tarda o falla,
            // la base sigue viéndose).
            const faceLoaded = loadedFacesRef.current.has(i) || nearFaces.includes(i);
            const isFront = i === frontIdx;
            // Oscurecido de la cara lateral SIN filter: antes iba un
            // `filter: brightness(...)` en línea que cambiaba en cada
            // fotograma (el tambor gira a 60 fps) y obligaba al navegador
            // a re-rasterizar las 10 caras sin parar; en el teléfono, al
            // hacer scroll, el compositor no daba abasto y la sección
            // parpadeaba en blanco y negro (PR #194). Ahora la sombra es
            // un velo negro con opacidad —propiedad que el compositor
            // mueve sin re-rasterizar— y el resultado es idéntico:
            // velo negro al (1 - brillo) sobre la imagen da rgb*brillo,
            // lo mismo que brightness(brillo).
            const shadeOpacity = Math.round((1 - faceBrightness(angle, T.dark)) * 100) / 100;
            return (
              <div key={item.key} data-face={i} className="event-wheel-face" style={{ transform: `rotateY(${i * step}deg) translateZ(${radius}px)` }}>
                {item.img
                  ? (<>
                    <WheelFacePlaceholder title={item.title} dark={T.dark} />
                    {faceLoaded ? (<>
                      <OptimizedImage src={item.img} alt={item.title || ''} widthRequest={WHEEL_BASE_W} priority={i === 0} srcSetWidths={SRCSET_THUMB} sizes={WHEEL_BASE_SIZES} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'relative' }} />
                      {isFront ? <img className="event-wheel-front-img" src={getThumbUrl(item.img, WHEEL_IMG_W)} srcSet={getThumbSrcSet(item.img, SRCSET_CARD)} sizes={WHEEL_PRELOAD_SIZES} alt="" aria-hidden="true" loading="eager" fetchPriority="high" decoding="sync" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', opacity: 0, transition: 'opacity 0.3s ease-out', pointerEvents: 'none' }} onLoad={(e) => { e.currentTarget.style.opacity = '1'; }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      : null}
                    </>) : null}
                  </>)
                  : <EventPosterFallback title={item.title} radius={12} dark={T.dark} />}
                <span className="event-wheel-shade" aria-hidden="true" style={{ opacity: shadeOpacity }} />
              </div>
            );
          })}
        </div>
      </div>
      <footer className="event-wheel-footer">
        <div className="event-wheel-dots" role="group" aria-label={t('home_rueda_eventos', 'Eventos')}>
          {items.map((item, i) => (
            <button
              key={item.key}
              type="button"
              className={`event-wheel-dot${i === frontIdx ? ' event-wheel-dot-active' : ''}`}
              style={{ background: i === frontIdx ? (T.text || '#111') : 'rgba(128,128,128,0.45)' }}
              aria-label={`${t('home_rueda_ir_evento', 'Ir al evento')} ${i + 1}`}
              aria-current={i === frontIdx || undefined}
              onClick={() => jumpTo(i)}
            />
          ))}
        </div>
        <div className="event-wheel-nav">
          <button type="button" className="event-wheel-front-name" style={{ color: T.text }} onClick={() => onSelect?.(frontItem)}>{frontItem?.title || ''}</button>
        </div>
      </footer>
    </section>
  );
}
