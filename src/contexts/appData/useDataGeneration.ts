import { useAppData } from '../../hooks/useAppData';

export const useDataGeneration = () => {
  const {
    generateData
  } = useAppData();

  return {
    generateData
  };
};
