// ABOUTME: Main hook for Admissions module pages
// ABOUTME: Uses useAdmissionsData() for database-backed data and CRUD
// ABOUTME: This is the ONLY hook Admissions pages should use

import { useCallback } from 'react';
import { useAdmissionsData } from '../data/useAdmissionsData';
import { databaseService } from '@/services/database/databaseService';

export const useAdmissions = () => {
  const admissionsData = useAdmissionsData();

  // Interview operations using databaseService
  const addInterview = useCallback(async (data: any) => {
    const db = await databaseService.getDatabase();
    const result = await db.admission_interviews?.insert(data);
    return result?.doc || null;
  }, []);

  const updateInterview = useCallback(async (id: string, data: any) => {
    const db = await databaseService.getDatabase();
    const result = await db.admission_interviews?.update(id, data);
    return result?.doc || null;
  }, []);

  const deleteInterview = useCallback(async (id: string) => {
    const db = await databaseService.getDatabase();
    await db.admission_interviews?.remove(id);
  }, []);

  // Application status helpers
  const approveApplication = useCallback(async (id: string) => {
    return admissionsData.updateApplication(id, { status: 'Approved' });
  }, [admissionsData]);

  const rejectApplication = useCallback(async (id: string) => {
    return admissionsData.updateApplication(id, { status: 'Rejected' });
  }, [admissionsData]);

  return {
    // Data
    applications: admissionsData.applications,
    statistics: admissionsData.statistics,
    loading: admissionsData.loading,
    error: admissionsData.error,
    interviews: [], // Interviews not loaded by default; implement if needed

    // Application CRUD
    loadApplications: admissionsData.loadApplications,
    addApplication: admissionsData.createApplication,
    updateApplication: admissionsData.updateApplication,
    deleteApplication: admissionsData.deleteApplication,
    approveApplication,
    rejectApplication,

    // Interview CRUD
    addInterview,
    updateInterview,
    deleteInterview,

    // Extended operations
    getApplication: admissionsData.getApplication,
    getApplicationByReference: admissionsData.getApplicationByReference,
    addReview: admissionsData.addReview,
    makeDecision: admissionsData.makeDecision,
    processEnrollment: admissionsData.processEnrollment,
  };
};

export default useAdmissions;