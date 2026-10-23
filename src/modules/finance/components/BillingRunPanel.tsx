// ABOUTME: The billing-run panel both fee-structure entry points use, extended to the v2 run: pick a
// ABOUTME: period and optional filters, add one-off charges and opening balances, preview the run
// ABOUTME: with the reason each learner is billed and each skip, then post it.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { MoneyField } from '@/components/ui/forms/MoneyField';
import { ArrowPathIcon, CheckCircleIcon, DocumentAddIcon, ExclamationCircleIcon } from '@/components/ui/icons';
import type { Id } from '@/domain/ids';
import { fromMinor, isCurrencyCode, type Money } from '@/domain/money';
import type { Money as SchemaMoney } from '@/domain/schema/common';
import {
  BillingRunService,
  type AdHocChargeInput,
  type AdHocChargeKind,
  type BillingOpeningSide,
  type BillingRunOutcome,
  type BillingRunPreview,
  type BillingSkip,
  type BillingSkipCode,
  type OpeningBalanceInput,
} from '@/domain/finance/billing';

import { FINANCE_CURRENCY, formatMoney, useCanonicalFinance, useFinanceRepository } from '../data/canonicalFinance';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** The label an exception panel reads for a skip. */
const SKIP_LABELS: Readonly<Record<BillingSkipCode, string>> = {
  no_enrolment: 'No enrolment for the year',
  not_enrolled_in_period: 'Not enrolled during the period',
  no_schedule: 'No schedule prices this learner',
  cell_unresolved: 'The fee matrix cannot resolve their cell',
  already_billed: 'Already billed',
  zero_total: 'Nothing is due',
  out_of_scope: 'Outside this run\u2019s cohort',
};

const SKIP_ORDER: readonly BillingSkipCode[] = [
  'cell_unresolved',
  'no_schedule',
  'no_enrolment',
  'not_enrolled_in_period',
  'already_billed',
  'zero_total',
  'out_of_scope',
];

/** The panel's boundary from the form's money to the money module's: an unknown currency is refused. */
function toBillingMoney(value: SchemaMoney | undefined | null): Money | null {
  if (!value) return null;
  return isCurrencyCode(value.currency) ? fromMinor(value.amount_minor, value.currency) : null;
}

export interface BillingRunPanelProps {
  /** A shorter description for the fee-structures tab. */
  readonly compact?: boolean;
}

