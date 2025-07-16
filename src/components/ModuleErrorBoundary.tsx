// ABOUTME: Module-level error boundary for handling module-specific errors
// ABOUTME: Provides graceful degradation when individual modules fail

import React from 'react';
import { AlertTriangleIcon, RefreshCwIcon, HomeIcon } from './ui/icons';

interface ModuleErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

interface ModuleErrorBoundaryProps {
  children: React.ReactNode;
  moduleName: string;
  fallbackComponent?: React.ComponentType<{ 
    moduleName: string; 
    error: Error; 
    retry: () => void; 
    goHome: () => void; 
  }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo, moduleName: string) => void;
  maxRetries?: number;
  enableRetry?: boolean;
  showModuleName?: boolean;
}

class ModuleErrorBoundary extends React.Component<
  ModuleErrorBoundaryProps,
  ModuleErrorBoundaryState
> {
  constructor(props: ModuleErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ModuleErrorBoundaryState> {
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

    // Log module-specific error
    console.error(`🔥 [ModuleErrorBoundary] Module "${this.props.moduleName}" error:`, {
      moduleName: this.props.moduleName,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, this.props.moduleName);
    }
  }

  private handleRetry = () => {
    const maxRetries = this.props.maxRetries || 2;
    
    if (this.state.retryCount >= maxRetries) {
      console.warn(`Maximum retry attempts reached for module: ${this.props.moduleName}`);
      return;
    }

    console.log(`🔄 [ModuleErrorBoundary] Retrying module "${this.props.moduleName}"... (${this.state.retryCount + 1}/${maxRetries})`);
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleGoHome = () => {
    window.location.hash = '#/dashboard';
  };

  private handleReloadModule = () => {
    // Force a full page reload to reset the module
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { 
        moduleName, 
        fallbackComponent: FallbackComponent, 
        enableRetry = true, 
        maxRetries = 2,
        showModuleName = true 
      } = this.props;
      const { error, retryCount } = this.state;

      // Use custom fallback if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent
            moduleName={moduleName}
            error={error!}
            retry={this.handleRetry}
            goHome={this.handleGoHome}
          />
        );
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-96 p-8">
          <div className="max-w-md w-full bg-white rounded-lg shadow-md border border-orange-200 p-6 text-center">
            <div className="text-orange-500 mb-4">
              <AlertTriangleIcon className="w-12 h-12 mx-auto" />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Module Error
            </h3>
            
            {showModuleName && (
              <p className="text-sm text-gray-600 mb-3">
                The <strong>{moduleName}</strong> module encountered an error and couldn't load properly.
              </p>
            )}
            
            <p className="text-sm text-gray-500 mb-6">
              {error?.message || 'An unexpected error occurred in this module.'}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {enableRetry && retryCount < maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="inline-flex items-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
                >
                  <RefreshCwIcon className="w-4 h-4 mr-2" />
                  Try Again ({maxRetries - retryCount} left)
                </button>
              )}
              
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
              >
                <HomeIcon className="w-4 h-4 mr-2" />
                Go to Dashboard
              </button>
              
              {retryCount >= maxRetries && (
                <button
                  onClick={this.handleReloadModule}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  <RefreshCwIcon className="w-4 h-4 mr-2" />
                  Reload Page
                </button>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-xs text-gray-500">
                  Error Details (Dev Mode)
                </summary>
                <pre className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded overflow-auto max-h-32">
                  {error.stack}
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

export default ModuleErrorBoundary;