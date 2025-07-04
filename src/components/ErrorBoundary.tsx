// ABOUTME: Global error boundary for catching and displaying errors in the UI.
// ABOUTME: Prevents blank/white screens by showing a fallback error message.

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    // Optionally log error to external service
    // logErrorToService(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: 'center', color: '#b91c1c', background: '#fef2f2' }}>
          <h1>Something went wrong.</h1>
          <pre style={{ color: '#991b1b', marginTop: 16 }}>{this.state.error?.toString()}</pre>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: 16 }}>
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary; 