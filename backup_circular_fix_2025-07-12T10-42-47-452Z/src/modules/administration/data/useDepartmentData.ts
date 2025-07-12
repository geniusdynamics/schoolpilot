import { useAppData } from '../../../contexts/AppDataContext';

export const useDepartmentData = () => {
  const { departments, addDepartment, updateDepartment, deleteDepartment } = useAppData();
  
  return {
    data: departments,
    create: addDepartment,
    update: updateDepartment,
    remove: deleteDepartment
  };
};