export const BillingRunPanel: React.FC<BillingRunPanelProps> = ({ compact = false }) => {
  const finance = useCanonicalFinance();
  const repository = useFinanceRepository();

  const [periodId, setPeriodId] = useState<Id<'academic_period'> | null>(null);
  const [scheduleId, setScheduleId] = useState<Id<'fee_schedule'> | null>(null);
  const [levelId, setLevelId] = useState<Id<'level'> | null>(null);

  const [charges, setCharges] = useState<readonly AdHocChargeInput[]>([]);
  const [chargeLearner, setChargeLearner] = useState<Id<'learner'> | null>(null);
  const [chargeItem, setChargeItem] = useState<Id<'fee_item'> | null>(null);
  const [chargeDescription, setChargeDescription] = useState('');
  const [chargeAmount, setChargeAmount] = useState<Money | null>(null);
  const [chargeKind, setChargeKind] = useState<AdHocChargeKind>('fine');

  const [openings, setOpenings] = useState<readonly OpeningBalanceInput[]>([]);
  const [openingLearner, setOpeningLearner] = useState<Id<'learner'> | null>(null);
  const [openingAmount, setOpeningAmount] = useState<Money | null>(null);
  const [openingSide, setOpeningSide] = useState<BillingOpeningSide>('debit');
  const [openingDate, setOpeningDate] = useState('');

  const [preview, setPreview] = useState<BillingRunPreview | null>(null);
  const [outcome, setOutcome] = useState<BillingRunOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const periodSchedules = useMemo(
    () =>
      finance.scheduleRows.filter(
        (schedule) =>
          !periodId || schedule.periodIds.length === 0 || schedule.periodIds.includes(periodId)
      ),
    [finance.scheduleRows, periodId]
  );

  const clearResult = () => {
    setPreview(null);
    setOutcome(null);
  };

  const addCharge = () => {
    if (!chargeLearner || !chargeItem || !chargeAmount || chargeDescription.trim() === '') return;
    const charge: AdHocChargeInput = {
      learnerId: chargeLearner,
      feeItemId: chargeItem,
      description: chargeDescription.trim(),
      amount: chargeAmount,
      kind: chargeKind,
    };
    setCharges((current) => [...current, charge]);
    setChargeDescription('');
    setChargeAmount(null);
    clearResult();
  };

  const addOpening = () => {
    if (!openingLearner || !openingAmount || openingDate === '') return;
    const opening: OpeningBalanceInput = {
      learnerId: openingLearner,
      amount: openingAmount,
      side: openingSide,
      asOfDate: openingDate,
    };
    setOpenings((current) => [...current, opening]);
    setOpeningAmount(null);
    setOpeningDate('');
    clearResult();
  };

  const run = async (mode: 'preview' | 'post') => {
    if (!periodId) return;
    setRunning(true);
    setError(null);
    setPreview(null);
    setOutcome(null);
    try {
      const service = new BillingRunService({ store: repository });
      const request = {
        scope: {
          periodId,
          ...(scheduleId ? { scheduleIds: [scheduleId] } : {}),
          ...(levelId ? { levelIds: [levelId] } : {}),
        },
        ...(charges.length > 0 ? { adhocCharges: charges } : {}),
        ...(openings.length > 0 ? { openingBalances: openings } : {}),
      };
      if (mode === 'preview') setPreview(await service.preview(request));
      else setOutcome(await service.post(request));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setRunning(false);
    }
  };

  const shown = outcome?.preview ?? preview;
  const skipsByCode = useMemo(() => {
    const groups = new Map<BillingSkipCode, BillingSkip[]>();
    for (const skip of shown?.skips ?? []) {
      const list = groups.get(skip.code) ?? [];
      list.push(skip);
      groups.set(skip.code, list);
    }
    return groups;
  }, [shown]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-muted-fg">
        {compact
          ? 'Bill the fee schedules of a period. Preview first: every learner is shown with the reason they are billed, or the reason they are not.'
          : 'Choose a period, preview the billing run with the reason each learner is billed, then post it. The run prices from the schedule version in force, posts one transaction, and a re-run of the same run bills nothing twice.'}
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <span className="mb-1.5 block text-sm font-medium text-surface-foreground">
            Academic period
          </span>
          <EntityPicker
            value={periodId}
            onChange={(id) => {
              setPeriodId(id);
              setScheduleId(null);
              clearResult();
            }}
            lookup={finance.lookups.period}
            placeholder="Select a period"
            aria-label="Academic period"
            data-testid="billing-period-picker"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-surface-foreground">
            Fee schedule
          </span>
          <EntityPicker
            value={scheduleId}
            onChange={(id) => {
              setScheduleId(id);
              clearResult();
            }}
            lookup={finance.lookups.feeSchedule}
            filter={(row) => periodSchedules.some((schedule) => schedule.id === row.id)}
            placeholder="Every version in force"
            aria-label="Fee schedule"
            disabled={!periodId}
            data-testid="billing-schedule-picker"
          />
        </div>
        <div>
          <span className="mb-1.5 block text-sm font-medium text-surface-foreground">Level</span>
          <EntityPicker
            value={levelId}
            onChange={(id) => {
              setLevelId(id);
              clearResult();
            }}
            lookup={finance.lookups.level}
            placeholder="All levels"
            aria-label="Level"
            data-testid="billing-level-picker"
          />
        </div>
      </div>

      <details className="rounded-md border border-surface-border p-3">
        <summary className="cursor-pointer text-sm font-medium">
          One-off charges and opening balances ({charges.length} charge
          {charges.length === 1 ? '' : 's'}, {openings.length} opening balance
          {openings.length === 1 ? '' : 's'})
        </summary>
        <div className="mt-3 space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <EntityPicker
              value={chargeLearner}
              onChange={setChargeLearner}
              lookup={finance.lookups.learner}
              placeholder="Learner"
              aria-label="Charge learner"
              data-testid="charge-learner-picker"
            />
            <EntityPicker
              value={chargeItem}
              onChange={setChargeItem}
              lookup={finance.lookups.feeItem}
              placeholder="Vote head"
              aria-label="Charge vote head"
              data-testid="charge-item-picker"
            />
            <input
              className="rounded-md border border-surface-border bg-surface px-3 py-2 text-sm"
              value={chargeDescription}
              onChange={(event) => setChargeDescription(event.target.value)}
              placeholder="Damaged textbook"
              aria-label="Charge description"
            />
            <MoneyField
              value={chargeAmount}
              onChange={(value) => setChargeAmount(toBillingMoney(value))}
              label="Amount"
              currency={FINANCE_CURRENCY}
            />
            <div className="flex items-end gap-2">
              {(['fine', 'adjustment', 'other'] as const).map((kind) => (
                <Button
                  key={kind}
                  size="sm"
                  variant={chargeKind === kind ? 'primary' : 'secondary'}
                  onClick={() => setChargeKind(kind)}
                  aria-pressed={chargeKind === kind}
                >
                  {kind}
                </Button>
              ))}
              <Button size="sm" variant="secondary" onClick={addCharge} disabled={!chargeLearner || !chargeItem || !chargeAmount}>
                Add
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <EntityPicker
              value={openingLearner}
              onChange={setOpeningLearner}
              lookup={finance.lookups.learner}
              placeholder="Learner"
              aria-label="Opening balance learner"
              data-testid="opening-learner-picker"
            />
            <MoneyField
              value={openingAmount}
              onChange={(value) => setOpeningAmount(toBillingMoney(value))}
              label="Opening balance"
              currency={FINANCE_CURRENCY}
            />
            <div className="flex items-end gap-2">
              <Button
                size="sm"
                variant={openingSide === 'debit' ? 'primary' : 'secondary'}
                onClick={() => setOpeningSide('debit')}
                aria-pressed={openingSide === 'debit'}
              >
                Owes
              </Button>
              <Button
                size="sm"
                variant={openingSide === 'credit' ? 'primary' : 'secondary'}
                onClick={() => setOpeningSide('credit')}
                aria-pressed={openingSide === 'credit'}
              >
                In credit
              </Button>
            </div>
            <input
              className="rounded-md border border-surface-border bg-surface px-3 py-2 text-sm"
              type="date"
              value={openingDate}
              onChange={(event) => setOpeningDate(event.target.value)}
              aria-label="Opening balance as at"
            />
            <div className="flex items-end">
              <Button size="sm" variant="secondary" onClick={addOpening} disabled={!openingLearner || !openingAmount || openingDate === ''}>
                Add
              </Button>
            </div>
          </div>
        </div>
      </details>

      <div className="flex gap-2">
        <Button variant="secondary" onClick={() => void run('preview')} disabled={running || !periodId}>
          Preview
        </Button>
        <Button
          onClick={() => void run('post')}
          disabled={running || !periodId}
          leftIcon={running ? undefined : <DocumentAddIcon className="w-5 h-5" />}
        >
          {running ? 'Posting…' : 'Post the run'}
        </Button>
      </div>

      {error ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <ExclamationCircleIcon className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      ) : null}

      {shown ? (
        <div
          className={`space-y-3 rounded-md border p-4 ${
            preview && !outcome ? 'border-primary-200 bg-primary-50' : 'border-green-200 bg-green-50'
          }`}
        >
          <div className="flex items-center gap-2">
            {outcome ? <CheckCircleIcon className="h-5 w-5 text-green-600" /> : null}
            <span className="font-medium">
              {outcome
                ? outcome.replayed
                  ? 'This run was already posted — nothing was written'
                  : 'Billing run posted'
                : 'Preview — nothing has been posted'}
            </span>
          </div>
          <p className="text-sm">
            {outcome ? (outcome.replayed ? 'Would have created' : 'Created') : 'Would create'}{' '}
            {shown.totals.newInvoices + shown.totals.supplementaryInvoices} invoice
            {shown.totals.newInvoices + shown.totals.supplementaryInvoices === 1 ? '' : 's'} for{' '}
            {formatMoney(shown.totals.amount)}: {shown.totals.learnersBilled} of{' '}
            {shown.totals.learnersInScope} learners billed, {shown.totals.learnersSkipped} skipped.
          </p>
          <p className="font-mono text-xs text-surface-muted-fg" data-testid="billing-run-key">
            run {shown.key}
          </p>
          <p className="text-xs text-surface-muted-fg">
            Priced from{' '}
            {shown.schedulePins.length === 0
              ? 'no schedule version'
              : shown.schedulePins
                  .map((pin) => `${pin.name} v${pin.version} (${pin.status})`)
                  .join(', ')}
          </p>
          {shown.notices.map((notice) => (
            <p key={notice} className="text-xs text-amber-700">
              {notice}
            </p>
          ))}

          {shown.lines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-1">Learner</th>
                    <th className="py-1">Invoice</th>
                    <th className="py-1 text-right">Amount</th>
                    <th className="py-1">Why</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.lines.map((line) => (
                    <tr key={line.learnerId} className="border-t border-surface-border align-top">
                      <td className="py-1">
                        {line.learnerName}
                        <span className="ml-1 font-mono text-xs text-surface-muted-fg">
                          {line.admissionNumber}
                        </span>
                      </td>
                      <td className="py-1 font-mono">
                        {line.existingInvoiceNumber
                          ? `${line.existingInvoiceNumber} + supplementary`
                          : 'new'}
                      </td>
                      <td className="py-1 text-right font-mono">{formatMoney(line.amount)}</td>
                      <td className="py-1">
                        <ul className="list-disc pl-4 text-xs">
                          {line.items.map((item) => (
                            <li key={`${item.source}-${item.description}`}>
                              {item.reason} — {formatMoney(item.amount)}
                              {item.listAmount
                                ? ` (was ${formatMoney(item.listAmount)}, prorated)`
                                : ''}
                            </li>
                          ))}
                          {line.reasons.map((reason) => (
                            <li key={reason} className="text-surface-muted-fg">
                              {reason}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {shown.skips.length > 0 ? (
            <div className="rounded-md border border-surface-border p-3" data-testid="billing-exceptions">
              <h3 className="mb-2 text-sm font-medium">Exceptions</h3>
              <ul className="space-y-2 text-xs">
                {SKIP_ORDER.filter((code) => skipsByCode.has(code)).map((code) => (
                  <li key={code}>
                    <span className="font-medium">
                      {SKIP_LABELS[code]} ({skipsByCode.get(code)?.length ?? 0})
                    </span>
                    <ul className="list-disc pl-4 text-surface-muted-fg">
                      {(skipsByCode.get(code) ?? []).map((skip) => (
                        <li key={skip.learnerId}>
                          {skip.learnerName}: {skip.detail}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={clearResult}
              leftIcon={<ArrowPathIcon className="w-4 h-4" />}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}

      {outcome ? (
        <p className="text-xs text-surface-muted-fg" data-testid="billing-run-outcome">
          {outcome.invoicesCreated} invoice{outcome.invoicesCreated === 1 ? '' : 's'} written,{' '}
          {outcome.ledgerEntries} journal entr{outcome.ledgerEntries === 1 ? 'y' : 'ies'} posted,{' '}
          {formatMoney(outcome.amount)} added to the learners&rsquo; balances
          {outcome.original ? ` (run ${outcome.original.runId})` : ''}.
        </p>
      ) : null}
    </div>
  );
};

export default BillingRunPanel;
