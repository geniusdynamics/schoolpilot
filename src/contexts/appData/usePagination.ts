import { useAppData } from '../../hooks/useAppData';

export const usePagination = () => {
  const { getCollectionPage } = useAppData();

  return {
    getCollectionPage
  };
};
