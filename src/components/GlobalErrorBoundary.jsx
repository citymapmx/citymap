import React from 'react';
import {ErrorBoundary} from './ErrorBoundary.jsx';
import LoadFailureView from './LoadFailureView.jsx';

export class GlobalErrorBoundary extends ErrorBoundary {
  render() {
    return this.state.hasError ? <LoadFailureView error={this.state.error} recovering={this.state.autoReloading} fullPage/> : this.props.children;
  }
}
