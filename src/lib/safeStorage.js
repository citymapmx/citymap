// Escrituras a localStorage que nunca deben tumbar un flujo de usuario.
//
// localStorage en iOS Safari ronda los 5 MB y CityMap acumula cachés por
// ciudad (cg_data_*_v5, cg_mapPins_*, cg_experiences_*): cada ciudad
// visitada deja su caché y nada las borra hasta el cambio de versión de
// la app. Cuando se llena, setItem lanza QuotaExceededError
// ("The quota has been exceeded."). Si esa escritura va dentro del flujo
// de publicar una reseña, el usuario ve el error aunque la reseña ya
// quedó guardada en la base (y al reintentar, la duplica).
//
// Reglas de este módulo:
// - safeSetItem nunca lanza: devuelve true/false.
// - Ante falta de cuota, borra primero los cachés derivados de OTRAS
//   ciudades (son re-descargables) y reintenta una sola vez.
// - Nunca borra datos del usuario: favoritos, RSVP, colecciones,
//   reclamos, sesión ni ciudad guardada.

export const isQuotaError = (err) => {
  if (!err) return false;
  if (err.name === 'QuotaExceededError' || err.code === 22 || err.code === 1014) return true;
  return /quota/i.test(err.message || '');
};

const DERIVED_CACHE_PREFIXES = ['cg_mapPins_', 'cg_data_', 'cg_experiences_'];

const storageKeys = () => {
  if (typeof localStorage === 'undefined') return [];
  try {
    if (typeof localStorage.length === 'number' && typeof localStorage.key === 'function') {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) keys.push(k);
      }
      return keys;
    }
    return Object.keys(localStorage);
  } catch {
    return [];
  }
};

// Borra cachés derivados (re-descargables) salvo la clave que se está
// escribiendo. Devuelve cuántas claves borró.
export const evictDerivedCaches = (exceptKey = null) => {
  if (typeof localStorage === 'undefined' || typeof localStorage.removeItem !== 'function') return 0;
  let removed = 0;
  for (const key of storageKeys()) {
    if (key === exceptKey) continue;
    if (!DERIVED_CACHE_PREFIXES.some((p) => key.startsWith(p))) continue;
    try {
      localStorage.removeItem(key);
      removed++;
    } catch {
      // Seguir con la siguiente clave.
    }
  }
  return removed;
};

export const safeSetItem = (key, value) => {
  if (typeof localStorage === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (!isQuotaError(err)) return false;
    evictDerivedCaches(key);
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
};

// La caché de pines solo guarda la primera página (20 negocios), igual que
// hace loadMapPins al restaurar: el resto se vuelve a pedir por
// viewport/paginación. Guardar el array entero (que crece con cada
// desplazamiento del mapa) es lo que llenaba el almacenamiento.
export const persistMapPinsCache = (city, pins) => {
  if (!city || !Array.isArray(pins)) return false;
  return safeSetItem(`cg_mapPins_${city}`, JSON.stringify(pins.slice(0, 20)));
};
