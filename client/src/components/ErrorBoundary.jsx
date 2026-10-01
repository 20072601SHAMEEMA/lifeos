import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('LifeOS UI error:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fatal">
        <AlertTriangle size={36} aria-hidden="true" />
        <h1>Something went wrong</h1>
        <p>An unexpected error occurred while showing this page. Your data is safe.</p>
        <div className="fatal__actions">
          <button className="btn btn--primary" onClick={() => window.location.reload()}>
            Reload page
          </button>
          <a className="btn btn--ghost" href="/dashboard">
            Go to dashboard
          </a>
        </div>
      </div>
    );
  }
}
