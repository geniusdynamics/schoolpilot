import { Permission } from '@/core/rbacService';

export const corePermissions: Permission[] = [
  // Dashboard
  {
    id: 'core.dashboard.read',
    name: 'View Dashboard',
    description: 'View the main dashboard',
    resource: 'core.dashboard',
    action: 'read',
    moduleId: 'core',
    feature: 'dashboard',
  },
  {
    id: 'dashboard.view',
    name: 'View Dashboard',
    description: 'View the main dashboard and its widgets',
    resource: 'dashboard',
    action: 'read',
    moduleId: 'dashboard',
    feature: 'dashboard',
  },
  {
    id: 'dashboard.view',
    name: 'View Dashboard',
    description: 'View the main dashboard and its widgets',
    resource: 'dashboard',
    action: 'read',
    moduleId: 'dashboard',
    feature: 'dashboard',
  },
  // Settings
  {
    id: 'core.settings.read',
    name: 'View Settings',
    description: 'View system settings',
    resource: 'core.settings',
    action: 'read',
    moduleId: 'core',
    feature: 'system-configuration',
  },
  {
    id: 'core.settings.update',
    name: 'Update Settings',
    description: 'Update system settings',
    resource: 'core.settings',
    action: 'update',
    moduleId: 'core',
    feature: 'system-configuration',
  },
  // Reports
  {
    id: 'core.reports.read',
    name: 'View Reports',
    description: 'View system reports',
    resource: 'core.reports',
    action: 'read',
    moduleId: 'core',
    feature: 'reporting',
  },
];

export const coreDefaultRoles = ['system_admin', 'administrator'];

export default {
  permissions: corePermissions,
  defaultRoles: coreDefaultRoles,
}; 