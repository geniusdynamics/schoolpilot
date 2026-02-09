/**
 * useRBAC Hook
 * 
 * React hook for role-based access control.
 */

import { useContext, useMemo, useCallback } from 'react';
import { RBACContext } from './RBACProvider';
import type { RBACUser, Resource, Permission, AccessResult } from './types';

interface UseRBACResult {
  // Permission checks
  can: (resource: Resource, permission: Permission) => boolean;
  canAny: (resources: Resource[], permission: Permission) => boolean;
  canAll: (resources: Resource[], permission: Permission) => boolean;
  checkAccess: (resource: Resource, permission: Permission, data?: Record<string, any>) => AccessResult;
  
  // User info
  user: RBACUser | null;
  roles: string[];
  permissions: string[];
  
  // Actions
  hasRole: (roleId: string) => boolean;
}

/**
 * Hook for RBAC functionality
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { can, user } = useRBAC();
 *   
 *   return (
 *     <div>
 *       {can('students', 'create') && (
 *         <Button>Add Student</Button>
 *       )}
 *       
 *       {can('grades', 'update') ? (
 *         <EditGrades />
 *       ) : (
 *         <ViewGrades />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useRBAC(): UseRBACResult {
  const context = useContext(RBACContext);
  
  if (!context) {
    throw new Error('useRBAC must be used within RBACProvider');
  }

  const { engine, currentUser } = context;

  // Permission check functions
  const can = useCallback(
    (resource: Resource, permission: Permission): boolean => {
      if (!currentUser) return false;
      return engine.can(currentUser, resource, permission);
    },
    [engine, currentUser]
  );

  const canAny = useCallback(
    (resources: Resource[], permission: Permission): boolean => {
      if (!currentUser) return false;
      return engine.canAny(currentUser, resources, permission);
    },
    [engine, currentUser]
  );

  const canAll = useCallback(
    (resources: Resource[], permission: Permission): boolean => {
      if (!currentUser) return false;
      return engine.canAll(currentUser, resources, permission);
    },
    [engine, currentUser]
  );

  const checkAccess = useCallback(
    (resource: Resource, permission: Permission, data?: Record<string, any>): AccessResult => {
      if (!currentUser) {
        return { allowed: false, reason: 'Not authenticated' };
      }
      return engine.checkAccess({ user: currentUser, resource, permission, resourceData: data });
    },
    [engine, currentUser]
  );

  // Role check
  const hasRole = useCallback(
    (roleId: string): boolean => {
      return currentUser?.roles.includes(roleId) || false;
    },
    [currentUser]
  );

  // Get all permissions for current user
  const permissions = useMemo(() => {
    if (!currentUser) return [];
    
    const perms: string[] = [];
    const rules = engine.getUserPermissions(currentUser.id);
    
    for (const rule of rules) {
      for (const perm of rule.permissions) {
        const permString = `${rule.resource}:${perm}`;
        if (!perms.includes(permString)) {
          perms.push(permString);
        }
      }
    }
    
    return perms;
  }, [engine, currentUser]);

  return {
    can,
    canAny,
    canAll,
    checkAccess,
    user: currentUser,
    roles: currentUser?.roles || [],
    permissions,
    hasRole,
  };
}

/**
 * Higher-order component for permission-based rendering
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  resource: Resource,
  permission: Permission
) {
  return function WithPermissionComponent(props: P) {
    const { can } = useRBAC();
    
    if (!can(resource, permission)) {
      return null;
    }
    
    return <WrappedComponent {...props} />;
  };
}

/**
 * Hook for conditional rendering based on permissions
 */
export function usePermission(resource: Resource, permission: Permission): boolean {
  const { can } = useRBAC();
  return can(resource, permission);
}

export default useRBAC;
