// ABOUTME: Global error boundary for catching and displaying errors in the UI.
// ABOUTME: Prevents blank/white screens by showing a fallback error message.

import React from 'react';

interface ErrorBoundaryProps {
  resetKey?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<React.PropsWithChildren<ErrorBoundaryProps>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<ErrorBoundaryProps>) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Check if this is a database-related error
    const isDatabaseError = this.isDatabaseRelatedError(error);
    
    console.error('🚨🚨🚨 [ErrorBoundary] Caught error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      isDatabaseError
    });
    
    // Enhanced error reporting for database errors
    if (isDatabaseError) {
      console.error('🗄️ [ErrorBoundary] Database-related error detected');
      // Additional database context could be collected here
    }
    
    // Optionally log error to external service
    // logErrorToService(error, errorInfo);
  }

  componentDidUpdate(prevProps: Readonly<React.PropsWithChildren<ErrorBoundaryProps>>) {
    if (this.props.resetKey !== prevProps.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null, errorInfo: null });
    }
  }

  private isDatabaseRelatedError(error: Error): boolean {
    const dbErrorPatterns = [
      /database/i,
      /sqlite/i,
      /indexeddb/i,
      /opfs/i,
      /pouchdb/i,
      /storage/i,
      /quota.*exceeded/i,
      /transaction/i,
      /collection/i,
      /provider/i
    ];
    
    const errorMessage = error.message.toLowerCase();
    const errorStack = (error.stack || '').toLowerCase();
    
    return dbErrorPatterns.some(pattern => 
      pattern.test(errorMessage) || pattern.test(errorStack)
    );
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full">
          <div className="bg-white rounded-lg shadow p-8 max-w-xl w-full border border-red-200">
            <h1 className="text-2xl font-bold text-red-700 mb-4">Something went wrong</h1>
            <pre className="text-red-600 bg-red-50 rounded p-4 overflow-x-auto mb-4">{this.state.error?.toString()}</pre>
            {this.state.errorInfo?.componentStack && (
              <details className="text-xs text-gray-500 whitespace-pre-wrap">
                {this.state.errorInfo.componentStack}
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
