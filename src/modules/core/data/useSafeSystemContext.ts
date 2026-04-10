// ABOUTME: Safe context hook for system module - returns empty data when module is disabled
import { useSystemDataContext } from './SystemDataContext';
import { moduleRegistry } from '@/core/moduleRegistry';

export const useSafeSystemContext = () => {
  const isEnabled = moduleRegistry.isEnabled('system');

  if (!isEnabled) {
    return {
      schoolDetails: null,
      roles: [],
      users: [],
      auditLogs: [],
      workflows: [],
      permissions: [],
      userRoles: [],
      isModuleEnabled: false,
    };
  }

  return { ...useSystemDataContext(), isModuleEnabled: true };
};
