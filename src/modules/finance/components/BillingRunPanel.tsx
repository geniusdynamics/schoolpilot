// ABOUTME: The billing-run panel both fee-structure entry points use: pick a period and optional
// ABOUTME: filters, preview the run, then post one invoice per learner through the canonical repository.

import React, { useMemo, useState } from 'react';

import Button from '@/components/ui/Button';
import { EntityPicker } from '@/components/ui/EntityPicker';
import { ArrowPathIcon, CheckCircleIcon, DocumentAddIcon, ExclamationCircleIcon } from '@/components/ui/icons';

import { formatMoney, useCanonicalFinance, useFinanceRepository } from '../data/canonicalFinance';
import { generateInvoices, type BillingRunResult } from '../services/canonicalFinanceService';
import type { Id } from '@/domain/ids';

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

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
  const [result, setResult] = useState<BillingRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const periodSchedules = useMemo(
    () =>
      finance.scheduleRows.filter(
        (schedule) =>
          !periodId ||
          schedule.periodIds.length === 0 ||
          schedule.periodIds.includes(periodId)
      ),
    [finance.scheduleRows, periodId]
  );

  const run = async (dryRun: boolean) => {
    if (!periodId) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const outcome = await generateInvoices(repository, {
        academicPeriodId: periodId,
        dryRun,
        ...(scheduleId ? { scheduleIds: [scheduleId] } : {}),
        ...(levelId ? { levelIds: [levelId] } : {}),
      });
      setResult(outcome);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-muted-fg">
        {compact
          ? 'Bill the published fee schedules of a period. Preview first; the run posts one invoice per learner.'
          : 'Choose a period, preview the billing run, then post it. Each learner receives one posted invoice per period; a learner who is already billed is reported, never edited.'}
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
              setResult(null);
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
              setResult(null);
            }}
            lookup={finance.lookups.feeSchedule}
            filter={(row) => periodSchedules.some((schedule) => schedule.id === row.id)}
            placeholder="All schedules of the period"
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
              setResult(null);
            }}
            lookup={finance.lookups.level}
            placeholder="All levels"
            aria-label="Level"
            data-testid="billing-level-picker"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => void run(true)}
          disabled={running || !periodId}
        >
          Preview
        </Button>
        <Button
          onClick={() => void run(false)}
          disabled={running || !periodId}
          leftIcon={running ? undefined : <DocumentAddIcon className="w-5 h-5" />}
        >
          {running ? 'Posting…' : 'Generate invoices'}
        </Button>
      </div>

      {error ? (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <ExclamationCircleIcon className="mr-2 inline h-4 w-4" />
          {error}
        </div>
      ) : null}

      {result ? (
        <div
          className={`space-y-3 rounded-md border p-4 ${
            result.dryRun ? 'border-primary-200 bg-primary-50' : 'border-green-200 bg-green-50'
          }`}
        >
          <div className="flex items-center gap-2">
            {!result.dryRun ? <CheckCircleIcon className="h-5 w-5 text-green-600" /> : null}
            <span className="font-medium">
              {result.dryRun ? 'Preview — nothing has been posted' : 'Billing run posted'}
            </span>
          </div>
          <p className="text-sm">
            {result.dryRun ? 'Would create' : 'Created'} {result.lines.length} invoice
            {result.lines.length === 1 ? '' : 's'} for {formatMoney(result.amount)}.{' '}
            {result.skippedLearnerIds.length} already billed,{' '}
            {result.unmatchedLearnerIds.length} without a matching schedule.
          </p>
          {result.lines.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-1">Learner</th>
                    <th className="py-1">Invoice</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map((line) => (
                    <tr key={line.learnerId} className="border-t border-surface-border">
                      <td className="py-1">{line.learnerName}</td>
                      <td className="py-1 font-mono">{line.invoiceNumber}</td>
                      <td className="py-1 text-right font-mono">{formatMoney(line.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setResult(null)}
              leftIcon={<ArrowPathIcon className="w-4 h-4" />}
            >
              Dismiss
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default BillingRunPanel;
