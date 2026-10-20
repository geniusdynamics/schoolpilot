// ABOUTME: Votehead statement: every invoice line with its billed, settled and outstanding share,
// ABOUTME: read from canonical invoice lines and payment allocations in exact minor units.

import React, { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { DocumentTextIcon } from '@/components/ui/icons';

import {
  formatMoneyMinor,
  useCanonicalFinance,
  type FinanceInvoiceLineRow,
} from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import type { Id } from '@/domain/ids';

interface StatementRow {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly learnerName: string;
  readonly admissionNumber: string;
  readonly periodName: string;
  readonly description: string;
  readonly billedMinor: number;
  readonly paidMinor: number;
  readonly balanceMinor: number;
  readonly status: string;
}

export const VoteheadStatementPageContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const [search, setSearch] = useState('');
  const [periodId, setPeriodId] = useState<Id<'academic_period'> | null>(null);

  const admissionByLearner = useMemo(() => {
    const map = new Map<string, string>();
    for (const learner of finance.learnerRows) map.set(learner.id, learner.admissionNumber);
    return map;
  }, [finance.learnerRows]);

  const rows = useMemo<readonly StatementRow[]>(
    () =>
      finance.invoiceLineRows
        .filter((line) => line.invoiceStatus !== 'void' && line.invoiceStatus !== 'draft')
        .filter((line) => !periodId || line.periodId === periodId)
        .map((line: FinanceInvoiceLineRow) => ({
          id: line.id,
          invoiceNumber: line.invoiceNumber,
          learnerName: line.learnerName,
          admissionNumber: line.learnerId ? admissionByLearner.get(line.learnerId) ?? '' : '',
          periodName: line.periodName,
          description: line.description,
          billedMinor: line.amount.amount_minor,
          paidMinor: line.paid.amount_minor,
          balanceMinor: line.balance.amount_minor,
          status: line.invoiceStatus,
        })),
    [finance.invoiceLineRows, periodId, admissionByLearner]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.learnerName.toLowerCase().includes(term) ||
        row.admissionNumber.toLowerCase().includes(term) ||
        row.invoiceNumber.toLowerCase().includes(term) ||
        row.description.toLowerCase().includes(term)
    );
  }, [rows, search]);

  const columns: DataGridColumn<StatementRow>[] = [
    { key: 'admissionNumber', header: 'Adm no', sortable: true, filterable: true },
    { key: 'learnerName', header: 'Learner', sortable: true, filterable: true },
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-mono">{value}</span>,
    },
    { key: 'periodName', header: 'Period', sortable: true, filterable: true },
    {
      key: 'description',
      header: 'Votehead',
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    {
      key: 'billedMinor',
      header: 'Billed',
      align: 'right',
      sortable: true,
      render: (value) => <span className="font-mono">{formatMoneyMinor(Number(value))}</span>,
    },
    {
      key: 'paidMinor',
      header: 'Paid',
      align: 'right',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-green-600">{formatMoneyMinor(Number(value))}</span>
      ),
    },
    {
      key: 'balanceMinor',
      header: 'Balance',
      align: 'right',
      sortable: true,
      render: (value) => (
        <span className={`font-mono ${Number(value) > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {formatMoneyMinor(Number(value))}
        </span>
      ),
    },
  ];

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <DocumentTextIcon className="h-5 w-5 text-primary-600" />
          Votehead statement
        </span>
      }
    >
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-surface-foreground">Search</span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Learner, adm no, invoice or votehead"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-surface-foreground">Period</span>
          <EntityPicker
            value={periodId}
            onChange={setPeriodId}
            lookup={finance.lookups.period}
            placeholder="All periods"
            aria-label="Period"
            allowClear
            data-testid="votehead-period-picker"
          />
        </div>
      </div>
      <DataGrid
        columns={columns}
        data={[...filtered]}
        sortable
        filterable
        emptyState={{
          icon: <DocumentTextIcon className="w-12 h-12 text-surface-muted-fg" />,
          title: 'No statements',
          description: 'Post an invoice to give its lines a statement.',
        }}
      />
    </Card>
  );
};

const VoteheadStatementPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-6">
      <VoteheadStatementPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default VoteheadStatementPage;
