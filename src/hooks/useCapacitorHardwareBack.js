import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { useUIStore } from '../store/useUIStore.js';
import { useAuthStore } from '../store/useAuthStore.js';
import { sb } from '../lib/supabase.js';

// Hosts cuyos enlaces internos la app debe abrir al recibir un deep link /
// App Link (p. ej. https://citymap.mx/scan/<member.id> del QR de lealtad).
const DEEP_LINK_HOSTS = new Set([
  'citymap.mx',
  'www.citymap.mx',
  'citymap.world',
  'www.citymap.world',
]);

// Ventana en la que una misma URL se ignora si llega dos veces (al arrancar,
// la misma URL puede llegar por getLaunchUrl() y por appUrlOpen). Pasado ese
// tiempo, escanear el mismo QR otra vez vuelve a navegar.
const DEEP_LINK_DEDUPE_MS = 5000;
const routedDeepLinks = new Map();

export function __resetDeepLinkRoutingForTests() {
  routedDeepLinks.clear();
}

async function defaultCloseBrowser() {
  const { Browser } = await import('@capacitor/browser');
  await Browser.close();
}

async function defaultGetPlatform() {
  const { Capacitor } = await import('@capacitor/core');
  return Capacitor.getPlatform();
}

// Decide qué hacer con una URL que abre la app (deep link / App Link).
// Devuelve true si la URL se gestionó.
// - Retorno OAuth (trae #access_token, p. ej. mx.citymap.app://login o
//   https://citymap.mx/login): camino actual, sin cambios.
// - Enlace interno de citymap (p. ej. /scan/<member.id>): navegar a
//   pathname + search para que lo resuelva el router de la app.
// Las dependencias se pueden inyectar en pruebas; por defecto usan el
// comportamiento real de la app.
export async function routeDeepLink(url, deps = {}) {
  const {
    closeBrowser = defaultCloseBrowser,
    getPlatform = defaultGetPlatform,
    setSessionFromUrl = (u) => sb.setSessionFromUrl(u),
    getUser = () => sb.getUser(),
    setAuthUser = (u) => useAuthStore.setState({ user: u, authChecked: true }),
    reload = () => window.location.reload(),
    navigate = (path) => { window.location.href = path; },
  } = deps;

  if (!url || typeof url !== 'string') return false;

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  const hash = url.split('#')[1] || '';

  // 1. Retorno OAuth: solo si la URL es de la app (esquema propio o host
  // de citymap) y el hash trae el token. Cualquier otro host con un
  // #access_token se ignora.
  const isOAuthReturn =
    (parsed.protocol === 'mx.citymap.app:' || DEEP_LINK_HOSTS.has(parsed.hostname)) &&
    hash.includes('access_token=');
  if (isOAuthReturn) {
    try {
      await closeBrowser();
    } catch (e) { console.error(e); }
    const success = await setSessionFromUrl(url);
    if (success) {
      // Force reload user session
      const u = await getUser();
      if (u) {
        setAuthUser(u);
        reload();
      }
    }
    return true;
  }

  // 2. Enlace interno (App Link): navegar al path para que lo resuelva
  // el router. En web la página ya está en esa URL, no hay nada que hacer.
  if (!DEEP_LINK_HOSTS.has(parsed.hostname)) return false;
  if (await getPlatform() === 'web') return false;
  const path = parsed.pathname + parsed.search;
  if (path && path !== '/') {
    // On mobile, just replace location to trigger standard app routing/parsing
    navigate(path);
  }
  return true;
}

// Igual que routeDeepLink, pero ignora una URL idéntica si ya se enrutó
// dentro de la ventana de dedupe (llega por dos caminos al arrancar).
export async function routeDeepLinkOnce(url, deps) {
  if (!url || typeof url !== 'string') return false;
  const now = Date.now();
  for (const [seenUrl, seenAt] of routedDeepLinks) {
    if (now - seenAt > DEEP_LINK_DEDUPE_MS) routedDeepLinks.delete(seenUrl);
  }
  if (routedDeepLinks.has(url)) return false;
  routedDeepLinks.set(url, now);
  return routeDeepLink(url, deps);
}

export function useCapacitorHardwareBack() {
  useEffect(() => {
    // 1. Hardware Back Button Listener
    const backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
      const ui = useUIStore.getState();
      
      // A. Close modals
      if (ui.showGallery || ui.showAddBiz || ui.showMenuGallery || ui.showLocPicker || ui.showPlans || ui.claimBiz || ui.showSchedule) {
        useUIStore.setState({ 
          showGallery: false, showAddBiz: false, showMenuGallery: false, 
          showLocPicker: false, showPlans: false, claimBiz: null, showSchedule: false
        });
        return;
      }
      
      // B. If detail view, go back
      const p = window.location.pathname;
      if (p.includes("/lugar/") || p.includes("/evento/") || p.includes("/itinerario/") || p.includes("/plan/")) {
        window.history.back();
        useUIStore.setState({ selected: null, selectedEvent: null });
        return;
      }
      
      // C. If not home, go home (or back)
      if (p !== "/" && !p.startsWith(`/${ui.activeCity}`)) {
        window.history.back();
        return;
      }
      
      // D. Exit app if on home
      CapApp.exitApp();
    });

    // 2. Deep Link Listener: App Links y enlaces que abren la app
    // (p. ej. el QR de la tarjeta de lealtad: /scan/<member.id>).
    const appUrlOpenListener = CapApp.addListener('appUrlOpen', (event) => {
      routeDeepLinkOnce(event?.url).catch((e) => console.error(e));
    });

    // 3. Arranque en frío: cuando la app estaba cerrada, appUrlOpen no se
    // dispara; la URL del intent solo se recupera con getLaunchUrl().
    // En web devuelve { url: '' } y no hace nada.
    CapApp.getLaunchUrl()
      .then((launch) => {
        if (launch?.url) routeDeepLinkOnce(launch.url).catch((e) => console.error(e));
      })
      .catch(() => {});

    return () => {
      backListener.then(l => l.remove());
      appUrlOpenListener.then(l => l.remove());
    };
  }, []);
}
