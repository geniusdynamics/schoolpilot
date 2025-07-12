import { useAppData } from '../../../contexts/AppDataContext';

export const useFeeAdjustmentData = () => {
  const { feeadjustments, addFeeAdjustment, updateFeeAdjustment, deleteFeeAdjustment } = useAppData();
  
  return {
    data: feeadjustments,
    create: addFeeAdjustment,
    update: updateFeeAdjustment,
    remove: deleteFeeAdjustment
  };
};
