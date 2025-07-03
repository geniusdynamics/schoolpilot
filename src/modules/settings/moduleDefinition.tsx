// ABOUTME: Settings module definition for modular system
// ABOUTME: Exports the module definition for the settings module

import { ModuleDefinition } from '../../core/types';
import { CogIcon, ClockIcon, IdentificationIcon, UsersIcon, ArrowsRightLeftIcon } from '../../components/ui/icons';

const settingsModule: ModuleDefinition = {
  id: 'settings',
  name: 'navigation:settings.title',
  description: 'navigation:settings.description',
  icon: CogIcon,
  path: '/settings',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:settings.auditLog', path: '/settings/audit-log', icon: ClockIcon },
    { name: 'navigation:settings.databaseSettings', path: '/settings/database-settings', icon: CogIcon },
    { name: 'navigation:settings.settings', path: '/settings/settings', icon: CogIcon },
    { name: 'navigation:settings.schoolProfile', path: '/settings/school-profile', icon: IdentificationIcon },
    { name: 'navigation:settings.users', path: '/settings/users', icon: UsersIcon },
    { name: 'navigation:settings.workflows', path: '/settings/workflows', icon: ArrowsRightLeftIcon },
  ],
  features: ['system-configuration', 'user-management', 'audit-trail', 'workflow-management'],
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