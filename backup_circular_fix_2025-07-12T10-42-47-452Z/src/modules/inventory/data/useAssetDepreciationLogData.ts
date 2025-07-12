import { useAppData } from '../../../contexts/AppDataContext';

export const useAssetDepreciationLogData = () => {
  const { assetdepreciationlogs, addAssetDepreciationLog, updateAssetDepreciationLog, deleteAssetDepreciationLog } = useAppData();
  
  return {
    data: assetdepreciationlogs,
    create: addAssetDepreciationLog,
    update: updateAssetDepreciationLog,
    remove: deleteAssetDepreciationLog
  };
};
