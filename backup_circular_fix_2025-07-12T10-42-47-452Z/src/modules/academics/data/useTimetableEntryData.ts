import { useAppData } from '../../../contexts/AppDataContext';

export const useTimetableEntryData = () => {
  const { timetableentrys, addTimetableEntry, updateTimetableEntry, deleteTimetableEntry } = useAppData();
  
  return {
    data: timetableentrys,
    create: addTimetableEntry,
    update: updateTimetableEntry,
    remove: deleteTimetableEntry
  };
};
