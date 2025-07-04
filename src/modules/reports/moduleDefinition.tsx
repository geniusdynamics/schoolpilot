// ABOUTME: Reports module definition for modular system
// ABOUTME: Exports the module definition for the reports module

import { ModuleDefinition } from '../../core/types';
import { DocumentReportIcon, BookOpenIcon, ChartPieIcon, CurrencyDollarIcon, WalletIcon, UsersIcon, UserGroupIcon } from '../../components/ui/icons';

const reportsModule: ModuleDefinition = {
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
    { name: 'navigation:reports.accountLedger', path: '/reports/account-ledger', icon: BookOpenIcon as React.FC<any>, page: 'AccountLedgerPage' },
    { name: 'navigation:reports.examResultsHorizontal', path: '/reports/exam-results-horizontal', icon: ChartPieIcon as React.FC<any>, page: 'ExamResultsHorizontalPage' },
    { name: 'navigation:reports.feeCollectionSummary', path: '/reports/fee-collection-summary', icon: CurrencyDollarIcon as React.FC<any>, page: 'FeeCollectionSummaryPage' },
    { name: 'navigation:reports.studentFinancialSummary', path: '/reports/student-financial-summary', icon: WalletIcon as React.FC<any>, page: 'StudentFinancialSummaryPage' },
    { name: 'navigation:reports.studentMasterlist', path: '/reports/student-masterlist', icon: UsersIcon as React.FC<any>, page: 'StudentMasterlistPage' },
    { name: 'navigation:reports.studentVoteheadStatement', path: '/reports/student-votehead-statement', icon: DocumentReportIcon as React.FC<any>, page: 'StudentVoteheadStatementPage' },
    { name: 'navigation:reports.teacherAssignments', path: '/reports/teacher-assignments', icon: UserGroupIcon as React.FC<any>, page: 'TeacherAssignmentsPage' },
  ],
  features: ['reporting', 'analytics', 'data-export']
};

export default reportsModule; 