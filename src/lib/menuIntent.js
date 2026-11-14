// Modo del menú: «En el local» o «Para llevar / Domicilio».
//
// El modo decide si el menú permite pedir (botones +, carrito,
// «Agregar promoción») o solo se consulta («Ver promoción», sin
// carrito). Desde nov 2026 (hallazgo #2) el menú ya no pregunta con
// un modal que lo tapa: se muestra con el modo por defecto y el
// visitante cambia cuando quiere desde la píldora del menú. La
// elección se recuerda por negocio en localStorage.

import { safeSetItem } from './safeStorage.js';

export const MENU_INTENT_LOCAL = 'local';
export const MENU_INTENT_DELIVERY = 'delivery';

export function menuIntentKey(businessId) {
  return `intent_${businessId}`;
}

function isValidMenuIntent(value) {
  return value === MENU_INTENT_LOCAL || value === MENU_INTENT_DELIVERY;
}

// Resuelve el modo inicial del menú. Precedencia: catálogo siempre
// delivery (no tiene modos); intención explícita (enlace con
// ?intent= o location.state); la guardada en este dispositivo; y por
// defecto delivery, que muestra el menú completo (con pedido) sin
// puerta obligatoria.
export function resolveMenuIntent({ isCatalog, initialIntent, saved }) {
  if (isCatalog) return MENU_INTENT_DELIVERY;
  if (isValidMenuIntent(initialIntent)) return initialIntent;
  if (isValidMenuIntent(saved)) return saved;
  return MENU_INTENT_DELIVERY;
}

export function readSavedMenuIntent(businessId) {
  if (!businessId || typeof localStorage === 'undefined') return null;
  try {
    const value = localStorage.getItem(menuIntentKey(businessId));
    return isValidMenuIntent(value) ? value : null;
  } catch {
    return null;
  }
}

export function saveMenuIntent(businessId, intent) {
  if (!businessId || !isValidMenuIntent(intent)) return false;
  return safeSetItem(menuIntentKey(businessId), intent);
}
