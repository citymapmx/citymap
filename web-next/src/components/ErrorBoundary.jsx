'use client';

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
    return this.state.hasError ? <LoadFailureView error={this.state.error} recovering={this.state.autoReloading}/> : this.props.children;
  }
}
export default ErrorBoundary;
