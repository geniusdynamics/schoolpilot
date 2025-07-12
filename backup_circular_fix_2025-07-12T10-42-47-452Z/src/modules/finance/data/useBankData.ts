import { useAppData } from '../../../contexts/AppDataContext';

export const useBankData = () => {
  const { banks, addBank, updateBank, deleteBank } = useAppData();
  
  return {
    data: banks,
    create: addBank,
    update: updateBank,
    remove: deleteBank
  };
};
