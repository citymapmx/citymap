// Animaciones Lottie de citymap.mx (elegidas por Jonathan, 13 nov 2026,
// de la página de propuestas `propuestas-de-animaciones-para-citymap`).
//
// 1. Cubos vacíos — «Isometric Cubes Empty State Loader», de Ision
//    Industries. Estados vacíos (ciudad sin eventos, búsquedas sin
//    resultados, colecciones vacías). Bucle lento y discreto.
//    https://lottiefiles.com/free-animation/isometric-cubes-empty-state-loader-Uqa5D2iYi7
// 2. Confeti de logro — «Confetti on transparent background», de
//    Sportbank Design. Una sola reproducción sobre el contenido cuando
//    se completa la tarjeta de lealtad o se canjea un premio.
//    https://lottiefiles.com/free-animation/confetti-on-transparent-background-ajhx1TPBa7
// 3. Boleto de avión — «Plane Ticket - Blue», de Yelena Mirsakova.
//    Solo en el encabezado de /tours. Estuvo en el detalle del tour y
//    al inicio de Revista, pero Jonathan lo quitó de los dos (13 nov
//    2026): en Revista quedaba muy grande y estorbaba.
//    https://lottiefiles.com/free-animation/plane-ticket-blue-sfXVX08SYR
// 4. Trofeo de logro — «trophy», de Gift chuks. Junto al confeti en
//    ScanView (completar tarjeta / canjear premio) y cuando se completa
//    una colección en Mis Favoritos. Una sola reproducción.
//    https://lottiefiles.com/free-animation/trophy-LBsHjHO2kT
// 5. Check de confirmación — «Processing animation with a checkmark»,
//    de Aswathy. Gira como «procesando» y termina en la palomita. Al
//    confirmar asistencia (RSVP) y al guardar cambios (perfil y
//    negocio). Una sola reproducción.
//    https://lottiefiles.com/free-animation/processing-animation-with-a-checkmark-HM6usKDzO6
//
// 6. Pin de ubicación — «03 - Location». REMOTO (URL de LottieFiles,
//    verificada): punto de encuentro del detalle del tour. Bucle lento.
//    Elegido por Jonathan de la vista previa «Animaciones para el
//    detalle del tour» (13 nov 2026).
// 7. Reloj — «time». REMOTO (URL de LottieFiles, verificada): junto a
//    la duración del detalle del tour. Bucle lento. Elegido por
//    Jonathan de la misma vista previa.
//
// Las 1-5 son gratuitas bajo la Lottie Simple License y viven en
// public/lottie/ como archivos .lottie (dotLottie). Los archivos
// binarios se suben aparte: el flujo de PR no transporta binarios.
// Las 6-7 son REMOTAS: no hay binario en el repo, se cargan por URL
// con el mismo reproductor (DotLottieReact acepta URL remota; el
// servidor responde Access-Control-Allow-Origin: *, verificado).
// Si la URL falla o no hay red, LottieAnim se oculta solo.

export const CUBOS_VACIOS_SRC = '/lottie/cubos-vacios.lottie';
export const CONFETTI_LOGRO_SRC = '/lottie/confetti-logro.lottie';
export const BOLETO_AVION_SRC = '/lottie/boleto-avion.lottie';
export const TROFEO_LOGRO_SRC = '/lottie/trofeo-logro.lottie';
export const CHECK_CONFIRMACION_SRC = '/lottie/check-confirmacion.lottie';
export const PIN_UBICACION_SRC = 'https://assets-v2.lottiefiles.com/a/33adfd0a-1152-11ee-bf4c-cf4f5408cb33/Qw1z0D2rdR.lottie';
export const RELOJ_DURACION_SRC = 'https://assets-v2.lottiefiles.com/a/399811bc-1164-11ee-ab46-5f393e5d8bac/9mUqK6fQog.lottie';
