import React from 'react';

export const isChunkError = (error) => {
  const msg = String(error?.message || error || '');
  return (
    error?.name === 'ChunkLoadError' ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('dynamically imported') ||
    msg.includes('not a valid JavaScript MIME type') ||
    (msg.includes('MIME type') && msg.includes('module')) ||
    msg.includes('text/html')
  );
};

export async function reloadClearingStaleAssets() {
  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
    }
  } catch (e) {
    console.warn('Cache cleanup error:', e);
  }
  window.location.reload();
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, autoReloading: false };
  }

  static getDerivedStateFromError(error) {
    if (isChunkError(error)) {
      const last = parseInt(sessionStorage.getItem('chunk_reload_guard') || '0', 10);
      if (Date.now() - last > 10000) {
        return { hasError: true, error, autoReloading: true };
      }
    }
    return { hasError: true, error, autoReloading: false };
  }

  componentDidCatch(error, errorInfo) {
    if (isChunkError(error)) {
      const last = parseInt(sessionStorage.getItem('chunk_reload_guard') || '0', 10);
      const now = Date.now();
      if (now - last > 10000) {
        sessionStorage.setItem('chunk_reload_guard', now.toString());
        reloadClearingStaleAssets();
        return;
      }
    }
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.state.autoReloading) {
        return (
          <div style={{ position: 'fixed', inset: 0, background: '#F7F8F6', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 30, height: 30, border: '3px solid #E4E8E4', borderTop: '3px solid #000000', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
          </div>
        );
      }
      return (
        <div style={{ padding: 24, margin: 16, background: '#F8FAFC', color: '#0F172A', borderRadius: 16, border: '1px solid #E2E8F0', textAlign: 'center' }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 8px 0' }}>Actualizando la aplicación…</h2>
          <p style={{ fontSize: 14, color: '#475569', margin: '0 0 16px 0' }}>Hay una nueva versión disponible. Pulsa recargar para continuar.</p>
          <button
            onClick={() => {
              sessionStorage.removeItem('chunk_reload_guard');
              reloadClearingStaleAssets();
            }}
            style={{ padding: '10px 20px', background: '#111827', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}
          >
            Recargar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
