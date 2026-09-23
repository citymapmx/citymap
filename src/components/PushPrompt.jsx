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
      background: dark ? 'rgba(59, 130, 246, 0.1)' : '#EFF6FF',
      border: `1px solid ${dark ? 'rgba(59, 130, 246, 0.2)' : '#BFDBFE'}`,
      borderRadius: 16,
      padding: 16,
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      position: 'relative',
      boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
    }}>
      <button 
        onClick={() => {
          localStorage.setItem('cg_push_prompt_dismissed', '1');
          setShow(false);
        }}
        style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: dark ? '#60A5FA' : '#3B82F6' }}
      >
        <Icon name="x" size={16} />
      </button>

      <div style={{ padding: 4, background: dark ? 'rgba(59,130,246,0.2)' : '#DBEAFE', borderRadius: 12, color: dark ? '#60A5FA' : '#2563EB' }}>
        <Icon name="bell" size={24} />
      </div>

      <div style={{ flex: 1 }}>
        <h4 style={{ margin: '0 0 4px 0', fontSize: 15, fontWeight: 700, color: dark ? '#E2E8F0' : '#1E3A8A' }}>
          Activa las notificaciones
        </h4>
        <p style={{ margin: '0 0 12px 0', fontSize: 13, color: dark ? '#94A3B8' : '#3B82F6', lineHeight: 1.4, paddingRight: 16 }}>
          Entérate de los mejores eventos, aperturas de lugares y actualizaciones de tus reservas.
        </p>
        <button
          onClick={async () => {
            setShow(false);
            const perm = await requestAndRegister();
            if (perm !== 'granted') {
              localStorage.setItem('cg_push_prompt_dismissed', '1');
            }
          }}
          style={{
            background: '#3B82F6',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontWeight: 600,
            fontSize: 13,
            cursor: 'pointer'
          }}
        >
          Activar ahora
        </button>
      </div>
    </div>
  );
}
