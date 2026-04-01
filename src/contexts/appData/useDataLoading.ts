import { useAppData } from '../../hooks/useAppData';

export const useDataLoading = () => {
  const {
    isLoading,
    error,
    refreshData,
    refreshCollection,
    refreshDataWithProgress
  } = useAppData();

  return {
    isLoading,
    error,
    refreshData,
    refreshCollection,
    refreshDataWithProgress
  };
};
