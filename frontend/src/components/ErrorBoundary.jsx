import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-card rounded-[2rem] p-8 text-center my-6 border-red-500/20 bg-red-500/5">
          <h3 className="text-xl font-bold text-white mb-2">Something went wrong</h3>
          <p className="text-slate-400 text-sm max-w-xs mx-auto mb-6">
            A section of the app failed to render. Try again, or open the details below for the error message.
          </p>
          <button
            onClick={this.handleRetry}
            className="premium-btn px-6 py-2 rounded-xl text-xs font-bold text-white shadow-lg shadow-indigo-500/10"
          >
            Retry
          </button>
          <details className="mt-5 rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-left text-xs text-slate-300">
            <summary className="cursor-pointer font-bold text-slate-200">Error details</summary>
            <pre className="mt-3 whitespace-pre-wrap break-words">{this.state.error?.message || 'Unknown error'}</pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}
