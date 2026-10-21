// ABOUTME: The status derivation of the plan: the dates decide what is current, and every
// ABOUTME: disagreement the legacy data carried is reported rather than repaired.

import type { AcademicPeriod, AcademicYear, FinancialYear } from '@/domain/schema';

import { LEGACY_SOURCES } from './001-legacy-calendar';
import type { PlanContext } from './001-calendar-plan';
import type { FlaggedPeriod } from './001-academic-plan';

/** True when the day falls inside the range. */
function covers(start: string, end: string, day: string): boolean {
  return start <= day && day <= end;
}

/** The status of a year or a period: current while it runs, planned before it, closed after. */
function statusOf(
  row: { start_date: string; end_date: string },
  referenceDate: string,
  isCurrent: boolean
): AcademicYear['status'] {
  if (isCurrent) return 'current';
  if (row.start_date > referenceDate) return 'planned';
  return 'closed';
}

/**
 * The status of every financial year.
 *
 * The legacy status is the input: an open year is the current one while the migration day
 * falls in it, a closed or archived year is closed. Where two open years both cover the
 * migration day, the later one stays current and the other is reported.
 */
export function planFinancialYearStatuses(
  financialYears: FinancialYear[],
  legacyIdByCanonicalId: ReadonlyMap<string, string>,
  context: PlanContext
): void {
  const currentYears = financialYears.filter((year) => year.status === 'current');
  if (currentYears.length <= 1) return;
  const winner = [...currentYears].sort((left, right) =>
    left.start_date < right.start_date ? 1 : -1
  )[0];
  for (const year of currentYears) {
    if (year.id === winner.id) continue;
    year.status = year.start_date > context.options.referenceDate ? 'planned' : 'closed';
    context.addIssue(
      'several_current_financial_years',
      'financial_year',
      LEGACY_SOURCES.financialYears,
      legacyIdByCanonicalId.get(year.id) ?? '',
      `the financial year "${year.name}" overlapped another current year, so it was not kept current`
    );
  }
}

/**
 * The status of every academic year.
 *
 * The dates decide: the year the migration day falls in is the current one, the years that have
 * not started are planned and the years that have ended are closed. The legacy school marked
 * the running term with `is_active`, and the plan checks that mark against the dates (see
 * {@link reportStaleActiveFlags}).
 */
export function planAcademicYearStatuses(
  academicYears: AcademicYear[],
  context: PlanContext
): void {
  const referenceDate = context.options.referenceDate;
  const yearsByCalendar = new Map<string, AcademicYear[]>();
  for (const year of academicYears) {
    const years = yearsByCalendar.get(year.calendar_id) ?? [];
    years.push(year);
    yearsByCalendar.set(year.calendar_id, years);
  }
  for (const [calendarId, years] of yearsByCalendar) {
    const covering = years.filter((year) => covers(year.start_date, year.end_date, referenceDate));
    let current = covering[0];
    if (covering.length > 1) {
      current = [...covering].sort((left, right) =>
        left.start_date < right.start_date ? 1 : -1
      )[0];
      context.addIssue(
        'several_current_academic_years',
        'academic_year',
        LEGACY_SOURCES.academicYears,
        legacyIdOf(context, current.id),
        `${covering.length} academic years in calendar ${calendarId} cover the migration day ${referenceDate}, so only "${current.name}" was kept current`
      );
    }
    for (const year of years) {
      year.status = statusOf(
        year,
        referenceDate,
        current !== undefined && year.id === current.id
      );
    }
  }
}

/**
 * The status of every academic period.
 *
 * A period of the current year that covers the migration day is the current one; at most one
 * period per year is current, so the canonical rule of one current term per year holds.
 */
export function planPeriodStatuses(
  academicPeriods: AcademicPeriod[],
  academicYears: readonly AcademicYear[],
  context: PlanContext
): void {
  const referenceDate = context.options.referenceDate;
  const currentYearIds = new Set(
    academicYears.filter((year) => year.status === 'current').map((year) => year.id)
  );
  const periodsByYear = new Map<string, AcademicPeriod[]>();
  for (const period of academicPeriods) {
    const periods = periodsByYear.get(period.academic_year_id) ?? [];
    periods.push(period);
    periodsByYear.set(period.academic_year_id, periods);
  }
  for (const periods of periodsByYear.values()) {
    const covering = periods.filter(
      (period) =>
        currentYearIds.has(period.academic_year_id) &&
        covers(period.start_date, period.end_date, referenceDate)
    );
    let current = covering[0];
    if (covering.length > 1) {
      current = [...covering].sort((left, right) => left.sequence - right.sequence)[0];
      context.addIssue(
        'several_current_academic_periods',
        'academic_period',
        LEGACY_SOURCES.schoolPeriods,
        legacyIdOf(context, current.id),
        `${covering.length} periods of the same academic year cover the migration day ${referenceDate}, so only "${current.name}" was kept current`
      );
    }
    for (const period of periods) {
      period.status = statusOf(
        period,
        referenceDate,
        current !== undefined && period.id === current.id
      );
    }
  }
}

/**
 * The legacy mark of the running term, read against the dates.
 *
 * The legacy school marked the term it was in with `is_active`. When that mark does not agree
 * with the dates - the term ended months ago, or the year lies outside the migration day - the
 * plan says so instead of deciding silently which of the two is right.
 */
export function reportStaleActiveFlags(
  flaggedPeriods: readonly FlaggedPeriod[],
  academicYears: readonly AcademicYear[],
  context: PlanContext
): void {
  const referenceDate = context.options.referenceDate;
  for (const flagged of flaggedPeriods) {
    if (covers(flagged.start_date, flagged.end_date, referenceDate)) continue;
    const year = academicYears.find((entry) => entry.id === flagged.academicYearId);
    const yearName = year?.name ?? 'the academic year';
    const yearOutside =
      year !== undefined && !covers(year.start_date, year.end_date, referenceDate);
    context.addIssue(
      'stale_active_flag',
      'academic_period',
      LEGACY_SOURCES.schoolPeriods,
      flagged.legacyId,
      `the legacy school marked the period "${flagged.name}" of "${yearName}" as the running one, but it does not cover the migration day ${referenceDate}${
        yearOutside ? ', and the academic year lies outside that day' : ''
      }`
    );
  }
}

/** The periods the legacy school left outside their academic year. */
export function reportPeriodsOutsideTheirYear(
  academicPeriods: readonly AcademicPeriod[],
  academicYears: readonly AcademicYear[],
  context: PlanContext
): void {
  for (const period of academicPeriods) {
    const year = academicYears.find((entry) => entry.id === period.academic_year_id);
    if (year === undefined) continue;
    if (period.start_date >= year.start_date && period.end_date <= year.end_date) continue;
    context.addIssue(
      'period_outside_academic_year',
      'academic_period',
      LEGACY_SOURCES.schoolPeriods,
      legacyIdOf(context, period.id),
      `the period "${period.name}" runs from ${period.start_date} to ${period.end_date}, outside its academic year "${year.name}" (${year.start_date} to ${year.end_date})`
    );
  }
}

/** The legacy id of a canonical row, from the id map the plan collected. */
function legacyIdOf(context: PlanContext, canonicalId: string): string {
  return (
    context.mapping.find((entry) => entry.canonicalId === canonicalId)?.legacyId ?? ''
  );
}
