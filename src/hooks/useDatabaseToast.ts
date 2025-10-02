// ABOUTME: Custom hook for database operation toast notifications
// ABOUTME: Provides consistent notification patterns for CRUD operations

import { useSnackbar, VariantType } from 'notistack';
import { useCallback } from 'react';

export interface ToastOptions {
  variant?: VariantType;
  persist?: boolean;
  action?: React.ReactNode;
}

export interface DatabaseToastHook {
  showSuccess: (message: string, options?: ToastOptions) => void;
  showError: (message: string, error?: Error, options?: ToastOptions) => void;
  showInfo: (message: string, options?: ToastOptions) => void;
  showWarning: (message: string, options?: ToastOptions) => void;
  
  // Database-specific notifications
  notifyCreate: (entityName: string, entityId?: string) => void;
  notifyUpdate: (entityName: string, entityId?: string) => void;
  notifyDelete: (entityName: string, entityId?: string) => void;
  notifyBulkOperation: (operation: string, count: number, entityName: string) => void;
  notifySync: (status: 'started' | 'completed' | 'failed', details?: string) => void;
  notifyBackup: (status: 'started' | 'completed' | 'failed', details?: string) => void;
  notifyRestore: (status: 'started' | 'completed' | 'failed', details?: string) => void;
}

export const useDatabaseToast = (): DatabaseToastHook => {
  const { enqueueSnackbar } = useSnackbar();

  const showSuccess = useCallback((message: string, options?: ToastOptions) => {
    enqueueSnackbar(message, {
      variant: options?.variant || 'success',
      persist: options?.persist,
      action: options?.action,
    });
  }, [enqueueSnackbar]);

  const showError = useCallback((message: string, error?: Error, options?: ToastOptions) => {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    enqueueSnackbar(errorMessage, {
      variant: options?.variant || 'error',
      persist: options?.persist,
      action: options?.action,
    });
  }, [enqueueSnackbar]);

  const showInfo = useCallback((message: string, options?: ToastOptions) => {
    enqueueSnackbar(message, {
      variant: options?.variant || 'info',
      persist: options?.persist,
      action: options?.action,
    });
  }, [enqueueSnackbar]);

  const showWarning = useCallback((message: string, options?: ToastOptions) => {
    enqueueSnackbar(message, {
      variant: options?.variant || 'warning',
      persist: options?.persist,
      action: options?.action,
    });
  }, [enqueueSnackbar]);

  // Database-specific notifications
  const notifyCreate = useCallback((entityName: string, entityId?: string) => {
    const message = entityId 
      ? `${entityName} created successfully (ID: ${entityId})`
      : `${entityName} created successfully`;
    showSuccess(message);
  }, [showSuccess]);

  const notifyUpdate = useCallback((entityName: string, entityId?: string) => {
    const message = entityId
      ? `${entityName} updated successfully (ID: ${entityId})`
      : `${entityName} updated successfully`;
    showSuccess(message);
  }, [showSuccess]);

  const notifyDelete = useCallback((entityName: string, entityId?: string) => {
    const message = entityId
      ? `${entityName} deleted successfully (ID: ${entityId})`
      : `${entityName} deleted successfully`;
    showSuccess(message);
  }, [showSuccess]);

  const notifyBulkOperation = useCallback((operation: string, count: number, entityName: string) => {
    const message = `${operation} ${count} ${entityName}${count !== 1 ? 's' : ''} successfully`;
    showSuccess(message);
  }, [showSuccess]);

  const notifySync = useCallback((status: 'started' | 'completed' | 'failed', details?: string) => {
    switch (status) {
      case 'started':
        showInfo('Synchronization started...');
        break;
      case 'completed':
        showSuccess(details || 'Synchronization completed successfully');
        break;
      case 'failed':
        showError('Synchronization failed', details ? new Error(details) : undefined);
        break;
    }
  }, [showInfo, showSuccess, showError]);

  const notifyBackup = useCallback((status: 'started' | 'completed' | 'failed', details?: string) => {
    switch (status) {
      case 'started':
        showInfo('Backup started...');
        break;
      case 'completed':
        showSuccess(details || 'Backup completed successfully');
        break;
      case 'failed':
        showError('Backup failed', details ? new Error(details) : undefined);
        break;
    }
  }, [showInfo, showSuccess, showError]);

  const notifyRestore = useCallback((status: 'started' | 'completed' | 'failed', details?: string) => {
    switch (status) {
      case 'started':
        showInfo('Restore started...');
        break;
      case 'completed':
        showSuccess(details || 'Restore completed successfully');
        break;
      case 'failed':
        showError('Restore failed', details ? new Error(details) : undefined);
        break;
    }
  }, [showInfo, showSuccess, showError]);

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    notifyCreate,
    notifyUpdate,
    notifyDelete,
    notifyBulkOperation,
    notifySync,
    notifyBackup,
    notifyRestore,
  };
};
