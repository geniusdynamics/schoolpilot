// ABOUTME: Error boundary specifically designed for table rendering failures
// ABOUTME: Provides graceful fallbacks and error recovery for DataGrid components

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import Button from '../Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  tableName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string;
}

export class TableErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: `table-error-${Date.now()}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, tableName } = this.props;
    
    // Log error details
    console.error(`Table rendering error in ${tableName || 'DataGrid'}:`, {
      error,
      errorInfo,
      timestamp: new Date().toISOString(),
      errorId: this.state.errorId
    });

    // Call custom error handler if provided
    if (onError) {
      onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorId: ''
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { tableName } = this.props;
      const { error, errorId } = this.state;

      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Table Loading Error
              </h3>
              <p className="text-red-700 mb-3">
                There was an error loading the {tableName || 'table'}. This might be due to:
              </p>
              <ul className="text-sm text-red-600 list-disc list-inside mb-4 space-y-1">
                <li>Invalid or corrupted data</li>
                <li>Missing required properties</li>
                <li>Network connectivity issues</li>
                <li>Temporary server problems</li>
              </ul>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="mb-4">
                  <summary className="text-sm font-medium text-red-700 cursor-pointer hover:text-red-800">
                    Technical Details (Development)
                  </summary>
                  <div className="mt-2 p-3 bg-red-100 rounded border border-red-200">
                    <p className="text-xs text-red-600 mb-2">
                      <strong>Error ID:</strong> {errorId}
                    </p>
                    <p className="text-xs text-red-600 mb-2">
                      <strong>Error:</strong> {error?.message}
                    </p>
                    <pre className="text-xs text-red-600 whitespace-pre-wrap overflow-auto max-h-40">
                      {error?.stack}
                    </pre>
                  </div>
                </details>
              )}
              
              <div className="flex space-x-3">
                <Button 
                  onClick={this.handleRetry}
                  variant="secondary"
                  size="sm"
                  leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                >
                  Retry Loading
                </Button>
                <Button 
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                >
                  Refresh Page
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default TableErrorBoundary;
