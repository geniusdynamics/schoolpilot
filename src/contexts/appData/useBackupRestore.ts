import { useBackupRestoreContext } from './BackupRestoreContext';

export const useBackupRestore = () => {
  return useBackupRestoreContext();
};
