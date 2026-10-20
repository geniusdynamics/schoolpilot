import { logger } from '@/utils/logging';

// ABOUTME: Error boundary component specifically for handling React Hook errors
// ABOUTME: Provides fallback UI and error recovery for hook order violations and module loading issues

import { Component, ErrorInfo, ReactNode } from 'react';
import * as React from 'react';
import { AlertTriangleIcon, RefreshCwIcon } from "./ui/icons";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  /** Human-readable component name used in logs and the fallback message. */
  componentName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class HookErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Check if this is a hook-related error
    const isHookError = error.message.includes('hook') || 
                       error.message.includes('prevDeps') ||
                       error.message.includes('Rendered more hooks') ||
                       error.message.includes('Rendered fewer hooks');
    
    if (isHookError) {
      return {
        hasError: true,
        error
      };
    }
    
    // Let other errors bubble up
    throw error;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log the error for debugging
    logger.error(`[HookErrorBoundary] Error in ${this.props.componentName || 'component'}:`, error, errorInfo);

    // Auto-retry for hook errors (they might be transient due to module loading)
    if (this.state.retryCount < this.maxRetries) {
      this.retryTimeout = setTimeout(() => {
        this.handleRetry();
      }, 1000 * (this.state.retryCount + 1)); // Exponential backoff
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleManualRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI for hook errors
      return (
        <div className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
          <div className="max-w-md w-full bg-surface-card rounded-lg shadow-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangleIcon className="h-12 w-12 text-amber-500" />
            </div>
            
            <h2 className="text-xl font-semibold text-surface-foreground mb-2">
              {this.props.componentName
                ? `An error occurred in the ${this.props.componentName} component.`
                : 'Component Loading Error'}
            </h2>
            
            <p className="text-surface-muted-fg mb-4">
              A temporary error occurred while loading the component. This is usually 
              caused by modules still initializing.
            </p>
            
            {this.state.retryCount < this.maxRetries && (
              <p className="text-sm text-primary-600 mb-4">
                Automatically retrying... (Attempt {this.state.retryCount + 1}/{this.maxRetries})
              </p>
            )}
            
            <button
              onClick={this.handleManualRetry}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Retry Now
            </button>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-surface-muted-fg hover:text-surface-foreground">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs bg-surface-accent p-2 rounded overflow-auto max-h-32">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Named export for `import { HookErrorBoundary } from ...` call sites
export { HookErrorBoundary };

// Higher-order component for wrapping components with an error boundary
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

    // In development, throw so error boundaries can pick it up
    if (process.env.NODE_ENV === 'development') {
      throw error;
    }
  }, []);

  return { handleError };
};

export default HookErrorBoundary;