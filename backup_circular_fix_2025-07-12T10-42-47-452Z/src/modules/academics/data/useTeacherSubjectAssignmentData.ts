import { useAppData } from '../../../contexts/AppDataContext';

export const useTeacherSubjectAssignmentData = () => {
  const { teachersubjectassignments, addTeacherSubjectAssignment, updateTeacherSubjectAssignment, deleteTeacherSubjectAssignment } = useAppData();
  
  return {
    data: teachersubjectassignments,
    create: addTeacherSubjectAssignment,
    update: updateTeacherSubjectAssignment,
    remove: deleteTeacherSubjectAssignment
  };
};
