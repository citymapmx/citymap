// Safe-area superior de iOS para encabezados a pantalla completa.
//
// Las sub-vistas que cubren toda la pantalla (Diseño de mi menú, Tarjetas
// de Lealtad, Estadísticas, Reservaciones, Mis Favoritos, Notificaciones,
// Mis Planes, Términos, etc.) tienen su propio encabezado pegado arriba y
// el header principal de App.jsx no se muestra en esas rutas, así que su
// título/flecha chocaba con la hora y la barra de estado del iPhone
// (reportado 14 nov 2026, 6 capturas + drawer, selector de ciudad,
// Para Negocios y mapa ampliado).
//
// safeAreaTop(basePx) devuelve el padding superior que respeta el
// safe-area: en iOS env(safe-area-inset-top) es la altura de la barra de
// estado (~47 px en iPhone 12) y el contenido baja por debajo de ella;
// en web env(...) = 0 y el padding queda exactamente igual que antes
// (calc(0px + basePx) = basePx), así que nada se mueve fuera de iOS.
export function safeAreaTop(basePx) {
  return `calc(env(safe-area-inset-top, 0px) + ${basePx}px)`;
}
