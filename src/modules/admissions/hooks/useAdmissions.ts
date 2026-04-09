import { useAppData } from '@/hooks/useAppData';
import { useAdmissionsDataContext } from '../data/AdmissionsDataProvider';

export const useAdmissions = () => {
  const appData = useAppData();
  const ctx = useAdmissionsDataContext();
  return {
    applications: appData.admissionApplications || [],
    interviews: appData.admissionInterviews || [],
    loading: appData.loading,
    addApplication: ctx.addApplication,
    updateApplication: ctx.updateApplication,
    deleteApplication: ctx.deleteApplication,
    approveApplication: ctx.approveApplication,
    rejectApplication: ctx.rejectApplication,
    addInterview: ctx.addInterview,
    updateInterview: ctx.updateInterview,
    deleteInterview: ctx.deleteInterview,
  };
};
export default useAdmissions;
