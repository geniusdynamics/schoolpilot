// ABOUTME: Reports landing page: a catalogue of the real report workspaces, not a mock finance dashboard.
// ABOUTME: Each card opens a report backed by the canonical repository or the finance ledger.

import React from 'react';
import { Link } from 'react-router-dom';

import Card from '@/components/ui/Card';
import {
  ChartBarIcon,
  ClipboardDocumentListIcon,
  CurrencyDollarIcon,
  DocumentReportIcon,
  DocumentTextIcon,
  UserGroupIcon,
  UsersIcon,
} from '@/components/ui/icons';

interface ReportLink {
  readonly title: string;
  readonly description: string;
  readonly to: string;
  readonly icon: React.ReactNode;
}

const STUDENT_REPORTS: readonly ReportLink[] = [
  {
    title: 'Report Builder',
    description: 'Choose columns and a class/stream, then preview, print or export the learner grid.',
    to: '/reports/student-reports?tab=builder',
    icon: <DocumentTextIcon className="h-5 w-5" />,
  },
  {
    title: 'Student Masterlist',
    description: 'The canonical learner directory with placement and guardian columns.',
    to: '/reports/student-reports',
    icon: <UsersIcon className="h-5 w-5" />,
  },
  {
    title: 'Class Lists',
    description: 'Class and stream lists with the current enrolment.',
    to: '/reports/student-reports?tab=class-lists',
    icon: <UserGroupIcon className="h-5 w-5" />,
  },
  {
    title: 'Exam Results',
    description: 'Assessment results across learning areas and periods.',
    to: '/reports/student-reports?tab=exam-results',
    icon: <ChartBarIcon className="h-5 w-5" />,
  },
];

const FINANCE_REPORTS: readonly ReportLink[] = [
  {
    title: 'Fee Collection Summary',
    description: 'Billed, collected and outstanding amounts by period and class.',
    to: '/reports/finance',
    icon: <CurrencyDollarIcon className="h-5 w-5" />,
  },
  {
    title: 'Overdue Report',
    description: 'Invoices past their due date, with the learner and balance.',
    to: '/reports/finance?tab=fees-due',
    icon: <ClipboardDocumentListIcon className="h-5 w-5" />,
  },
  {
    title: 'Account Ledger',
    description: 'The posted ledger entries for an account, with a date range.',
    to: '/finance/accounting-ops?tab=ledger',
    icon: <DocumentReportIcon className="h-5 w-5" />,
  },
  {
    title: 'Student Votehead Statement',
    description: 'Charges and payments for one learner and period.',
    to: '/reports/student-reports?tab=votehead-statement',
    icon: <DocumentTextIcon className="h-5 w-5" />,
  },
];

const ReportCard: React.FC<{ readonly report: ReportLink }> = ({ report }) => (
  <Link
    to={report.to}
    className="group flex gap-3 rounded-xl border border-surface-border bg-surface-card p-4 transition-colors hover:border-primary-300 hover:bg-primary-50/40"
  >
    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
      {report.icon}
    </span>
    <span>
      <span className="block text-sm font-semibold text-surface-foreground group-hover:text-primary-800">
        {report.title}
      </span>
      <span className="mt-1 block text-xs text-surface-muted-fg">{report.description}</span>
    </span>
  </Link>
);

export const ReportsPageContent: React.FC = () => (
  <div className="space-y-4">
    <Card
      title="Reports"
      info="Every report below reads the canonical repository or the posted ledger. There are no sample totals on this page."
    >
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-surface-muted-fg">
          Students and academics
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {STUDENT_REPORTS.map((report) => (
            <ReportCard key={report.title} report={report} />
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-surface-muted-fg">
          Finance
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {FINANCE_REPORTS.map((report) => (
            <ReportCard key={report.title} report={report} />
          ))}
        </div>
      </section>
    </Card>
  </div>
);

export default ReportsPageContent;
