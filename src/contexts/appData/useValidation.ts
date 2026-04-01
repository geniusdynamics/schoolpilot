import { useAppData } from '../../hooks/useAppData';

export const useValidation = () => {
  const { validateData } = useAppData();

  return {
    validateData
  };
};
