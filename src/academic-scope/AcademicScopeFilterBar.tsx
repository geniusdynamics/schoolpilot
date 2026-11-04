// ABOUTME: The shared filter bar every learner-facing report and grid renders: Year, Class (grade),
// ABOUTME: Stream (year-scoped class group) and — where the screen wants it — Period, in that order.

import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import Select from '@/components/ui/Select';

import type { AcademicScope, PeriodMode } from './useAcademicScope';

export interface AcademicScopeFilterBarProps {
  readonly scope: AcademicScope;
  /** Whether the Period control is hidden, optional ("All periods") or required. */
  readonly period?: PeriodMode;
  /** Trailing controls a screen adds after the shared ones (vote head, aging, generate…). */
  readonly children?: ReactNode;
  readonly className?: string;
}

/**
 * One row of the same controls everywhere. The options come from the school's own records via the
 * scope hook — not from the rows a report happens to return — so an empty report cannot shrink the
 * filters.
 */
export function AcademicScopeFilterBar({
  scope,
  period = 'none',
  children,
  className = '',
}: AcademicScopeFilterBarProps) {
  const { t } = useTranslation('common');
  const { scope: resolved } = scope;
  const disabled = scope.status === 'loading';

  const periodOptions =
    period === 'none'
      ? []
      : [
          ...(period === 'optional' ? [{ value: '', label: t('scope.allPeriods', 'All periods') }] : []),
          ...resolved.periodsOfYear.map((row) => ({ value: row.id, label: row.name })),
        ];

  return (
    <div
      className={`grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-5 ${className}`}
      data-testid="academic-scope-filter-bar"
      data-scope-year={resolved.effective.yearId}
      data-scope-level={resolved.effective.levelId}
      data-scope-stream={resolved.effective.classGroupId}
      data-scope-period={resolved.effective.periodId}
    >
      <Select
        label={t('scope.year', 'Year')}
        aria-label={t('scope.year', 'Year')}
        value={resolved.effective.yearId}
        onValueChange={(value) => scope.setYear(Array.isArray(value) ? null : value || null)}
        disabled={disabled || resolved.years.length === 0}
        options={resolved.years.map((year) => ({ value: year.id, label: year.name }))}
        data-testid="scope-year"
      />
      <Select
        label={t('scope.class', 'Class')}
        aria-label={t('scope.class', 'Class')}
        value={resolved.effective.levelId}
        onValueChange={(value) => scope.setLevel(Array.isArray(value) ? '' : value || '')}
        disabled={disabled}
        options={[
          { value: '', label: t('scope.allClasses', 'All classes') },
          ...resolved.levelsOfYear.map((level) => ({ value: level.id, label: level.label })),
        ]}
        data-testid="scope-level"
      />
      <Select
        label={t('scope.stream', 'Stream')}
        aria-label={t('scope.stream', 'Stream')}
        value={resolved.effective.classGroupId}
        onValueChange={(value) => scope.setStream(Array.isArray(value) ? '' : value || '')}
        disabled={disabled || resolved.streams.length === 0}
        options={[
          { value: '', label: t('scope.allStreams', 'All streams') },
          ...resolved.streams.map((stream) => ({ value: stream.id, label: stream.label })),
        ]}
        data-testid="scope-stream"
      />
      {period === 'none' ? null : (
        <Select
          label={t('scope.period', 'Period')}
          aria-label={t('scope.period', 'Period')}
          value={resolved.effective.periodId}
          onValueChange={(value) => scope.setPeriod(Array.isArray(value) ? '' : value || '')}
          disabled={disabled || periodOptions.length === 0}
          options={periodOptions}
          data-testid="scope-period"
        />
      )}
      {children}
    </div>
  );
}

export default AcademicScopeFilterBar;
