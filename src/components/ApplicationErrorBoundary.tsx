// ABOUTME: Application-level error boundary for critical error handling
// ABOUTME: Provides recovery mechanisms and prevents complete application crashes

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { reportError } from '../config/errorTracking';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  errorId: string;
}

class ApplicationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `app-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError } = this.props;
    const { errorId } = this.state;
    
    this.setState({ errorInfo });
    
    // Check if this is a database-related error
    const isDatabaseError = this.isDatabaseRelatedError(error);
    const errorCategory = this.categorizeError(error);
    
    console.error('🚨 [ApplicationErrorBoundary] Critical application error:', {
      errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      isDatabaseError,
      errorCategory
    });

    // Report error to Bugsink with enhanced context
    try {
      reportError(error, {
        errorId,
        componentStack: errorInfo.componentStack,
        errorBoundary: 'ApplicationErrorBoundary',
        retryCount: this.state.retryCount,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        isDatabaseError,
        errorCategory,
        databaseContext: this.getDatabaseContext(),
        storageInfo: this.getStorageInfo()
      });
    } catch (reportingError) {
      console.error('Failed to report error to Bugsink:', reportingError);
    }

    if (onError) {
      onError(error, errorInfo, errorId);
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
      /provider/i,
      /initialization/i
    ];
    
    const errorMessage = error.message.toLowerCase();
    const errorStack = (error.stack || '').toLowerCase();
    
    return dbErrorPatterns.some(pattern => 
      pattern.test(errorMessage) || pattern.test(errorStack)
    );
  }

  private categorizeError(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('database') || message.includes('sqlite') || message.includes('indexeddb')) {
      return 'database';
    }
    if (message.includes('network') || message.includes('fetch')) {
      return 'network';
    }
    if (message.includes('render') || message.includes('component')) {
      return 'rendering';
    }
    if (message.includes('chunk') || message.includes('loading')) {
      return 'loading';
    }
    
    return 'unknown';
  }

  private getDatabaseContext(): any {
    try {
      return {
        localStorage: Object.keys(localStorage).filter(key => 
          key.includes('db') || key.includes('database') || key.includes('config')
        ).length,
        indexedDBSupported: 'indexedDB' in window,
        opfsSupported: 'storage' in navigator && 'getDirectory' in navigator.storage,
        webAssemblySupported: 'WebAssembly' in window
      };
    } catch (e) {
      return { error: 'Failed to collect database context' };
    }
  }

  private getStorageInfo(): any {
    try {
      return {
        localStorageUsed: JSON.stringify(localStorage).length,
        localStorageAvailable: typeof Storage !== 'undefined'
      };
    } catch (e) {
      return { error: 'Failed to collect storage info' };
    }
  }

  handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      console.log(`🔄 [ApplicationErrorBoundary] Retrying... (${retryCount + 1}/${maxRetries})`);
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      });
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, retryCount, errorId } = this.state;
    const { maxRetries = 3 } = this.props;

    if (hasError && error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0">
                <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">
                  Application Error
                </h3>
                <p className="text-sm text-gray-500">
                  Something went wrong with the application
                </p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-2">
                <strong>Error:</strong> {error.message}
              </p>
              <p className="text-xs text-gray-500">
                Error ID: {errorId}
              </p>
            </div>

            <div className="flex space-x-3">
              {retryCount < maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Try Again ({maxRetries - retryCount} left)
                </button>
              )}
              <button
                onClick={this.handleReload}
                className="flex-1 bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Reload Page
              </button>
            </div>

            <details className="mt-4">
              <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                Technical Details
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 max-h-32 overflow-y-auto">
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

export default ApplicationErrorBoundary;