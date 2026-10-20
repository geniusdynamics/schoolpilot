// ABOUTME: Fees due report: learners with an outstanding balance, aged from their earliest due
// ABOUTME: invoice. It reads the canonical student financial summary, in exact minor units.

import React, { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { ExclamationTriangleIcon } from '@/components/ui/icons';
import { formatDate } from '@/utils/format';

import { formatMoneyMinor } from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { useStudentFinancialSummary } from '../hooks/useStudentFinancialSummary';

type AgingCategory = 'Current' | '1-30 days' | '31-60 days' | '61-90 days' | '90+ days';

const AGING_CATEGORIES: readonly AgingCategory[] = [
  'Current',
  '1-30 days',
  '31-60 days',
  '61-90 days',
  '90+ days',
];

function agingBucket(daysOverdue: number): AgingCategory {
  if (daysOverdue <= 0) return 'Current';
  if (daysOverdue <= 30) return '1-30 days';
  if (daysOverdue <= 60) return '31-60 days';
  if (daysOverdue <= 90) return '61-90 days';
  return '90+ days';
}

interface DueRow {
  readonly id: string;
  readonly learnerName: string;
  readonly admissionNumber: string;
  readonly className: string;
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly balanceMinor: number;
  readonly dueDate: string;
  readonly daysOverdue: number;
  readonly aging: AgingCategory;
}

export const FeesDueReportPageContent: React.FC = () => {
  const { data: summaries, loading } = useStudentFinancialSummary();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [agingFilter, setAgingFilter] = useState('');

  const rows = useMemo<readonly DueRow[]>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return summaries
      .filter((summary) => summary.balance > 0)
      .map((summary) => {
        const dueDate = summary.earliestDueDate ?? '';
        const daysOverdue = dueDate
          ? Math.max(0, Math.floor((today.getTime() - new Date(dueDate).getTime()) / 86_400_000))
          : 0;
        return {
          id: summary.studentId,
          learnerName: summary.name,
          admissionNumber: summary.admissionNo,
          className: summary.className ?? '',
          totalMinor: summary.feeAmount + summary.feePenalty,
          paidMinor: summary.amountPaid,
          balanceMinor: summary.balance,
          dueDate,
          daysOverdue,
          aging: agingBucket(daysOverdue),
        };
      })
      .sort((left, right) => left.learnerName.localeCompare(right.learnerName));
  }, [summaries]);

  const classNames = useMemo(
    () => [...new Set(rows.map((row) => row.className).filter(Boolean))].sort(),
    [rows]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (
        term &&
        !row.learnerName.toLowerCase().includes(term) &&
        !row.admissionNumber.toLowerCase().includes(term)
      ) {
        return false;
      }
      if (classFilter && row.className !== classFilter) return false;
      if (agingFilter && row.aging !== agingFilter) return false;
      return true;
    });
  }, [rows, search, classFilter, agingFilter]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (sum, row) => ({
          due: sum.due + row.totalMinor,
          paid: sum.paid + row.paidMinor,
          balance: sum.balance + row.balanceMinor,
        }),
        { due: 0, paid: 0, balance: 0 }
      ),
    [filtered]
  );

  const columns: DataGridColumn<DueRow>[] = [
    { key: 'learnerName', header: 'Learner', sortable: true, filterable: true },
    { key: 'admissionNumber', header: 'Adm no', sortable: true, filterable: true },
    { key: 'className', header: 'Class', sortable: true, filterable: true },
    {
      key: 'totalMinor',
      header: 'Billed',
      align: 'right',
      sortable: true,
      render: (value) => formatMoneyMinor(Number(value)),
    },
    {
      key: 'paidMinor',
      header: 'Paid',
      align: 'right',
      sortable: true,
      render: (value) => formatMoneyMinor(Number(value)),
    },
    {
      key: 'balanceMinor',
      header: 'Balance',
      align: 'right',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-red-600">{formatMoneyMinor(Number(value))}</span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due date',
      sortable: true,
      render: (value) => (value ? formatDate(String(value)) : '-'),
    },
    { key: 'daysOverdue', header: 'Days overdue', align: 'right', sortable: true },
    { key: 'aging', header: 'Aging', sortable: true, filterable: true },
  ];

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-600" />
          Fees due
        </span>
      }
    >
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-surface-foreground">Search</span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Name or admission number"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-surface-foreground">Class</span>
          <Select
            value={classFilter}
            onChange={(event) => setClassFilter(event.target.value)}
            options={[
              { value: '', label: 'All classes' },
              ...classNames.map((name) => ({ value: name, label: name })),
            ]}
          />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-surface-foreground">Aging</span>
          <Select
            value={agingFilter}
            onChange={(event) => setAgingFilter(event.target.value)}
            options={[
              { value: '', label: 'Every bucket' },
              ...AGING_CATEGORIES.map((category) => ({ value: category, label: category })),
            ]}
          />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-6 text-sm">
        <span>
          Billed: <span className="font-mono">{formatMoneyMinor(totals.due)}</span>
        </span>
        <span>
          Paid: <span className="font-mono text-green-600">{formatMoneyMinor(totals.paid)}</span>
        </span>
        <span>
          Outstanding:{' '}
          <span className="font-mono text-red-600">{formatMoneyMinor(totals.balance)}</span>
        </span>
      </div>

      <DataGrid
        columns={columns}
        data={[...filtered]}
        isLoading={loading}
        sortable
        filterable
        emptyState={{
          icon: <ExclamationTriangleIcon className="w-12 h-12 text-surface-muted-fg" />,
          title: 'Nothing due',
          description: 'Every posted invoice in scope is settled.',
        }}
      />
    </Card>
  );
};

const FeesDueReportPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-6">
      <FeesDueReportPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default FeesDueReportPage;
