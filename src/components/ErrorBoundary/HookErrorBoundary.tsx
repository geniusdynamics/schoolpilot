import { logger } from '@/utils/logging';

// ABOUTME: Error boundary specifically designed to catch React hook errors
// ABOUTME: Provides fallback UI and error reporting for hook-related issues

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class HookErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    logger.error(`[HookErrorBoundary] Error in ${this.props.componentName || 'component'}:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    // Update state with error info
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 border border-red-200 rounded-lg m-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-red-800 mb-2">
            Component Error
          </h2>
          <p className="text-red-600 text-center mb-4">
            {this.props.componentName ? 
              `An error occurred in the ${this.props.componentName} component.` :
              'An error occurred in this component.'
            }
          </p>
          
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mb-4 p-3 bg-red-100 rounded border text-sm">
              <summary className="cursor-pointer font-medium text-red-800">
                Error Details (Development)
              </summary>
              <pre className="mt-2 text-red-700 whitespace-pre-wrap">
                {this.state.error.message}
                {this.state.error.stack && `\n\nStack Trace:\n${this.state.error.stack}`}
              </pre>
            </details>
          )}
          
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export const withHookErrorBoundary = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string,
  fallback?: ReactNode
) => {
  const WithErrorBoundary = (props: P) => (
    <HookErrorBoundary 
      componentName={componentName || WrappedComponent.displayName || WrappedComponent.name}
      fallback={fallback}
    >
      <WrappedComponent {...props} />
    </HookErrorBoundary>
  );

  WithErrorBoundary.displayName = `withHookErrorBoundary(${componentName || WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithErrorBoundary;
};

// Hook for handling errors in functional components
export const useErrorHandler = () => {
  const handleError = React.useCallback((error: Error, context?: string) => {
    logger.error(`[useErrorHandler] ${context || 'Component'} error:`, {
      error: error.message,
      stack: error.stack
    });
    
    // In development, you might want to throw the error to trigger error boundaries
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
  }, []);

  return { handleError };
};