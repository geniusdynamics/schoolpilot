// ABOUTME: Core system module definitions
// ABOUTME: Contains only essential system modules that are always available

import { ModuleDefinition } from '@/core/types';
import { corePermissions } from './rbac';
import {
  HomeIcon,
  CogIcon,
  DocumentReportIcon,
  CircleStackIcon,
  ClockIcon,
  IdentificationIcon,
  UsersIcon,
  ArrowsRightLeftIcon,
  CubeIcon,
} from '@/components/ui/icons';

// Dashboard Module (Core System)
export const dashboardModule: ModuleDefinition = {
  id: 'dashboard',
  name: 'navigation:dashboard',
  description: 'navigation:dashboard.description',
  icon: HomeIcon,
  path: '/dashboard',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:dashboard', path: '/dashboard', icon: HomeIcon, page: 'DashboardPage' }
  ],
  features: ['core', 'dashboard', 'overview'],
  rbacPermissions: [
    { id: 'dashboard.view', name: 'View Dashboard', description: 'View the main dashboard and its widgets', resource: 'dashboard', action: 'read', moduleId: 'dashboard' }
  ]
};

// Note: Settings and Reports modules are now handled by their dedicated modules
// The core module should only define essential system modules to avoid conflicts

// Export core modules
export const coreModules: ModuleDefinition[] = [
  dashboardModule
];

export default coreModules;