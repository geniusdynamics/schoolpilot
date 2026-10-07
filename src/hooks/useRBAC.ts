import { logger } from '@/utils/logging';

// ABOUTME: RBAC Hook for React Components
// ABOUTME: Provides role-based access control integration with the modular architecture

import { useCallback, useMemo } from 'react';
import { rbacService, SYSTEM_ROLES } from '@/core/rbacService';
import { getEnabledModules } from '@/core/moduleLoader';
import { isDemo } from '@/config/unifiedConfig';
// Removed problematic hook utilities import

export interface RBACHookReturn {
  // Permission checks
  hasPermission: (permissionId: string) => boolean;
  hasModuleAccess: (moduleId: string) => boolean;
  hasFeatureAccess: (moduleId: string, feature: string) => boolean;
  
  // User role information
  userRoles: string[];
  isSuperAdmin: boolean;
  isAdministrator: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  
  // Module access
  accessibleModules: string[];
  getUserModulePermissions: (moduleId: string) => string[];
  getUserModuleFeatures: (moduleId: string) => string[];
  
  // Navigation filtering
  filterNavigationItems: (moduleId: string, navigationItems: any[]) => any[];
  
  // Utility functions
  canCreate: (resource: string) => boolean;
  canRead: (resource: string) => boolean;
  canUpdate: (resource: string) => boolean;
  canDelete: (resource: string) => boolean;
  canExecute: (resource: string) => boolean;
}

