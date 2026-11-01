// ABOUTME: Bulk opening balances: a class grid where a positive amount is a brought-forward charge and
// ABOUTME: a negative amount is a prepayment. It replaces the old balance B/F spreadsheet with
// ABOUTME: canonical opening_balance invoices and posted credit notes.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { parseMoneyInput } from '@/components/ui/forms/MoneyField';
import { useToast } from '@/hooks/useToast';

import {
  FINANCE_CURRENCY,
  currencyDigits,
  formatMoneyMinor,
  money,
  useCanonicalFinance,
  useFinanceRepository,
  type FinanceLearnerRow,
} from '../data/canonicalFinance';
import { CanonicalRepositoryProvider } from '../data/canonicalRepository';
import { createChargeInvoice, createCreditNote } from '../services/canonicalFinanceService';

type RowResult =
  | { readonly status: 'posted'; readonly label: string }
  | { readonly status: 'failed'; readonly reason: string };

const today = (): string => new Date().toISOString().slice(0, 10);

const parseSigned = (value: string): number | null => {
  const parsed = parseMoneyInput(value, {
    minorUnitDigits: currencyDigits(FINANCE_CURRENCY),
    allowNegative: true,
  });
  return parsed.ok && parsed.amountMinor !== 0 ? parsed.amountMinor : null;
};

export const BulkOpeningBalancesPageContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const repository = useFinanceRepository();
  const confirm = useConfirm();
  const { showSuccess, showError, showWarning } = useToast();

  const [className, setClassName] = useState('');
  const [search, setSearch] = useState('');
  const [asOf, setAsOf] = useState(today());
  const [commonAmount, setCommonAmount] = useState('');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [results, setResults] = useState<Record<string, RowResult>>({});
  const [posting, setPosting] = useState(false);

  const classOptions = useMemo(
    () =>
      [...new Set(finance.learnerRows.map((learner) => learner.className).filter(Boolean))].sort(),
    [finance.learnerRows]
  );

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    return finance.learnerRows.filter(
      (learner) =>
        learner.status === 'enrolled' &&
        (!className || learner.className === className) &&
        (!term ||
          learner.name.toLowerCase().includes(term) ||
          learner.admissionNumber.toLowerCase().includes(term))
    );
  }, [finance.learnerRows, className, search]);

  const priced = visible
    .map((learner) => ({ learner, amountMinor: parseSigned(amounts[learner.id] ?? '') }))
    .filter(
      (entry): entry is { learner: FinanceLearnerRow; amountMinor: number } =>
        entry.amountMinor !== null
    );
  const debitMinor = priced.reduce(
    (sum, entry) => sum + (entry.amountMinor > 0 ? entry.amountMinor : 0),
    0
  );
  const creditMinor = priced.reduce(
    (sum, entry) => sum + (entry.amountMinor < 0 ? -entry.amountMinor : 0),
    0
  );

  const applyCommon = () => {
    if (parseSigned(commonAmount) === null) {
      showWarning('Enter a positive or negative amount first.');
      return;
    }
    setAmounts((current) => {
      const next = { ...current };
      for (const learner of visible) next[learner.id] = commonAmount;
      return next;
    });
  };

  const post = async () => {
    if (!asOf) {
      showWarning('Choose the date the balances are brought forward to.');
      return;
    }
    if (priced.length === 0) {
      showWarning('Enter an amount for at least one learner.');
      return;
    }
    const confirmed = await confirm({
      title: 'Post opening balances',
      message: `Post ${priced.length} opening balance(s): ${formatMoneyMinor(
        debitMinor
      )} debit and ${formatMoneyMinor(creditMinor)} credit, as at ${asOf}? Positive amounts become opening-balance charges; negative amounts become prepayment credit notes.`,
      confirmLabel: 'Post balances',
      variant: 'warning',
    });
    if (!confirmed) return;

    setPosting(true);
    const next: Record<string, RowResult> = { ...results };
    let posted = 0;
    for (const entry of priced) {
      try {
        if (entry.amountMinor > 0) {
          const created = await createChargeInvoice(repository, {
            learnerId: entry.learner.id,
            description: 'Opening balance brought forward',
            amount: money(entry.amountMinor, FINANCE_CURRENCY),
            kind: 'opening_balance',
            issueDate: asOf,
          });
          next[entry.learner.id] = { status: 'posted', label: created.invoice.number };
        } else {
          const note = await createCreditNote(repository, {
            learnerId: entry.learner.id,
            amount: money(-entry.amountMinor, FINANCE_CURRENCY),
            reason: 'Opening balance prepayment',
            issueDate: asOf,
            status: 'posted',
          });
          next[entry.learner.id] = { status: 'posted', label: note.number };
        }
        posted += 1;
        setAmounts((current) => {
          const copy = { ...current };
          delete copy[entry.learner.id];
          return copy;
        });
      } catch (error) {
        next[entry.learner.id] = {
          status: 'failed',
          reason: error instanceof Error ? error.message : String(error),
        };
      }
    }
    setResults(next);
    setPosting(false);
    if (posted === priced.length) {
      showSuccess(`${posted} opening balance(s) posted.`);
    } else {
      showError(`${posted} posted, ${priced.length - posted} refused. See the row status.`);
    }
  };

  const columns: DataGridColumn<FinanceLearnerRow>[] = [
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
      key: 'id',
      header: 'Amount',
      sortable: false,
      filterable: false,
      render: (_value, learner) => (
        <input
          aria-label={`Opening balance for ${learner.name}`}
          value={amounts[learner.id] ?? ''}
          onChange={(event) =>
            setAmounts((current) => ({ ...current, [learner.id]: event.target.value }))
          }
          inputMode="decimal"
          placeholder="0.00"
          className="h-8 w-28 rounded border border-surface-input bg-surface-card px-2 text-sm"
        />
      ),
    },
    {
      key: 'status',
      header: 'Result',
      sortable: false,
      filterable: false,
      render: (_value, learner) => {
        const result = results[learner.id];
        if (!result) return <span className="text-xs text-surface-muted-fg">—</span>;
        if (result.status === 'posted') {
          return <span className="text-xs text-green-700 dark:text-green-400">{result.label}</span>;
        }
        return (
          <span className="text-xs text-red-600 dark:text-red-400" title={result.reason}>
            {result.reason}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Card
        title="Bulk opening balances"
        info="A positive amount is a brought-forward charge (an opening_balance invoice); a negative amount is a prepayment (a posted credit note). Each learner gets one document, and a refused row keeps its amount."
        actions={
          <Button onClick={() => void post()} loading={posting} disabled={priced.length === 0}>
            Post balances ({priced.length})
          </Button>
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Class</span>
            <select
              value={className}
              onChange={(event) => setClassName(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="">All classes</option>
              {classOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Search</span>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name or admission number"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">As at</span>
            <input
              type="date"
              value={asOf}
              onChange={(event) => setAsOf(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Common amount</span>
            <div className="flex gap-2">
              <Input
                value={commonAmount}
                onChange={(event) => setCommonAmount(event.target.value)}
                placeholder="0.00"
                inputMode="decimal"
              />
              <Button variant="secondary" onClick={applyCommon}>
                Apply
              </Button>
            </div>
          </label>
        </div>

        <p className="mb-3 text-sm text-surface-muted-fg">
          {priced.length} learner(s): {formatMoneyMinor(debitMinor)} debit,{' '}
          {formatMoneyMinor(creditMinor)} credit.
        </p>

        <DataGrid
          columns={columns}
          data={[...visible]}
          sortable
          filterable
          emptyState={{
            title: 'No enrolled learners match',
            description: 'Choose a class or change the search.',
          }}
        />
      </Card>
    </div>
  );
};

const BulkOpeningBalancesPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <BulkOpeningBalancesPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default BulkOpeningBalancesPage;
