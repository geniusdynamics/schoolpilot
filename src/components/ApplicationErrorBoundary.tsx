// ABOUTME: Application-level error boundary for critical application errors
// ABOUTME: Provides comprehensive error handling with recovery options and detailed logging

import React from 'react';
import { getAppConfig } from '../config/appConfig';

interface ApplicationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

interface ApplicationErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void; errorId: string }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo, errorId: string) => void;
  maxRetries?: number;
}

class ApplicationErrorBoundary extends React.Component<
  ApplicationErrorBoundaryProps,
  ApplicationErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: ApplicationErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ApplicationErrorBoundaryState> {
    const errorId = `app-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorId = this.state.errorId || `app-error-${Date.now()}`;
    
    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Log error details
    console.error('🚨 [ApplicationErrorBoundary] Critical application error:', {
      errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorId);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo, errorId);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private logErrorToService = (error: Error, errorInfo: React.ErrorInfo, errorId: string) => {
    // TODO: Implement external error logging service
    // This could be Sentry, LogRocket, or custom logging endpoint
    try {
      // Example implementation:
      // errorLoggingService.log({
      //   errorId,
      //   message: error.message,
      //   stack: error.stack,
      //   componentStack: errorInfo.componentStack,
      //   userAgent: navigator.userAgent,
      //   url: window.location.href,
      //   timestamp: new Date().toISOString(),
      //   retryCount: this.state.retryCount
      // });
    } catch (loggingError) {
      console.error('Failed to log error to external service:', loggingError);
    }
  };

  private handleRetry = () => {
    const maxRetries = this.props.maxRetries || 3;
    
    if (this.state.retryCount >= maxRetries) {
      console.warn('Maximum retry attempts reached');
      return;
    }

    console.log(`🔄 [ApplicationErrorBoundary] Retrying... (${this.state.retryCount + 1}/${maxRetries})`);
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReportError = () => {
    const { error, errorInfo, errorId } = this.state;
    const config = getAppConfig();
    
    const errorReport = {
      errorId,
      message: error?.message,
      stack: error?.stack,
      componentStack: errorInfo?.componentStack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      timestamp: new Date().toISOString(),
      appConfig: {
        mode: config.mode,
        useEnhancedFeatures: config.useEnhancedFeatures,
        enabledFeatures: Object.entries(config.features)
          .filter(([, enabled]) => enabled)
          .map(([name]) => name)
      }
    };

    // Copy error report to clipboard
    navigator.clipboard.writeText(JSON.stringify(errorReport, null, 2))
      .then(() => alert('Error report copied to clipboard'))
      .catch(() => {
        // Fallback: show error report in a new window
        const reportWindow = window.open('', '_blank');
        if (reportWindow) {
          reportWindow.document.write(`
            <html>
              <head><title>Error Report</title></head>
              <body>
                <h1>Application Error Report</h1>
                <pre>${JSON.stringify(errorReport, null, 2)}</pre>
              </body>
            </html>
          `);
        }
      });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorId, retryCount } = this.state;
      const maxRetries = this.props.maxRetries || 3;
      const config = getAppConfig();

      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={error!}
            retry={this.handleRetry}
            errorId={errorId!}
          />
        );
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Application Error
              </h1>
              <p className="text-gray-600 mb-4">
                A critical error occurred that prevented the application from working properly.
              </p>
              {errorId && (
                <p className="text-sm text-gray-500 mb-4">
                  Error ID: <code className="bg-gray-100 px-2 py-1 rounded">{errorId}</code>
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              {retryCount < maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Try Again ({maxRetries - retryCount} attempts left)
                </button>
              )}
              
              <button
                onClick={this.handleReload}
                className="bg-gray-600 text-white px-6 py-2 rounded-md hover:bg-gray-700 transition-colors"
              >
                Reload Page
              </button>
              
              <button
                onClick={this.handleReportError}
                className="bg-orange-600 text-white px-6 py-2 rounded-md hover:bg-orange-700 transition-colors"
              >
                Report Error
              </button>
            </div>

            {config.development.enableDebugLogging && error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm font-medium text-gray-700 mb-2">
                  Error Details (Development Mode)
                </summary>
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="mb-3">
                    <h4 className="font-medium text-red-800">Error Message:</h4>
                    <p className="text-red-700 text-sm">{error.message}</p>
                  </div>
                  
                  {error.stack && (
                    <div className="mb-3">
                      <h4 className="font-medium text-red-800">Stack Trace:</h4>
                      <pre className="text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto max-h-40">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <h4 className="font-medium text-red-800">Component Stack:</h4>
                      <pre className="text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto max-h-40">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>If this problem persists, please contact support with the error ID above.</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ApplicationErrorBoundary;