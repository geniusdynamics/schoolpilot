// ABOUTME: System domain hook — SchoolDetails, Roles, Users, AppSettings, RBAC, Audit, Workflows
// ABOUTME: Handles initialization of the database service and seeding/clearing operations

import { useState, useEffect, useCallback } from 'react';
import type { AppDataLoadingStates, AppDataContextType } from '@/types';
import { databaseService } from '@/services/database/databaseService';
import { rbacService } from '@/core/rbacService';
import type { RbacRole, Permission, UserRole } from '@/core/types';
import * as allTypes from '@/types';

type RawInitialData = AppDataContextType['rawInitialData'];

// Loading keys owned by this domain
const SYSTEM_LOADING_KEYS = [
  'all', 'schoolDetails', 'roles', 'users', 'appSettings',
  'templatesComm', 'campaigns', 'auditLogs', 'workflows', 'permissions', 'userRoles',
] as const;

export function useSystemData(mockDataForSeeding: RawInitialData) {
  const [loading, setLoading] = useState<Partial<AppDataLoadingStates>>(() =>
    Object.fromEntries(SYSTEM_LOADING_KEYS.map(k => [k, true])) as Partial<AppDataLoadingStates>
  );
  const [initializationError, setInitializationError] = useState<Error | null>(null);
  const [isUsingRxDBDummyData, setIsUsingRxDBDummyData] = useState<boolean>(false);
  const [systemData, setSystemData] = useState<{
    schoolDetails: allTypes.SchoolDetails | null;
    roles: allTypes.Role[];
    users: allTypes.User[];
    appSettings: any | null;
    templatesComm: any[];
    campaigns: any[];
    auditLogs: allTypes.AuditLog[];
    workflows: any[];
    workflowStates: any[];
  }>({
    schoolDetails: null,
    roles: [],
    users: [],
    appSettings: null,
    templatesComm: [],
    campaigns: [],
    auditLogs: [],
    workflows: [],
    workflowStates: [],
  });
  const [rbac, setRbac] = useState<{ permissions: Permission[]; roles: RbacRole[]; userRoles: UserRole[] }>({
    permissions: [],
    roles: [],
    userRoles: [],
  });

  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        await databaseService.initializeDatabase();
        if (isMounted) {
          setIsUsingRxDBDummyData(false);
          setRbac({ permissions: [], roles: [], userRoles: [] });
          setLoading(Object.fromEntries(SYSTEM_LOADING_KEYS.map(k => [k, false])) as Partial<AppDataLoadingStates>);
        }
      } catch (err: any) {
        if (isMounted) {
          setInitializationError(err);
          setLoading(Object.fromEntries(SYSTEM_LOADING_KEYS.map(k => [k, false])) as Partial<AppDataLoadingStates>);
        }
      }
    };
    init();
    return () => { isMounted = false; };
  }, []);

  // ── Seed / Clear ────────────────────────────────────────────────────────────
  const triggerSeedRxDB = useCallback(async () => {
    try {
      await databaseService.seedDatabaseWithMockData();
      setIsUsingRxDBDummyData(true);
      console.log('Database seeded with mock data successfully');
    } catch (error) {
      console.error('Failed to seed database:', error);
    }
  }, [mockDataForSeeding]);

  const triggerClearRxDB = useCallback(async () => {
    try {
      await databaseService.clearDatabase();
      setIsUsingRxDBDummyData(false);
      console.log('Database cleared successfully');
    } catch (error) {
      console.error('Failed to clear database:', error);
    }
  }, []);

  // ── School Details ───────────────────────────────────────────────────────────
  const updateSchoolDetails = useCallback(async (schoolDetails: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.school_details?.update(schoolDetails.id, schoolDetails);
      return result?.doc || null;
    } catch (error) {
      console.error('Error updating school details:', error);
      throw error;
    }
  }, []);

  // ── Users ────────────────────────────────────────────────────────────────────
  const addUser = useCallback(async (userData: Omit<allTypes.User, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const userWithId = { ...userData, id: databaseService.generateId() };
      const result = await db.users?.insert(userWithId);
      return result?.doc || null;
    } catch (error) {
      console.error('Error adding user:', error);
      throw error;
    }
  }, []);

  const updateUser = useCallback(async (userId: string, userData: Partial<allTypes.User>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.users?.update(userId, userData);
      return result?.doc || null;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.users?.remove(userId);
      return true;
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  }, []);

  // ── Roles ────────────────────────────────────────────────────────────────────
  const addRole = useCallback(async (roleData: Omit<allTypes.Role, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const roleWithId = { ...roleData, id: databaseService.generateNumericId() };
      const result = await db.roles?.insert(roleWithId);
      return result?.doc || null;
    } catch (error) {
      console.error('Error adding role:', error);
      throw error;
    }
  }, []);

  const updateRole = useCallback(async (roleId: string, roleData: Partial<allTypes.Role>) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.roles?.update(roleId, roleData);
      return result?.doc || null;
    } catch (error) {
      console.error('Error updating role:', error);
      throw error;
    }
  }, []);

  const deleteRole = useCallback(async (roleId: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.roles?.remove(roleId);
      return true;
    } catch (error) {
      console.error('Error deleting role:', error);
      throw error;
    }
  }, []);

  // ── Audit Log ────────────────────────────────────────────────────────────────
  const addAuditLog = useCallback(async (logData: Omit<allTypes.AuditLog, 'id'>) => {
    try {
      const db = await databaseService.getDatabase();
      const logWithId = { ...logData, id: databaseService.generateId() };
      const result = await db.audit_logs?.insert(logWithId);
      return result?.doc || null;
    } catch (error) {
      console.error('Error adding audit log:', error);
      throw error;
    }
  }, []);

  // ── Templates / Campaigns ────────────────────────────────────────────────────
  const addTemplateComm = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.template_comms?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding template_comm:', error); throw error; }
  }, []);

  const updateTemplateComm = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.template_comms?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating template_comm:', error); throw error; }
  }, []);

  const deleteTemplateComm = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.template_comms?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting template_comm:', error); throw error; }
  }, []);

  const addCampaign = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.campaigns?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding campaign:', error); throw error; }
  }, []);

  const updateCampaign = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.campaigns?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating campaign:', error); throw error; }
  }, []);

  const deleteCampaign = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.campaigns?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting campaign:', error); throw error; }
  }, []);

  // ── Workflows ────────────────────────────────────────────────────────────────
  const addWorkflow = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.workflows?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding workflow:', error); throw error; }
  }, []);

  const updateWorkflow = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.workflows?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating workflow:', error); throw error; }
  }, []);

  const deleteWorkflow = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.workflows?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting workflow:', error); throw error; }
  }, []);

  const addWorkflowState = useCallback(async (data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const d = { ...data, id: databaseService.generateId() };
      const result = await db.workflow_states?.insert(d);
      return result?.doc || null;
    } catch (error) { console.error('Error adding workflow state:', error); throw error; }
  }, []);

  const updateWorkflowState = useCallback(async (id: string, data: any) => {
    try {
      const db = await databaseService.getDatabase();
      const result = await db.workflow_states?.update(id, data);
      return result?.doc || null;
    } catch (error) { console.error('Error updating workflow state:', error); throw error; }
  }, []);

  const deleteWorkflowState = useCallback(async (id: string) => {
    try {
      const db = await databaseService.getDatabase();
      await db.workflow_states?.remove(id);
      return true;
    } catch (error) { console.error('Error deleting workflow state:', error); throw error; }
  }, []);

  return {
    // Loading / meta
    loading,
    initializationError,
    isRxDBModeActive: true as const,
    isUsingRxDBDummyData,
    triggerSeedRxDB,
    triggerClearRxDB,

    // Data
    schoolDetails: systemData.schoolDetails,
    roles: rbac.roles.map((role, idx) => ({
      id: idx + 1,
      name: role.name,
      description: role.description,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })),
    users: systemData.users,
    appSettings: systemData.appSettings,
    templatesComm: systemData.templatesComm,
    campaigns: systemData.campaigns,
    auditLogs: systemData.auditLogs,
    workflows: systemData.workflows,
    permissions: rbac.permissions,
    userRoles: rbac.userRoles,

    // CRUD
    updateSchoolDetails,
    addUser, updateUser, deleteUser,
    addRole, updateRole, deleteRole,
    addAuditLog,
    addTemplateComm, updateTemplateComm, deleteTemplateComm,
    addCampaign, updateCampaign, deleteCampaign,
    addWorkflow, updateWorkflow, deleteWorkflow,
    addWorkflowState, updateWorkflowState, deleteWorkflowState,
  };
}