export const useRBAC = (userId?: string, userType?: string): RBACHookReturn => {
  // Get user roles
  const userRoles = useMemo((): string[] => {
    if (isDemo()) {
      // In demo mode, regardless of whether a userId is provided,
      // we treat the current session as having SUPER_ADMIN privileges
      // until a proper login system is implemented.
      return [SYSTEM_ROLES.SUPER_ADMIN];
    }

    // Production mode logic (or if APP_MODE is not 'demo')
    if (!userId) {
      // In production mode, if no userId is provided, return no roles
      return [];
    }

    // Existing logic for production mode with a userId
    if (userType === 'Staff') {
      return ['teacher'];
    } else if (userType === 'Student') {
      return ['student'];
    }
    return ['administrator'];
  }, [userId, userType]);

  // Assign roles to user if not already assigned
  useMemo(() => {
    if (userId && userRoles.length > 0) {
      userRoles.forEach(roleId => {
        rbacService.assignRoleToUser(userId, roleId, 'system');
      });
    }
  }, [userId, userRoles]);

  // Permission checks
  const hasPermission = useCallback((permissionId: string): boolean => {
    if (isDemo()) {
      // In demo mode, super admin has all permissions
      return true;
    }
    
    if (!permissionId || typeof permissionId !== 'string') {
      logger.warn('[useRBAC] Invalid permissionId provided:', permissionId);
      return false;
    }
    
    if (!userId) return false;
    return rbacService.hasPermission(userId, permissionId);
  }, [userId]);

  const hasModuleAccess = useCallback((moduleId: string): boolean => {
    if (isDemo()) {
      // In demo mode, all modules are accessible
      return true;
    }
    
    if (!moduleId || typeof moduleId !== 'string') {
      logger.warn('[useRBAC] Invalid moduleId provided:', moduleId);
      return false;
    }
    
    if (!userId) return false;
    return rbacService.hasModuleAccess(userId, moduleId);
  }, [userId]);

  const hasFeatureAccess = useCallback((moduleId: string, feature: string): boolean => {
    if (isDemo()) {
      // In demo mode, all features are accessible
      return true;
    }
    
    if (!moduleId || typeof moduleId !== 'string') {
      logger.warn('[useRBAC] Invalid moduleId provided:', moduleId);
      return false;
    }
    
    if (!feature || typeof feature !== 'string') {
      logger.warn('[useRBAC] Invalid feature provided:', feature);
      return false;
    }
    
    if (!userId) return false;
    const features = rbacService.getUserModuleFeatures(userId, moduleId);
    return features.includes(feature);
  }, [userId]);

  // Role checks
  const isSuperAdmin = useMemo(() => {
    const roles = Array.isArray(userRoles) ? userRoles : [];
    return roles.includes('super_admin');
  }, [userRoles]);

  const isAdministrator = useMemo(() => {
    const roles = Array.isArray(userRoles) ? userRoles : [];
    return roles.includes('administrator') || isSuperAdmin;
  }, [userRoles, isSuperAdmin]);

  const isTeacher = useMemo(() => {
    const roles = Array.isArray(userRoles) ? userRoles : [];
    return roles.includes('teacher') || isAdministrator;
  }, [userRoles, isAdministrator]);

  const isStudent = useMemo(() => {
    const roles = Array.isArray(userRoles) ? userRoles : [];
    return roles.includes('student');
  }, [userRoles]);

  // Module access
  const accessibleModules = useMemo(() => {
    if (isDemo()) {
      // In demo mode, return all available modules regardless of userId
      // getEnabledModules() returns string[] of module IDs directly
      const modules = getEnabledModules();
      logger.info('🔍 [useRBAC] Demo mode - accessible modules:', modules);
      return Array.isArray(modules) ? modules : [];
    }
    
    if (!userId) return [];
    return rbacService.getUserModules(userId) || [];
  }, [userId]);

  const getUserModulePermissions = useCallback((moduleId: string): string[] => {
    if (!moduleId || typeof moduleId !== 'string') {
      logger.warn('[useRBAC] Invalid moduleId provided to getUserModulePermissions:', moduleId);
      return [];
    }
    
    if (!userId) return [];
    return rbacService.getUserModulePermissions(userId, moduleId) || [];
  }, [userId]);

  const getUserModuleFeatures = useCallback((moduleId: string): string[] => {
    if (!moduleId || typeof moduleId !== 'string') {
      logger.warn('[useRBAC] Invalid moduleId provided to getUserModuleFeatures:', moduleId);
      return [];
    }
    
    if (!userId) return [];
    return rbacService.getUserModuleFeatures(userId, moduleId) || [];
  }, [userId]);

  // Navigation filtering
  const filterNavigationItems = useCallback((moduleId: string, navigationItems: any[]): any[] => {
    if (!moduleId || typeof moduleId !== 'string') {
      logger.warn('[useRBAC] Invalid moduleId provided to filterNavigationItems:', moduleId);
      return [];
    }
    
    if (!Array.isArray(navigationItems)) {
      logger.warn('[useRBAC] Invalid navigationItems array provided to filterNavigationItems:', navigationItems);
      return [];
    }
    
    if (!userId) return [];
    return rbacService.filterNavigationItems(userId, moduleId, navigationItems) || [];
  }, [userId]);

  // Resource-based permission checks
  const canCreate = useCallback((resource: string): boolean => {
    if (isDemo()) {
      // In demo mode, all CRUD operations are allowed
      return true;
    }
    if (!resource || typeof resource !== 'string') return false;
    if (!userId) return false;
    const permissionId = `${resource}.create`;
    return rbacService.hasPermission(userId, permissionId);
  }, [userId]);

  const canRead = useCallback((resource: string): boolean => {
    if (isDemo()) {
      // In demo mode, all CRUD operations are allowed
      return true;
    }
    if (!resource || typeof resource !== 'string') return false;
    if (!userId) return false;
    const permissionId = `${resource}.read`;
    return rbacService.hasPermission(userId, permissionId);
  }, [userId]);

  const canUpdate = useCallback((resource: string): boolean => {
    if (isDemo()) {
      // In demo mode, all CRUD operations are allowed
      return true;
    }
    if (!resource || typeof resource !== 'string') return false;
    if (!userId) return false;
    const permissionId = `${resource}.update`;
    return rbacService.hasPermission(userId, permissionId);
  }, [userId]);

  const canDelete = useCallback((resource: string): boolean => {
    if (isDemo()) {
      // In demo mode, all CRUD operations are allowed
      return true;
    }
    if (!resource || typeof resource !== 'string') return false;
    if (!userId) return false;
    const permissionId = `${resource}.delete`;
    return rbacService.hasPermission(userId, permissionId);
  }, [userId]);

  const canExecute = useCallback((resource: string): boolean => {
    if (isDemo()) {
      // In demo mode, all CRUD operations are allowed
      return true;
    }
    if (!resource || typeof resource !== 'string') return false;
    if (!userId) return false;
    const permissionId = `${resource}.execute`;
    return rbacService.hasPermission(userId, permissionId);
  }, [userId]);

  return {
    hasPermission,
    hasModuleAccess,
    hasFeatureAccess,
    userRoles,
    isSuperAdmin,
    isAdministrator,
    isTeacher,
    isStudent,
    accessibleModules,
    getUserModulePermissions,
    getUserModuleFeatures,
    filterNavigationItems,
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canExecute,
  };
};

// Hook for conditional rendering based on permissions
export const usePermissionGate = (permissionId: string, userId?: string, userType?: string) => {
  const { hasPermission } = useRBAC(userId, userType);
  return hasPermission(permissionId);
};

// Hook for module access gates
export const useModuleGate = (moduleId: string, userId?: string, userType?: string) => {
  const { hasModuleAccess } = useRBAC(userId, userType);
  return hasModuleAccess(moduleId);
};

// Hook for feature access gates
export const useFeatureGate = (moduleId: string, feature: string, userId?: string, userType?: string) => {
  const { hasFeatureAccess } = useRBAC(userId, userType);
  return hasFeatureAccess(moduleId, feature);
};