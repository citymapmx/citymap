// Google Identity Services (botón oficial de Google) se carga solo cuando
// hace falta (login/registro). Antes el script vivía en index.html y
// pesaba ~84 KiB en cada carga inicial, aunque el usuario no fuera a
// iniciar sesión. Las pantallas de login ya esperan a window.google con
// un sondeo cada 100 ms, así que basta con inyectarlo antes de ese sondeo.
let gisPromise = null;

export function ensureGoogleIdentityServices() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.google?.accounts?.id) return Promise.resolve(true);
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve) => {
    const script = document.createElement('script');
    script.id = 'google-identity-services';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => { gisPromise = null; resolve(false); };
    document.head.appendChild(script);
  });
  return gisPromise;
}
