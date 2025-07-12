import { useAppData } from '../../../contexts/AppDataContext';

export const useClassStreamData = () => {
  const { classstreams, addClassStream, updateClassStream, deleteClassStream } = useAppData();
  
  return {
    data: classstreams,
    create: addClassStream,
    update: updateClassStream,
    remove: deleteClassStream
  };
};
