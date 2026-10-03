import { logger } from '@/utils/logging';

// ABOUTME: Page-level error boundary for individual page failures
// ABOUTME: Provides navigation alternatives when specific pages fail to load

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  pageName: string;
  onError?: (pageName: string, error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class PageErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { pageName, onError } = this.props;
    
    logger.error(`ðŸ“„ [PageErrorBoundary] Page "${pageName}" error:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    if (onError) {
      onError(pageName, error);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null
    });
  };

  handleGoBack = () => {
    window.history.back();
  };

  handleGoHome = () => {
    window.location.hash = '#/dashboard';
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error } = this.state;
    const { pageName } = this.props;

    if (hasError && error) {
      const errorId = `page-error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-muted">
          <div className="max-w-md w-full bg-surface-card shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-surface-foreground">
                  Page Error
                </h3>
                <p className="text-sm text-surface-muted-fg">
                  Failed to load page: {pageName}
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-surface-foreground mb-2">
                <strong>Error:</strong> {error.message}
              </p>
              <p className="text-xs text-surface-muted-fg">
                Error ID: {errorId}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                onClick={this.handleRetry}
                className="bg-primary-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Try Again
              </button>
              <button
                onClick={this.handleRefresh}
                className="bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Refresh Page
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={this.handleGoBack}
                className="bg-orange-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                Go Back
              </button>
              <button
                onClick={this.handleGoHome}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Go to Dashboard
              </button>
            </div>

            <details className="mt-4">
              <summary className="text-sm text-surface-muted-fg cursor-pointer hover:text-surface-foreground">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-surface-accent rounded text-xs font-mono text-surface-foreground max-h-32 overflow-y-auto">
                {error.stack}
              </div>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;