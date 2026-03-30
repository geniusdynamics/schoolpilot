// ABOUTME: Enhanced toast notification management hook with spring animations, gestures, and modern features
// ABOUTME: Provides methods to show, dismiss, and manage toast notifications with stacking, themes, and accessibility

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'framer-motion';
import Toast, { ToastProps, ToastVariant } from '../components/ui/feedback/Toast';

export interface ToastOptions {
  title?: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  progress?: number;
  showProgress?: boolean;
  pauseOnHover?: boolean;
  swipeToDismiss?: boolean;
  soundEnabled?: boolean;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact';
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
  theme?: 'light' | 'dark' | 'auto';
  defaultPauseOnHover?: boolean;
  defaultSwipeToDismiss?: boolean;
  defaultSoundEnabled?: boolean;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  maxToasts = 5,
  position = 'top-right',
  theme = 'auto',
  defaultPauseOnHover = true,
  defaultSwipeToDismiss = true,
  defaultSoundEnabled = false,
}) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const generateId = useCallback(() => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const showToast = useCallback((options: ToastOptions): string => {
    const id = generateId();
    const newToast: ToastProps = {
      id,
      pauseOnHover: defaultPauseOnHover,
      swipeToDismiss: defaultSwipeToDismiss,
      soundEnabled: defaultSoundEnabled,
      theme,
      position,
      ...options,
      onDismiss: (toastId: string) => dismissToast(toastId),
    };

    setToasts(prev => {
      const updated = [newToast, ...prev];
      // Limit the number of toasts
      return updated.slice(0, maxToasts);
    });

    return id;
  }, [generateId, maxToasts, theme, position, defaultPauseOnHover, defaultSwipeToDismiss, defaultSoundEnabled]);

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
          <AnimatePresence mode="popLayout">
            {toasts.map((toast, index) => (
              <Toast
                key={toast.id}
                {...toast}
                stackIndex={index}
                totalStacked={toasts.length}
              />
            ))}
          </AnimatePresence>
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
};

// Convenience hooks for different toast types
export const useToastHelpers = () => {
  const { showToast } = useToast();

  const showSuccess = useCallback((message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
    showToast({ ...options, message, variant: 'success' }), [showToast]);
  
  const showError = useCallback((message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
    showToast({ ...options, message, variant: 'error' }), [showToast]);
  
  const showWarning = useCallback((message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
    showToast({ ...options, message, variant: 'warning' }), [showToast]);
  
  const showInfo = useCallback((message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
    showToast({ ...options, message, variant: 'info' }), [showToast]);
  
  const showProgress = useCallback((message: string, options?: Omit<ToastOptions, 'message' | 'variant'>) =>
    showToast({ ...options, message, variant: 'progress', duration: 0 }), [showToast]);

  return React.useMemo(() => ({
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showProgress,
  }), [showSuccess, showError, showWarning, showInfo, showProgress]);
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