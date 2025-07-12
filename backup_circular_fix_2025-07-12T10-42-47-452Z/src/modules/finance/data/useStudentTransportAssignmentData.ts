import { useAppData } from '../../../contexts/AppDataContext';

export const useStudentTransportAssignmentData = () => {
  const { studenttransportassignments, addStudentTransportAssignment, updateStudentTransportAssignment, deleteStudentTransportAssignment } = useAppData();
  
  return {
    data: studenttransportassignments,
    create: addStudentTransportAssignment,
    update: updateStudentTransportAssignment,
    remove: deleteStudentTransportAssignment
  };
};
