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

// ── Pantalla blanca al reanudar en una ficha (nov 2026) ───────────────
// La ficha depende de `selected` / `selectedEvent` en memoria. Al
// reanudar tras horas en segundo plano, si la ruta es de detalle pero
// el seleccionado ya no está, la vista queda en blanco para siempre:
// DetailView devuelve null sin `selected` y el modal de evento solo se
// monta con `selectedEvent`; para /evento/ ni siquiera se renderiza el
// inicio detrás. Nada lo vuelve a resolver: el resolver del arranque
// solo corre una vez y un cuelgue no tira ningún error (por eso no
// salta el ErrorBoundary ni el aviso de «Sin conexión»).
// La recuperación es recargar una vez, con guardia: el arranque vuelve
// a correr, la ficha se restaura desde la URL o cae en la lista. Es
// invisible (sin botón ni mensaje) y solo dispara cuando la app ya está
// rota: ruta de detalle + seleccionado ausente + suspensión real.

// Prefijos de sistema (espejo de NON_HOME_PREFIXES en AppRouter.jsx):
// una ruta que empieza por uno de ellos nunca es una ficha.
const DETAIL_SYSTEM_PREFIXES = ['/mapa', '/eventos', '/explorar', '/mis-planes', '/revista', '/experiencias', '/tours', '/negocios', '/planes', '/favoritos', '/cuenta', '/itinerarios', '/itinerario', '/plan', '/about', '/privacy', '/terms', '/admin_notifs', '/user_notifs', '/manage', '/stats', '/precios', '/lealtad', '/wallet', '/scan', '/login', '/reservar'];

// 'event' | 'business' | null: qué ficha (si alguna) representa la ruta.
export function detailKindForPath(pathname, isWorld = false) {
  if (!pathname || pathname === '/') return null;
  if (pathname.startsWith('/evento/')) return 'event';
  const segments = pathname.split('/').filter(Boolean);
  if (isWorld) {
    if (segments.length === 3) return 'business';
    if (segments.length === 4 && segments[3] === 'reservar') return 'business';
    return null;
  }
  if (segments.length === 2) {
    if (DETAIL_SYSTEM_PREFIXES.some(p => pathname.startsWith(p))) return null;
    return 'business';
  }
  if (segments.length === 3 && segments[2] === 'reservar') return 'business';
  return null;
}

export const RESUME_MIN_HIDDEN_MS = 60000;
const RESUME_RELOAD_GUARD_KEY = 'resume_reload_guard';
const RESUME_RELOAD_MIN_INTERVAL_MS = 60000;

export function shouldReloadOnResume({ hiddenMs, pathname, hasSelected, hasSelectedEvent, isWorld = false, now = Date.now() } = {}) {
  if (!Number.isFinite(hiddenMs) || hiddenMs < RESUME_MIN_HIDDEN_MS) return false;
  const kind = detailKindForPath(pathname, isWorld);
  if (!kind) return false;
  if (kind === 'event' && hasSelectedEvent) return false;
  if (kind === 'business' && hasSelected) return false;
  try {
    const last = Number(sessionStorage.getItem(RESUME_RELOAD_GUARD_KEY) || '0');
    if (!Number.isFinite(last) || now - last <= RESUME_RELOAD_MIN_INTERVAL_MS) return false;
  } catch { return false; }
  return true;
}

export function claimResumeReload(now = Date.now()) {
  try { sessionStorage.setItem(RESUME_RELOAD_GUARD_KEY, String(now)); return true; } catch { return false; }
}
