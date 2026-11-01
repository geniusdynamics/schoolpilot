// ABOUTME: Class payment grid: record one canonical payment per learner in a single action, with a
// ABOUTME: shared channel, slip and distribution policy. Each row gets its own receipt; a refused row
// ABOUTME: keeps its amount and says why.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import { DataGrid, type DataGridColumn } from '@/components/ui/data';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { parseMoneyInput } from '@/components/ui/forms/MoneyField';
import { useToast } from '@/hooks/useToast';
import {
  CHANNEL_LABELS,
  PAYMENT_CHANNEL_VALUES,
  isCashChannel,
  type PaymentChannel,
} from '@/domain/finance/payments';
import type { AllocationStrategyKind } from '@/domain/finance/allocation';
import { asId } from '@/domain/ids';

import {
  FINANCE_CURRENCY,
  currencyDigits,
  formatMoneyMinor,
  useCanonicalFinance,
  type FinanceLearnerRow,
} from '../data/canonicalFinance';
import { useCashierRuntimePort } from './cashier/runtime';
import { PAYMENT_STRATEGY_OPTIONS } from './paymentStrategy';

type RowResult =
  | { readonly status: 'posted'; readonly receipt: string }
  | { readonly status: 'failed'; readonly reason: string };

const parseAmount = (value: string): number | null => {
  const parsed = parseMoneyInput(value, {
    minorUnitDigits: currencyDigits(FINANCE_CURRENCY),
    allowNegative: false,
  });
  return parsed.ok && parsed.amountMinor > 0 ? parsed.amountMinor : null;
};

export const BulkPaymentsPageContent: React.FC<{ readonly cashierName?: string }> = ({
  cashierName = '',
}) => {
  const finance = useCanonicalFinance();
  const port = useCashierRuntimePort();
  const confirm = useConfirm();
  const { showSuccess, showError, showWarning } = useToast();

  const [className, setClassName] = useState('');
  const [search, setSearch] = useState('');
  const [channel, setChannel] = useState<PaymentChannel>('cash');
  const [reference, setReference] = useState('');
  const [receivedOn, setReceivedOn] = useState(new Date().toISOString().slice(0, 10));
  const [strategy, setStrategy] = useState<AllocationStrategyKind>('vote_head_priority');
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

  const batchTotal = useMemo(
    () =>
      visible.reduce((sum, learner) => sum + (parseAmount(amounts[learner.id] ?? '') ?? 0), 0),
    [visible, amounts]
  );
  const pricedRows = visible.filter((learner) => parseAmount(amounts[learner.id] ?? '') !== null);

  const applyCommon = () => {
    if (parseAmount(commonAmount) === null) {
      showWarning('Enter a positive common amount first.');
      return;
    }
    setAmounts((current) => {
      const next = { ...current };
      for (const learner of visible) next[learner.id] = commonAmount;
      return next;
    });
  };

  const post = async () => {
    if (!port) {
      showWarning('The payments service is still opening. Try again in a moment.');
      return;
    }
    if (!receivedOn) {
      showWarning('Choose the date the money was received.');
      return;
    }
    if (!isCashChannel(channel) && !reference.trim()) {
      showWarning(`A ${CHANNEL_LABELS[channel]} payment needs a slip, cheque or provider reference.`);
      return;
    }
    if (pricedRows.length === 0) {
      showWarning('Enter a positive amount for at least one learner.');
      return;
    }
    const confirmed = await confirm({
      title: 'Post class payments',
      message: `Record ${pricedRows.length} payment(s) totalling ${formatMoneyMinor(
        batchTotal
      )} on ${receivedOn}? Each learner gets their own receipt and allocation.`,
      confirmLabel: 'Post payments',
      variant: 'warning',
    });
    if (!confirmed) return;

    const receivedAt = new Date(`${receivedOn}T12:00:00`).toISOString();
    setPosting(true);
    const next: Record<string, RowResult> = { ...results };
    let posted = 0;
    for (const learner of pricedRows) {
      const amountMinor = parseAmount(amounts[learner.id] ?? '');
      if (amountMinor === null) continue;
      try {
        const recorded = await port.recordPayment({
          learnerId: asId<'learner'>(learner.id),
          amount: { amount_minor: amountMinor, currency: FINANCE_CURRENCY },
          channel,
          strategy,
          receivedAt,
          ...(reference.trim() ? { reference: reference.trim() } : {}),
          ...(cashierName ? { cashierName } : {}),
        });
        next[learner.id] = { status: 'posted', receipt: recorded.receipt.number };
        posted += 1;
        setAmounts((current) => {
          const copy = { ...current };
          delete copy[learner.id];
          return copy;
        });
      } catch (error) {
        next[learner.id] = {
          status: 'failed',
          reason: error instanceof Error ? error.message : String(error),
        };
      }
    }
    setResults(next);
    setPosting(false);
    if (posted === pricedRows.length) {
      showSuccess(`${posted} payment(s) recorded.`);
    } else {
      showError(`${posted} recorded, ${pricedRows.length - posted} refused. See the row status.`);
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
          aria-label={`Amount for ${learner.name}`}
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
          return <span className="text-xs text-green-700 dark:text-green-400">{result.receipt}</span>;
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
        title="Class payment"
        info="One row per learner, one receipt per payment. The channel, slip and distribution apply to the batch; the distribution is the same policy the cashier offers."
        actions={
          <Button onClick={() => void post()} loading={posting} disabled={!port || pricedRows.length === 0}>
            Post payments ({pricedRows.length})
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
            <span className="mb-1 block font-medium text-surface-foreground">Date received</span>
            <input
              type="date"
              value={receivedOn}
              onChange={(event) => setReceivedOn(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Channel</span>
            <select
              value={channel}
              onChange={(event) => setChannel(event.target.value as PaymentChannel)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              {PAYMENT_CHANNEL_VALUES.map((value) => (
                <option key={value} value={value}>
                  {CHANNEL_LABELS[value]}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">
              Reference {isCashChannel(channel) ? '(optional)' : '(required)'}
            </span>
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Slip, cheque or provider reference"
            />
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Distribution</span>
            <select
              value={strategy}
              onChange={(event) => setStrategy(event.target.value as AllocationStrategyKind)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              {PAYMENT_STRATEGY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Common amount</span>
            <Input
              value={commonAmount}
              onChange={(event) => setCommonAmount(event.target.value)}
              placeholder="0.00"
              inputMode="decimal"
            />
          </label>
          <div className="flex items-end">
            <Button variant="secondary" onClick={applyCommon}>
              Apply to shown
            </Button>
          </div>
        </div>

        <p className="mb-3 text-sm text-surface-muted-fg">
          {pricedRows.length} row(s) priced, {formatMoneyMinor(batchTotal)} in total.
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

export default BulkPaymentsPageContent;
