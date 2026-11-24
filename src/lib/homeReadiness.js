// Wait for the current city's rendered first screen, rather than a loading timer.
// No font gate: the home never loads Geist (it only loads in DetailView's lazy
// chunk), so requiring it made `visual` never 'ready' on the home and the splash
// always waited out the full cap (~3,7 s + fade). The gates that remain are the
// real "presentable" ones: the city home is mounted, visible images are complete
// and none is broken. With font-display: swap, text shows with its fallback at once.
export function getHomeVisualState(doc,citySlug,viewport={width:0,height:0}) {
  const home=Array.from(doc.querySelectorAll('[data-city-home]')).find(el=>el.getAttribute('data-city-home')===citySlug);
  if(!home)return 'loading';
  const images=Array.from(home.querySelectorAll('img')).filter(img=>{
    if(img.closest?.('[aria-hidden="true"]'))return false;
    const box=img.getBoundingClientRect();
    return box.width>0&&box.height>0&&box.bottom>0&&box.right>0&&box.top<viewport.height&&box.left<viewport.width;
  });
  const logo=doc.querySelector('.city-arrival-logo');
  if(logo)images.push(logo);
  if(images.some(img=>!img.complete))return 'loading';
  if(images.some(img=>img.naturalWidth===0))return 'error';
  return 'ready';
}

// Salida del splash de llegada: la ciudad se muestra en cuanto los datos
// están listos y la primera pantalla está presentable. El mínimo evita un
// parpadeo al cambiar de ciudad; el tope evita que una foto lenta o rota
// deje la pantalla negra atorada: pasado el tope la ciudad se muestra igual
// y las fotos terminan de cargar progresivamente. Una imagen rota o lenta
// nunca bloquea la salida por sí sola. Un error de datos tampoco bloquea
// para siempre: retrasa la salida solo hasta el tope (3 s) y entonces la
// ciudad se muestra con lo que haya (el reintentar queda para cuando los
// datos core ni siquiera están listos, que es cuando `ready` es false).
// `ready` (datos core) sigue siendo obligatorio para salir: el splash nunca
// sale antes de que los datos estén listos.
export const SPLASH_MINIMUM_MS = 600;
export const SPLASH_MAX_WAIT_MS = 3000;

export function shouldExitSplash({ready, error, visual, elapsedMs}) {
  if (!ready) return false;
  if (elapsedMs < SPLASH_MINIMUM_MS) return false;
  if (error && elapsedMs < SPLASH_MAX_WAIT_MS) return false;
  return visual === 'ready' || elapsedMs >= SPLASH_MAX_WAIT_MS;
}

// Reintento automático del splash: cuando la carga de datos falla, el
// splash ya muestra el mensaje de error con botón manual, pero si nadie lo
// toca la app se queda ahí. El reintento automático es UNA sola vez por
// episodio de error: si la recarga vuelve a fallar, queda el mensaje con el
// botón manual y no se entra en bucle. La marca vive en sessionStorage para
// sobrevivir a la recarga (onRetry por defecto es window.location.reload()).
// Al cargar bien (ready), la marca se limpia y un fallo posterior vuelve a
// tener su reintento.
export const SPLASH_AUTO_RETRY_DELAY_MS = 1500;
const SPLASH_AUTO_RETRY_KEY = 'splash_auto_retry_claimed';

export function claimSplashAutoRetry() {
  try {
    if (typeof sessionStorage === 'undefined') return false;
    if (sessionStorage.getItem(SPLASH_AUTO_RETRY_KEY)) return false;
    sessionStorage.setItem(SPLASH_AUTO_RETRY_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export function clearSplashAutoRetry() {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(SPLASH_AUTO_RETRY_KEY);
  } catch { /* sin storage no hay marca que limpiar */ }
}
