export const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

export function isChunkError(error) {
  const message = String(error?.message || error || '');
  return error?.name === 'ChunkLoadError' || /dynamically imported|module script|JavaScript MIME|MIME type.*module|text\/html/i.test(message);
}

export function isStaleAssetError(error) {
  const message = String(error?.message || error || '');
  return /not a valid JavaScript MIME type|MIME type.*module|text\/html/i.test(message);
}

// Un chunk que ya no existe en el servidor tras un despliegue también es
// evidencia de una versión nueva: Vite renombra los chunks en cada build y
// el import() falla con "Failed to fetch dynamically imported module" o
// "Loading chunk … failed" (ChunkLoadError). Un fallo genérico de red
// ("Importing a module script failed.") NO lo es: sin red no hay forma de
// saber si hay versión nueva, así que ese no se auto-recupera.
export function isRecoverableChunkError(error) {
  const message = String(error?.message || error || '');
  return error?.name === 'ChunkLoadError' || /Loading chunk \d+ failed|Failed to fetch dynamically imported module/i.test(message);
}

// Un fallo de red/importación por sí solo no es evidencia de una versión
// nueva. Un asset obsoleto o un chunk que ya no existe sí lo son: en ese
// caso la app recarga sola una vez, con el guardia de 15 s para no entrar
// en bucle.
export function canAutoRecover(error, now = Date.now()) {
  if (!isOnline() || (!isStaleAssetError(error) && !isRecoverableChunkError(error))) return false;
  try {
    const last = Number(sessionStorage.getItem('chunk_reload_guard') || '0');
    return Number.isFinite(last) && now - last > 15000;
  } catch { return false; }
}

export function claimAutoRecovery(error) {
  if (!canAutoRecover(error)) return false;
  try { sessionStorage.setItem('chunk_reload_guard', String(Date.now())); return true; } catch { return false; }
}

export async function reloadClearingStaleAssets() {
  if (!isOnline()) return false;
  try {
    if (window.caches) {
      const keys = await window.caches.keys();
      if (!isOnline()) return false;
      await Promise.all(keys.map(key => window.caches.delete(key)));
    }
    if (navigator.serviceWorker) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        if (!isOnline()) return false;
        const script = (registration.active || registration.waiting || registration.installing)?.scriptURL || '';
        if (!script.includes('firebase-messaging-sw.js')) await registration.unregister();
      }
    }
  } catch (error) { console.warn('Cache cleanup error:', error); }
  if (!isOnline()) return false;
  window.location.reload();
  return true;
}

export function retryPageLoad(error) {
  if (!isOnline()) return false;
  if (isStaleAssetError(error)) return reloadClearingStaleAssets();
  window.location.reload();
  return true;
}
