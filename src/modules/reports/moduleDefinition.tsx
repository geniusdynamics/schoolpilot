// ABOUTME: Reports module definition for modular system
// ABOUTME: Exports the module definition for the reports module

import { ModuleDefinition } from '../../core/types';
import { DocumentReportIcon, BookOpenIcon, ChartPieIcon, CurrencyDollarIcon, WalletIcon, UsersIcon, UserGroupIcon } from '../../components/ui/icons';

const reportsModule: ModuleDefinition = {
  id: 'reports',
  name: 'navigation:reports.title',
  description: 'navigation:reports.description',
  icon: <DocumentReportIcon />,
  path: '/reports',
  isActive: true,
  version: '1.0.0',
  dependencies: ['administration', 'academics', 'finance'],
  navigation: [
    { name: 'navigation:reports.accountLedger', path: '/reports/account-ledger', icon: <BookOpenIcon /> },
    { name: 'navigation:reports.examResultsHorizontal', path: '/reports/exam-results-horizontal', icon: <ChartPieIcon /> },
    { name: 'navigation:reports.feeCollectionSummary', path: '/reports/fee-collection-summary', icon: <CurrencyDollarIcon /> },
    { name: 'navigation:reports.studentFinancialSummary', path: '/reports/student-financial-summary', icon: <WalletIcon /> },
    { name: 'navigation:reports.studentMasterlist', path: '/reports/student-masterlist', icon: <UsersIcon /> },
    { name: 'navigation:reports.studentVoteheadStatement', path: '/reports/student-votehead-statement', icon: <DocumentReportIcon /> },
    { name: 'navigation:reports.teacherAssignments', path: '/reports/teacher-assignments', icon: <UserGroupIcon /> },
  ],
  features: ['reporting', 'analytics', 'data-export']
};

export default reportsModule; 