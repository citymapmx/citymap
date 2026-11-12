// Carrusel de «Experiencias destacadas»: constantes y lógica pura del
// avance automático (aquí, no en el componente, para no romper el
// fast refresh de React).
// Avance automático: 4.5 s por tarjeta, en bucle.
export const EXPERIENCIAS_AUTOPLAY_MS = 4500;
// Pausa tras interactuar (deslizar, tocar un punto o usar las flechas)
// antes de reanudar el avance automático.
export const EXPERIENCIAS_RESUME_AFTER_MS = 6000;

// Índice siguiente en bucle.
export function nextExperienciasIndex(current, count) {
  if (!count || count < 1) return 0;
  return (((current + 1) % count) + count) % count;
}
