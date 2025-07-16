// ABOUTME: Page-level error boundary for handling page-specific errors
// ABOUTME: Provides quick recovery options and maintains navigation context

import React from 'react';
import { AlertCircleIcon, ArrowLeftIcon, RefreshCwIcon, HomeIcon } from './ui/icons';

interface PageErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

interface PageErrorBoundaryProps {
  children: React.ReactNode;
  pageName?: string;
  fallbackComponent?: React.ComponentType<{ 
    pageName?: string; 
    error: Error; 
    retry: () => void; 
    goBack: () => void;
    goHome: () => void;
  }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo, pageName?: string) => void;
  maxRetries?: number;
  enableRetry?: boolean;
  enableGoBack?: boolean;
  showPageName?: boolean;
}

class PageErrorBoundary extends React.Component<
  PageErrorBoundaryProps,
  PageErrorBoundaryState
> {
  constructor(props: PageErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<PageErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log page-specific error
    console.error(`📄 [PageErrorBoundary] Page "${this.props.pageName || 'Unknown'}" error:`, {
      pageName: this.props.pageName,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
      currentPath: window.location.hash
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.props.pageName);
    }
  }

  private handleRetry = () => {
    const maxRetries = this.props.maxRetries || 1;
    
    if (this.state.retryCount >= maxRetries) {
      console.warn(`Maximum retry attempts reached for page: ${this.props.pageName}`);
      return;
    }

    console.log(`🔄 [PageErrorBoundary] Retrying page "${this.props.pageName}"... (${this.state.retryCount + 1}/${maxRetries})`);
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      // Fallback to dashboard if no history
      window.location.hash = '#/dashboard';
    }
  };

  private handleGoHome = () => {
    window.location.hash = '#/dashboard';
  };

  private getErrorSuggestion = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'This might be a network connectivity issue. Please check your internet connection and try again.';
    }
    
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'You might not have permission to access this page. Please contact your administrator.';
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return 'The requested page or resource could not be found. It might have been moved or deleted.';
    }
    
    if (message.includes('timeout')) {
      return 'The page took too long to load. Please try again or check your connection.';
    }
    
    return 'An unexpected error occurred while loading this page.';
  };

  render() {
    if (this.state.hasError) {
      const { 
        pageName, 
        fallbackComponent: FallbackComponent, 
        enableRetry = true,
        enableGoBack = true,
        maxRetries = 1,
        showPageName = true 
      } = this.props;
      const { error, retryCount } = this.state;

      // Use custom fallback if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent
            pageName={pageName}
            error={error!}
            retry={this.handleRetry}
            goBack={this.handleGoBack}
            goHome={this.handleGoHome}
          />
        );
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-96 p-6">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-sm border border-red-200 p-6 text-center">
            <div className="text-red-500 mb-4">
              <AlertCircleIcon className="w-10 h-10 mx-auto" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Page Error
            </h3>
            
            {showPageName && pageName && (
              <p className="text-sm text-gray-600 mb-3">
                There was a problem loading the <strong>{pageName}</strong> page.
              </p>
            )}
            
            <p className="text-sm text-gray-600 mb-4">
              {this.getErrorSuggestion(error!)}
            </p>

            <div className="flex flex-col sm:flex-row gap-2 justify-center mb-4">
              {enableRetry && retryCount < maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                >
                  <RefreshCwIcon className="w-4 h-4 mr-2" />
                  Try Again
                </button>
              )}
              
              {enableGoBack && (
                <button
                  onClick={this.handleGoBack}
                  className="inline-flex items-center px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
                >
                  <ArrowLeftIcon className="w-4 h-4 mr-2" />
                  Go Back
                </button>
              )}
              
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                <HomeIcon className="w-4 h-4 mr-2" />
                Dashboard
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="text-left">
                <summary className="cursor-pointer text-xs text-gray-500 mb-2">
                  Technical Details (Dev Mode)
                </summary>
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-xs text-red-700 mb-2">
                    <strong>Error:</strong> {error.message}
                  </p>
                  {error.stack && (
                    <pre className="text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto max-h-32">
                      {error.stack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default PageErrorBoundary;