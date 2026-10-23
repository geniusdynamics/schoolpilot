// ABOUTME: Previous session fees: the balances a learner still carries from earlier academic years,
// ABOUTME: read from canonical invoices whose period belongs to a year that is no longer current.

import React, { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { ArrowPathIcon } from '@/components/ui/icons';

import { formatMoneyMinor, useCanonicalFinance } from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import type { Id } from '@/domain/ids';
import { asId } from '@/domain/ids';

interface PreviousRow {
  readonly id: string;
  readonly learnerName: string;
  readonly admissionNumber: string;
  readonly invoiceNumber: string;
  readonly periodName: string;
  readonly yearId: string;
  readonly yearName: string;
  readonly totalMinor: number;
  readonly paidMinor: number;
  readonly balanceMinor: number;
  readonly status: string;
}

export const PreviousSessionFeesPageContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const [yearId, setYearId] = useState<Id<'academic_year'> | null>(null);
  const [search, setSearch] = useState('');

  const currentYearId = useMemo(() => {
    const current = finance.years.find((year) => year.status === 'current');
    return current?.id ?? finance.years[0]?.id ?? null;
  }, [finance.years]);

  const periodYear = useMemo(() => {
    const map = new Map<string, string>();
    for (const period of finance.periods) map.set(period.id, period.academic_year_id);
    return map;
  }, [finance.periods]);

  const admissionByLearner = useMemo(() => {
    const map = new Map<string, string>();
    for (const learner of finance.learnerRows) map.set(learner.id, learner.admissionNumber);
    return map;
  }, [finance.learnerRows]);

  const rows = useMemo<readonly PreviousRow[]>(
    () =>
      finance.invoiceRows
        .filter((invoice) => invoice.periodId !== null)
        .filter((invoice) => invoice.status !== 'void' && invoice.status !== 'draft')
        .filter((invoice) => {
          const year = invoice.periodId ? periodYear.get(invoice.periodId) ?? '' : '';
          return year !== '' && year !== currentYearId;
        })
        .filter((invoice) => !yearId || (invoice.periodId && periodYear.get(invoice.periodId) === yearId))
        .map((invoice) => {
          const year = invoice.periodId ? periodYear.get(invoice.periodId) ?? '' : '';
          return {
            id: invoice.id,
            learnerName: invoice.learnerName,
            admissionNumber: invoice.learnerId ? admissionByLearner.get(invoice.learnerId) ?? '' : '',
            invoiceNumber: invoice.number,
            periodName: invoice.periodName,
            yearId: year,
            yearName: finance.lookups.year.label(asId<'academic_year'>(year), ''),
            totalMinor: invoice.total.amount_minor,
            paidMinor: invoice.paid.amount_minor,
            balanceMinor: invoice.balance.amount_minor,
            status: invoice.status,
          };
        }),
    [finance.invoiceRows, finance.lookups.year, periodYear, currentYearId, yearId, admissionByLearner]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.learnerName.toLowerCase().includes(term) ||
        row.admissionNumber.toLowerCase().includes(term) ||
        row.invoiceNumber.toLowerCase().includes(term)
    );
  }, [rows, search]);

  const columns: DataGridColumn<PreviousRow>[] = [
    { key: 'learnerName', header: 'Learner', sortable: true, filterable: true },
    { key: 'admissionNumber', header: 'Adm no', sortable: true, filterable: true },
    {
      key: 'invoiceNumber',
      header: 'Invoice',
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-mono">{value}</span>,
    },
    { key: 'yearName', header: 'Year', sortable: true, filterable: true },
    { key: 'periodName', header: 'Period', sortable: true, filterable: true },
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
        <span className={`font-mono ${Number(value) > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {formatMoneyMinor(Number(value))}
        </span>
      ),
    },
    { key: 'status', header: 'Status', sortable: true, filterable: true },
  ];

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <ArrowPathIcon className="h-5 w-5 text-primary-600" />
          Previous session fees
        </span>
      }
      info="Invoices from earlier academic years and what is still outstanding on them. A carry-over is written as an opening balance in the new session, not by editing the old invoice."
    >
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-surface-foreground">Year</span>
          <EntityPicker
            value={yearId}
            onChange={setYearId}
            lookup={finance.lookups.year}
            filter={(year) => year.id !== currentYearId}
            placeholder="Every earlier year"
            aria-label="Academic year"
            allowClear
            data-testid="previous-year-picker"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-surface-foreground">Search</span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Learner, admission number or invoice"
          />
        </div>
      </div>
      <DataGrid
        columns={columns}
        data={[...filtered]}
        sortable
        filterable
        emptyState={{
          icon: <ArrowPathIcon className="w-12 h-12 text-surface-muted-fg" />,
          title: 'No previous session fees',
          description: 'Invoices from earlier academic years will appear here.',
        }}
      />
    </Card>
  );
};

const PreviousSessionFeesPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <PreviousSessionFeesPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default PreviousSessionFeesPage;
