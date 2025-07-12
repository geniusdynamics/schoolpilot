import { useAppData } from '../../../contexts/AppDataContext';

export const useBookCategoryData = () => {
  const { bookcategorys, addBookCategory, updateBookCategory, deleteBookCategory } = useAppData();
  
  return {
    data: bookcategorys,
    create: addBookCategory,
    update: updateBookCategory,
    remove: deleteBookCategory
  };
};
