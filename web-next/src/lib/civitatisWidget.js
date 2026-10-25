export const CIVITATIS_RESIZER_URL = 'https://www.civitatis.com/f/js/vendor/iframeResizer.min.js';
export const MAX_WIDGET_CODE_LENGTH = 50000;

// The saved snippet is never evaluated or injected as arbitrary HTML. Only the
// official iframe URL is used; the known Civitatis library is initialized separately.
export function getCivitatisWidgetSrc(code) {
  if (typeof code !== 'string' || !code.trim() || code.length > MAX_WIDGET_CODE_LENGTH) return null;
  const frames = [...code.matchAll(/<iframe\b([^>]*?)>/gi)];
  if (frames.length !== 1) return null;
  const src = frames[0][1].match(/(?:^|\s)src\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
  if (!src) return null;
  try {
    const url = new URL(src.replace(/&amp;/gi, '&'));
    if (url.protocol !== 'https:' || !['www.civitatis.com', 'civitatis.com'].includes(url.hostname) || url.port || url.username || url.password || url.pathname !== '/widget-activities/') return null;
    return url.href;
  } catch { return null; }
}

export function validateCivitatisWidgetCode(code) {
  if (code === null || code === undefined || (typeof code === 'string' && !code.trim())) return null;
  if (typeof code !== 'string' || code.length > MAX_WIDGET_CODE_LENGTH) throw new Error('El código del widget supera el tamaño permitido.');
  if (!getCivitatisWidgetSrc(code)) throw new Error('Pega el código completo del widget de actividades generado por Civitatis, con un único iframe HTTPS oficial.');
  return code;
}

let resizerPromise;
export function loadCivitatisResizer(doc = document, win = window) {
  if (typeof win.iFrameResize === 'function') return Promise.resolve(win.iFrameResize);
  if (resizerPromise) return resizerPromise;
  resizerPromise = new Promise((resolve, reject) => {
    let script = doc.getElementById('citymap-civitatis-resizer');
    if (script && script.src !== CIVITATIS_RESIZER_URL) { reject(new Error('Invalid widget loader')); return; }
    const created = !script;
    if (!script) {
      script = doc.createElement('script');
      script.id = 'citymap-civitatis-resizer';
      script.src = CIVITATIS_RESIZER_URL;
      script.async = true;
    }
    const cleanup = () => { clearTimeout(timer); script.removeEventListener('load', onLoad); script.removeEventListener('error', onError); };
    const onLoad = () => {
      cleanup();
      if (typeof win.iFrameResize === 'function') resolve(win.iFrameResize);
      else { script.remove(); reject(new Error('Widget resizer unavailable')); }
    };
    const onError = () => { cleanup(); script.remove(); reject(new Error('Widget loader unavailable')); };
    const timer = setTimeout(onError, 15000);
    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);
    if (created) doc.head.appendChild(script);
  }).catch(error => { resizerPromise = undefined; throw error; });
  return resizerPromise;
}
