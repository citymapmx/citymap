import { useState, useEffect } from 'react';
import Icon from './ui/Icon.jsx';

export default function OfflineScreen() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999, background: '#fff',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 24, textAlign: 'center', fontFamily: 'system-ui, sans-serif'
    }}>
      <div style={{ 
        width: 80, height: 80, borderRadius: '50%', background: '#FEE2E2', 
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24
      }}>
        <Icon name="wifi_off" size={40} color="#DC2626" />
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#111', margin: '0 0 12px' }}>
        No hay conexión
      </h1>
      <p style={{ fontSize: 16, color: '#4B5563', lineHeight: 1.5, margin: '0 0 32px', maxWidth: 300 }}>
        Parece que no tienes internet. Por favor, verifica tu conexión para seguir explorando la ciudad.
      </p>
      <button 
        onClick={() => window.location.reload()}
        style={{
          background: '#1A7A5E', color: '#fff', border: 'none', padding: '14px 32px',
          borderRadius: 999, fontSize: 16, fontWeight: 700, cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(26,122,94,0.3)'
        }}
      >
        Reintentar
      </button>
    </div>
  );
}
