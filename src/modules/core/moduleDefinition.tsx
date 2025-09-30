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

// Note: Settings module is now handled by the dedicated settings module
// The core module should not define settings routes to avoid conflicts

// Reports Module (Core System)
export const reportsModule: ModuleDefinition = {
  id: 'reports',
  name: 'navigation:reports.title',
  description: 'navigation:reports.description',
  icon: DocumentReportIcon,
  path: '/reports',
  isActive: true,
  version: '1.0.0',
  dependencies: [
    {
      moduleId: 'administration',
      version: '^1.0.0',
      required: true
    },
    {
      moduleId: 'academics',
      version: '^1.0.0',
      required: true
    },
    {
      moduleId: 'finance',
      version: '^1.0.0',
      required: true
    }
  ],
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
  reportsModule
];

export default coreModules;