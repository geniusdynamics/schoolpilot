import { useAppData } from '../../../contexts/AppDataContext';

export const useExamSessionData = () => {
  const { examsessions, addExamSession, updateExamSession, deleteExamSession } = useAppData();
  
  return {
    data: examsessions,
    create: addExamSession,
    update: updateExamSession,
    remove: deleteExamSession
  };
};
