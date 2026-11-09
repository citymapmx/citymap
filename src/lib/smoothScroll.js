// Desplazamiento suave a un elemento (respeta "reducir movimiento").
//
// Se usa al expandir listas con "Ver más": tras cargar la tanda nueva, la
// vista se desliza hasta la primera tarjeta nueva en vez de que la lista
// crezca de golpe y la pantalla no se mueva (se veía brusco). Al contraer
// ("Ver menos") no se desplaza nada: quien llama decide cuándo invocar esto.
export function prefersReducedMotion() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function smoothScrollIntoView(el, block = 'nearest') {
  if (!el || typeof el.scrollIntoView !== 'function') return;
  el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block });
}
