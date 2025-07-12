import { useAppData } from '../../../contexts/AppDataContext';

export const useSchoolPeriodData = () => {
  const { schoolperiods, addSchoolPeriod, updateSchoolPeriod, deleteSchoolPeriod } = useAppData();
  
  return {
    data: schoolperiods,
    create: addSchoolPeriod,
    update: updateSchoolPeriod,
    remove: deleteSchoolPeriod
  };
};
