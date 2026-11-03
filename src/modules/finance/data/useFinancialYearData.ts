// ABOUTME: The canonical financial years the finance screens read and write: rows of the
// ABOUTME: financial_year entity, with non-overlapping ranges and exactly one current year.
// ABOUTME: Closing a year here changes this setting only; the ledger's periods close in reports.

import { useCallback, useMemo } from 'react';

import { useEntityQuery } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';
import { asId } from '@/domain/ids';
import type { CALENDAR_YEAR_STATUSES } from '@/domain/schema';

import { useFinanceRepository } from './canonicalFinance';

/** The statuses a canonical financial year can hold. */
export type FinancialYearStatusValue = (typeof CALENDAR_YEAR_STATUSES)[number];

/** A stored financial year. */
export type FinancialYearRow = RepositoryRow<'financial_year'>;

/** The fields a person edits; the status follows from create, close and reopen. */
export interface FinancialYearInput {
  name: string;
  start_date: string;
  end_date: string;
}

export type FinancialYearRuleCode =
  | 'name-required'
  | 'dates-required'
  | 'end-before-start'
  | 'overlap'
  | 'duplicate-name'
  | 'not-found'
  | 'last-open-year';

export interface FinancialYearRuleViolation {
  code: FinancialYearRuleCode;
  message: string;
}

/** Thrown when a write would break a financial-year rule. */
export class FinancialYearRuleError extends Error {
  readonly violations: FinancialYearRuleViolation[];

  constructor(violations: FinancialYearRuleViolation[]) {
    super(violations.map((violation) => violation.message).join(' '));
    this.name = 'FinancialYearRuleError';
    this.violations = violations;
  }
}

/** The part of a year the rules read, so the rules serve the entity and old rows alike. */
interface FinancialYearLike {
  readonly id: string;
  readonly name: string;
  readonly start_date: string;
  readonly end_date: string;
}

const isoDay = (value: string | undefined | null): string => (value ? String(value).slice(0, 10) : '');

const toIsoDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * Checks a financial year against the rules: name and dates present, end after start,
 * unique name, and no overlap (inclusive of boundary days) with any other year.
 */
export function validateFinancialYear(
  input: FinancialYearInput,
  existing: readonly FinancialYearLike[],
  editingId?: string
): FinancialYearRuleViolation[] {
  const violations: FinancialYearRuleViolation[] = [];
  const name = (input.name || '').trim();
  const start = isoDay(input.start_date);
  const end = isoDay(input.end_date);
  const others = existing.filter((year) => String(year.id) !== String(editingId ?? ''));

  if (!name) violations.push({ code: 'name-required', message: 'Financial year name is required.' });
  if (!start || !end) {
    violations.push({ code: 'dates-required', message: 'Start and end dates are required.' });
    return violations;
  }
  if (end <= start) {
    violations.push({ code: 'end-before-start', message: 'End date must be after the start date.' });
  }

  if (name) {
    const duplicate = others.find(
      (year) => (year.name || '').trim().toLowerCase() === name.toLowerCase()
    );
    if (duplicate) {
      violations.push({
        code: 'duplicate-name',
        message: `A financial year named ${duplicate.name} already exists.`,
      });
    }
  }

  const overlapping = others.find(
    (year) => start <= isoDay(year.end_date) && isoDay(year.start_date) <= end
  );
  if (overlapping) {
    violations.push({
      code: 'overlap',
      message: `This date range overlaps ${overlapping.name} (${isoDay(overlapping.start_date)} to ${isoDay(overlapping.end_date)}).`,
    });
  }
  return violations;
}

/** The financial year created for a new school: the calendar year containing `today`. */
export function buildDefaultFinancialYear(today: Date = new Date()): FinancialYearInput {
  const year = today.getFullYear();
  return { name: `FY ${year}`, start_date: `${year}-01-01`, end_date: `${year}-12-31` };
}

/** The year that follows the latest existing one, used to pre-fill the create form. */
export function suggestNextFinancialYear(
  existing: readonly Pick<FinancialYearLike, 'end_date'>[],
  today: Date = new Date()
): FinancialYearInput {
  const latestEnd = existing
    .map((year) => isoDay(year.end_date))
    .filter(Boolean)
    .sort()
    .pop();
  if (!latestEnd) return buildDefaultFinancialYear(today);

  const start = new Date(`${latestEnd}T00:00:00`);
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setFullYear(end.getFullYear() + 1);
  end.setDate(end.getDate() - 1);
  const name =
    start.getFullYear() === end.getFullYear()
      ? `FY ${start.getFullYear()}`
      : `FY ${start.getFullYear()}/${String(end.getFullYear()).slice(-2)}`;
  return { name, start_date: toIsoDay(start), end_date: toIsoDay(end) };
}

/** The single current year among the rows, if the school has set one. */
export function currentFinancialYearOf<T extends { readonly status: string }>(
  years: readonly T[]
): T | undefined {
  return years.find((year) => year.status === 'current');
}

