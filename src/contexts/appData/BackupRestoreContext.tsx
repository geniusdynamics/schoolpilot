import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import { UnifiedDatabaseManager } from '@/services/database/UnifiedDatabaseManager';
import { useToastHelpers } from '@/hooks/useToast';

export interface BackupRestoreContextType {
  backupData: () => Promise<any>;
  restoreData: (backup: any) => Promise<void>;
  clearAllData: () => Promise<void>;
}

export const BackupRestoreContext = createContext<BackupRestoreContextType | undefined>(undefined);

export const BackupRestoreProvider: React.FC<{ 
  children: ReactNode; 
  onDataChanged?: () => Promise<void>;
}> = ({ children, onDataChanged }) => {
  const toast = useToastHelpers();
  
  const backupData = useCallback(async () => {
    try {
      const dbManager = UnifiedDatabaseManager.getInstance();
      toast.showInfo('Starting backup...');
      const backup = await dbManager.createBackup();
      toast.showSuccess('Backup completed successfully');
      return backup;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Backup failed';
      console.error('Backup failed:', err);
      toast.showError(errorMessage);
      throw err;
    }
  }, [toast]);

  const restoreData = useCallback(async (backup: any) => {
    try {
      const dbManager = UnifiedDatabaseManager.getInstance();
      toast.showInfo('Starting restore...');
      const result = await dbManager.restoreFromBackup(backup, { clearExisting: true });
      if (onDataChanged) {
        await onDataChanged();
      } else {
        window.dispatchEvent(new CustomEvent('appDataChanged'));
      }

      if (result.success) {
        toast.showSuccess(`Restore completed: ${result.restored} records restored`);
      } else {
        toast.showWarning(`Restore completed with errors: ${result.restored} restored, ${result.failed} failed`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Restore failed';
      console.error('Restore failed:', err);
      toast.showError(errorMessage);
      throw err;
    }
  }, [onDataChanged, toast]);

  const clearAllData = useCallback(async () => {
    try {
      const dbManager = UnifiedDatabaseManager.getInstance();
      toast.showInfo('Clearing all data...');
      await dbManager.clearAllData();
      if (onDataChanged) {
        await onDataChanged();
      } else {
        window.dispatchEvent(new CustomEvent('appDataChanged'));
      }
      toast.showSuccess('All data cleared successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear data';
      console.error('Clear data failed:', err);
      toast.showError(errorMessage);
      throw err;
    }
  }, [onDataChanged, toast]);

  return (
    <BackupRestoreContext.Provider value={{ backupData, restoreData, clearAllData }}>
      {children}
    </BackupRestoreContext.Provider>
  );
};

export const useBackupRestoreContext = () => {
  const context = useContext(BackupRestoreContext);
  if (!context) {
    throw new Error('useBackupRestoreContext must be used within a BackupRestoreProvider');
  }
  return context;
};
