import { logger } from '@/utils/logging';

// ABOUTME: Error boundary component for the tabbed workspace system.
// ABOUTME: Provides fallback UI and error handling for tab content failures.

import React, { Component, ErrorInfo } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class TabWorkspaceErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to error reporting service
    logger.error('Tab Workspace Error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-red-600 dark:text-red-400">
          <AlertCircle className="w-12 h-12 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Tab Content Error</h3>
          <p className="text-sm text-center mb-4 max-w-md">
            {this.state.error?.message || 'An error occurred while rendering this tab content.'}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 rounded-md transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
