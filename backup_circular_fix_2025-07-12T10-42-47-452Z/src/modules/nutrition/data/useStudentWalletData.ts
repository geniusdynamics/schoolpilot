import { useAppData } from '../../../contexts/AppDataContext';

export const useStudentWalletData = () => {
  const { studentwallets, addStudentWallet, updateStudentWallet, deleteStudentWallet } = useAppData();
  
  return {
    data: studentwallets,
    create: addStudentWallet,
    update: updateStudentWallet,
    remove: deleteStudentWallet
  };
};
