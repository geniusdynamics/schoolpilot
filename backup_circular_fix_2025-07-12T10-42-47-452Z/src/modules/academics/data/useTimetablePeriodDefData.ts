import { useAppData } from '../../../contexts/AppDataContext';

export const useTimetablePeriodDefData = () => {
  const { timetableperioddefs, addTimetablePeriodDef, updateTimetablePeriodDef, deleteTimetablePeriodDef } = useAppData();
  
  return {
    data: timetableperioddefs,
    create: addTimetablePeriodDef,
    update: updateTimetablePeriodDef,
    remove: deleteTimetablePeriodDef
  };
};
