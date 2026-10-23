// ABOUTME: Student financial summary: one row per learner with exact billed, collected and balance
// ABOUTME: from canonical invoices, allocations and posted credit notes. No amount passes through a float.

import React, { useMemo, useState } from 'react';

import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';

import { formatMoneyMinor, useCanonicalFinance, type FinanceInvoiceRow } from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';

interface SummaryRow {
  readonly id: string;
  readonly admissionNumber: string;
  readonly name: string;
  readonly className: string;
  readonly levelName: string;
  readonly billedMinor: number;
  readonly paidMinor: number;
  readonly creditMinor: number;
  readonly balanceMinor: number;
  readonly earliestDueDate: string | null;
}

export const StudentFinancialSummaryPageContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [balanceFilter, setBalanceFilter] = useState('all');

  const rows = useMemo<readonly SummaryRow[]>(() => {
    const invoicesByLearner = new Map<string, FinanceInvoiceRow[]>();
    for (const invoice of finance.invoiceRows) {
      if (!invoice.learnerId || invoice.status === 'void') continue;
      const list = invoicesByLearner.get(invoice.learnerId) ?? [];
      list.push(invoice);
      invoicesByLearner.set(invoice.learnerId, list);
    }
    const creditsByLearner = new Map<string, number>();
    for (const note of finance.creditNotes) {
      if (!note.learner_id || note.status !== 'posted') continue;
      creditsByLearner.set(
        note.learner_id,
        (creditsByLearner.get(note.learner_id) ?? 0) + note.amount.amount_minor
      );
    }
    return finance.learnerRows
      .map((learner) => {
        const invoices = invoicesByLearner.get(learner.id) ?? [];
        const billed = invoices.reduce((total, invoice) => total + invoice.total.amount_minor, 0);
        const paid = invoices.reduce((total, invoice) => total + invoice.paid.amount_minor, 0);
        const credit = creditsByLearner.get(learner.id) ?? 0;
        const earliestDueDate =
          invoices
            .map((invoice) => invoice.dueDate)
            .filter((date): date is string => typeof date === 'string' && date !== '')
            .sort()[0] ?? null;
        return {
          id: learner.id,
          admissionNumber: learner.admissionNumber,
          name: learner.name,
          className: learner.className,
          levelName: learner.levelName,
          billedMinor: billed,
          paidMinor: paid,
          creditMinor: credit,
          balanceMinor: billed - paid - credit,
          earliestDueDate,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [finance.invoiceRows, finance.creditNotes, finance.learnerRows]);

  const filtered = useMemo(() => {
    let result = rows;
    if (search.trim()) {
      const term = search.trim().toLowerCase();
      result = result.filter(
        (row) =>
          row.name.toLowerCase().includes(term) || row.admissionNumber.toLowerCase().includes(term)
      );
    }
    if (classFilter) result = result.filter((row) => row.className === classFilter);
    if (balanceFilter === 'arrears') result = result.filter((row) => row.balanceMinor > 0);
    if (balanceFilter === 'settled') result = result.filter((row) => row.balanceMinor === 0);
    if (balanceFilter === 'overpaid') result = result.filter((row) => row.balanceMinor < 0);
    return result;
  }, [rows, search, classFilter, balanceFilter]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (sum, row) => ({
          billed: sum.billed + row.billedMinor,
          paid: sum.paid + row.paidMinor,
          balance: sum.balance + row.balanceMinor,
        }),
        { billed: 0, paid: 0, balance: 0 }
      ),
    [filtered]
  );

  const classNames = useMemo(
    () => [...new Set(rows.map((row) => row.className).filter(Boolean))].sort(),
    [rows]
  );

  const columns: DataGridColumn<SummaryRow>[] = [
    { key: 'admissionNumber', header: 'Adm no', sortable: true, filterable: true },
    {
      key: 'name',
      header: 'Learner',
      sortable: true,
      filterable: true,
      render: (value) => <span className="font-medium">{value}</span>,
    },
    { key: 'className', header: 'Class', sortable: true, filterable: true },
    {
      key: 'billedMinor',
      header: 'Billed',
      align: 'right',
      sortable: true,
      render: (value) => formatMoneyMinor(Number(value)),
    },
    {
      key: 'paidMinor',
      header: 'Collected',
      align: 'right',
      sortable: true,
      render: (value) => formatMoneyMinor(Number(value)),
    },
    {
      key: 'creditMinor',
      header: 'Credit notes',
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
    { key: 'earliestDueDate', header: 'Earliest due', sortable: true },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card title="Billed">
          <p className="font-mono text-2xl">{formatMoneyMinor(totals.billed)}</p>
        </Card>
        <Card title="Collected">
          <p className="font-mono text-2xl text-green-600">{formatMoneyMinor(totals.paid)}</p>
        </Card>
        <Card title="Balance">
          <p className="font-mono text-2xl text-red-600">{formatMoneyMinor(totals.balance)}</p>
        </Card>
      </div>

      <Card title="Student financial summary">
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
            <span className="mb-1.5 block text-sm font-medium text-surface-foreground">Balance</span>
            <Select
              value={balanceFilter}
              onChange={(event) => setBalanceFilter(event.target.value)}
              options={[
                { value: 'all', label: 'Every learner' },
                { value: 'arrears', label: 'In arrears' },
                { value: 'settled', label: 'Settled' },
                { value: 'overpaid', label: 'Overpaid' },
              ]}
            />
          </div>
        </div>
        <DataGrid columns={columns} data={[...filtered]} sortable filterable />
      </Card>
    </div>
  );
};

const StudentFinancialSummaryPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <StudentFinancialSummaryPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default StudentFinancialSummaryPage;
