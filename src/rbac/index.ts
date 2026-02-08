/**
 * RBAC Module
 * 
 * Role-Based Access Control system for SchoolPilot3.
 * 
 * @example
 * ```tsx
 * // Setup
 * <RBACProvider config={{ superAdminRole: 'admin' }}>
 *   <App />
 * </RBACProvider>
 * 
 * // Usage in components
 * function MyComponent() {
 *   const { can, user } = useRBAC();
 *   
 *   return (
 *     <div>
 *       {can('students', 'create') && (
 *         <Button>Add Student</Button>
 *       )}
 *       
 *       <PermissionButton resource="grades" permission="update">
 *         Edit Grades
 *       </PermissionButton>
 *     </div>
 *   );
 * }
 * 
 * // Route protection
 * <ProtectedRoute resource="settings" permission="manage">
 *   <SettingsPage />
 * </ProtectedRoute>
 * ```
 */

// Types
export type {
  Permission,
  Resource,
  PermissionRule,
  PermissionCondition,
  Role,
  UserRole,
  RBACUser,
  AccessRequest,
  AccessResult,
  RBACConfig,
} from './types';

// Constants
export { SYSTEM_ROLES, PERMISSION_SETS } from './types';

// Core
export { RBACEngine, initRBAC, getRBAC } from './RBACEngine';
export { RBACContext } from './RBACProvider';

// React
export { RBACProvider } from './RBACProvider';
export { useRBAC, withPermission, usePermission } from './useRBAC';

// Components
export { ProtectedRoute } from './components/ProtectedRoute';
export { PermissionButton } from './components/PermissionButton';
