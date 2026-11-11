// Decisión de arranque: en qué rutas la app NO debe navegar al resolver los
// enlaces profundos. La URL ya dice dónde estar; AppRouter la resuelve.
//
// Causa raíz del salto /tepic → / (10 nov 2026): el efecto de arranque de
// App.jsx trataba una ruta de ciudad de un solo segmento como "no es
// detalle ni categoría ni sección" y llamaba navigate("home"). Con la
// ciudad activa todavía vacía en ese efecto (perfil limpio, sin ciudad
// guardada), el "home" se resolvía a "/" y el visitante nuevo que abría un
// enlace directo a una ciudad acababa en el muro global. Con una ciudad
// anterior guardada, la URL acababa en esa ciudad aunque el contenido era
// el de la URL (p. ej. contenido de Guadalajara con URL /tepic).
import { buildCityPath } from './domain.js';

// Prefijos que nunca son el inicio de una ciudad (misma lista que usaba el
// efecto de arranque de App.jsx).
export const NON_HOME_PREFIXES_INIT = [
  '/mapa', '/eventos', '/explorar', '/explorer', '/mis-planes', '/revista',
  '/experiencias', '/tours', '/negocios', '/planes', '/favoritos', '/cuenta',
  '/itinerarios', '/itinerario', '/plan', '/about', '/privacy', '/terms',
  '/admin_notifs', '/user_notifs', '/manage', '/stats', '/precios',
  '/lealtad', '/wallet', '/scan', '/login',
];

// ¿La app debe quedarse en esta ruta al arrancar, sin navegar a "home"?
// - Secciones y rutas de sistema: sí (las resuelve AppRouter).
// - Detalle o categoría (2+ segmentos): sí (/tepic/emilianos,
//   /tepic/c/restaurantes).
// - Inicio de ciudad de un solo segmento: sí (/tepic). Es la ruta válida
//   de la ciudad; quedarse es lo que hace que un enlace directo funcione.
//   Las ciudades borradas (Chapala, Zapotlán) también se quedan aquí: su
//   404 para Google viene del middleware y su página vacía para usuarios es
//   el comportamiento vigente — aquí no se redirige nada.
// - "/": no (se resuelve aparte: muro global o ciudad guardada).
export function isStayOnInitialPath(pathname) {
  if (NON_HOME_PREFIXES_INIT.some((p) => pathname.startsWith(p))) return true;
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length >= 2) return true;
  if (segments.length === 1) return true;
  return false;
}

// Ruta de "Inicio" para navigate("home"). La ciudad que se pasa debe ser la
// VIVA (del store en el momento de la llamada), no la del cierre del efecto
// de arranque: en perfil limpio esa era "" y el home acababa en "/", y al
// abrir otro enlace era la ciudad anterior y la URL acababa en ella.
export function resolveHomePath({ pathname, activeCity, cities = [] }) {
  if (pathname === '/') return '/';
  return buildCityPath(activeCity, cities);
}
