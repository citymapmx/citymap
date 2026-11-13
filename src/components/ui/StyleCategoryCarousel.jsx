// Carrusel de categorías de estilos (PR #297/#298, compartido por el
// diseñador del menú y el wizard de la tarjeta de lealtad).
//
// Una categoría visible a la vez en cuadrícula 3×3 (9 estilos), con
// deslizamiento horizontal (scroll-snap nativo, funciona en navegador y
// en la WebView de la app), puntos abajo para saltar de categoría y loop
// infinito: [clon Coloridos, Premium, Sobrios, Cafetería, Coloridos,
// clon Premium]. Al asentarse sobre un clon, salta sin animación a la
// página real equivalente (mismo contenido, sin salto visible). Al abrir,
// la página es la categoría inicial que pasa quien lo monta (la del
// estilo guardado, o Premium).
// El deslizamiento vertical sobre los círculos sigue bajando la página:
// touch-action pan-x pan-y deja que el navegador elija según la
// dirección del gesto (con solo pan-x el vertical moría ahí).
//
// Props:
// - selectedId: id del estilo seleccionado (o null)
// - onSelectStyle(style): al tocar un estilo
// - initialCategoryId: categoría con la que abre el carrusel
// - tokens: { bg, border, text, sub } — colores del fondo sobre el que
//   va el carrusel (anillo, borde del círculo, texto, título)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LOYALTY_COLOR_CATEGORIES,
  loyaltyStyleBackground,
  menuThemeForStyle,
} from '../../lib/menuColorStyles.js';

export default function StyleCategoryCarousel({ selectedId, onSelectStyle, initialCategoryId, tokens }) {
  const t = tokens || { bg: '#FFFFFF', border: '#E4E4E7', text: '#18181B', sub: '#71717A' };

  const PAGE_COUNT = LOYALTY_COLOR_CATEGORIES.length;
  const carouselPages = [
    { cat: LOYALTY_COLOR_CATEGORIES[PAGE_COUNT - 1], key: 'clone-last' },
    ...LOYALTY_COLOR_CATEGORIES.map((cat) => ({ cat, key: cat.id })),
    { cat: LOYALTY_COLOR_CATEGORIES[0], key: 'clone-first' },
  ];
  const initialPage = Math.max(0, LOYALTY_COLOR_CATEGORIES.findIndex(
    (cat) => cat.id === (initialCategoryId || 'premium')
  ));
  const initialPageRef = useRef(initialPage);
  const [page, setPage] = useState(initialPage);
  const carouselRef = useRef(null);
  const settleTimerRef = useRef(null);
  // Posición del clon -> página real: la posición 0 es la última
  // categoría y PAGE_COUNT + 1 es la primera.
  const repositionLoop = useCallback((el) => {
    if (!el.clientWidth) return;
    const pos = Math.round(el.scrollLeft / el.clientWidth);
    if (pos === 0) el.scrollTo({ left: PAGE_COUNT * el.clientWidth, behavior: 'auto' });
    else if (pos === PAGE_COUNT + 1) el.scrollTo({ left: el.clientWidth, behavior: 'auto' });
  }, [PAGE_COUNT]);
  // Ref estable: pone el carrusel en la página inicial antes del primer
  // pintado (sin flash de Premium) y no se re-ejecuta al re-renderizar
  // (p. ej. al elegir un estilo, que no debe mover el carrusel). La
  // posición inicial es initialPage + 1 por el clon de la izquierda.
  const setCarouselRef = useCallback((el) => {
    carouselRef.current = el;
    if (el) el.scrollLeft = (initialPageRef.current + 1) * el.clientWidth;
  }, []);
  const handleCarouselScroll = (e) => {
    const el = e.currentTarget;
    if (!el.clientWidth) return;
    const pos = Math.max(0, Math.min(PAGE_COUNT + 1, Math.round(el.scrollLeft / el.clientWidth)));
    // Posición -> categoría real: el clon envuelve (0 = última, PAGE_COUNT + 1 = primera).
    const real = (pos - 1 + PAGE_COUNT) % PAGE_COUNT;
    if (real !== page) setPage(real);
    // Cuando el deslizamiento se asienta sobre un clon, saltar a la
    // página real equivalente (el contenido es idéntico, no se nota).
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(() => repositionLoop(el), 100);
  };
  const goToCategory = (idx) => {
    setPage(idx);
    const el = carouselRef.current;
    if (el) el.scrollTo({ left: (idx + 1) * el.clientWidth, behavior: 'smooth' });
  };
  // Limpieza del temporizador al desmontar.
  useEffect(() => () => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
  }, []);

  return (
    <>
      {/* CARRUSEL: una categoría por página, se desliza de lado */}
      <div
        ref={setCarouselRef}
        onScroll={handleCarouselScroll}
        style={{ display: 'flex', overflowX: 'auto', overflowY: 'hidden', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x pan-y', overscrollBehaviorX: 'contain' }}
      >
        {carouselPages.map(({ cat, key }) => (
          <div key={key} style={{ flex: '0 0 100%', scrollSnapAlign: 'start', boxSizing: 'border-box', padding: '0 2px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: t.sub, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' }}>{cat.label}</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {cat.styles.map((style) => {
                const isSelected = selectedId === style.id;
                const styleTheme = menuThemeForStyle(style);
                return (
                  <button
                    key={style.id}
                    onClick={() => onSelectStyle(style)}
                    aria-pressed={isSelected}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '6px 2px', border: 'none', background: 'transparent', cursor: 'pointer' }}
                  >
                    <span style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                      <span style={{ width: 44, height: 44, borderRadius: '50%', background: loyaltyStyleBackground(style), border: `1px solid ${t.border}`, display: 'block', boxShadow: isSelected ? `0 0 0 2px ${t.bg}, 0 0 0 4px ${styleTheme ? styleTheme.primary : t.text}` : 'none' }} />
                      {isSelected && (
                        <span style={{ position: 'absolute', right: -2, top: -2, width: 18, height: 18, borderRadius: '50%', background: styleTheme ? styleTheme.primary : t.text, color: styleTheme ? styleTheme.onPrimary : '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, border: `2px solid ${t.bg}` }}>✓</span>
                      )}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: isSelected ? 800 : 600, color: isSelected ? (styleTheme ? styleTheme.primary : t.text) : t.text, textAlign: 'center', lineHeight: 1.3 }}>{style.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* PUNTOS: una por categoría, tocables para saltar */}
      <div role="tablist" aria-label="Categorías de estilos" style={{ display: 'flex', gap: 8, justifyContent: 'center', paddingTop: 14 }}>
        {LOYALTY_COLOR_CATEGORIES.map((cat, idx) => (
          <button
            key={cat.id}
            onClick={() => goToCategory(idx)}
            aria-label={`Ir a ${cat.label}`}
            aria-current={idx === page ? 'true' : undefined}
            style={{ width: idx === page ? 22 : 8, height: 8, borderRadius: 999, border: 'none', padding: 0, background: idx === page ? t.text : t.border, cursor: 'pointer', transition: 'width .2s ease, background .2s ease' }}
          />
        ))}
      </div>
    </>
  );
}
