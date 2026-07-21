import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#fee2e2', color: '#991b1b', borderRadius: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800 }}>Algo salió mal</h2>
          <p style={{ fontSize: 13, fontFamily: 'monospace' }}>{this.state.error && this.state.error.toString()}</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: 10, padding: 8, background: '#991b1b', color: '#fff', border: 'none', borderRadius: 8 }}>Recargar</button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
