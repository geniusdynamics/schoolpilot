import { useAppData } from '../../hooks/useAppData';

export const useBackupRestore = () => {
  const {
    backupData,
    restoreData,
    clearAllData
  } = useAppData();

  return {
    backupData,
    restoreData,
    clearAllData
  };
};
