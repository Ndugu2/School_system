import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Application render error:', error);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app-fallback" role="alert">
        <AlertTriangle size={28} />
        <h1>Something needs attention</h1>
        <p>The page could not be loaded. Your data has not been changed.</p>
        <button onClick={() => window.location.reload()}><RefreshCw size={16} /> Reload application</button>
      </main>
    );
  }
}
