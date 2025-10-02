// ABOUTME: Toast notification provider for database operations and errors
// ABOUTME: Provides user-friendly notifications for database CRUD operations and error states

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

interface DatabaseToastContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => string;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;
  showDatabaseSuccess: (operation: string, details?: string) => string;
  showDatabaseError: (operation: string, error: Error, action?: Toast['action']) => string;
  showDatabaseWarning: (operation: string, message: string, action?: Toast['action']) => string;
  showDatabaseInfo: (operation: string, message: string) => string;
}

const DatabaseToastContext = createContext<DatabaseToastContextType | undefined>(undefined);

export const useDatabaseToast = () => {
  const context = useContext(DatabaseToastContext);
  if (!context) {
    throw new Error('useDatabaseToast must be used within a DatabaseToastProvider');
  }
  return context;
};

interface DatabaseToastProviderProps {
  children: React.ReactNode;
  maxToasts?: number;
  defaultDuration?: number;
}

export const DatabaseToastProvider: React.FC<DatabaseToastProviderProps> = ({
  children,
  maxToasts = 5,
  defaultDuration = 5000
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>): string => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? defaultDuration
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      // Keep only the most recent toasts
      return updated.slice(0, maxToasts);
    });

    // Auto-hide non-persistent toasts
    if (!toast.persistent && newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }

    return id;
  }, [defaultDuration, maxToasts]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showDatabaseSuccess = useCallback((operation: string, details?: string): string => {
    return showToast({
      type: 'success',
      title: `${operation} Successful`,
      message: details,
      duration: 3000
    });
  }, [showToast]);

  const showDatabaseError = useCallback((operation: string, error: Error, action?: Toast['action']): string => {
    return showToast({
      type: 'error',
      title: `${operation} Failed`,
      message: error.message,
      duration: 8000,
      action
    });
  }, [showToast]);

  const showDatabaseWarning = useCallback((operation: string, message: string, action?: Toast['action']): string => {
    return showToast({
      type: 'warning',
      title: operation,
      message,
      duration: 6000,
      action
    });
  }, [showToast]);

  const showDatabaseInfo = useCallback((operation: string, message: string): string => {
    return showToast({
      type: 'info',
      title: operation,
      message,
      duration: 4000
    });
  }, [showToast]);

  const contextValue: DatabaseToastContextType = {
    toasts,
    showToast,
    hideToast,
    clearAllToasts,
    showDatabaseSuccess,
    showDatabaseError,
    showDatabaseWarning,
    showDatabaseInfo
  };

  return (
    <DatabaseToastContext.Provider value={contextValue}>
      {children}
      <DatabaseToastContainer />
    </DatabaseToastContext.Provider>
  );
};

const DatabaseToastContainer: React.FC = () => {
  const { toasts, hideToast } = useDatabaseToast();

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm w-full">
      {toasts.map(toast => (
        <DatabaseToastItem
          key={toast.id}
          toast={toast}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </div>
  );
};

interface DatabaseToastItemProps {
  toast: Toast;
  onClose: () => void;
}

const DatabaseToastItem: React.FC<DatabaseToastItemProps> = ({ toast, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Match animation duration
  };

  const getToastStyles = () => {
    const baseStyles = "transform transition-all duration-300 ease-in-out";
    const visibilityStyles = isVisible && !isExiting
      ? "translate-x-0 opacity-100"
      : "translate-x-full opacity-0";
    
    return `${baseStyles} ${visibilityStyles}`;
  };

  const getToastColors = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return (
          <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 19.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'info':
        return (
          <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`${getToastStyles()} ${getToastColors()} border rounded-lg shadow-lg p-4 max-w-sm w-full`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">
            {toast.title}
          </h3>
          {toast.message && (
            <p className="text-sm mt-1 opacity-90">
              {toast.message}
            </p>
          )}
          {toast.action && (
            <div className="mt-2">
              <button
                onClick={toast.action.onClick}
                className="text-sm font-medium underline hover:no-underline focus:outline-none"
              >
                {toast.action.label}
              </button>
            </div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleClose}
            className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DatabaseToastProvider;