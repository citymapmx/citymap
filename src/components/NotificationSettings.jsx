import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { useAppContext } from '../context/AppContext';

export default function NotificationSettings({ T }) {
  const { requestWebNotifications, user, setShowAuth } = useAppContext();
  const native = Capacitor.isNativePlatform();
  const [status, setStatus] = useState('checking');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      let value = 'unsupported';
      if (native) {
        try { value = (await PushNotifications.checkPermissions()).receive; } catch { /* Unsupported native environment. */ }
      } else if ('Notification' in window && 'serviceWorker' in navigator) value = Notification.permission;
      if (alive) setStatus(value);
    };
    refresh(); window.addEventListener('focus', refresh);
    return () => { alive = false; window.removeEventListener('focus', refresh); };
  }, [native]);
  const activate = async () => {
    if (busy) return;
    if (!user) { setStatus("signin-required"); setShowAuth?.(true); return; }
    setBusy(true);
    try {
      if (native) {
        const result = await PushNotifications.requestPermissions();
        if (result.receive === 'granted') await PushNotifications.register();
        setStatus(result.receive);
      } else setStatus(await requestWebNotifications());
    } catch { setStatus('error'); }
    finally { setBusy(false); }
  };
  const messages = {
    granted: 'Permiso de notificaciones activado en este dispositivo.',
    denied: 'Están bloqueadas. Puedes permitirlas en los ajustes del navegador o del teléfono.',
    unsupported: 'No están disponibles aquí. En iPhone, agrega CityMap a la pantalla de inicio y ábrela desde su icono.',
    error: 'No se pudo completar la activación. Inténtalo de nuevo.',
    checking: 'Comprobando disponibilidad…',
    'signin-required': 'Inicia sesión para vincular las notificaciones a tu cuenta.',
  };
  const canActivate = !['granted', 'denied', 'unsupported', 'checking'].includes(status);
  if (status === 'granted') return null;
  return <section aria-label="Notificaciones del dispositivo" style={{ textAlign: 'left', padding: '16px 0', borderTop: `1px solid ${T.border}` }}>
    <div style={{ fontSize: 16, fontWeight: 750, color: T.text }}>Notificaciones del dispositivo</div>
    <p role="status" style={{ fontSize: 13, color: T.sub, lineHeight: 1.5, margin: '6px 0 12px' }}>{messages[status] || 'Recibe novedades de eventos y avisos de CityMap.'}</p>
    {canActivate && <button type="button" disabled={busy} onClick={activate} style={{ background: T.text, color: T.bg, border: 0, borderRadius: 12, padding: '11px 16px', fontFamily: 'inherit', fontWeight: 700, cursor: 'pointer' }}>{busy ? 'Activando…' : 'Activar notificaciones'}</button>}
  </section>;
}
