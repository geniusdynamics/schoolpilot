import { useAppData } from '../../../contexts/AppDataContext';

export const useWalletTransactionData = () => {
  const { wallettransactions, addWalletTransaction, updateWalletTransaction, deleteWalletTransaction } = useAppData();
  
  return {
    data: wallettransactions,
    create: addWalletTransaction,
    update: updateWalletTransaction,
    remove: deleteWalletTransaction
  };
};
