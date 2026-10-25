import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { getCivitatisWidgetSrc, loadCivitatisResizer } from '../lib/civitatisWidget.js';

export default function CivitatisWidget({ code, cityName = '', T }) {
  const src = useMemo(() => getCivitatisWidgetSrc(code), [code]);
  const iframeRef = useRef(null);
  const id = 'citymap-civitatis-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!src) return;
    setFailed(false);
    let cancelled = false;
    let initTimer;
    let resizer;
    const iframe = iframeRef.current;
    const fail = () => {
      if (cancelled) return;
      iframe?.iFrameResizer?.removeListeners?.();
      setFailed(true);
    };
    const timeout = setTimeout(fail, 25000);
    loadCivitatisResizer().then(resize => {
      if (cancelled || !iframe?.isConnected) return;
      resize({
        checkOrigin: [new URL(src).origin],
        scrolling: false,
        initCallback: frame => {
          if (cancelled) return;
          clearTimeout(timeout);
          initTimer = setTimeout(() => {
            if (!cancelled && frame.isConnected) frame.dispatchEvent(new UIEvent('resize', { bubbles:true, view:window }));
          }, 0);
        },
      }, iframe);
      resizer = iframe.iFrameResizer;
    }).catch(fail);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      clearTimeout(initTimer);
      resizer?.removeListeners?.();
    };
  }, [src]);
  if (!src) return null;
  return <section aria-label={cityName ? `Tours de Civitatis en ${cityName}` : 'Tours de Civitatis'} style={{ width:'100%', maxWidth:'100%', minWidth:0, marginBottom:24, overflowX:'clip' }}>
    {failed ? <div role="status" style={{ padding:20, borderRadius:16, border:`1px solid ${T?.border || '#e5e7eb'}`, color:T?.text || 'inherit', textAlign:'center' }}>
      <p style={{ margin:'0 0 10px', fontSize:14 }}>Los tours no están disponibles en este momento.</p>
      <a href={src} target="_blank" rel="noopener noreferrer" style={{ color:'inherit', fontSize:14, fontWeight:600 }}>Ver tours en Civitatis ↗</a>
    </div> : <iframe key={src} ref={iframeRef} id={id} className="civitatis-iframe" title={cityName ? `Tours y actividades en ${cityName} · Civitatis` : 'Tours y actividades · Civitatis'} src={src} width="100%" height="520" loading="eager" frameBorder="0" data-maxwidth="100%" style={{ display:'block', width:'100%', maxWidth:'100%', minWidth:'100%', border:0 }} />}
  </section>;
}
