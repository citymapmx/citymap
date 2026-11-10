import React, { useEffect, useState } from 'react';
import OptimizedImage from '../ui/OptimizedImage.jsx';
import SaveHeartButton from '../ui/SaveHeartButton.jsx';
import { SRCSET_CARD } from '../../lib/utils.js';
import { formatReviewCount } from '../../lib/googleRatings.js';
import { prefersReducedMotion } from '../../lib/smoothScroll.js';

// Tira tipo historias (PR #148): las secciones «Lugares increíbles» y
// «Restaurantes que debes conocer» del inicio eran filas horizontales de
// tarjetas grandes ordenadas por calificación, así que siempre salían
// los mismos lugares primero y las dos filas ocupaban mucho alto. Ahora
// cada sección muestra UN lugar a la vez en una tarjeta panorámica que
// rota sola, estilo historias: barras de progreso arriba, zoom lento en
// la foto y arranque en un lugar al azar en cada visita.
//
// Dos decisiones medidas, no capricho:
// - STORY_MAX_ITEMS = 12: la lista de restaurantes tiene 128 lugares y
//   la de lugares ~35; con todos, las barras de progreso serían
//   ilegibles y una vuelta completa tardaría 8 minutos. La tira rota
//   entre los 12 mejor calificados de la lista (el orden por calificación
//   no cambia) y el arranque al azar hace que cada visita empiece en
//   uno distinto.
// - La tarjeta mide clamp(140px, 36vw, 240px) de alto: un 16:9 a lo
//   ancho sería MÁS alto que la fila actual (219 px en un teléfono de
//   390 px, 675 px en escritorio), así que la altura está topada para
//   que la tira ocupe claramente menos alto que los 168 px de la fila.
export const STORY_MS = 4000;
export const STORY_MAX_ITEMS = 12;

export default function StoryStrip({ items = [], T, t, onSelect, isSaved, onToggleSave, cityName, ratingFor }) {
  const pool = (items || []).slice(0, STORY_MAX_ITEMS);
  const total = pool.length;
  // Arranque al azar en cada visita: el primer lugar que se ve cambia
  // de una visita a otra, en vez de ser siempre el mejor calificado.
  const [i, setI] = useState(() => (total ? Math.floor(Math.random() * total) : 0));
  const [paused, setPaused] = useState(false);
  const reduceMotion = prefersReducedMotion();
  const idx = total ? i % total : 0;
  const item = pool[idx];

  const prev = () => setI((x) => (x - 1 + total) % total);
  const next = () => setI((x) => (x + 1) % total);
  const goTo = (n) => setI(n);

  // Pausa el automático con la pestaña oculta (no avanza en segundo plano).
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Avance automático cada 4 s. Depende de `idx`: cada cambio de lugar
  // (manual o automático) reinicia el conteo, así nunca interrumpe al
  // usuario a mitad de mirar un lugar. Sin avance con
  // prefers-reduced-motion ni con la pestaña oculta.
  const canAutoplay = total > 1 && !reduceMotion && !paused;
  useEffect(() => {
    if (!canAutoplay) return;
    const timer = window.setTimeout(() => setI((x) => (x + 1) % total), STORY_MS);
    return () => window.clearTimeout(timer);
  }, [canAutoplay, idx, total]);

  if (!item) return null;
  const rating = ratingFor ? ratingFor(item) : null;
  const city = cityName ? cityName(item.citySlug) : '';

  return (
    <article
      onClick={() => onSelect && onSelect(item)}
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
      }}
    >
      {/* Foto activa con zoom lento (kenburns): solo la foto se mueve, el
          texto no. key={idx} reinicia el zoom al cambiar de lugar. */}
      <div key={idx} className="story-kenburns" style={{ position: 'absolute', inset: 0 }}>
        {item.img ? (
          <OptimizedImage
            src={item.img}
            alt={item.title || ''}
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

      {/* Barras de progreso, estilo historias: un segmento por lugar; el
          activo se llena en 4 s, los anteriores ya están llenos. Tocar un
          segmento salta a ese lugar. El hueco a la derecha deja libre el
          corazón. */}
      <div style={{ position: 'absolute', top: 10, left: 12, right: 60, display: 'flex', gap: 4, zIndex: 5 }}>
        {pool.map((it, n) => (
          <button
            key={it.key}
            aria-label={t ? t('story_ir_a', `Ir al lugar ${n + 1} de ${total}`) : `Ir al lugar ${n + 1} de ${total}`}
            onClick={(e) => { e.stopPropagation(); goTo(n); }}
            style={{ flex: 1, height: 3, borderRadius: 2, border: 'none', padding: 0, background: 'rgba(255,255,255,0.35)', overflow: 'hidden', cursor: 'pointer' }}
          >
            {n < idx && <span style={{ display: 'block', height: '100%', width: '100%', background: '#fff' }} />}
            {n === idx && <span className="story-progress-fill" style={{ display: 'block', height: '100%', width: '100%', background: '#fff' }} />}
          </button>
        ))}
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

      <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10, zIndex: 4 }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', lineHeight: 1.25, margin: '0 0 2px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{item.title}</h3>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', margin: 0, lineHeight: 1.4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {city}{rating && rating.rating ? ` · ★ ${Number(rating.rating).toFixed(1)}${rating.count ? ` (${formatReviewCount(rating.count)})` : ''}` : ''}
        </p>
      </div>
    </article>
  );
}
