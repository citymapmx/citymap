import {useEffect, useRef, useState} from 'react';
import {useTranslation} from '../hooks/useTranslation.js';
import {useUIStore} from '../store/useUIStore.js';
import {getT} from '../lib/constants.js';
import {isOnline, isChunkError, retryPageLoad} from '../lib/loadRecovery.js';

// Opción A (16 nov 2026, Jonathan): aviso mínimo y centrado, sin tarjeta
// ni botón. Sin conexión, la sección vuelve sola al recuperar la conexión
// (reintento automático al evento 'online'); el reintentar manual queda
// solo como enlace de texto cuando ya hay conexión pero la sección sigue
// sin cargar, nunca como botón grande apagado.
function WifiOffIcon({color}) {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M2 8.5a15 15 0 0 1 20 0" />
      <path d="M5.5 12.5a10 10 0 0 1 13 0" />
      <path d="M9 16.4a5 5 0 0 1 6 0" />
      <circle cx="12" cy="19.5" r="1.3" fill={color} stroke="none" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}

export default function LoadFailureView({error, fullPage = false, recovering = false}) {
  const { t } = useTranslation();
  const T = getT(useUIStore(state => state.dark));
  const [online, setOnline] = useState(isOnline);
  const [wasOffline, setWasOffline] = useState(() => !isOnline());
  const wasOfflineRef = useRef(!isOnline());
  const retriedRef = useRef(false);
  useEffect(() => {
    const update = () => {
      const value = isOnline();
      setOnline(value);
      if (!value) {
        setWasOffline(true);
        wasOfflineRef.current = true;
        retriedRef.current = false;
        return;
      }
      if (wasOfflineRef.current && !retriedRef.current) {
        retriedRef.current = true;
        retryPageLoad(error);
      }
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, [error]);
  const title = !online ? t('comun_sin_conexion', 'Sin conexión') : wasOffline ? t('comun_conexion_restablecida', 'Conexión restablecida') : isChunkError(error) ? t('comun_no_pudimos_cargar', 'No pudimos cargar esta sección') : t('comun_algo_salio_mal', 'Algo salió mal');
  const message = !online ? t('comun_necesita_internet', 'Vuelve sola cuando tengas internet.') : wasOffline ? t('comun_ya_puedes_reintentar', 'Ya puedes reintentar para continuar donde estabas.') : t('comun_comprueba_conexion', 'Comprueba tu conexión e inténtalo de nuevo.');
  return <div style={{minHeight: fullPage ? '100dvh' : 'calc(100dvh - 190px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, boxSizing: 'border-box', background: fullPage ? T.bg : 'transparent'}}>
    <section role="status" aria-live="polite" style={{textAlign: 'center', fontFamily: 'inherit', color: T.text}}>
      <div style={{width: 56, height: 56, borderRadius: '50%', background: T.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px'}}><WifiOffIcon color={T.sub} /></div>
      <h2 style={{fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: T.text}}>{title}</h2>
      <p style={{fontSize: 13.5, color: T.sub, lineHeight: 1.55, margin: '0 auto', maxWidth: 280}}>{message}</p>
      {recovering ? (
        <p style={{fontSize: 13.5, color: T.sub, margin: '14px 0 0'}}>{t('comun_recuperando_seccion', 'Recuperando la sección…')}</p>
      ) : online ? (
        <button type="button" onClick={() => retryPageLoad(error)} style={{marginTop: 14, background: 'none', border: 0, padding: 0, color: T.text, fontSize: 14, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3}}>
          {t('comun_reintentar', 'Reintentar')}
        </button>
      ) : null}
    </section>
  </div>;
}
