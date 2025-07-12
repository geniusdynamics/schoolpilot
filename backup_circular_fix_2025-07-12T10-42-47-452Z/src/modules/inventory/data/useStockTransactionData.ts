import { useAppData } from '../../../contexts/AppDataContext';

export const useStockTransactionData = () => {
  const { stocktransactions, addStockTransaction, updateStockTransaction, deleteStockTransaction } = useAppData();
  
  return {
    data: stocktransactions,
    create: addStockTransaction,
    update: updateStockTransaction,
    remove: deleteStockTransaction
  };
};
