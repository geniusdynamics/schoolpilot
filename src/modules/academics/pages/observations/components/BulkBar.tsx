// ABOUTME: The bulk control: one level for a whole group with a stated overwrite policy, plus the
// ABOUTME: visible count of learners whose level now differs from the bulk entry.

import React from 'react';
import { useTranslation } from 'react-i18next';

import Button from '@/components/ui/Button';

import type { ObservationLevel } from '../data/pack';
import type { CaptureTarget } from '../data/model';

export type BulkPolicy = 'skip' | 'replace';

export interface BulkBarProps {
  readonly targets: readonly CaptureTarget[];
  readonly targetKey: string;
  readonly level: string;
  readonly policy: BulkPolicy;
  readonly levels: readonly ObservationLevel[];
  readonly existingCount: number;
  readonly exceptionCount: number;
  readonly confirming: boolean;
  readonly message: string;
  readonly disabled: boolean;
  readonly onTargetChange: (targetKey: string) => void;
  readonly onLevelChange: (level: string) => void;
  readonly onPolicyChange: (policy: BulkPolicy) => void;
  readonly onApply: () => void;
  readonly onConfirmReplace: () => void;
  readonly onCancelReplace: () => void;
}

const fieldClass =
  'w-full min-h-[44px] rounded-md border border-surface-border bg-surface px-3 py-2 text-sm text-surface-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';

export const BulkBar: React.FC<BulkBarProps> = ({
  targets,
  targetKey,
  level,
  policy,
  levels,
  existingCount,
  exceptionCount,
  confirming,
  message,
  disabled,
  onTargetChange,
  onLevelChange,
  onPolicyChange,
  onApply,
  onConfirmReplace,
  onCancelReplace,
}) => {
  const { t } = useTranslation('academics');

  return (
    <section
      aria-labelledby="observations-bulk-heading"
      className="rounded-lg border border-surface-border bg-surface-accent p-4"
    >
      <h2 id="observations-bulk-heading" className="text-base font-semibold text-surface-foreground">
        {t('observations.bulkTitle', 'Whole group at one level')}
      </h2>
      <p className="mt-1 text-sm text-surface-muted-fg">
        {policy === 'skip'
          ? t(
              'observations.bulkSkipHelp',
              'Learners who already have an observation for this outcome keep it; the bulk level is not written over it.'
            )
          : t(
              'observations.bulkReplaceHelp',
              'Learners who already have an observation are asked about once, then replaced.'
            )}
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="bulk-target" className="block text-sm font-medium text-surface-foreground">
            {t('observations.bulkTarget', 'Outcome')}
          </label>
          <select
            id="bulk-target"
            className={fieldClass}
            value={targetKey}
            onChange={(event) => onTargetChange(event.target.value)}
            disabled={disabled || targets.length === 0}
          >
            {targets.length === 0 ? <option value="">—</option> : null}
            {targets.map((target) => (
              <option key={target.key} value={target.key}>
                {target.code} — {target.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bulk-level" className="block text-sm font-medium text-surface-foreground">
            {t('observations.bulkLevel', 'Level')}
          </label>
          <select
            id="bulk-level"
            className={fieldClass}
            value={level}
            onChange={(event) => onLevelChange(event.target.value)}
            disabled={disabled}
          >
            <option value="">{t('observations.chooseLevel', 'Choose a level')}</option>
            {levels.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.code} — {entry.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bulk-policy" className="block text-sm font-medium text-surface-foreground">
            {t('observations.bulkExisting', 'If an observation exists')}
          </label>
          <select
            id="bulk-policy"
            className={fieldClass}
            value={policy}
            onChange={(event) => onPolicyChange(event.target.value === 'replace' ? 'replace' : 'skip')}
            disabled={disabled}
          >
            <option value="skip">{t('observations.bulkSkip', 'Skip it')}</option>
            <option value="replace">{t('observations.bulkReplace', 'Replace it (asks first)')}</option>
          </select>
        </div>
        <div className="flex items-end">
          <Button
            size="lg"
            fullWidth
            onClick={onApply}
            disabled={disabled || targetKey === '' || level === ''}
          >
            {t('observations.applyBulk', 'Apply to the group')}
          </Button>
        </div>
      </div>

      {confirming ? (
        <div role="alert" className="mt-3 rounded-md border border-yellow-400 bg-yellow-50 p-3 dark:bg-yellow-950/40">
          <p className="text-sm text-surface-foreground">
            {t('observations.replaceConfirm', 'Replace {{count}} existing observation(s) or pending level(s) with this bulk level?', {
              count: existingCount,
            })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="lg" variant="warning" onClick={onConfirmReplace}>
              {t('observations.replaceYes', 'Replace them')}
            </Button>
            <Button size="lg" variant="secondary" onClick={onCancelReplace}>
              {t('observations.cancel', 'Cancel')}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <span data-testid="bulk-existing" className="text-surface-muted-fg">
          {t('observations.bulkExistingCount', '{{count}} learner(s) already have an observation or a pending level for this outcome', {
            count: existingCount,
          })}
        </span>
        <span
          data-testid="bulk-exceptions"
          className={
            exceptionCount > 0
              ? 'font-medium text-yellow-700 dark:text-yellow-300'
              : 'text-surface-muted-fg'
          }
        >
          {exceptionCount > 0
            ? t('observations.bulkExceptionCount', '{{count}} exception(s) for this outcome', { count: exceptionCount })
            : t('observations.bulkNoExceptions', 'No exceptions for this outcome')}
        </span>
      </div>
      {message ? (
        <p role="status" className="mt-2 text-sm text-surface-foreground">
          {message}
        </p>
      ) : null}
    </section>
  );
};

export default BulkBar;
