import { useAppData } from '../../../contexts/AppDataContext';

export const useItemCategoryData = () => {
  const { itemcategorys, addItemCategory, updateItemCategory, deleteItemCategory } = useAppData();
  
  return {
    data: itemcategorys,
    create: addItemCategory,
    update: updateItemCategory,
    remove: deleteItemCategory
  };
};
