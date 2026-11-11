import React, { useEffect, useRef, useState } from 'react';
import OptimizedImage from '../ui/OptimizedImage.jsx';
import SaveHeartButton from '../ui/SaveHeartButton.jsx';
import { SRCSET_CARD } from '../../lib/utils.js';
import { formatReviewCount } from '../../lib/googleRatings.js';
import { prefersReducedMotion } from '../../lib/smoothScroll.js';

// Tira tipo historias (PR #148; ajustes PR #149): las secciones
// «Lugares increíbles» y «Restaurantes que debes conocer» del inicio
// eran filas horizontales de tarjetas grandes ordenadas por calificación,
// así que siempre salían los mismos lugares primero y las dos filas
// ocupaban mucho alto. Ahora cada sección muestra UN lugar a la vez en
// una tarjeta panorámica que rota sola, estilo historias: deslizamiento
// fluido tipo carrusel, puntos sutiles debajo de la imagen, zoom lento
// en la foto y arranque en un lugar al azar en cada visita.
//
// Dos decisiones medidas, no capricho:
// - STORY_MAX_ITEMS = 12: la lista de restaurantes tiene 128 lugares y
//   la de lugares ~35; con todos, los puntos serían ilegibles y una
//   vuelta completa tardaría 8 minutos. La tira rota entre los 12 mejor
//   calificados de la lista (el orden por calificación no cambia) y el
//   arranque al azar hace que cada visita empiece en uno distinto.
// - La tarjeta mide clamp(140px, 36vw, 240px) de alto: un 16:9 a lo
//   ancho sería MÁS alto que la fila actual (219 px en un teléfono de
//   390 px, 675 px en escritorio), así que la altura está topada para
//   que la tira ocupe claramente menos alto que los 168 px de la fila.
//
// Desincronización (PR #149): cada sección pasa su propio intervalo y
// sentido de giro (intervalMs, direction). Lugares gira hacia adelante
// cada 4 s y Restaurantes hacia atrás cada 6 s, así las dos tiras no se
// mueven a la vez ni se ven iguales; el arranque al azar las separa más.
export const STORY_MS = 4000;
export const STORY_MAX_ITEMS = 12;
const SLIDE_MS = 500;
const SWIPE_MIN_PX = 60;

