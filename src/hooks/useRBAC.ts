// ABOUTME: RBAC Hook for React Components
// ABOUTME: Provides role-based access control integration with the modular architecture

import React, { useCallback, useMemo } from 'react';
import { rbacService, SYSTEM_ROLES } from '../core/rbacService';
import type { RbacRole } from '../core/types';

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
    if (!userId) return ['super_admin'];
    // This would typically come from the user context or API
    // For now, we'll use a default role based on user type
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
    if (!userId) return false;
    return rbacService.hasPermission(userId, permissionId);
  }, [userId]);

  const hasModuleAccess = useCallback((moduleId: string): boolean => {
    if (!userId) return false;
    return rbacService.hasModuleAccess(userId, moduleId);
  }, [userId]);

  const hasFeatureAccess = useCallback((moduleId: string, feature: string): boolean => {
    if (!userId) return false;
    const features = rbacService.getUserModuleFeatures(userId, moduleId);
    return features.includes(feature);
  }, [userId]);

  // Role checks
  const isSuperAdmin = useMemo(() => {
    return userRoles.includes('super_admin');
  }, [userRoles]);

  const isAdministrator = useMemo(() => {
    return userRoles.includes('administrator') || isSuperAdmin;
  }, [userRoles, isSuperAdmin]);

  const isTeacher = useMemo(() => {
    return userRoles.includes('teacher') || isAdministrator;
  }, [userRoles, isAdministrator]);

  const isStudent = useMemo(() => {
    return userRoles.includes('student');
  }, [userRoles]);

  // Module access
  const accessibleModules = useMemo(() => {
    if (!userId) return [];
    return rbacService.getUserModules(userId);
  }, [userId]);

  const getUserModulePermissions = useCallback((moduleId: string): string[] => {
    if (!userId) return [];
    return rbacService.getUserModulePermissions(userId, moduleId);
  }, [userId]);

  const getUserModuleFeatures = useCallback((moduleId: string): string[] => {
    if (!userId) return [];
    return rbacService.getUserModuleFeatures(userId, moduleId);
  }, [userId]);

  // Navigation filtering
  const filterNavigationItems = useCallback((moduleId: string, navigationItems: any[]): any[] => {
    if (!userId) return [];
    return rbacService.filterNavigationItems(userId, moduleId, navigationItems);
  }, [userId]);

  // Resource-based permission checks
  const canCreate = useCallback((resource: string): boolean => {
    if (!userId) return false;
    const permissionId = `${resource}.create`;
    return rbacService.hasPermission(userId, permissionId);
  }, [userId]);

  const canRead = useCallback((resource: string): boolean => {
    if (!userId) return false;
    const permissionId = `${resource}.read`;
    return rbacService.hasPermission(userId, permissionId);
  }, [userId]);

  const canUpdate = useCallback((resource: string): boolean => {
    if (!userId) return false;
    const permissionId = `${resource}.update`;
    return rbacService.hasPermission(userId, permissionId);
  }, [userId]);

  const canDelete = useCallback((resource: string): boolean => {
    if (!userId) return false;
    const permissionId = `${resource}.delete`;
    return rbacService.hasPermission(userId, permissionId);
  }, [userId]);

  const canExecute = useCallback((resource: string): boolean => {
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