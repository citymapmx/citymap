import {useEffect, useState} from 'react';
import {useTranslation} from '../hooks/useTranslation.js';
import {useUIStore} from '../store/useUIStore.js';
import {getT} from '../lib/constants.js';
import {isOnline, isChunkError, retryPageLoad} from '../lib/loadRecovery.js';

export default function LoadFailureView({error, fullPage = false, recovering = false}) {
  const { t } = useTranslation();
  const T = getT(useUIStore(state => state.dark));
  const [online, setOnline] = useState(isOnline);
  const [wasOffline, setWasOffline] = useState(() => !isOnline());
  useEffect(() => {
    const update = () => { const value = isOnline(); setOnline(value); if (!value) setWasOffline(true); };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  const title = !online ? t('comun_sin_conexion', 'Sin conexión a internet') : wasOffline ? t('comun_conexion_restablecida', 'Conexión restablecida') : isChunkError(error) ? t('comun_no_pudimos_cargar', 'No pudimos cargar esta sección') : t('comun_algo_salio_mal', 'Algo salió mal');
  const message = !online ? t('comun_necesita_internet', 'Esta sección necesita internet. Comprueba tu conexión; podrás reintentar cuando vuelva.') : wasOffline ? t('comun_ya_puedes_reintentar', 'Ya puedes reintentar para continuar donde estabas.') : t('comun_comprueba_conexion', 'Comprueba tu conexión e inténtalo de nuevo.');
  return <div style={{minHeight:fullPage?'100dvh':undefined,display:'flex',alignItems:'center',justifyContent:'center',padding:20,boxSizing:'border-box',background:fullPage?T.bg:'transparent'}}>
    <section role="status" aria-live="polite" style={{width:'100%',maxWidth:420,padding:24,boxSizing:'border-box',borderRadius:20,background:T.white,border:`1px solid ${T.border}`,color:T.text,textAlign:'center',fontFamily:'inherit'}}>
      <h2 style={{fontSize:20,fontWeight:800,margin:'0 0 10px',color:T.text}}>{title}</h2>
      <p style={{fontSize:15,color:T.sub,lineHeight:1.55,margin:'0 0 20px'}}>{message}</p>
      <button type="button" disabled={!online || recovering} onClick={() => retryPageLoad(error)} style={{minHeight:44,padding:'12px 20px',background:T.text,color:T.bg,border:0,borderRadius:12,fontSize:14,fontWeight:700,fontFamily:'inherit',cursor:online?'pointer':'default',opacity:online?1:0.55}}>
        {!online ? t('comun_esperando_conexion', 'Esperando conexión…') : recovering ? t('comun_recuperando_seccion', 'Recuperando la sección…') : t('comun_reintentar', 'Reintentar')}
      </button>
    </section>
  </div>;
}
