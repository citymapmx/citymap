// Wait for the current city's rendered first screen, rather than a loading timer.
export function getHomeVisualState(doc,citySlug,viewport={width:0,height:0}) {
  const home=Array.from(doc.querySelectorAll('[data-city-home]')).find(el=>el.getAttribute('data-city-home')===citySlug);
  if(!home)return 'loading';
  if(doc.fonts&&(!doc.fonts.check('500 16px Geist')))return 'loading';
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
// nunca bloquea la salida por sí sola; el reintentar queda solo para un
// error real de carga de datos.
export const SPLASH_MINIMUM_MS = 600;
export const SPLASH_MAX_WAIT_MS = 3000;

export function shouldExitSplash({ready, error, visual, elapsedMs}) {
  if (!ready || error) return false;
  if (elapsedMs < SPLASH_MINIMUM_MS) return false;
  return visual === 'ready' || elapsedMs >= SPLASH_MAX_WAIT_MS;
}
