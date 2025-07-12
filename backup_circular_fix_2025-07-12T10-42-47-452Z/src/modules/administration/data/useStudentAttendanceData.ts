import { useAppData } from '../../../contexts/AppDataContext';

export const useStudentAttendanceData = () => {
  const { studentattendances, addStudentAttendance, updateStudentAttendance, deleteStudentAttendance } = useAppData();
  
  return {
    data: studentattendances,
    create: addStudentAttendance,
    update: updateStudentAttendance,
    remove: deleteStudentAttendance
  };
};
