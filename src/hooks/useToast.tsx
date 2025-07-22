// ABOUTME: Toast notification management hook with stacking and auto-dismiss functionality
// ABOUTME: Provides methods to show, dismiss, and manage toast notifications with proper cleanup

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Toast, { ToastProps, ToastVariant } from '../components/ui/feedback/Toast';

export interface ToastOptions {
  title?: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  progress?: number;
  showProgress?: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ToastContextValue {
  toasts: ToastProps[];
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
  clearAllToasts: () => void;
  updateToast: (id: string, updates: Partial<ToastOptions>) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
  maxToasts?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 5,
  position = 'top-right',
}) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const showToast = useCallback((options: ToastOptions): string => {
    const id = generateId();
    const newToast: ToastProps = {
      id,
      ...options,
      onDismiss: (toastId: string) => dismissToast(toastId),
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      // Limit the number of toasts
      return updated.slice(0, maxToasts);
    });

    return id;
  }, [generateId, maxToasts]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<ToastOptions>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  const getPositionStyles = () => {
    const baseStyles = 'fixed z-50 flex flex-col space-y-2 pointer-events-none';
    
    switch (position) {
      case 'top-right':
        return `${baseStyles} top-4 right-4`;
      case 'top-left':
        return `${baseStyles} top-4 left-4`;
      case 'bottom-right':
        return `${baseStyles} bottom-4 right-4 flex-col-reverse`;
      case 'bottom-left':
        return `${baseStyles} bottom-4 left-4 flex-col-reverse`;
      case 'top-center':
        return `${baseStyles} top-4 left-1/2 transform -translate-x-1/2`;
      case 'bottom-center':
        return `${baseStyles} bottom-4 left-1/2 transform -translate-x-1/2 flex-col-reverse`;
      default:
        return `${baseStyles} top-4 right-4`;
    }
  };

  const contextValue: ToastContextValue = {
    toasts,
    showToast,
    dismissToast,
    clearAllToasts,
    updateToast,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {typeof document !== 'undefined' && createPortal(
        <div className={getPositionStyles()}>
          {toasts.map((toast, index) => (
            <div
              key={toast.id}
              className="pointer-events-auto"
              style={{
                zIndex: 1000 - index, // Stack toasts properly
                marginTop: position.includes('bottom') ? undefined : index * 4,
                marginBottom: position.includes('bottom') ? index * 4 : undefined,
              }}
            >
              <Toast {...toast} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

// Convenience hooks for different toast types
export const useToastHelpers = () => {
  const { showToast } = useToast();

  return {
    showSuccess: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
      showToast({ ...options, message, variant: 'success' }),
    
    showError: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
      showToast({ ...options, message, variant: 'error' }),
    
    showWarning: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
      showToast({ ...options, message, variant: 'warning' }),
    
    showInfo: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
      showToast({ ...options, message, variant: 'info' }),
    
    showProgress: (message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
      showToast({ ...options, message, variant: 'progress', duration: 0 }),
  };
};

// Hook for managing long-running operations with progress
export const useProgressToast = () => {
  const { showToast, updateToast, dismissToast } = useToast();

  const startProgress = useCallback((message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) => {
    const id = showToast({
      ...options,
      message,
      variant: 'progress',
      duration: 0,
      showProgress: true,
      progress: 0,
    });

    const updateProgress = (progress: number, newMessage?: string) => {
      updateToast(id, {
        progress: Math.min(100, Math.max(0, progress)),
        ...(newMessage && { message: newMessage }),
      });
    };

    const completeProgress = (successMessage?: string) => {
      updateToast(id, {
        variant: 'success',
        message: successMessage || 'Operation completed successfully',
        progress: 100,
        duration: 3000,
      });
    };

    const failProgress = (errorMessage?: string) => {
      updateToast(id, {
        variant: 'error',
        message: errorMessage || 'Operation failed',
        duration: 5000,
      });
    };

    const cancelProgress = () => {
      dismissToast(id);
    };

    return {
      id,
      updateProgress,
      completeProgress,
      failProgress,
      cancelProgress,
    };
  }, [showToast, updateToast, dismissToast]);

  return { startProgress };
};