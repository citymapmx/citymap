import React from 'react';

const isChunkError = (error) => {
  const msg = String(error?.message || error || '');
  return (
    error?.name === 'ChunkLoadError' ||
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('Importing a module script failed') ||
    msg.includes('dynamically imported') ||
    msg.includes('MIME type') ||
    msg.includes('text/html') ||
    msg.includes('fetch')
  );
};

export class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (isChunkError(error)) {
      if (!sessionStorage.getItem('chunk_reload_guard')) {
        sessionStorage.setItem('chunk_reload_guard', '1');
        window.location.reload(true);
        return;
      }
    }
    console.error("Global Error:", error, info);
    this.setState({ error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20, background: '#fff', gap: 16 }}>
          <div style={{ fontSize: 48 }}>😕</div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111', margin: 0, textAlign: 'center' }}>Algo salió mal</h2>
          <p style={{ fontSize: 14, color: '#555', textAlign: 'center', margin: 0 }}>La app encontró un problema. Intenta recargar.</p>
          <button onClick={async () => { 
            sessionStorage.clear(); 
            if ('serviceWorker' in navigator) {
              try {
                const regs = await navigator.serviceWorker.getRegistrations();
                for (let r of regs) await r.unregister();
              } catch(e) {}
            }
            window.location.reload(); 
          }} style={{ padding: '12px 24px', background: '#1A7A5E', color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
            Recargar app
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
