import { useAppData } from '../../../contexts/AppDataContext';

export const useExamPaperSettingData = () => {
  const { exampapersettings, addExamPaperSetting, updateExamPaperSetting, deleteExamPaperSetting } = useAppData();
  
  return {
    data: exampapersettings,
    create: addExamPaperSetting,
    update: updateExamPaperSetting,
    remove: deleteExamPaperSetting
  };
};