export default function StoryStrip({ items = [], T, t, onSelect, isSaved, onToggleSave, cityName, ratingFor, intervalMs = STORY_MS, direction = 'next' }) {
  const pool = (items || []).slice(0, STORY_MAX_ITEMS);
  const total = pool.length;
  // Arranque al azar en cada visita: el primer lugar que se ve cambia
  // de una visita a otra, en vez de ser siempre el mejor calificado.
  // PR #151: el inicializador NO depende de `total` — al montar, los
  // datos aún no han cargado y `total` es 0, así que antes `i` quedaba
  // en 0 siempre y la tira arrancaba en el lugar #1. Con
  // STORY_MAX_ITEMS el arranque es aleatorio de verdad; `idx = i %
  // total` ya lo acota cuando la lista llega (y si trae menos de 12,
  // también vale).
  const [i, setI] = useState(() => Math.floor(Math.random() * STORY_MAX_ITEMS));
  const [paused, setPaused] = useState(false);
  // Sin transición durante el salto de la vuelta (del último al primero):
  // la pista no barre las 12 tarjetas de regreso.
  const [noAnim, setNoAnim] = useState(false);
  // Arrastre táctil en curso (null = sin arrastre): la pista sigue al dedo.
  const [dragX, setDragX] = useState(null);
  const touchStart = useRef(null);
  const reduceMotion = prefersReducedMotion();
  const idx = total ? i % total : 0;
  const item = pool[idx];

  // Avanza una posición en el sentido dado; al dar la vuelta el salto es
  // instantáneo (noAnim), para que la pista no deslice por todas las
  // tarjetas de regreso. Las flechas mantienen su sentido habitual
  // (anterior/siguiente en el orden de la lista); solo el auto-avance
  // usa `direction`.
  const advance = (dir) => {
    if (!total) return;
    const wrapped = (dir === 1 && idx === total - 1) || (dir === -1 && idx === 0);
    if (wrapped) setNoAnim(true);
    setI((x) => (x + dir + total) % total);
  };
  const prev = () => advance(-1);
  const next = () => advance(1);
  const goTo = (n) => { if (n !== idx) setI(n); };

  // El salto instantáneo de la vuelta dura un fotograma: la transición
  // se vuelve a activar justo después, para el siguiente cambio.
  useEffect(() => {
    if (!noAnim) return;
    const timer = window.setTimeout(() => setNoAnim(false), 50);
    return () => window.clearTimeout(timer);
  }, [noAnim]);

  // Pausa el automático con la pestaña oculta (no avanza en segundo plano).
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Avance automático cada `intervalMs` en el sentido de `direction`.
  // Depende de `idx`: cada cambio de lugar (manual o automático)
  // reinicia el conteo, así nunca interrumpe al usuario a mitad de
  // mirar un lugar. Sin avance con prefers-reduced-motion, con la
  // pestaña oculta ni mientras se arrastra con el dedo.
  const canAutoplay = total > 1 && !reduceMotion && !paused && dragX === null;
  useEffect(() => {
    if (!canAutoplay) return;
    const timer = window.setTimeout(() => advance(direction === 'prev' ? -1 : 1), intervalMs);
    return () => window.clearTimeout(timer);
    // advance lee `idx`, que está en las dependencias: el cierre es fresco.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAutoplay, idx, total, direction, intervalMs]);

  // Swipe táctil: deslizar con el dedo cambia de tarjeta; la pista sigue
  // al dedo (sin transición durante el arrastre) y al soltar completa el
  // cambio si el gesto supera SWIPE_MIN_PX. touchAction pan-y: el
  // navegador conserva el scroll vertical de la página; si el gesto es
  // claramente vertical, se cancela el arrastre y la página hace scroll.
  const onTouchStart = (e) => {
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    setDragX(0);
  };
  const onTouchMove = (e) => {
    if (!touchStart.current) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      touchStart.current = null;
      setDragX(null);
      return;
    }
    setDragX(dx);
  };
  const onTouchEnd = () => {
    if (dragX !== null && Math.abs(dragX) > SWIPE_MIN_PX) advance(dragX < 0 ? 1 : -1);
    setDragX(null);
    touchStart.current = null;
  };

  if (!item) return null;

  const trackTransition = reduceMotion || noAnim || dragX !== null
    ? 'none'
    : `transform ${SLIDE_MS}ms cubic-bezier(0.32, 0.72, 0, 1)`;

  return (
    <div style={{ width: '100%' }}>
      <article
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          position: 'relative',
          width: '100%',
          height: 'clamp(140px, 36vw, 240px)',
          borderRadius: 16,
          overflow: 'hidden',
          border: `1px solid ${T.border}`,
          background: '#111',
          cursor: 'pointer',
          boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
          touchAction: 'pan-y',
        }}
      >
        {/* Pista deslizante: las tarjetas en fila; la pista se mueve con
            translateX y una transición suave de 0,5 s, como un carrusel,
            en vez del corte instantáneo de antes. El corazón y las
            flechas van fuera de la pista, así no se mueven con ella. */}
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            transform: dragX !== null
              ? `translateX(calc(${-idx * 100}% + ${dragX}px))`
              : `translateX(${-idx * 100}%)`,
            transition: trackTransition,
          }}
        >
          {pool.map((it, n) => {
            const rating = ratingFor ? ratingFor(it) : null;
            const city = cityName ? cityName(it.citySlug) : '';
            return (
              <div
                key={it.key}
                onClick={() => onSelect && onSelect(it)}
                style={{ flex: '0 0 100%', position: 'relative', height: '100%', overflow: 'hidden', cursor: 'pointer' }}
              >
                {/* Foto con zoom lento (kenburns): solo la foto activa lo
                    lleva (la clase se pone solo en ella, así el zoom
                    arranca al entrar la tarjeta); dura lo mismo que el
                    intervalo de la tira, para que complete al cambiar. */}
                <div
                  className={n === idx ? 'story-kenburns' : undefined}
                  style={{ position: 'absolute', inset: 0, animationDuration: `${intervalMs}ms`, WebkitAnimationDuration: `${intervalMs}ms` }}
                >
                  {it.img ? (
                    <OptimizedImage
                      src={it.img}
                      alt={it.title || ''}
                      widthRequest={800}
                      srcSetWidths={SRCSET_CARD}
                      sizes="(max-width: 640px) 100vw, 800px"
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, background: 'linear-gradient(135deg,#111,#333)' }}>📍</div>
                  )}
                </div>
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.75), transparent 55%)' }} />

                <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10, zIndex: 4 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.25, margin: '0 0 2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{it.title}</h3>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {city}{rating && rating.rating ? ` · ★ ${Number(rating.rating).toFixed(1)}${rating.count ? ` (${formatReviewCount(rating.count)})` : ''}` : ''}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <SaveHeartButton
          isFav={isSaved ? isSaved(item) : false}
          onToggle={(e) => onToggleSave && onToggleSave(e, item)}
          size={26}
          overlay
          ariaLabel={t ? t('home_guardar', 'Guardar') : 'Guardar'}
          buttonStyle={{ position: 'absolute', top: 8, right: 8, width: 44, height: 44, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}
        />

        {/* Flechas para avanzar/retroceder a mano sin abrir el detalle. */}
        {total > 1 && (
          <>
            <button
              aria-label={t ? t('story_anterior', 'Anterior') : 'Anterior'}
              onClick={(e) => { e.stopPropagation(); prev(); }}
              style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 22, lineHeight: 1, cursor: 'pointer', zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ‹
            </button>
            <button
              aria-label={t ? t('story_siguiente', 'Siguiente') : 'Siguiente'}
              onClick={(e) => { e.stopPropagation(); next(); }}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,0.45)', color: '#fff', fontSize: 22, lineHeight: 1, cursor: 'pointer', zIndex: 6, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ›
            </button>
          </>
        )}
      </article>

      {/* Puntos sutiles debajo de la imagen (PR #149): sustituyen a las
          barras de progreso que iban sobre la foto. Mismo lenguaje que
          los puntos de la galería de la ficha (Gallery.jsx): el activo
          es una píldora corta, los demás puntitos discretos con opacidad
          baja. Tocar un punto salta a ese lugar. Sin animación de
          llenado. PR #151: SIN transición — la transición de ancho y
          opacidad se atascaba a mitad en el WebView del teléfono con
          el avance automático y dejaba una estela de puntos a medio
          activar (una barra larga en vez de una sola píldora). El
          cambio es instantáneo: un punto es 6 px tenue o 16 px
          brillante, nada entre medias. */}
      {total > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 10 }}>
          {pool.map((it, n) => (
            <button
              key={it.key}
              aria-label={t ? t('story_ir_a', `Ir al lugar ${n + 1} de ${total}`) : `Ir al lugar ${n + 1} de ${total}`}
              onClick={(e) => { e.stopPropagation(); goTo(n); }}
              style={{
                // Área táctil de 24×24 (WCAG 2.2): el punto visual sigue
                // midiendo 6 px de alto; el margen negativo compensa el
                // alto para que la fila no crezca (el diseño no cambia).
                width: 24,
                height: 24,
                margin: '-9px 0',
                padding: 0,
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: n === idx ? 16 : 6,
                  height: 6,
                  borderRadius: 3,
                  background: T.text,
                  opacity: n === idx ? 1 : 0.25,
                  display: 'block',
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
