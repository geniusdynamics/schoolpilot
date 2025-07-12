import { useAppData } from '../../../contexts/AppDataContext';

export const useFeeTemplateItemData = () => {
  const { feetemplateitems, addFeeTemplateItem, updateFeeTemplateItem, deleteFeeTemplateItem } = useAppData();
  
  return {
    data: feetemplateitems,
    create: addFeeTemplateItem,
    update: updateFeeTemplateItem,
    remove: deleteFeeTemplateItem
  };
};
