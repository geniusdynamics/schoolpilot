// ABOUTME: Settings module definition for modular system
// ABOUTME: Exports the module definition for the settings module with hub-and-spoke navigation

import { ModuleDefinition } from '@/core/types';
import { CogIcon, ClockIcon, IdentificationIcon, UsersIcon, ArrowsRightLeftIcon, CircleStackIcon, ViewColumnsIcon, DownloadIcon, PuzzlePieceIcon, HomeIcon, AdjustmentsHorizontalIcon, SparklesIcon, WrenchIcon, DocumentTextIcon } from '@/components/ui/icons';

// Simple database icon component
const DatabaseIcon: React.FC<{ className?: string }> = ({ className }) => (
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
    // Hub pages - shown in standard mode
    {
      name: 'navigation:settings.configuration',
      path: '/settings/configuration',
      icon: CogIcon,
      page: 'ConfigurationHubPage',
      showInModes: ['standard', 'fullwidth'],
    },
    {
      name: 'navigation:settings.systemManagement',
      path: '/settings/system',
      icon: CircleStackIcon,
      page: 'SystemManagementHubPage',
      showInModes: ['standard', 'fullwidth'],
    },
    {
      name: 'navigation:settings.schoolOperations',
      path: '/settings/school',
      icon: IdentificationIcon,
      page: 'SchoolOperationsHubPage',
      showInModes: ['standard', 'fullwidth'],
    },

    // Legacy pages - shown in fullwidth mode with redirects to hub tabs
    {
      name: 'navigation:settings.dashboard',
      path: '/settings',
      icon: CogIcon,
      page: 'SettingsPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/settings/configuration?tab=settings',
    },
    {
      name: 'navigation:settings.unified',
      path: '/settings/unified',
      icon: AdjustmentsHorizontalIcon,
      page: 'UnifiedSettingsPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/settings/configuration?tab=unified',
    },
    {
      name: 'navigation:settings.features',
      path: '/settings/features',
      icon: SparklesIcon,
      page: 'FeatureSettingsPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/settings/configuration?tab=features',
    },
    {
      name: 'navigation:settings.general',
      path: '/settings/general',
      icon: WrenchIcon,
      page: 'SettingsGeneralPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/settings/configuration?tab=general',
    },
    {
      name: 'navigation:settings.dataLayer',
      path: '/settings/data-layer',
      icon: DatabaseIcon,
      page: 'DataLayerSettingsPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/settings/system?tab=data-layer',
    },
    {
      name: 'navigation:settings.modules',
      path: '/settings/modules',
      icon: ViewColumnsIcon,
      page: 'ModuleManagementPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/settings/system?tab=modules',
    },
    {
      name: 'navigation:settings.dependencyReport',
      path: '/settings/dependency-report',
      icon: DocumentTextIcon,
      page: 'ModuleDependencyReportPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/settings/system?tab=dependencies',
    },
    {
      name: 'navigation:settings.plugins',
      path: '/settings/plugins',
      icon: PuzzlePieceIcon,
      page: 'PluginSettingsPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/settings/system?tab=plugins',
    },
    {
      name: 'navigation:settings.schoolProfile',
      path: '/settings/school-profile',
      icon: IdentificationIcon,
      page: 'SettingsSchoolProfilePage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/settings/school?tab=school-profile',
    },
    {
      name: 'navigation:settings.users',
      path: '/settings/users',
      icon: UsersIcon,
      page: 'SettingsUsersPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/settings/school?tab=users',
    },
    {
      name: 'navigation:settings.workflows',
      path: '/settings/workflows',
      icon: ArrowsRightLeftIcon,
      page: 'SettingsWorkflowsPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/settings/school?tab=workflows',
    },
    {
      name: 'navigation:settings.auditLog',
      path: '/settings/audit-log',
      icon: ClockIcon,
      page: 'AuditLogPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/settings/school?tab=audit',
    },
    {
      name: 'navigation:settings.tabs',
      path: '/settings/tabs',
      icon: ViewColumnsIcon,
      page: 'TabSettingsPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/settings/school?tab=tabs',
    },
    {
      name: 'navigation:settings.settingsDashboard',
      path: '/settings/dashboard',
      icon: HomeIcon,
      page: 'SettingsDashboardPage',
      showInModes: ['fullwidth'],
      deprecated: true,
      redirectTo: '/settings/school?tab=dashboard',
    },
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
      id: 'plugins.view',
      name: 'View Plugins',
      description: 'Can view installed plugins',
      resource: 'plugins',
      action: 'view',
      moduleId: 'settings'
    },
    {
      id: 'plugins.manage',
      name: 'Manage Plugins',
      description: 'Can install, activate, and deactivate plugins',
      resource: 'plugins',
      action: 'manage',
      moduleId: 'settings'
    },
    {
      id: 'plugins.configure',
      name: 'Configure Plugins',
      description: 'Can configure plugin settings',
      resource: 'plugins',
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
