// ABOUTME: Database-specific error boundary for handling database initialization and operation failures
// ABOUTME: Provides specialized recovery mechanisms and fallback UI for database-related errors

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { reportError } from '../config/errorTracking';

interface Props {
  children: ReactNode;
  onDatabaseError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  fallbackMode?: 'minimal' | 'offline' | 'maintenance';
  showTechnicalDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  isDatabaseError: boolean;
  errorType: 'initialization' | 'operation' | 'corruption' | 'quota' | 'unknown';
}

class DatabaseErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      isDatabaseError: false,
      errorType: 'unknown'
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    const errorId = `db-error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const isDatabaseError = DatabaseErrorBoundary.isDatabaseRelatedError(error);
    const errorType = DatabaseErrorBoundary.categorizeError(error);
    
    return {
      hasError: true,
      error,
      errorId,
      isDatabaseError,
      errorType
    };
  }

  static isDatabaseRelatedError(error: Error): boolean {
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

  static categorizeError(error: Error): State['errorType'] {
    const message = error.message.toLowerCase();
    
    if (message.includes('initialization') || message.includes('init')) {
      return 'initialization';
    }
    if (message.includes('quota') || message.includes('storage')) {
      return 'quota';
    }
    if (message.includes('corrupt') || message.includes('integrity')) {
      return 'corruption';
    }
    if (message.includes('operation') || message.includes('transaction')) {
      return 'operation';
    }
    
    return 'unknown';
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onDatabaseError } = this.props;
    const { errorId } = this.state;
    
    this.setState({ errorInfo });
    
    console.error('🗄️ [DatabaseErrorBoundary] Database error caught:', {
      errorId,
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      isDatabaseError: this.state.isDatabaseError,
      errorType: this.state.errorType
    });

    // Report to error tracking with database-specific context
    try {
      reportError(error, {
        errorId,
        componentStack: errorInfo.componentStack,
        errorBoundary: 'DatabaseErrorBoundary',
        retryCount: this.state.retryCount,
        isDatabaseError: this.state.isDatabaseError,
        errorType: this.state.errorType,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        storageEstimate: this.getStorageEstimate(),
        databaseContext: this.getDatabaseContext()
      });
    } catch (reportingError) {
      console.error('Failed to report database error:', reportingError);
    }

    if (onDatabaseError) {
      onDatabaseError(error, errorInfo, errorId);
    }
  }

  private async getStorageEstimate(): Promise<any> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        return await navigator.storage.estimate();
      }
    } catch (e) {
      // Ignore storage estimate errors
    }
    return null;
  }

  private getDatabaseContext(): any {
    try {
      return {
        localStorage: Object.keys(localStorage).filter(key => 
          key.includes('db') || key.includes('database') || key.includes('config')
        ),
        indexedDBSupported: 'indexedDB' in window,
        opfsSupported: 'storage' in navigator && 'getDirectory' in navigator.storage,
        webAssemblySupported: 'WebAssembly' in window
      };
    } catch (e) {
      return { error: 'Failed to collect database context' };
    }
  }

  handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount < this.maxRetries) {
      console.log(`🔄 [DatabaseErrorBoundary] Retrying database operation... (${retryCount + 1}/${this.maxRetries})`);
      
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      });
    }
  };

  handleRetryWithDelay = (delay: number = 2000) => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    
    this.retryTimeout = setTimeout(() => {
      this.handleRetry();
    }, delay);
  };

  handleReset = () => {
    // Clear database-related localStorage
    const keysToRemove = Object.keys(localStorage).filter(key => 
      key.includes('db') || key.includes('database') || key.includes('config')
    );
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn(`Failed to remove localStorage key: ${key}`);
      }
    });
    
    // Reload the page to reinitialize
    window.location.reload();
  };

  handleReload = () => {
    window.location.reload();
  };

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  renderErrorUI() {
    const { error, errorType, retryCount, errorId } = this.state;
    const { fallbackMode = 'minimal', showTechnicalDetails = false } = this.props;
    const canRetry = retryCount < this.maxRetries;

    const errorMessages = {
      initialization: {
        title: 'Database Initialization Failed',
        description: 'The database system could not be initialized. This may be due to browser compatibility or storage issues.',
        suggestions: [
          'Check if your browser supports modern storage features',
          'Clear browser data and try again',
          'Try using a different browser'
        ]
      },
      operation: {
        title: 'Database Operation Failed',
        description: 'A database operation encountered an error. Your data may still be safe.',
        suggestions: [
          'Try the operation again',
          'Check your internet connection',
          'Contact support if the problem persists'
        ]
      },
      corruption: {
        title: 'Database Corruption Detected',
        description: 'The database appears to be corrupted. You may need to restore from a backup.',
        suggestions: [
          'Try resetting the database',
          'Restore from a recent backup',
          'Contact technical support for assistance'
        ]
      },
      quota: {
        title: 'Storage Quota Exceeded',
        description: 'Your browser storage is full. Please free up space to continue.',
        suggestions: [
          'Clear old data from the application',
          'Clear browser cache and data',
          'Contact your administrator about storage limits'
        ]
      },
      unknown: {
        title: 'Database Error',
        description: 'An unexpected database error occurred.',
        suggestions: [
          'Try refreshing the page',
          'Clear browser data if the problem persists',
          'Contact support with the error ID below'
        ]
      }
    };

    const errorConfig = errorMessages[errorType];

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-lg w-full bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0">
              <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-medium text-gray-900">
                {errorConfig.title}
              </h3>
              <p className="text-sm text-gray-500">
                {errorConfig.description}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Suggested Actions:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              {errorConfig.suggestions.map((suggestion, index) => (
                <li key={index} className="flex items-start">
                  <span className="text-gray-400 mr-2">•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col space-y-3">
            {canRetry && (
              <button
                onClick={this.handleRetry}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Try Again ({this.maxRetries - retryCount} attempts left)
              </button>
            )}
            
            {errorType === 'initialization' && (
              <button
                onClick={this.handleReset}
                className="w-full bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                Reset Database Configuration
              </button>
            )}
            
            <button
              onClick={this.handleReload}
              className="w-full bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Reload Application
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">
              Error ID: <code className="bg-gray-100 px-1 rounded">{errorId}</code>
            </p>
            
            {showTechnicalDetails && (
              <details className="mt-2">
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                  Technical Details
                </summary>
                <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 max-h-32 overflow-y-auto">
                  <div className="mb-2">
                    <strong>Error:</strong> {error?.message}
                  </div>
                  <div className="mb-2">
                    <strong>Type:</strong> {errorType}
                  </div>
                  <div>
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap mt-1">{error?.stack}</pre>
                  </div>
                </div>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      return this.renderErrorUI();
    }

    return this.props.children;
  }
}

export default DatabaseErrorBoundary;