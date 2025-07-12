import { useAppData } from '../../../contexts/AppDataContext';

export const useStaffRecurringItemData = () => {
  const { staffrecurringitems, addStaffRecurringItem, updateStaffRecurringItem, deleteStaffRecurringItem } = useAppData();
  
  return {
    data: staffrecurringitems,
    create: addStaffRecurringItem,
    update: updateStaffRecurringItem,
    remove: deleteStaffRecurringItem
  };
};