/**
 * The canonical financial years of the school.
 *
 * A year is `current` while it is the school's current year, `planned` when it is open but
 * not current, and `closed` once closed. The write methods keep at most one current year:
 * the first year is current, a later year is planned, closing the current one promotes the
 * earliest remaining open year, and reopening a year is current only when none is.
 */
export function useFinancialYearData() {
  const repository = useFinanceRepository();
  const institutions = useEntityQuery(repository, 'institution');
  const years = useEntityQuery(repository, 'financial_year');
  const refetchInstitutions = institutions.refetch;
  const refetchYears = years.refetch;

  const institutionId = institutions.data?.items[0]?.id ?? null;

  const financialYears = useMemo(() => {
    const rows = years.data?.items ?? [];
    return (institutionId === null ? [] : rows.filter((row) => row.institution_id === institutionId))
      .slice()
      .sort((left, right) => right.start_date.localeCompare(left.start_date));
  }, [years.data, institutionId]);

  const currentFinancialYear = useMemo(
    () => currentFinancialYearOf(financialYears),
    [financialYears]
  );

  const loading = institutions.status === 'loading' || years.status === 'loading';
  const error = institutions.error ?? years.error ?? null;

  const refresh = useCallback(() => {
    void refetchInstitutions();
    void refetchYears();
  }, [refetchInstitutions, refetchYears]);

  const findYear = useCallback(
    (id: string) => {
      const found = financialYears.find((year) => String(year.id) === String(id));
      if (!found) {
        throw new FinancialYearRuleError([{ code: 'not-found', message: 'Financial year not found.' }]);
      }
      return found;
    },
    [financialYears]
  );

  const create = useCallback(
    async (input: FinancialYearInput): Promise<FinancialYearRow> => {
      if (institutionId === null) {
        throw new Error(
          'The canonical database holds no institution row, so a financial year cannot be saved yet.'
        );
      }
      const violations = validateFinancialYear(input, financialYears);
      if (violations.length > 0) throw new FinancialYearRuleError(violations);

      const status: FinancialYearStatusValue = financialYears.some(
        (year) => year.status === 'current'
      )
        ? 'planned'
        : 'current';

      return repository.create('financial_year', {
        institution_id: asId<'institution'>(institutionId),
        name: input.name.trim(),
        start_date: isoDay(input.start_date),
        end_date: isoDay(input.end_date),
        status,
      });
    },
    [repository, institutionId, financialYears]
  );

  const update = useCallback(
    async (id: string, patch: Partial<FinancialYearInput>): Promise<FinancialYearRow> => {
      const current = findYear(id);
      const next: FinancialYearInput = {
        name: patch.name ?? current.name,
        start_date: patch.start_date ?? current.start_date,
        end_date: patch.end_date ?? current.end_date,
      };
      const violations = validateFinancialYear(next, financialYears, id);
      if (violations.length > 0) throw new FinancialYearRuleError(violations);

      return repository.update(
        'financial_year',
        asId<'financial_year'>(id),
        {
          name: next.name.trim(),
          start_date: isoDay(next.start_date),
          end_date: isoDay(next.end_date),
        },
        { expectedVersion: current.rowVersion }
      );
    },
    [repository, financialYears, findYear]
  );

  /** A year can be closed only while another open year remains to carry the school forward. */
  const canClose = useCallback(
    (id: string) => {
      const target = financialYears.find((year) => String(year.id) === String(id));
      if (!target || target.status === 'closed') return false;
      return financialYears.some(
        (year) => String(year.id) !== String(id) && year.status !== 'closed'
      );
    },
    [financialYears]
  );

  const setStatus = useCallback(
    (year: FinancialYearRow, status: FinancialYearStatusValue): Promise<FinancialYearRow> =>
      repository.update(
        'financial_year',
        asId<'financial_year'>(year.id),
        { status },
        { expectedVersion: year.rowVersion }
      ),
    [repository]
  );

  const close = useCallback(
    async (id: string): Promise<FinancialYearRow> => {
      const target = findYear(id);
      if (target.status === 'closed') return target;
      if (!canClose(id)) {
        throw new FinancialYearRuleError([
          {
            code: 'last-open-year',
            message:
              'This is the only open financial year. Create or reopen the next financial year before closing it.',
          },
        ]);
      }

      const successor = financialYears
        .filter((year) => String(year.id) !== String(id) && year.status !== 'closed')
        .slice()
        .sort((left, right) => left.start_date.localeCompare(right.start_date))[0];

      const closed = await setStatus(target, 'closed');
      if (target.status === 'current' && successor) {
        await setStatus(successor, 'current');
      }
      return closed;
    },
    [financialYears, findYear, canClose, setStatus]
  );

  const reopen = useCallback(
    async (id: string): Promise<FinancialYearRow> => {
      const target = findYear(id);
      if (target.status !== 'closed') return target;
      const hasCurrent = financialYears.some((year) => year.status === 'current');
      return setStatus(target, hasCurrent ? 'planned' : 'current');
    },
    [financialYears, findYear, setStatus]
  );

  return {
    repository,
    institutionId,
    financialYears,
    currentFinancialYear,
    loading,
    error,
    refresh,
    create,
    update,
    close,
    reopen,
    canClose,
  };
}
