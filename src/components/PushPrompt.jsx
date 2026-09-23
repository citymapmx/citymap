import React, { useState, useEffect } from 'react';
import { useWebPush } from '../hooks/useWebPush.js';
import Icon from './ui/Icon.jsx';

export default function PushPrompt({ citySlug, dark }) {
  const [show, setShow] = useState(false);
  const { requestAndRegister } = useWebPush({ citySlug, enabled: true });

  useEffect(() => {
    // Check if we are on supported web
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) return;
    if (window.Capacitor?.isNativePlatform?.()) return;
    
    // Check if dismissed previously
    if (localStorage.getItem('cg_push_prompt_dismissed')) return;

    if (Notification.permission === 'default') {
      // Show after a small delay to not overwhelm on load
      const t = setTimeout(() => setShow(true), 5000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  return (
    <div style={{
      margin: '16px 20px',
      background: dark ? '#1E293B' : '#FFFFFF',
      border: `1px solid ${dark ? '#334155' : '#E2E8F0'}`,
      borderRadius: 20,
      padding: '24px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      textAlign: 'center',
      position: 'relative',
      boxShadow: dark ? '0 8px 24px rgba(0,0,0,0.4)' : '0 8px 24px rgba(0,0,0,0.06)'
    }}>
      <button 
        onClick={() => {
          localStorage.setItem('cg_push_prompt_dismissed', '1');
          setShow(false);
        }}
        style={{ position: 'absolute', top: 12, right: 12, background: dark ? 'rgba(255,255,255,0.05)' : '#F1F5F9', borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 6, color: dark ? '#94A3B8' : '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
      >
        <Icon name="x" size={16} />
      </button>

      <div style={{ fontSize: 36, marginBottom: 12, lineHeight: 1 }}>
        🔔
      </div>

      <h4 style={{ margin: '0 0 8px 0', fontSize: 17, fontWeight: 800, color: dark ? '#F8FAFC' : '#0F172A', letterSpacing: '-0.3px' }}>
        Activa las notificaciones
      </h4>
      <p style={{ margin: '0 0 20px 0', fontSize: 14, color: dark ? '#94A3B8' : '#475569', lineHeight: 1.5, maxWidth: 280 }}>
        Entérate antes que nadie de los mejores eventos, aperturas y actualizaciones de tus reservas.
      </p>
      
      <button
        className="press"
        onClick={async () => {
          setShow(false);
          const perm = await requestAndRegister();
          if (perm !== 'granted') {
            localStorage.setItem('cg_push_prompt_dismissed', '1');
          }
        }}
        style={{
          background: dark ? '#F8FAFC' : '#0F172A',
          color: dark ? '#0F172A' : '#FFFFFF',
          border: 'none',
          padding: '12px 24px',
          borderRadius: 12,
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          width: '100%',
          maxWidth: 240,
          letterSpacing: '0.2px'
        }}
      >
        Activar ahora
      </button>
    </div>
  );
}
