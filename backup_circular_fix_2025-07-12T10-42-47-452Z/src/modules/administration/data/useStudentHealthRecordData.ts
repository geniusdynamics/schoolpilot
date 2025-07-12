import { useAppData } from '../../../contexts/AppDataContext';

export const useStudentHealthRecordData = () => {
  const { studenthealthrecords, addStudentHealthRecord, updateStudentHealthRecord, deleteStudentHealthRecord } = useAppData();
  
  return {
    data: studenthealthrecords,
    create: addStudentHealthRecord,
    update: updateStudentHealthRecord,
    remove: deleteStudentHealthRecord
  };
};
