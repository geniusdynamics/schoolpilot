// ABOUTME: RBAC configuration for settings module
// ABOUTME: Defines permissions and roles for system configuration and workflow management

export const defaultPermissions = [
  // General settings permissions
  'settings.view',
  'settings.configure',
  
  // Workflow management permissions
  'settings.workflows.view',
  'settings.workflows.create',
  'settings.workflows.update',
  'settings.workflows.delete',
  'settings.workflows.manage_states',
  
  // User management permissions
  'settings.users.view',
  'settings.users.create',
  'settings.users.update',
  'settings.users.delete',
  
  // School profile permissions
  'settings.school_profile.view',
  'settings.school_profile.update',
  
  // Database settings permissions
  'settings.database.view',
  'settings.database.configure',
  
  // Audit log permissions
  'settings.audit_log.view',
  'settings.audit_log.export'
];

export const defaultRoles = [
  {
    id: 'settings_viewer',
    name: 'Settings Viewer',
    description: 'Can view settings but cannot modify them',
    permissions: [
      'settings.view',
      'settings.workflows.view',
      'settings.users.view',
      'settings.school_profile.view',
      'settings.database.view',
      'settings.audit_log.view'
    ]
  },
  {
    id: 'settings_manager',
    name: 'Settings Manager',
    description: 'Can view and manage most settings',
    permissions: [
      'settings.view',
      'settings.configure',
      'settings.workflows.view',
      'settings.workflows.create',
      'settings.workflows.update',
      'settings.workflows.manage_states',
      'settings.users.view',
      'settings.users.create',
      'settings.users.update',
      'settings.school_profile.view',
      'settings.school_profile.update',
      'settings.database.view',
      'settings.audit_log.view'
    ]
  },
  {
    id: 'settings_administrator',
    name: 'Settings Administrator',
    description: 'Full access to all settings including database configuration',
    permissions: defaultPermissions
  }
];

export default {
  defaultPermissions,
  defaultRoles
}; 