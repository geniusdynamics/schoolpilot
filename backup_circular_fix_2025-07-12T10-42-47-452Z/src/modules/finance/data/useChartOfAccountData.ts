import { useAppData } from '../../../contexts/AppDataContext';

export const useChartOfAccountData = () => {
  const { chartofaccounts, addChartOfAccount, updateChartOfAccount, deleteChartOfAccount } = useAppData();
  
  return {
    data: chartofaccounts,
    create: addChartOfAccount,
    update: updateChartOfAccount,
    remove: deleteChartOfAccount
  };
};
