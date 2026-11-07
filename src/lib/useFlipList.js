import { useCallback, useLayoutEffect, useRef } from 'react';
import { computeFlipMoves } from './flip.js';

const FLIP_MS = 350;

function nextFrame(cb) {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(cb);
  }
  return setTimeout(cb, 16);
}

// Anima el reorden de una lista cuando cambia el filtro (idea 2 de
// motion.dev): las tarjetas que se quedan se deslizan a su nuevo lugar
// (FLIP: mide antes, invierte el salto con un transform y lo suelta con
// transición) y las nuevas entran con un fundido y una leve subida. Solo
// anima transform y opacidad, para que no se trabe en el teléfono. Con
// prefers-reduced-motion no anima nada.
//
// Uso: const register = useFlipList(items.map(i => i.id).join(','));
//      <article ref={register(item.id)}>…
export function useFlipList(keys) {
  const itemRefs = useRef(new Map());
  const prevRects = useRef(new Map());
  const reduced = useRef(false);

  const register = useCallback(
    (key) => (el) => {
      if (el) itemRefs.current.set(key, el);
      else itemRefs.current.delete(key);
    },
    [],
  );

  useLayoutEffect(() => {
    if (
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      reduced.current = true;
    }
    const next = new Map();
    itemRefs.current.forEach((el, key) => {
      try {
        next.set(key, el.getBoundingClientRect());
      } catch {
        // Sin geometría (SSR o nodo desmontado): sin animación.
      }
    });
    if (!reduced.current) {
      const moves = computeFlipMoves(prevRects.current, next);
      moves.forEach((move, key) => {
        const el = itemRefs.current.get(key);
        if (!el) return;
        if (move.enter) {
          el.style.transition = 'none';
          el.style.opacity = '0';
          el.style.transform = 'translateY(10px)';
          nextFrame(() => {
            el.style.transition = `opacity 300ms ease, transform ${FLIP_MS}ms cubic-bezier(.22,1,.36,1)`;
            el.style.opacity = '';
            el.style.transform = '';
            setTimeout(() => {
              el.style.transition = '';
            }, FLIP_MS + 50);
          });
          return;
        }
        el.style.transition = 'none';
        el.style.transform = `translate(${move.dx}px, ${move.dy}px)`;
        nextFrame(() => {
          el.style.transition = `transform ${FLIP_MS}ms cubic-bezier(.22,1,.36,1)`;
          el.style.transform = '';
          setTimeout(() => {
            el.style.transition = '';
          }, FLIP_MS + 50);
        });
      });
    }
    prevRects.current = next;
  }, [keys]);

  return register;
}
