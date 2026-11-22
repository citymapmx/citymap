// Decisiones de arranque para recortar las ~100 peticiones de la primera
// visita (hallazgos A9/A10/A11 de fluidez, 21 nov 2026). Son funciones
// puras para poder probarlas sin montar la app (mismo patrón que
// shouldHoldSplashForSavedCity en savedCityBoot.js).

// A9 — En «/» sin ciudad guardada la ciudad es la de por defecto
// (guadalajara/parís) y el muro global hace sus propias consultas: solo
// necesita `cities` del store, que ya carga el efecto de arranque con
// refreshCities. Cargar la ciudad entera ahí (~16-18 peticiones) es
// desperdicio; al elegir ciudad desde el muro, handleCitySelect ya llama
// a loadData. La excepción son los enlaces profundos (?b=, ?ev=,
// ?vista=, ?cat=, etc.): esa vista sí necesita los datos de la ciudad.
export function shouldSkipCityLoadOnRoot({ citySlugIsDefault, pathname, hasDeepLink }) {
  return Boolean(citySlugIsDefault) && pathname === '/' && !hasDeepLink;
}

// A11 — Popularidad por ciudad («Explora por ciudad»): 80 HEAD por
// montaje del muro, sin caché. Los conteos solo ordenan la lista, así
// que un dato de hace horas es suficiente: se guardan 6 h en
// localStorage. La primera visita paga los 80 una vez; las siguientes,
// cero.
export const POP_COUNTS_KEY = 'cg_city_counts_v1';
export const POP_COUNTS_TTL_MS = 6 * 60 * 60 * 1000;

export function readCachedPopCounts() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(POP_COUNTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !parsed.counts) return null;
    if (Date.now() - (parsed.savedAt || 0) > POP_COUNTS_TTL_MS) return null;
    return parsed.counts;
  } catch {
    return null;
  }
}

export function savePopCounts(counts) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(
      POP_COUNTS_KEY,
      JSON.stringify({ savedAt: Date.now(), counts }),
    );
  } catch {
    // Sin almacenamiento: los conteos se vuelven a pedir en el próximo
    // montaje, como antes.
  }
}

// A11 — La visita va a redirigir a la ciudad guardada (entrada rápida
// con caché o tardía tras cargar): el muro se desmonta en milisegundos
// o queda tapado por el splash, así que los conteos no se ven. En ese
// caso ni se piden. Si la ciudad guardada ya no existe, el muro se
// queda y la lista se ordena por nombre (el orden por popularidad
// vuelve en la siguiente visita, cuando el caché ya no tiene la ciudad
// guardada).
export function isPlainRootWithSavedCity(pathname, search, hash, savedCity) {
  return pathname === '/' && !search && !hash && Boolean(savedCity);
}
