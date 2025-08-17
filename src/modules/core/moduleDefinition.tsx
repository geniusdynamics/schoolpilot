// ABOUTME: Core system module definitions
// ABOUTME: Contains only essential system modules that are always available

import { ModuleDefinition } from '@/core/types';
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
  features: ['core', 'dashboard', 'overview']
};

// Settings Module (Core System)
export const settingsModule: ModuleDefinition = {
  id: 'settings',
  name: 'navigation:settings',
  description: 'navigation:settings.description',
  icon: CogIcon,
  path: '/settings',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:settings.general', path: '/settings/general', icon: CogIcon, page: 'SettingsGeneralPage' },
    { name: 'navigation:settings.features', path: '/settings/features', icon: CogIcon, page: 'FeatureSettingsPage' },
    { name: 'navigation:settings.tabbedMode', path: '/settings/tabbed-mode', icon: ArrowsRightLeftIcon, page: 'TabbedModeSettingsPage' },
    { name: 'navigation:settings.tabbedModeTest', path: '/settings/tabbed-mode-test', icon: ArrowsRightLeftIcon, page: 'TabbedModeTestPage' },
    { name: 'navigation:settings.modules', path: '/settings/modules', icon: CircleStackIcon, page: 'ModuleManagementPage' },
    { name: 'navigation:settings.auditLog', path: '/settings/audit-log', icon: ClockIcon, page: 'AuditLogPage' },
    { name: 'navigation:settings.databaseSettings', path: '/settings/database-settings', icon: CogIcon, page: 'DatabaseSettingsPage' },
    { name: 'navigation:settings.schoolProfile', path: '/settings/school-profile', icon: IdentificationIcon, page: 'SettingsSchoolProfilePage' },
    { name: 'navigation:settings.users', path: '/settings/users', icon: UsersIcon, page: 'SettingsUsersPage' },
    { name: 'navigation:settings.workflows', path: '/settings/workflows', icon: ArrowsRightLeftIcon, page: 'SettingsWorkflowsPage' },
  ],
  features: ['system-configuration', 'user-management', 'audit-trail', 'workflow-management', 'module-management'],
  rbacPermissions: [
    { id: 'settings.view', name: 'View Settings', description: 'Can view settings pages', resource: 'settings', action: 'read', moduleId: 'settings' },
    { id: 'settings.manage', name: 'Manage Settings', description: 'Can modify system settings', resource: 'settings', action: 'update', moduleId: 'settings' },
    { id: 'settings.configure', name: 'Configure Settings', description: 'Can configure advanced settings', resource: 'settings', action: 'execute', moduleId: 'settings' },
    { id: 'modules.view', name: 'View Modules', description: 'Can view module configurations', resource: 'modules', action: 'read', moduleId: 'settings' },
    { id: 'modules.manage', name: 'Manage Modules', description: 'Can enable/disable modules', resource: 'modules', action: 'update', moduleId: 'settings' },
    { id: 'modules.configure', name: 'Configure Modules', description: 'Can configure module settings', resource: 'modules', action: 'execute', moduleId: 'settings' },
    { id: 'permissions.view', name: 'View Permissions', description: 'Can view permission configurations', resource: 'permissions', action: 'read', moduleId: 'settings' },
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

// Reports Module (Core System)
export const reportsModule: ModuleDefinition = {
  id: 'reports',
  name: 'navigation:reports.title',
  description: 'navigation:reports.description',
  icon: DocumentReportIcon,
  path: '/reports',
  isActive: true,
  version: '1.0.0',
  dependencies: ['administration', 'academics', 'finance'],
  navigation: [
    { name: 'navigation:reports.title', path: '/reports', icon: DocumentReportIcon, page: 'ReportsPage' },
    { name: 'navigation:reports.accountLedger', path: '/reports/account-ledger', icon: DocumentReportIcon, page: 'AccountLedgerPage' },
    { name: 'navigation:reports.examResultsHorizontal', path: '/reports/exam-results-horizontal', icon: DocumentReportIcon, page: 'ExamResultsHorizontalPage' },
    { name: 'navigation:reports.feeCollectionSummary', path: '/reports/fee-collection-summary', icon: DocumentReportIcon, page: 'FeeCollectionSummaryPage' },
    { name: 'navigation:reports.studentFinancialSummary', path: '/reports/student-financial-summary', icon: DocumentReportIcon, page: 'StudentFinancialSummaryPage' },
    { name: 'navigation:reports.studentMasterlist', path: '/reports/student-masterlist', icon: DocumentReportIcon, page: 'StudentMasterlistPage' },
    { name: 'navigation:reports.studentVoteheadStatement', path: '/reports/student-votehead-statement', icon: DocumentReportIcon, page: 'StudentVoteheadStatementPage' },
    { name: 'navigation:reports.teacherAssignments', path: '/reports/teacher-assignments', icon: DocumentReportIcon, page: 'TeacherAssignmentsPage' },
    { name: 'navigation:reports.overdueBooks', path: '/reports/overdue-books', icon: ClockIcon, page: 'OverdueReportPage' },
    { name: 'navigation:reports.inventoryStatus', path: '/reports/inventory-status', icon: CubeIcon, page: 'InventoryStatusReportPage' },
  ],
  features: ['reporting', 'analytics', 'data-export']
};

// Export core modules
export const coreModules: ModuleDefinition[] = [
  dashboardModule,
  settingsModule,
  reportsModule
];

export default coreModules;