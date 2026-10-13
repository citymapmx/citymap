import React from 'react';
import { isChunkError, reloadClearingStaleAssets } from './ErrorBoundary.jsx';

export class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null, autoReloading: false };
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

  componentDidCatch(error, info) {
    if (isChunkError(error)) {
      const last = parseInt(sessionStorage.getItem('chunk_reload_guard') || '0', 10);
      const now = Date.now();
      if (now - last > 10000) {
        sessionStorage.setItem('chunk_reload_guard', now.toString());
        reloadClearingStaleAssets();
        return;
      }
    }
    console.error("Global Error:", error, info);
    this.setState({ error, info });
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20, background: '#fff', gap: 16 }}>
          <div style={{ fontSize: 48 }}>😕</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111', margin: 0, textAlign: 'center' }}>Algo salió mal</h2>
          <p style={{ fontSize: 14, color: '#555', textAlign: 'center', margin: 0 }}>La app encontró un problema. Intenta recargar.</p>
          <button onClick={() => {
            sessionStorage.clear();
            reloadClearingStaleAssets();
          }} style={{ padding: '12px 24px', background: '#1A7A5E', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            Recargar app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
