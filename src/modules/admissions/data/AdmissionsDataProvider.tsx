// ABOUTME: Admissions Data Provider
import React, { createContext, useContext, ReactNode, useCallback, useState } from 'react';
import { databaseService } from '@/services/database/databaseService';
import { useToast } from '@/hooks/useToast';
import * as types from './types';

interface AdmissionsDataContextType {
  applications: types.AdmissionApplication[];
  interviews: types.AdmissionInterview[];
  loading: boolean;
  addApplication: (data: Omit<types.AdmissionApplication, 'id' | 'created_at' | 'updated_at'>) => Promise<types.AdmissionApplication>;
  updateApplication: (id: string, data: Partial<types.AdmissionApplication>) => Promise<types.AdmissionApplication>;
  deleteApplication: (id: string) => Promise<void>;
  approveApplication: (id: string) => Promise<types.AdmissionApplication>;
  rejectApplication: (id: string, reason: string) => Promise<types.AdmissionApplication>;
  addInterview: (data: Omit<types.AdmissionInterview, 'id' | 'created_at' | 'updated_at'>) => Promise<types.AdmissionInterview>;
  updateInterview: (id: string, data: Partial<types.AdmissionInterview>) => Promise<types.AdmissionInterview>;
  deleteInterview: (id: string) => Promise<void>;
}

const AdmissionsDataContext = createContext<AdmissionsDataContextType | undefined>(undefined);

export const useAdmissionsDataContext = () => {
  const context = useContext(AdmissionsDataContext);
  if (!context) throw new Error('useAdmissionsDataContext must be used within AdmissionsDataProvider');
  return context;
};

interface Props {
  children: ReactNode;
  applications: types.AdmissionApplication[];
  interviews: types.AdmissionInterview[];
  loading: boolean;
}

export const AdmissionsDataProvider: React.FC<Props> = ({
  children, applications, interviews, loading: parentLoading
}) => {
  const toast = useToast();
  const [localLoading, setLocalLoading] = useState(false);
  const loading = parentLoading || localLoading;

  const withToast = async <T,>(fn: () => Promise<T>, successMsg: string): Promise<T> => {
    setLocalLoading(true);
    try {
      const result = await fn();
      toast.showSuccess(successMsg);
      return result;
    } catch (error) {
      toast.showError(`Failed: ${error}`);
      throw error;
    } finally {
      setLocalLoading(false);
    }
  };

  const withConfirm = async <T,>(fn: () => Promise<T>, confirmMsg: string): Promise<T | void> => {
    if (!window.confirm(confirmMsg)) return;
    return fn();
  };

  const addApplication = useCallback((data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const newItem: types.AdmissionApplication = {
        ...data,
        id: crypto.randomUUID(),
        status: 'Submitted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.admission_applications?.insert(newItem);
      return newItem;
    }, 'Application submitted'), [toast]);

  const updateApplication = useCallback((id, data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.admission_applications?.update(id, updates);
      return { ...applications.find(a => a.id === id), ...updates } as types.AdmissionApplication;
    }, 'Application updated'), [applications, toast]);

  const deleteApplication = useCallback((id) =>
    withConfirm(() =>
      withToast(async () => { const db = await databaseService.getDatabase(); await db.admission_applications?.remove(id); }, 'Application deleted'),
      'Delete this application?'), [toast]);

  const approveApplication = useCallback((id) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const updates = { status: 'Approved' as types.ApplicationStatus, updated_at: new Date().toISOString() };
      await db.admission_applications?.update(id, updates);
      return { ...applications.find(a => a.id === id), ...updates } as types.AdmissionApplication;
    }, 'Application approved'), [applications, toast]);

  const rejectApplication = useCallback((id, reason) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const updates = { status: 'Rejected' as types.ApplicationStatus, rejection_reason: reason, updated_at: new Date().toISOString() };
      await db.admission_applications?.update(id, updates);
      return { ...applications.find(a => a.id === id), ...updates } as types.AdmissionApplication;
    }, 'Application rejected'), [applications, toast]);

  const addInterview = useCallback((data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const newItem: types.AdmissionInterview = { ...data, id: crypto.randomUUID(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
      await db.admission_interviews?.insert(newItem);
      return newItem;
    }, 'Interview scheduled'), [toast]);

  const updateInterview = useCallback((id, data) =>
    withToast(async () => {
      const db = await databaseService.getDatabase();
      const updates = { ...data, updated_at: new Date().toISOString() };
      await db.admission_interviews?.update(id, updates);
      return { ...interviews.find(i => i.id === id), ...updates } as types.AdmissionInterview;
    }, 'Interview updated'), [interviews, toast]);

  const deleteInterview = useCallback((id) =>
    withConfirm(() =>
      withToast(async () => { const db = await databaseService.getDatabase(); await db.admission_interviews?.remove(id); }, 'Interview deleted'),
      'Delete this interview?'), [toast]);

  return (
    <AdmissionsDataContext.Provider value={{
      applications, interviews, loading,
      addApplication, updateApplication, deleteApplication, approveApplication, rejectApplication,
      addInterview, updateInterview, deleteInterview,
    }}>
      {children}
    </AdmissionsDataContext.Provider>
  );
};

export default AdmissionsDataProvider;
