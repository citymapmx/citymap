export const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

export function isChunkError(error) {
  const message = String(error?.message || error || '');
  return error?.name === 'ChunkLoadError' || /dynamically imported|module script|JavaScript MIME|MIME type.*module|text\/html/i.test(message);
}

export function isStaleAssetError(error) {
  const message = String(error?.message || error || '');
  return /not a valid JavaScript MIME type|MIME type.*module|text\/html/i.test(message);
}

// A network/import failure alone is not evidence that a new version exists.
export function canAutoRecover(error, now = Date.now()) {
  if (!isOnline() || !isStaleAssetError(error)) return false;
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
