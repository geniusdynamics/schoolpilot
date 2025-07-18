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
    
    console.error(`📄 [PageErrorBoundary] Page "${pageName}" error:`, {
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

  render() {
    const { hasError, error } = this.state;
    const { pageName } = this.props;

    if (hasError && error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">Page Error</h3>
              <p className="mt-1 text-sm text-gray-500">
                Failed to load page: {pageName}
              </p>
              <p className="mt-2 text-xs text-red-600">
                {error.message}
              </p>
            </div>

            <div className="mt-6 flex flex-col space-y-2">
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Try Again
              </button>
              <button
                onClick={this.handleGoBack}
                className="w-full bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700"
              >
                Go Back
              </button>
              <button
                onClick={this.handleGoHome}
                className="w-full bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;