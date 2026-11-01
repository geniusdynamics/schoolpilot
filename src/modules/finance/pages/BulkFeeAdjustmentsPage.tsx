// ABOUTME: Bulk fee penalties and exemptions: choose a class, tick learners, then post one canonical
// ABOUTME: fine invoice or credit note per learner. The old Akademico mass form wrote raw penalty and
// ABOUTME: exemption rows; this keeps the same batch reach with documents that can be audited.

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

type AdjustmentKind = 'fine' | 'exemption';

const today = (): string => new Date().toISOString().slice(0, 10);

const parseAmount = (value: string): number | null => {
  const parsed = parseMoneyInput(value, {
    minorUnitDigits: currencyDigits(FINANCE_CURRENCY),
    allowNegative: false,
  });
  return parsed.ok && parsed.amountMinor > 0 ? parsed.amountMinor : null;
};

export const BulkFeeAdjustmentsPageContent: React.FC = () => {
  const finance = useCanonicalFinance();
  const repository = useFinanceRepository();
  const confirm = useConfirm();
  const { showSuccess, showError, showWarning } = useToast();

  const [kind, setKind] = useState<AdjustmentKind>('fine');
  const [className, setClassName] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<readonly FinanceLearnerRow[]>([]);
  const [amountMode, setAmountMode] = useState<'common' | 'perLearner'>('common');
  const [commonAmount, setCommonAmount] = useState('');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [description, setDescription] = useState('');
  const [issueDate, setIssueDate] = useState(today());
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
        (!className || learner.className === className) &&
        (!term ||
          learner.name.toLowerCase().includes(term) ||
          learner.admissionNumber.toLowerCase().includes(term))
    );
  }, [finance.learnerRows, className, search]);

  const targets = selected.length > 0 ? selected : visible;
  const amountFor = (learner: FinanceLearnerRow): number | null =>
    amountMode === 'common' ? parseAmount(commonAmount) : parseAmount(amounts[learner.id] ?? '');

  const previewTotal = useMemo(() => {
    let total = 0;
    for (const learner of targets) {
      const amount = amountFor(learner);
      if (amount !== null) total += amount;
    }
    return total;
    // amountFor reads the amount state; the dependency list is the state it reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targets, amountMode, commonAmount, amounts]);

  const post = async () => {
    if (targets.length === 0) {
      showWarning('There are no learners to apply the adjustment to.');
      return;
    }
    if (!description.trim()) {
      showWarning('Enter a description so the document says what the adjustment is for.');
      return;
    }
    const priced = targets
      .map((learner) => ({ learner, amountMinor: amountFor(learner) }))
      .filter((entry): entry is { learner: FinanceLearnerRow; amountMinor: number } => entry.amountMinor !== null);
    if (priced.length === 0) {
      showWarning('Enter a positive amount for at least one learner.');
      return;
    }

    const confirmed = await confirm({
      title: kind === 'fine' ? 'Post bulk fines' : 'Post bulk exemptions',
      message:
        kind === 'fine'
          ? `Post a fine invoice for ${priced.length} learner(s), totalling ${formatMoneyMinor(
              priced.reduce((sum, entry) => sum + entry.amountMinor, 0)
            )}?`
          : `Post a credit note for ${priced.length} learner(s), totalling ${formatMoneyMinor(
              priced.reduce((sum, entry) => sum + entry.amountMinor, 0)
            )}?`,
      confirmLabel: kind === 'fine' ? 'Post fines' : 'Post exemptions',
      variant: 'warning',
    });
    if (!confirmed) return;

    setPosting(true);
    let posted = 0;
    const failures: string[] = [];
    for (const entry of priced) {
      try {
        if (kind === 'fine') {
          await createChargeInvoice(repository, {
            learnerId: entry.learner.id,
            description: description.trim(),
            amount: money(entry.amountMinor, FINANCE_CURRENCY),
            kind: 'fine',
            issueDate,
          });
        } else {
          await createCreditNote(repository, {
            learnerId: entry.learner.id,
            amount: money(entry.amountMinor, FINANCE_CURRENCY),
            reason: description.trim(),
            issueDate,
            status: 'posted',
          });
        }
        posted += 1;
      } catch (error) {
        failures.push(
          `${entry.learner.admissionNumber}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
    setPosting(false);
    setSelected([]);
    if (failures.length > 0) {
      showError(`${posted} posted, ${failures.length} failed. ${failures[0]}`);
    } else {
      showSuccess(`${posted} ${kind === 'fine' ? 'fine invoice(s)' : 'credit note(s)'} posted.`);
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
          value={amountMode === 'common' ? commonAmount : (amounts[learner.id] ?? '')}
          disabled={amountMode === 'common'}
          onChange={(event) =>
            setAmounts((current) => ({ ...current, [learner.id]: event.target.value }))
          }
          inputMode="decimal"
          placeholder="0.00"
          className="h-8 w-28 rounded border border-surface-input bg-surface-card px-2 text-sm disabled:opacity-60"
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <Card
        title="Bulk fee adjustments"
        info="A fine is a one-line charge invoice; an exemption is a credit note. With no rows ticked, the action applies to every learner currently shown, the way the old class grid did."
        actions={
          <Button onClick={() => void post()} loading={posting} disabled={targets.length === 0}>
            Post {kind === 'fine' ? 'fines' : 'exemptions'} ({targets.length})
          </Button>
        }
      >
        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Kind</span>
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value as AdjustmentKind)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="fine">Fine (charge)</option>
              <option value="exemption">Exemption (credit note)</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Class</span>
            <select
              value={className}
              onChange={(event) => {
                setClassName(event.target.value);
                setSelected([]);
              }}
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
            <span className="mb-1 block font-medium text-surface-foreground">Issue date</span>
            <input
              type="date"
              value={issueDate}
              onChange={(event) => setIssueDate(event.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            />
          </label>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Amounts</span>
            <select
              value={amountMode}
              onChange={(event) => setAmountMode(event.target.value as 'common' | 'perLearner')}
              className="w-full rounded-md border border-surface-border px-3 py-2"
            >
              <option value="common">One amount for every learner</option>
              <option value="perLearner">An amount per learner</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-surface-foreground">Common amount</span>
            <Input
              value={commonAmount}
              onChange={(event) => setCommonAmount(event.target.value)}
              placeholder="0.00"
              disabled={amountMode !== 'common'}
              inputMode="decimal"
            />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block font-medium text-surface-foreground">Description</span>
            <Input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={kind === 'fine' ? 'e.g. Library fine' : 'e.g. Board scholarship'}
            />
          </label>
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-surface-muted-fg">
          <span>
            {targets.length} learner(s), {formatMoneyMinor(previewTotal)} to post
          </span>
          <Button size="sm" variant="secondary" onClick={() => setSelected(visible)}>
            Select all shown
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setSelected([])}>
            Clear selection
          </Button>
        </div>

        <DataGrid
          columns={columns}
          data={[...visible]}
          sortable
          filterable
          selectable
          onSelectionChange={(rows) => setSelected(rows as FinanceLearnerRow[])}
          emptyState={{
            title: 'No learners match the filters',
            description: 'Choose a class or change the search.',
          }}
        />
      </Card>
    </div>
  );
};

const BulkFeeAdjustmentsPage: React.FC = () => (
  <CanonicalRepositoryProvider>
    <div className="space-y-3">
      <BulkFeeAdjustmentsPageContent />
    </div>
  </CanonicalRepositoryProvider>
);

export default BulkFeeAdjustmentsPage;
