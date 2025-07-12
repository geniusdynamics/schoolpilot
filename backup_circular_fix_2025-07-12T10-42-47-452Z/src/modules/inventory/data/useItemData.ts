import { useAppData } from '../../../contexts/AppDataContext';

export const useItemData = () => {
  const { items, addItem, updateItem, deleteItem } = useAppData();
  
  return {
    data: items,
    create: addItem,
    update: updateItem,
    remove: deleteItem
  };
};
