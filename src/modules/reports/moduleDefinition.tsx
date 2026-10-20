// ABOUTME: Reports module definition for modular system
// ABOUTME: Exports the module definition for the reports module

import { ModuleDefinition } from '@/core/types';
import { DocumentReportIcon, BookOpenIcon, ChartPieIcon, CurrencyDollarIcon, WalletIcon, UsersIcon, UserGroupIcon, ChartBarIcon, AcademicCapIcon } from '@/components/ui/icons';

const reportsModule: ModuleDefinition = {
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
    { name: 'navigation:reports.dashboard', path: '/reports/dashboard', icon: DocumentReportIcon, page: 'ReportsDashboardPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:reports.overview', path: '/reports', icon: DocumentReportIcon, page: 'ReportsPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:reports.studentReports', path: '/reports/student-reports', icon: UsersIcon, page: 'StudentReportsHubPage', showInModes: ['standard', 'fullwidth'] },
    // M3: Financial reports hub (relocated from finance module)
    { name: 'navigation:reports.financeReports', path: '/reports/finance', icon: CurrencyDollarIcon, page: 'FinancialReportsHubPage', showInModes: ['standard', 'fullwidth'] },
    // M3: Analytics hub (consolidates teacher/subject/class analytics + exports + trends)
    { name: 'navigation:reports.analytics', path: '/reports/analytics', icon: ChartPieIcon, page: 'AnalyticsHubPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:reports.accountLedger', path: '/reports/account-ledger', icon: BookOpenIcon as React.FC<any>, page: 'AccountLedgerPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:reports.examResultsHorizontal', path: '/reports/exam-results-horizontal', icon: ChartPieIcon as React.FC<any>, page: 'ExamResultsHorizontalPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:reports.feeCollectionSummary', path: '/reports/fee-collection-summary', icon: CurrencyDollarIcon as React.FC<any>, page: 'FeeCollectionSummaryPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:reports.studentFinancialSummary', path: '/reports/student-financial-summary', icon: WalletIcon as React.FC<any>, page: 'StudentFinancialSummaryPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:reports.studentMasterlist', path: '/reports/student-masterlist', icon: UsersIcon as React.FC<any>, page: 'StudentMasterlistPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/reports/student-reports?tab=masterlist' },
    { name: 'navigation:reports.studentVoteheadStatement', path: '/reports/student-votehead-statement', icon: DocumentReportIcon as React.FC<any>, page: 'StudentVoteheadStatementPage', showInModes: ['standard', 'fullwidth'] },
    { name: 'navigation:reports.teacherAssignments', path: '/reports/teacher-assignments', icon: UserGroupIcon as React.FC<any>, page: 'TeacherAssignmentsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/reports/student-reports?tab=teacher-assignments' },
    { name: 'navigation:reports.classLists', path: '/reports/class-lists', icon: UsersIcon as React.FC<any>, page: 'ClassListsPage', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/reports/student-reports?tab=class-lists' },
    // Analytics sub-feature (deprecated, redirects to /reports/analytics)
    { name: 'navigation:analytics.teacherDashboard', path: '/reports/analytics/dashboard', icon: AcademicCapIcon, page: 'analytics/AnalyticsTeacherDashboardPage', feature: 'teacher-analytics', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/reports/analytics?tab=teacher-dashboard' },
    { name: 'navigation:analytics.subjectAnalytics', path: '/reports/analytics/subjects', icon: ChartBarIcon, page: 'analytics/AnalyticsSubjectPage', feature: 'subject-analytics', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/reports/analytics?tab=subject-analysis' },
    { name: 'navigation:analytics.classAnalytics', path: '/reports/analytics/classes', icon: UserGroupIcon, page: 'analytics/AnalyticsClassPage', feature: 'class-analytics', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/reports/analytics?tab=class-analysis' },
    { name: 'navigation:analytics.exportReports', path: '/reports/analytics/export', icon: DocumentReportIcon, page: 'analytics/AnalyticsExportPage', feature: 'analytics-export', deprecated: true, showInModes: ['fullwidth'], redirectTo: '/reports/analytics?tab=exports' },
  ],
  routes: [
    { path: '/reports/student-reports', page: 'StudentReportsHubPage' },
    { path: '/reports/finance', page: 'FinancialReportsHubPage' },
    { path: '/reports/analytics', page: 'AnalyticsHubPage' },
  ],
  features: ['reporting', 'analytics', 'data-export', 'teacher-analytics', 'subject-analytics', 'class-analytics']
};

export default reportsModule;