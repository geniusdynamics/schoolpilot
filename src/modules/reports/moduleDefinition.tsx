// ABOUTME: Reports module definition for modular system
// ABOUTME: Exports the module definition for the reports module

import { ModuleDefinition } from '@/core/types';
import { DocumentReportIcon, BookOpenIcon, ChartPieIcon, CurrencyDollarIcon, WalletIcon, UsersIcon, UserGroupIcon, ChartBarIcon, AcademicCapIcon } from '@/components/ui/icons';

const reportsModule: ModuleDefinition = {
  id: 'reports',
  name: 'reports',
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
    }
  ],
  optionalDependencies: [
    {
      moduleId: 'academics',
      version: '^1.0.0',
      required: false
    },
    {
      moduleId: 'finance',
      version: '^1.0.0',
      required: false
    }
  ],
  navigation: [
    { name: 'navigation:reports.dashboard', path: '/reports/dashboard', icon: DocumentReportIcon, page: 'ReportsDashboardPage' },
    { name: 'navigation:reports.title', path: '/reports', icon: DocumentReportIcon, page: 'ReportsPage' },
    { name: 'navigation:reports.accountLedger', path: '/reports/account-ledger', icon: BookOpenIcon as React.FC<any>, page: 'AccountLedgerPage' },
    { name: 'navigation:reports.examResultsHorizontal', path: '/reports/exam-results-horizontal', icon: ChartPieIcon as React.FC<any>, page: 'ExamResultsHorizontalPage' },
    { name: 'navigation:reports.feeCollectionSummary', path: '/reports/fee-collection-summary', icon: CurrencyDollarIcon as React.FC<any>, page: 'FeeCollectionSummaryPage' },
    { name: 'navigation:reports.studentFinancialSummary', path: '/reports/student-financial-summary', icon: WalletIcon as React.FC<any>, page: 'StudentFinancialSummaryPage' },
    { name: 'navigation:reports.studentMasterlist', path: '/reports/student-masterlist', icon: UsersIcon as React.FC<any>, page: 'StudentMasterlistPage' },
    { name: 'navigation:reports.studentVoteheadStatement', path: '/reports/student-votehead-statement', icon: DocumentReportIcon as React.FC<any>, page: 'StudentVoteheadStatementPage' },
    { name: 'navigation:reports.teacherAssignments', path: '/reports/teacher-assignments', icon: UserGroupIcon as React.FC<any>, page: 'TeacherAssignmentsPage' },
    // Analytics sub-feature (merged from analytics module)
    { name: 'navigation:analytics.teacherDashboard', path: '/reports/analytics/dashboard', icon: AcademicCapIcon, page: 'analytics/AnalyticsTeacherDashboardPage', feature: 'teacher-analytics' },
    { name: 'navigation:analytics.subjectAnalytics', path: '/reports/analytics/subjects', icon: ChartBarIcon, page: 'analytics/AnalyticsSubjectPage', feature: 'subject-analytics' },
    { name: 'navigation:analytics.classAnalytics', path: '/reports/analytics/classes', icon: UserGroupIcon, page: 'analytics/AnalyticsClassPage', feature: 'class-analytics' },
    { name: 'navigation:analytics.exportReports', path: '/reports/analytics/export', icon: DocumentReportIcon, page: 'analytics/AnalyticsExportPage', feature: 'analytics-export' },
  ],
  features: ['reporting', 'analytics', 'data-export', 'teacher-analytics', 'subject-analytics', 'class-analytics']
};

export default reportsModule;