import React from 'react';
import LoadFailureView from './LoadFailureView.jsx';
import {canAutoRecover, claimAutoRecovery, reloadClearingStaleAssets} from '../lib/loadRecovery.js';
export {isChunkError, reloadClearingStaleAssets} from '../lib/loadRecovery.js';

export class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = {hasError:false,error:null,autoReloading:false}; }
  static getDerivedStateFromError(error) { return {hasError:true,error,autoReloading:canAutoRecover(error)}; }
  componentDidCatch(error, info) {
    if (claimAutoRecovery(error)) {
      reloadClearingStaleAssets().then(reloading => { if (!reloading) this.setState({autoReloading:false}); });
      return;
    }
    if (this.state.autoReloading) this.setState({autoReloading:false});
    console.error('ErrorBoundary caught an error',error,info);
  }
  render() {
    if (this.state.hasError) {
      // Mientras se auto-recupera de un chunk viejo, se sigue mostrando
      // la vista de carga; si el padre pasó un `fallback` propio (p. ej.
      // el aviso chico del mapa de Favoritos), ese es el que se muestra.
      if (this.state.autoReloading) return <LoadFailureView error={this.state.error} recovering={this.state.autoReloading}/>;
      return this.props.fallback || <LoadFailureView error={this.state.error} recovering={this.state.autoReloading}/>;
    }
    return this.props.children;
  }
}
export default ErrorBoundary;
