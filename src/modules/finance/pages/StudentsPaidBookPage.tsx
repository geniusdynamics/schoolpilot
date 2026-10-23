// ABOUTME: Students paid book: every posted payment in a date range with its receipt, from the
// ABOUTME: canonical payment and receipt rows. Totals are exact minor units.

import React, { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { BookOpenIcon } from '@/components/ui/icons';

import {
  formatMoneyMinor,
  useCanonicalFinance,
  type FinancePaymentRow,
} from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';

const today = (): string => new Date().toISOString().slice(0, 10);

const monthAgo = (): string => {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().slice(0, 10);
};

interface PaidRow extends FinancePaymentRow {
  readonly admissionNumber: string;
  readonly date: string;
}

export const StudentsPaidBookPageContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const [startDate, setStartDate] = useState(monthAgo);
  const [endDate, setEndDate] = useState(today);
  const [search, setSearch] = useState('');

  const admissionByLearner = useMemo(() => {
    const map = new Map<string, string>();
    for (const learner of finance.learnerRows) map.set(learner.id, learner.admissionNumber);
    return map;
  }, [finance.learnerRows]);

  const rows = useMemo<readonly PaidRow[]>(() => {
    const term = search.trim().toLowerCase();
    return finance.paymentRows
      .filter((payment) => {
        if (payment.status === 'reversed' || payment.status === 'bounced') return false;
        const date = payment.receivedAt.slice(0, 10);
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        if (!term) return true;
        const admission = payment.learnerId ? admissionByLearner.get(payment.learnerId) ?? '' : '';
        return (
          payment.learnerName.toLowerCase().includes(term) ||
          admission.toLowerCase().includes(term) ||
          payment.receiptNumber.toLowerCase().includes(term) ||
          payment.reference.toLowerCase().includes(term)
        );
      })
      .map((payment) => ({
        ...payment,
        admissionNumber: payment.learnerId ? admissionByLearner.get(payment.learnerId) ?? '' : '',
        date: payment.receivedAt.slice(0, 10),
      }));
  }, [finance.paymentRows, startDate, endDate, search, admissionByLearner]);

  const totalMinor = rows.reduce((total, row) => total + row.amount.amount_minor, 0);

  const columns: DataGridColumn<PaidRow>[] = [
    { key: 'date', header: 'Date', sortable: true, filterable: true },
    {
      key: 'receiptNumber',
      header: 'Receipt',
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-mono">{value || '-'}</span>,
    },
    { key: 'learnerName', header: 'Learner', sortable: true, filterable: true },
    { key: 'admissionNumber', header: 'Adm no', sortable: true, filterable: true },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (_value, row) => <span className="font-mono">{formatMoneyMinor(row.amount.amount_minor)}</span>,
    },
    { key: 'channel', header: 'Channel', sortable: true, filterable: true },
    { key: 'reference', header: 'Reference', filterable: true },
    { key: 'status', header: 'Status', sortable: true, filterable: true },
  ];

  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          <BookOpenIcon className="h-5 w-5 text-primary-600" />
          Students paid book
        </span>
      }
    >
      <div className="mb-4 flex flex-wrap gap-4">
        <label className="flex-1 text-sm">
          <span className="mb-1 block font-medium text-surface-foreground">Start date</span>
          <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label className="flex-1 text-sm">
          <span className="mb-1 block font-medium text-surface-foreground">End date</span>
          <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
        <label className="flex-1 text-sm">
          <span className="mb-1 block font-medium text-surface-foreground">Search</span>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Learner, admission number, receipt or reference"
          />
        </label>
      </div>

      <div className="mb-4 flex flex-wrap gap-6 text-sm">
        <span>
          Collected: <span className="font-mono font-semibold text-green-600">{formatMoneyMinor(totalMinor)}</span>
        </span>
        <span>
          Payments: <span className="font-semibold">{rows.length}</span>
        </span>
      </div>

      <DataGrid
        columns={columns}
        data={[...rows]}
        sortable
        filterable
        emptyState={{
          icon: <BookOpenIcon className="w-12 h-12 text-surface-muted-fg" />,
          title: 'No payments in this range',
          description: 'Widen the dates or record a payment.',
        }}
      />
    </Card>
  );
};

const StudentsPaidBookPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <StudentsPaidBookPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default StudentsPaidBookPage;
