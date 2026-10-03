import { logger } from '@/utils/logging';

// ABOUTME: System domain hook — SchoolDetails, Roles, Users, AppSettings, RBAC, Audit, Workflows
// ABOUTME: Uses real database-backed hooks for persistent data

import { useEffect, useCallback } from 'react';
import type { AppDataLoadingStates } from '@/types';
import { databaseService } from '@/services/database/databaseService';
import type { RbacRole, Permission, UserRole } from '@/core/types';
import * as allTypes from '@/types';
import { useDatabaseCollection } from '@/hooks/useDatabaseCollection';
import { useDatabaseDocument } from '@/hooks/useDatabaseDocument';

// Loading keys owned by this domain
const SYSTEM_LOADING_KEYS = [
  'all', 'schoolDetails', 'roles', 'users', 'appSettings',
  'templatesComm', 'campaigns', 'auditLogs', 'workflows', 'permissions', 'userRoles',
] as const;

export function useSystemData() {
  const schoolDetailsDoc = useDatabaseDocument<allTypes.SchoolDetails>('school_details');
  const usersCollection = useDatabaseCollection<allTypes.User>('users');
  const rolesCollection = useDatabaseCollection<allTypes.Role>('roles');
  const campaignsCollection = useDatabaseCollection<any>('message_campaigns');
  const templatesCommCollection = useDatabaseCollection<any>('communication_templates');
  const auditLogsCollection = useDatabaseCollection<allTypes.AuditLog>('audit_logs');
  const workflowsCollection = useDatabaseCollection<any>('workflows');
  const workflowStatesCollection = useDatabaseCollection<any>('workflow_states');

  const loading: Partial<AppDataLoadingStates> = Object.fromEntries(
    SYSTEM_LOADING_KEYS.map(k => [
      k,
      schoolDetailsDoc.loading ||
      usersCollection.loading ||
      rolesCollection.loading ||
      campaignsCollection.loading ||
      templatesCommCollection.loading ||
      auditLogsCollection.loading ||
      workflowsCollection.loading ||
      workflowStatesCollection.loading
    ])
  ) as Partial<AppDataLoadingStates>;

  const initializationError =
    schoolDetailsDoc.error ||
    usersCollection.error ||
    rolesCollection.error ||
    campaignsCollection.error ||
    templatesCommCollection.error ||
    auditLogsCollection.error ||
    workflowsCollection.error ||
    workflowStatesCollection.error ||
    null;

  useEffect(() => {
    databaseService.initializeDatabase().catch((err) => {
      logger.error('[useSystemData] Failed to initialize database:', err);
    });
  }, []);

  // ── Seed / Clear ────────────────────────────────────────────────────────────
  const triggerSeedRxDB = useCallback(async () => {
    try {
      await databaseService.seedDatabaseWithMockData();
      await Promise.all([
        schoolDetailsDoc.refresh(),
        usersCollection.refresh(),
        rolesCollection.refresh(),
        campaignsCollection.refresh(),
        templatesCommCollection.refresh(),
        auditLogsCollection.refresh(),
        workflowsCollection.refresh(),
        workflowStatesCollection.refresh(),
      ]);
      logger.info('Database seeded with mock data successfully');
    } catch (error) {
      logger.error('Failed to seed database:', error);
    }
  }, [schoolDetailsDoc, usersCollection, rolesCollection, campaignsCollection, templatesCommCollection, auditLogsCollection, workflowsCollection, workflowStatesCollection]);

  const triggerClearRxDB = useCallback(async () => {
    try {
      await databaseService.clearDatabase();
      await Promise.all([
        schoolDetailsDoc.refresh(),
        usersCollection.refresh(),
        rolesCollection.refresh(),
        campaignsCollection.refresh(),
        templatesCommCollection.refresh(),
        auditLogsCollection.refresh(),
        workflowsCollection.refresh(),
        workflowStatesCollection.refresh(),
      ]);
      logger.info('Database cleared successfully');
    } catch (error) {
      logger.error('Failed to clear database:', error);
    }
  }, [schoolDetailsDoc, usersCollection, rolesCollection, campaignsCollection, templatesCommCollection, auditLogsCollection, workflowsCollection, workflowStatesCollection]);

  // ── School Details ───────────────────────────────────────────────────────────
  const updateSchoolDetails = useCallback(async (schoolDetails: any) => {
    return schoolDetailsDoc.save(schoolDetails);
  }, [schoolDetailsDoc]);

  // ── Users ────────────────────────────────────────────────────────────────────
  const addUser = useCallback(async (userData: Omit<allTypes.User, 'id'>) => {
    return usersCollection.insert(userData);
  }, [usersCollection]);

  const updateUser = useCallback(async (userId: string, userData: Partial<allTypes.User>) => {
    return usersCollection.update(userId, userData);
  }, [usersCollection]);

  const deleteUser = useCallback(async (userId: string) => {
    return usersCollection.remove(userId);
  }, [usersCollection]);

  // ── Roles ────────────────────────────────────────────────────────────────────
  const addRole = useCallback(async (roleData: Omit<allTypes.Role, 'id'>) => {
    return rolesCollection.insert(roleData);
  }, [rolesCollection]);

  const updateRole = useCallback(async (roleId: string, roleData: Partial<allTypes.Role>) => {
    return rolesCollection.update(roleId, roleData);
  }, [rolesCollection]);

  const deleteRole = useCallback(async (roleId: string) => {
    return rolesCollection.remove(roleId);
  }, [rolesCollection]);

  // ── Audit Log ────────────────────────────────────────────────────────────────
  const addAuditLog = useCallback(async (logData: Omit<allTypes.AuditLog, 'id'>) => {
    return auditLogsCollection.insert(logData);
  }, [auditLogsCollection]);

  // ── Templates / Campaigns ────────────────────────────────────────────────────
  const addTemplateComm = useCallback(async (data: any) => {
    return templatesCommCollection.insert(data);
  }, [templatesCommCollection]);

  const updateTemplateComm = useCallback(async (id: string, data: any) => {
    return templatesCommCollection.update(id, data);
  }, [templatesCommCollection]);

  const deleteTemplateComm = useCallback(async (id: string) => {
    return templatesCommCollection.remove(id);
  }, [templatesCommCollection]);

  const addCampaign = useCallback(async (data: any) => {
    return campaignsCollection.insert(data);
  }, [campaignsCollection]);

  const updateCampaign = useCallback(async (id: string, data: any) => {
    return campaignsCollection.update(id, data);
  }, [campaignsCollection]);

  const deleteCampaign = useCallback(async (id: string) => {
    return campaignsCollection.remove(id);
  }, [campaignsCollection]);

  // ── Workflows ────────────────────────────────────────────────────────────────
  const addWorkflow = useCallback(async (data: any) => {
    return workflowsCollection.insert(data);
  }, [workflowsCollection]);

  const updateWorkflow = useCallback(async (id: string, data: any) => {
    return workflowsCollection.update(id, data);
  }, [workflowsCollection]);

  const deleteWorkflow = useCallback(async (id: string) => {
    return workflowsCollection.remove(id);
  }, [workflowsCollection]);

  const addWorkflowState = useCallback(async (data: any) => {
    return workflowStatesCollection.insert(data);
  }, [workflowStatesCollection]);

  const updateWorkflowState = useCallback(async (id: string, data: any) => {
    return workflowStatesCollection.update(id, data);
  }, [workflowStatesCollection]);

  const deleteWorkflowState = useCallback(async (id: string) => {
    return workflowStatesCollection.remove(id);
  }, [workflowStatesCollection]);

  // RBAC placeholder - will be populated when RBAC service is integrated with DB
  const rbac = { permissions: [] as Permission[], roles: [] as RbacRole[], userRoles: [] as UserRole[] };

  return {
    // Loading / meta
    loading,
    initializationError,
    isRxDBModeActive: true as const,
    isUsingRxDBDummyData: false,
    triggerSeedRxDB,
    triggerClearRxDB,

    // Data
    schoolDetails: schoolDetailsDoc.data,
    roles: rolesCollection.data,
    users: usersCollection.data,
    appSettings: null,
    templatesComm: templatesCommCollection.data,
    campaigns: campaignsCollection.data,
    auditLogs: auditLogsCollection.data,
    workflows: workflowsCollection.data,
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
