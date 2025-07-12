import { useAppData } from '../../../contexts/AppDataContext';

export const useStockLevelData = () => {
  const { stocklevels, addStockLevel, updateStockLevel, deleteStockLevel } = useAppData();
  
  return {
    data: stocklevels,
    create: addStockLevel,
    update: updateStockLevel,
    remove: deleteStockLevel
  };
};
