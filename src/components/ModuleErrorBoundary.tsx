// ABOUTME: Module-level error boundary for isolating module failures
// ABOUTME: Allows other modules to continue working when one module fails

import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  moduleName: string;
  onError?: (moduleName: string, error: Error, errorInfo: ErrorInfo) => void;
  fallbackComponent?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ModuleErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { moduleName, onError } = this.props;
    
    this.setState({ errorInfo });
    
    console.error(`🔥 [ModuleErrorBoundary] Module "${moduleName}" error:`, {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    });

    if (onError) {
      onError(moduleName, error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    const { hasError, error } = this.state;
    const { moduleName, fallbackComponent } = this.props;

    if (hasError && error) {
      if (fallbackComponent) {
        return fallbackComponent;
      }

      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center mb-2">
            <svg className="h-5 w-5 text-red-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-sm font-medium text-red-800">
              Module Error: {moduleName}
            </h3>
          </div>
          <p className="text-sm text-red-700 mb-3">
            {error.message}
          </p>
          <button
            onClick={this.handleRetry}
            className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded hover:bg-red-200 transition-colors"
          >
            Retry Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ModuleErrorBoundary;