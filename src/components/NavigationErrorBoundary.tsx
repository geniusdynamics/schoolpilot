// ABOUTME: Navigation-specific error boundary with recovery options
// ABOUTME: Provides graceful handling of navigation failures and route resolution errors

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AlertTriangleIcon, HomeIcon, ArrowLeftIcon, RefreshCwIcon } from './ui/icons';

interface NavigationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  lastWorkingRoute: string | null;
}

interface NavigationErrorBoundaryProps {
  children: React.ReactNode;
  fallbackComponent?: React.ComponentType<{
    error: Error;
    retry: () => void;
    goHome: () => void;
    goBack: () => void;
    lastWorkingRoute: string | null;
  }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo, currentRoute: string) => void;
  maxRetries?: number;
  enableFallbackRoutes?: boolean;
  fallbackRoutes?: string[];
}

class NavigationErrorBoundary extends React.Component<
  NavigationErrorBoundaryProps,
  NavigationErrorBoundaryState
> {
  private navigate: any;
  private location: any;

  constructor(props: NavigationErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      lastWorkingRoute: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<NavigationErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const currentRoute = window.location.hash.replace('#', '') || '/';
    
    this.setState({
      error,
      errorInfo
    });

    // Log navigation-specific error
    console.error(`🧭 [NavigationErrorBoundary] Navigation error on route "${currentRoute}":`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      retryCount: this.state.retryCount,
      currentRoute,
      userAgent: navigator.userAgent
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo, currentRoute);
    }

    // Store last working route for recovery
    const lastWorkingRoute = sessionStorage.getItem('lastWorkingRoute');
    if (lastWorkingRoute && lastWorkingRoute !== currentRoute) {
      this.setState({ lastWorkingRoute });
    }
  }

  componentDidUpdate(prevProps: NavigationErrorBoundaryProps, prevState: NavigationErrorBoundaryState) {
    // Clear error state when route changes successfully
    if (!this.state.hasError && prevState.hasError) {
      const currentRoute = window.location.hash.replace('#', '') || '/';
      sessionStorage.setItem('lastWorkingRoute', currentRoute);
    }
  }

  private handleRetry = () => {
    const maxRetries = this.props.maxRetries || 2;
    
    if (this.state.retryCount >= maxRetries) {
      console.warn('Maximum navigation retry attempts reached');
      return;
    }

    console.log(`🔄 [NavigationErrorBoundary] Retrying navigation... (${this.state.retryCount + 1}/${maxRetries})`);
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  private handleGoHome = () => {
    try {
      window.location.hash = '#/dashboard';
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    } catch (error) {
      console.error('Failed to navigate to dashboard:', error);
      // Force page reload as last resort
      window.location.reload();
    }
  };

  private handleGoBack = () => {
    try {
      if (this.state.lastWorkingRoute) {
        window.location.hash = `#${this.state.lastWorkingRoute}`;
        this.setState({
          hasError: false,
          error: null,
          errorInfo: null
        });
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        this.handleGoHome();
      }
    } catch (error) {
      console.error('Failed to go back:', error);
      this.handleGoHome();
    }
  };

  private handleTryFallbackRoute = (route: string) => {
    try {
      window.location.hash = `#${route}`;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    } catch (error) {
      console.error(`Failed to navigate to fallback route ${route}:`, error);
    }
  };

  private getNavigationSuggestion = (error: Error): string => {
    const message = error.message.toLowerCase();
    
    if (message.includes('chunk') || message.includes('loading')) {
      return 'This appears to be a loading issue. The page component may not be available.';
    }
    
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'You may not have permission to access this page.';
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return 'The requested page could not be found. It may have been moved or removed.';
    }
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'This might be a network connectivity issue affecting page loading.';
    }
    
    return 'An unexpected navigation error occurred.';
  };

  render() {
    if (this.state.hasError) {
      const { 
        fallbackComponent: FallbackComponent, 
        maxRetries = 2,
        enableFallbackRoutes = true,
        fallbackRoutes = ['/dashboard', '/reports', '/administration']
      } = this.props;
      const { error, retryCount, lastWorkingRoute } = this.state;

      // Use custom fallback if provided
      if (FallbackComponent) {
        return (
          <FallbackComponent
            error={error!}
            retry={this.handleRetry}
            goHome={this.handleGoHome}
            goBack={this.handleGoBack}
            lastWorkingRoute={lastWorkingRoute}
          />
        );
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-md border border-orange-200 p-8">
            <div className="text-center mb-6">
              <div className="text-orange-500 mb-4">
                <AlertTriangleIcon className="w-12 h-12 mx-auto" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Navigation Error
              </h1>
              
              <p className="text-gray-600 mb-4">
                There was a problem loading this page or navigating to the requested location.
              </p>
              
              <p className="text-sm text-gray-600 mb-6">
                {this.getNavigationSuggestion(error!)}
              </p>
            </div>

            <div className="space-y-3 mb-6">
              {/* Primary actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {retryCount < maxRetries && (
                  <button
                    onClick={this.handleRetry}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 transition-colors"
                  >
                    <RefreshCwIcon className="w-4 h-4 mr-2" />
                    Try Again ({maxRetries - retryCount} left)
                  </button>
                )}
                
                <button
                  onClick={this.handleGoHome}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                >
                  <HomeIcon className="w-4 h-4 mr-2" />
                  Go to Dashboard
                </button>
              </div>

              {/* Secondary actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                {lastWorkingRoute && (
                  <button
                    onClick={this.handleGoBack}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
                  >
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Go Back
                  </button>
                )}
                
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-gray-500 text-white text-sm font-medium rounded-md hover:bg-gray-600 transition-colors"
                >
                  <RefreshCwIcon className="w-4 h-4 mr-2" />
                  Reload Page
                </button>
              </div>
            </div>

            {/* Fallback routes */}
            {enableFallbackRoutes && fallbackRoutes.length > 0 && (
              <div className="border-t pt-4">
                <p className="text-sm text-gray-600 mb-3">Or try these pages:</p>
                <div className="flex flex-wrap gap-2">
                  {fallbackRoutes.map(route => (
                    <button
                      key={route}
                      onClick={() => this.handleTryFallbackRoute(route)}
                      className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      {route.replace('/', '').charAt(0).toUpperCase() + route.replace('/', '').slice(1) || 'Home'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error details for development */}
            {process.env.NODE_ENV === 'development' && error && (
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
                      <pre className="text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto max-h-32">
                        {error.stack}
                      </pre>
                    </div>
                  )}
                  
                  {this.state.errorInfo?.componentStack && (
                    <div>
                      <h4 className="font-medium text-red-800">Component Stack:</h4>
                      <pre className="text-xs text-red-600 bg-red-100 p-2 rounded overflow-auto max-h-32">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  )}
                </div>
              </details>
            )}

            <div className="mt-6 text-center text-sm text-gray-500">
              <p>If this problem persists, please contact support.</p>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC to provide navigation hooks to class component
const NavigationErrorBoundaryWithHooks: React.FC<NavigationErrorBoundaryProps> = (props) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Store last working route
  React.useEffect(() => {
    sessionStorage.setItem('lastWorkingRoute', location.pathname);
  }, [location.pathname]);

  return <NavigationErrorBoundary {...props} />;
};

export default NavigationErrorBoundaryWithHooks;