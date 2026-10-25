import {useState, useEffect} from 'react';
import {useUIStore} from '../store/useUIStore.js';
import {getT} from '../lib/constants.js';
import {isOnline} from '../lib/loadRecovery.js';

export default function OfflineScreen() {
  const [offline,setOffline] = useState(() => !isOnline());
  const T = getT(useUIStore(state => state.dark));
  useEffect(() => {
    const update = () => setOffline(!isOnline());
    window.addEventListener('online',update);window.addEventListener('offline',update);
    return () => {window.removeEventListener('online',update);window.removeEventListener('offline',update);};
  },[]);
  if (!offline) return null;
  return <div role="status" aria-live="polite" style={{position:'fixed',top:'env(safe-area-inset-top, 0px)',left:12,right:12,zIndex:100001,padding:'12px 16px',background:T.white,color:T.text,border:`1px solid ${T.border}`,borderRadius:14,boxShadow:T.shadow,fontSize:13,lineHeight:1.45,textAlign:'center'}}>
    <strong>Sin conexión.</strong> Puedes seguir viendo lo que ya cargaste; algunas secciones necesitan internet.
  </div>;
}
