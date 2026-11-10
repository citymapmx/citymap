// Entrada en cascada del lote inicial (demo #2 de "15 animaciones para
// citymap", elegida por Jonathan, nov 2026): al abrir una pantalla, las
// tarjetas del lote inicial suben una tras otra con un mini retraso entre
// cada una, en vez de aparecer todas a la vez.
//
// Animación: Animista fade-in-bottom (verificado en animista.net —
// existe en /play/entrances/fade-in/fade-in-bottom): opacidad 0 +
// translateY → opacidad 1 + translateY(0), con su easing exacto
// cubic-bezier(0.390, 0.575, 0.565, 1.000). El canon de Animista usa
// translateY(50px) y 0.6 s; aquí van los valores de la demo que Jonathan
// eligió (22px, 0.55 s), más suaves para una lista. El retraso
// escalonado (~0.13 s por tarjeta, con tope de 0.6 s para no hacer
// esperar en listas largas) también es de la demo.
//
// Solo el lote inicial: lo que llega con "Ver más" sigue entrando con
// scale-in-ver-top (PR #136), nunca con cascada. Solo transform/opacity:
// no mueve el layout ni cambia la altura que Virtuoso mide.
export const CASCADE_STEP_S = 0.13;
export const CASCADE_MAX_DELAY_S = 0.6;
export const CASCADE_DURATION_S = 0.55;

// Retraso de entrada de la tarjeta `index` del lote inicial, en segundos.
export const cascadeDelayS = (index) =>
  Math.round(Math.min(index * CASCADE_STEP_S, CASCADE_MAX_DELAY_S) * 100) / 100;

// Ventana de entrada: retraso máximo + duración, con margen. Pasado ese
// tiempo la clase se quita para que las filas no re-animen al remontarse
// (Virtuoso recicla filas al bajar y subir).
export const CASCADE_WINDOW_MS = 1300;
