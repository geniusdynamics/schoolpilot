import { useAppData } from '../../../contexts/AppDataContext';

export const useStudentSubjectEnrollmentData = () => {
  const { studentsubjectenrollments, addStudentSubjectEnrollment, updateStudentSubjectEnrollment, deleteStudentSubjectEnrollment } = useAppData();
  
  return {
    data: studentsubjectenrollments,
    create: addStudentSubjectEnrollment,
    update: updateStudentSubjectEnrollment,
    remove: deleteStudentSubjectEnrollment
  };
};
