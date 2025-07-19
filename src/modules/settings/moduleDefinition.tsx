// ABOUTME: Settings module definition for modular system
// ABOUTME: Exports the module definition for the settings module

import { ModuleDefinition } from '@/core/types';
import { CogIcon, ClockIcon, IdentificationIcon, UsersIcon, ArrowsRightLeftIcon, CircleStackIcon } from '@/components/ui/icons';

const settingsModule: ModuleDefinition = {
  id: 'settings',
  name: 'navigation:settings.title',
  description: 'navigation:settings.description',
  icon: CogIcon,
  path: '/settings',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:settings.general', path: '/settings/general', icon: CogIcon, page: 'SettingsGeneralPage' },
    { name: 'navigation:settings.features', path: '/settings/features', icon: CogIcon, page: 'FeatureSettingsPage' },
    { name: 'navigation:settings.modules', path: '/settings/modules', icon: CircleStackIcon, page: 'ModuleManagementPage' },
    { name: 'navigation:settings.auditLog', path: '/settings/audit-log', icon: ClockIcon, page: 'AuditLogPage' },
    { name: 'navigation:settings.databaseSettings', path: '/settings/database-settings', icon: CogIcon, page: 'DatabaseSettingsPage' },
    { name: 'navigation:settings.schoolProfile', path: '/settings/school-profile', icon: IdentificationIcon, page: 'SettingsSchoolProfilePage' },
    { name: 'navigation:settings.users', path: '/settings/users', icon: UsersIcon, page: 'SettingsUsersPage' },
    { name: 'navigation:settings.workflows', path: '/settings/workflows', icon: ArrowsRightLeftIcon, page: 'SettingsWorkflowsPage' },
  ],
  features: ['system-configuration', 'user-management', 'audit-trail', 'workflow-management', 'module-management'],
  rbacPermissions: [
    { id: 'settings.view', name: 'View Settings', description: 'Can view settings pages' },
    { id: 'settings.manage', name: 'Manage Settings', description: 'Can modify system settings' },
    { id: 'settings.configure', name: 'Configure Settings', description: 'Can configure advanced settings' },
    { id: 'modules.view', name: 'View Modules', description: 'Can view module configurations' },
    { id: 'modules.manage', name: 'Manage Modules', description: 'Can enable/disable modules' },
    { id: 'modules.configure', name: 'Configure Modules', description: 'Can configure module settings' },
    { id: 'permissions.view', name: 'View Permissions', description: 'Can view permission configurations' },
  ],
  settings: {
    category: 'system',
    items: [
      {
        key: 'theme',
        type: 'select',
        defaultValue: 'dark',
        options: [
          { value: 'light', label: 'Light' },
          { value: 'dark', label: 'Dark' },
          { value: 'auto', label: 'Auto' }
        ]
      },
      {
        key: 'language',
        type: 'select',
        defaultValue: 'en',
        options: [
          { value: 'en', label: 'English' },
          { value: 'fr', label: 'French' }
        ]
      }
    ]
  }
};

export default settingsModule;