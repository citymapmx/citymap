// Caché sin internet de lo último visto: ficha y menú de un negocio.
//
// El muro ya se guarda por ciudad (cg_data_<ciudad>_v5 y cg_mapPins_<ciudad>),
// pero la ficha (fetchFullBusiness) y el menú (fetchStoreCategories) solo
// vivían en la memoria de React Query: al cerrar la app sin internet no
// había nada que mostrar. Aquí se guardan en localStorage la última ficha
// y el último menú vistos, para servirlos cuando la red falla.
//
// Reglas:
// - Nunca lanza: sin localStorage o sin cuota, leer devuelve null y
//   guardar devuelve false.
// - Máximo 20 entradas por tipo (LRU por orden de guardado): al pasar de
//   20 se borra la más vieja. La lista índice vive en cg_offline_index.
// - La ficha se guarda SIN reviews: DetailView las extrae aparte del
//   resultado de fetchFullBusiness y las reseñas cambian mucho; sin
//   internet la ficha se ve sin reseñas.
// - Las fotos NO se guardan: son URLs remotas y sin internet no cargan;
//   sin internet la ficha y el menú se ven en texto.

import { safeSetItem } from './safeStorage.js';

export const OFFLINE_BIZ_PREFIX = 'cg_biz_';
export const OFFLINE_MENU_PREFIX = 'cg_menu_';
export const OFFLINE_CACHE_INDEX_KEY = 'cg_offline_index';
export const OFFLINE_CACHE_MAX = 20;

const readJson = (key) => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const readIndex = () => {
  const parsed = readJson(OFFLINE_CACHE_INDEX_KEY);
  if (!parsed || typeof parsed !== 'object') return { biz: [], menu: [] };
  return {
    biz: Array.isArray(parsed.biz) ? parsed.biz.filter((id) => typeof id === 'string') : [],
    menu: Array.isArray(parsed.menu) ? parsed.menu.filter((id) => typeof id === 'string') : [],
  };
};

const writeIndex = (index) => safeSetItem(OFFLINE_CACHE_INDEX_KEY, JSON.stringify(index));

// Registra el id como el más reciente de su tipo y borra los más viejos
// si se pasa del máximo. Nunca lanza.
const touchIndex = (kind, id) => {
  try {
    const index = readIndex();
    const list = index[kind].filter((entry) => entry !== id);
    list.push(id);
    while (list.length > OFFLINE_CACHE_MAX) {
      const oldest = list.shift();
      try {
        if (typeof localStorage !== 'undefined') localStorage.removeItem(`${kind === 'biz' ? OFFLINE_BIZ_PREFIX : OFFLINE_MENU_PREFIX}${oldest}`);
      } catch {
        // Seguir: el índice es lo que manda.
      }
    }
    index[kind] = list;
    writeIndex(index);
  } catch {
    // El índice es un derivado: si no se puede escribir, la entrada
    // guardada sigue sirviendo aunque no entre en el LRU.
  }
};

export const readBizCache = (bizId) => {
  if (!bizId) return null;
  const parsed = readJson(`${OFFLINE_BIZ_PREFIX}${bizId}`);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return parsed;
};

export const saveBizCache = (bizId, biz) => {
  if (!bizId || !biz || typeof biz !== 'object' || Array.isArray(biz)) return false;
  // Sin reviews: DetailView las extrae aparte del resultado.
  const { reviews: _reviews, ...withoutReviews } = biz;
  const ok = safeSetItem(`${OFFLINE_BIZ_PREFIX}${bizId}`, JSON.stringify(withoutReviews));
  if (ok) touchIndex('biz', String(bizId));
  return ok;
};

export const readMenuCache = (bizId) => {
  if (!bizId) return null;
  const parsed = readJson(`${OFFLINE_MENU_PREFIX}${bizId}`);
  if (!Array.isArray(parsed)) return null;
  return parsed;
};

export const saveMenuCache = (bizId, categories) => {
  if (!bizId || !Array.isArray(categories)) return false;
  const ok = safeSetItem(`${OFFLINE_MENU_PREFIX}${bizId}`, JSON.stringify(categories));
  if (ok) touchIndex('menu', String(bizId));
  return ok;
};
