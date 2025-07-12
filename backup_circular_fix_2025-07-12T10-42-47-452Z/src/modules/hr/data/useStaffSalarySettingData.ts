import { useAppData } from '../../../contexts/AppDataContext';

export const useStaffSalarySettingData = () => {
  const { staffsalarysettings, addStaffSalarySetting, updateStaffSalarySetting, deleteStaffSalarySetting } = useAppData();
  
  return {
    data: staffsalarysettings,
    create: addStaffSalarySetting,
    update: updateStaffSalarySetting,
    remove: deleteStaffSalarySetting
  };
};
