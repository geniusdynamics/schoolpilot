import { useAppData } from '../../../contexts/AppDataContext';

export const useMealConsumptionLogData = () => {
  const { mealconsumptionlogs, addMealConsumptionLog, updateMealConsumptionLog, deleteMealConsumptionLog } = useAppData();
  
  return {
    data: mealconsumptionlogs,
    create: addMealConsumptionLog,
    update: updateMealConsumptionLog,
    remove: deleteMealConsumptionLog
  };
};
