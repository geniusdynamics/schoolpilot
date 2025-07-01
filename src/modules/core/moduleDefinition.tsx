// ABOUTME: Core system module definitions
// ABOUTME: Contains only essential system modules that are always available

import { ModuleDefinition } from '../../core/types';
import {
  HomeIcon,
  CogIcon,
  DocumentReportIcon,
} from '../../components/ui/icons';

// Dashboard Module (Core System)
export const dashboardModule: ModuleDefinition = {
  id: 'dashboard',
  name: 'navigation:dashboard',
  description: 'navigation:dashboard.description',
  icon: <HomeIcon />,
  path: '/dashboard',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:dashboard', path: '/dashboard', icon: <HomeIcon /> }
  ],
  features: ['core', 'dashboard', 'overview']
};

// Settings Module (Core System)
export const settingsModule: ModuleDefinition = {
  id: 'settings',
  name: 'navigation:settings.title',
  description: 'navigation:settings.description',
  icon: <CogIcon />,
  path: '/settings',
  isActive: true,
  version: '1.0.0',
  navigation: [
    { name: 'navigation:settings.auditLog', path: '/settings/audit-log', icon: <CogIcon /> },
    { name: 'navigation:settings.databaseSettings', path: '/settings/database-settings', icon: <CogIcon /> },
    { name: 'navigation:settings.settings', path: '/settings/settings', icon: <CogIcon /> },
    { name: 'navigation:settings.schoolProfile', path: '/settings/school-profile', icon: <CogIcon /> },
    { name: 'navigation:settings.users', path: '/settings/users', icon: <CogIcon /> },
    { name: 'navigation:settings.workflows', path: '/settings/workflows', icon: <CogIcon /> },
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

// Reports Module (Core System)
export const reportsModule: ModuleDefinition = {
  id: 'reports',
  name: 'navigation:reports.title',
  description: 'navigation:reports.description',
  icon: <DocumentReportIcon />,
  path: '/reports',
  isActive: true,
  version: '1.0.0',
  dependencies: ['administration', 'academics', 'finance'],
  navigation: [
    { name: 'navigation:reports.accountLedger', path: '/reports/account-ledger', icon: <DocumentReportIcon /> },
    { name: 'navigation:reports.examResultsHorizontal', path: '/reports/exam-results-horizontal', icon: <DocumentReportIcon /> },
    { name: 'navigation:reports.feeCollectionSummary', path: '/reports/fee-collection-summary', icon: <DocumentReportIcon /> },
    { name: 'navigation:reports.studentFinancialSummary', path: '/reports/student-financial-summary', icon: <DocumentReportIcon /> },
    { name: 'navigation:reports.studentMasterlist', path: '/reports/student-masterlist', icon: <DocumentReportIcon /> },
    { name: 'navigation:reports.studentVoteheadStatement', path: '/reports/student-votehead-statement', icon: <DocumentReportIcon /> },
    { name: 'navigation:reports.teacherAssignments', path: '/reports/teacher-assignments', icon: <DocumentReportIcon /> },
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