import { useAppData } from '../../../contexts/AppDataContext';

export const useFixedAssetData = () => {
  const { fixedassets, addFixedAsset, updateFixedAsset, deleteFixedAsset } = useAppData();
  
  return {
    data: fixedassets,
    create: addFixedAsset,
    update: updateFixedAsset,
    remove: deleteFixedAsset
  };
};
