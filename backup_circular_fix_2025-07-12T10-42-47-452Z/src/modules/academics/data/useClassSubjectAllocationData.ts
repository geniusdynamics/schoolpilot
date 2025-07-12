import { useAppData } from '../../../contexts/AppDataContext';

export const useClassSubjectAllocationData = () => {
  const { classsubjectallocations, addClassSubjectAllocation, updateClassSubjectAllocation, deleteClassSubjectAllocation } = useAppData();
  
  return {
    data: classsubjectallocations,
    create: addClassSubjectAllocation,
    update: updateClassSubjectAllocation,
    remove: deleteClassSubjectAllocation
  };
};
