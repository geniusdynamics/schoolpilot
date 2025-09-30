// ABOUTME: Settings module definition for modular system
// ABOUTME: Exports the module definition for the settings module

import { ModuleDefinition } from '@/core/types';
import { CogIcon, ClockIcon, IdentificationIcon, UsersIcon, ArrowsRightLeftIcon, CircleStackIcon, ViewColumnsIcon, DownloadIcon } from '@/components/ui/icons';

// Import the new unified settings page
import UnifiedSettingsPage from './pages/UnifiedSettingsPage';
// Import the new combined data management page
import DataManagementSettingsPage from './pages/DataManagementSettingsPage';

// Simple database icon component
const DatabaseIcon: React.FC<{className?: string}> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
  </svg>
);

const settingsModule: ModuleDefinition = {
  id: 'settings',
  name: 'navigation:settings.title',
  description: 'navigation:settings.description',
  icon: CogIcon,
  path: '/settings',
  isActive: true,
  version: '1.0.0',
  navigation: [
    // Primary unified settings page
    { name: 'navigation:settings.unified', path: '/settings', icon: CogIcon, page: 'UnifiedSettingsPage' },
    
    // Legacy pages (deprecated - use unified settings instead)
    { name: 'navigation:settings.dashboard', path: '/settings/dashboard', icon: CogIcon, page: 'SettingsDashboardPage', deprecated: true },
    { name: 'navigation:settings.general', path: '/settings/general', icon: CogIcon, page: 'SettingsGeneralPage', deprecated: true },
    { name: 'navigation:settings.features', path: '/settings/features', icon: CogIcon, page: 'FeatureSettingsPage', deprecated: true },
    { name: 'navigation:settings.schoolProfile', path: '/settings/school-profile', icon: IdentificationIcon, page: 'SettingsSchoolProfilePage', deprecated: true },
    { name: 'navigation:settings.users', path: '/settings/users', icon: UsersIcon, page: 'SettingsUsersPage', deprecated: true },
    { name: 'navigation:settings.workflows', path: '/settings/workflows', icon: ArrowsRightLeftIcon, page: 'SettingsWorkflowsPage', deprecated: true },
    
    // Specialized pages (still active)
    { name: 'navigation:settings.dataManagement', path: '/settings/data-management', icon: DatabaseIcon, page: 'DataManagementSettingsPage' },
    { name: 'navigation:settings.tabs', path: '/settings/tabs', icon: ArrowsRightLeftIcon, page: 'TabSettingsPage' },
    { name: 'navigation:settings.modules', path: '/settings/modules', icon: CircleStackIcon, page: 'ModuleManagementPage' },
    { name: 'navigation:settings.dependencyReport', path: '/settings/dependency-report', icon: CircleStackIcon, page: 'ModuleDependencyReportPage' },
    { name: 'navigation:settings.auditLog', path: '/settings/audit-log', icon: ClockIcon, page: 'AuditLogPage' },
    
    // Legacy data layer pages (deprecated - use data management instead)
    { name: 'navigation:settings.databaseProvider', path: '/settings/database-provider', icon: DatabaseIcon, page: 'DatabaseProviderSettingsPage', deprecated: true },
    { name: 'navigation:settings.dataLayerSettings', path: '/settings/data-layer', icon: DatabaseIcon, page: 'DataLayerSettingsPage', deprecated: true },
    
    // Test pages
    { name: 'navigation:settings.tabbedWorkspaceTest', path: '/settings/tabbed-workspace-test', icon: ViewColumnsIcon, page: 'TabbedWorkspaceTestPage' },
    { name: 'navigation:settings.tabbedModeTest', path: '/settings/tabbed-mode-test', icon: ViewColumnsIcon, page: 'TabbedModeTestPage' },
  ],
  features: ['system-configuration', 'user-management', 'audit-trail', 'workflow-management', 'module-management'],
  rbacPermissions: [
    { 
      id: 'settings.view', 
      name: 'View Settings', 
      description: 'Can view settings pages',
      resource: 'settings',
      action: 'view',
      moduleId: 'settings'
    },
    { 
      id: 'settings.manage', 
      name: 'Manage Settings', 
      description: 'Can modify system settings',
      resource: 'settings',
      action: 'manage',
      moduleId: 'settings'
    },
    { 
      id: 'settings.configure', 
      name: 'Configure Settings', 
      description: 'Can configure advanced settings',
      resource: 'settings',
      action: 'configure',
      moduleId: 'settings'
    },
    { 
      id: 'modules.view', 
      name: 'View Modules', 
      description: 'Can view module configurations',
      resource: 'modules',
      action: 'view',
      moduleId: 'settings'
    },
    { 
      id: 'modules.manage', 
      name: 'Manage Modules', 
      description: 'Can enable/disable modules',
      resource: 'modules',
      action: 'manage',
      moduleId: 'settings'
    },
    { 
      id: 'modules.configure', 
      name: 'Configure Modules', 
      description: 'Can configure module settings',
      resource: 'modules',
      action: 'configure',
      moduleId: 'settings'
    },
    { 
      id: 'permissions.view', 
      name: 'View Permissions', 
      description: 'Can view permission configurations',
      resource: 'permissions',
      action: 'view',
      moduleId: 'settings'
    },
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