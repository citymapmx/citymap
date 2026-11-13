// Listas locales de Mis Favoritos (propuesta C): lugares marcados como
// visitados y eventos con alerta puesta en el calendario. Son estado del
// usuario en este dispositivo (localStorage), como el «Ya lo agregué» de la
// página de fotos: no viajan al servidor.

export const VISITADOS_KEY = 'citymapmx_visitados_v1';
export const ALERTAS_CALENDARIO_KEY = 'citymapmx_alertas_calendario_v1';

export function loadIdSet(key) {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function saveIdSet(key, ids) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(Array.isArray(ids) ? ids : []));
  } catch {
    // Almacenamiento no disponible: el estado se queda solo en memoria.
  }
}

// Puro: devuelve la lista nueva con el id agregado o quitado.
export function toggleIdInList(ids, id) {
  const list = Array.isArray(ids) ? ids : [];
  return list.includes(id) ? list.filter((v) => v !== id) : [...list, id];
}

export const loadVisitados = () => loadIdSet(VISITADOS_KEY);
export const saveVisitados = (ids) => saveIdSet(VISITADOS_KEY, ids);
export const loadAlertasCalendario = () => loadIdSet(ALERTAS_CALENDARIO_KEY);
export const saveAlertasCalendario = (ids) => saveIdSet(ALERTAS_CALENDARIO_KEY, ids);
