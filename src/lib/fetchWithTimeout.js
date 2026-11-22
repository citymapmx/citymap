// Un fetch sin timeout puede quedarse colgado para siempre cuando iOS
// reanuda la app tras horas en segundo plano: la pila de red del
// WebView no siempre se restablece y la petición nunca resuelve ni
// rechaza. El arranque secuencial de App.jsx espera esos fetch (loadData,
// perfil, favoritos, resolver de deep link) y la ficha queda en blanco
// sin error ni reintento: nada tira porque un cuelgue no es un error.
// Con timeout, el cuelgue se convierte en un AbortError y los catch que
// ya existen (loadData marca dbReady, el resolver cae en la lista)
// recuperan solos. 15 s iguala al guardia de recarga de chunks y al
// respaldo de 15 s del splash: una lectura sana tarda menos de 2 s.
export const FETCH_TIMEOUT_MS = 15000;

export function fetchWithTimeout(url, options = {}, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}
