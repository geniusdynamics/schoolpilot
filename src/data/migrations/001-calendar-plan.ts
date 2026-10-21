// ABOUTME: The plan that maps the legacy calendar rows onto the canonical model: the context the
// ABOUTME: steps share, the order they run in, and the values the plan decides.

import type { SqliteRow } from '@/data/adapters/sqlite';
import type {
  AcademicPeriod,
  AcademicYear,
  Calendar,
  FinancialYear,
  Institution,
  InstitutionIdentifier,
} from '@/domain/schema';

import {
  legacyCounts,
  legacyId,
  legacyText,
  LEGACY_SOURCES,
  type IdMapEntry,
  type InstitutionDefaults,
  type LegacyCalendarSource,
  type M1Entity,
  type MigrationCounts,
  type MigrationIssue,
  type UnmappableRow,
} from './001-legacy-calendar';
import { planAcademicPeriods, planAcademicYears } from './001-academic-plan';
import {
  planAcademicYearStatuses,
  planFinancialYearStatuses,
  planPeriodStatuses,
  reportPeriodsOutsideTheirYear,
  reportStaleActiveFlags,
} from './001-calendar-status';
import { planCalendars, planFinancialYears, planInstitution } from './001-organisation-plan';

/** The options the planner needs. */
export interface PlanOptions {
  /** The day the migration runs on; the statuses are derived against it. */
  readonly referenceDate: string;
  /** The timestamp the canonical audit columns carry when the legacy row has none. */
  readonly referenceTimestamp: string;
  /** The values applied where the legacy data has none. */
  readonly defaults: InstitutionDefaults;
}

/** Everything the plan holds. */
export interface CalendarMigrationPlan {
  readonly referenceDate: string;
  readonly referenceTimestamp: string;
  readonly institution: Institution | null;
  readonly institutionIdentifier: InstitutionIdentifier | null;
  readonly calendars: readonly Calendar[];
  readonly academicYears: readonly AcademicYear[];
  readonly academicPeriods: readonly AcademicPeriod[];
  readonly financialYears: readonly FinancialYear[];
  readonly mapping: readonly IdMapEntry[];
  readonly unmappable: readonly UnmappableRow[];
  readonly issues: readonly MigrationIssue[];
  readonly assumptions: readonly string[];
  readonly counts: {
    readonly before: MigrationCounts;
    readonly planned: MigrationCounts;
  };
}

/**
 * What the plan collects while it walks the legacy rows.
 *
 * The context is the only way a step records something, so every decision the plan makes leaves
 * a trace: a row it could not map, a problem it found, or a value it applied where the legacy
 * data had none.
 */
export interface PlanContext {
  readonly options: PlanOptions;
  /** The legacy rows the plan could not map. */
  readonly unmappable: UnmappableRow[];
  /** The problems the legacy data carried. */
  readonly issues: MigrationIssue[];
  /** The values the plan applied where the legacy data had none. */
  readonly assumptions: string[];
  /** The mapping between a legacy row and the canonical row it became. */
  readonly mapping: IdMapEntry[];
  /** Records a legacy row the plan could not map. */
  addUnmappable(
    legacyTable: string,
    legacyId: string,
    canonicalEntity: M1Entity,
    reason: string
  ): void;
  /** Records a problem the legacy data carried; the migration still commits. */
  addIssue(
    code: string,
    entity: M1Entity,
    legacyTable: string,
    legacyId: string,
    message: string
  ): void;
  /** Records a problem that stops the migration: it refuses to commit. */
  addError(
    code: string,
    entity: M1Entity,
    legacyTable: string,
    legacyId: string,
    message: string
  ): void;
  /** Records a value the plan applied where the legacy data had none. */
  addAssumption(message: string): void;
}

/** The context a plan collects into. */
export function createPlanContext(options: PlanOptions): PlanContext {
  const unmappable: UnmappableRow[] = [];
  const issues: MigrationIssue[] = [];
  const assumptions: string[] = [];
  const mapping: IdMapEntry[] = [];
  return {
    options,
    unmappable,
    issues,
    assumptions,
    mapping,
    addUnmappable(legacyTable, legacyId, canonicalEntity, reason) {
      unmappable.push({ legacyTable, legacyId, canonicalEntity, reason });
    },
    addIssue(code, entity, legacyTable, legacyId, message) {
      issues.push({
        code,
        severity: 'warning',
        entity,
        legacyTable,
        legacyId,
        message,
      });
    },
    addError(code, entity, legacyTable, legacyId, message) {
      issues.push({
        code,
        severity: 'error',
        entity,
        legacyTable,
        legacyId,
        message,
      });
    },
    addAssumption(message) {
      assumptions.push(message);
    },
  };
}

/**
 * Maps the legacy calendar rows onto the canonical model.
 *
 * The function is pure: it reads nothing and writes nothing, so the same legacy rows always
 * produce the same plan. A legacy row that cannot be mapped is reported, never repaired: the
 * migration refuses to invent a date, a name or a reference it did not find.
 */
export function planCalendarMigration(
  source: LegacyCalendarSource,
  options: PlanOptions
): CalendarMigrationPlan {
  const context = createPlanContext(options);

  const institution = planInstitution(source, context);
  if (institution === null) {
    reportNoInstitution(source, context);
    return emptyPlan(source, context);
  }

  const institutionId = institution.institution.id;
  const { calendars, byStructureId } = planCalendars(source, context, institutionId);
  const { financialYears, legacyIdByCanonicalId } = planFinancialYears(
    source,
    context,
    institutionId
  );
  const { academicYears, byLegacyId } = planAcademicYears(
    source,
    context,
    institutionId,
    byStructureId
  );
  const { academicPeriods, flaggedPeriods } = planAcademicPeriods(
    source,
    context,
    institutionId,
    byLegacyId
  );

  linkFinancialYears(academicYears, financialYears);
  planFinancialYearStatuses(financialYears, legacyIdByCanonicalId, context);
  planAcademicYearStatuses(academicYears, context);
  planPeriodStatuses(academicPeriods, academicYears, context);
  reportStaleActiveFlags(flaggedPeriods, academicYears, context);
  reportPeriodsOutsideTheirYear(academicPeriods, academicYears, context);
  reportPeriodDefaults(academicPeriods, context);

  const planned: MigrationCounts = {
    institution: 1,
    institution_identifier: institution.identifier === null ? 0 : 1,
    calendar: calendars.length,
    academic_year: academicYears.length,
    academic_period: academicPeriods.length,
    financial_year: financialYears.length,
  };

  return {
    referenceDate: options.referenceDate,
    referenceTimestamp: options.referenceTimestamp,
    institution: institution.institution,
    institutionIdentifier: institution.identifier,
    calendars,
    academicYears,
    academicPeriods,
    financialYears,
    mapping: context.mapping,
    unmappable: context.unmappable,
    issues: context.issues,
    assumptions: context.assumptions,
    counts: { before: legacyCounts(source), planned },
  };
}

/** The financial year the academic year belongs to: the one that covers its first day. */
function linkFinancialYears(
  academicYears: AcademicYear[],
  financialYears: readonly FinancialYear[]
): void {
  for (const academicYear of academicYears) {
    const covering = financialYears.find(
      (year) =>
        year.start_date <= academicYear.start_date && academicYear.start_date <= year.end_date
    );
    if (covering !== undefined) {
      academicYear.financial_year_id = covering.id;
      continue;
    }
    const overlapping = financialYears.find(
      (year) =>
        year.start_date <= academicYear.end_date && academicYear.start_date <= year.end_date
    );
    if (overlapping !== undefined) {
      academicYear.financial_year_id = overlapping.id;
    }
  }
}

/**
 * The values the plan applies to every academic period.
 *
 * The legacy data has no reporting flag and no billing flag, but the legacy app bills and
 * reports per school period, so every migrated period is a reporting and a billing period. The
 * plan records that it decided this.
 */
function reportPeriodDefaults(
  academicPeriods: readonly AcademicPeriod[],
  context: PlanContext
): void {
  if (academicPeriods.length === 0) return;
  context.addAssumption(
    'academic_period.is_reporting was set to true for every period: the legacy app reports per school period and the legacy data carries no reporting flag'
  );
  context.addAssumption(
    'academic_period.is_billing was set to true for every period: the legacy app bills per school period and the legacy data carries no billing flag'
  );
}

/** Reports every legacy row that has no institution to be attached to. */
function reportNoInstitution(source: LegacyCalendarSource, context: PlanContext): void {
  const report = (
    rows: readonly SqliteRow[],
    table: string,
    entity: M1Entity,
    what: string
  ): void => {
    for (const row of rows) {
      context.addUnmappable(
        table,
        legacyId(row),
        entity,
        `there is no institution to attach the ${what} to`
      );
    }
  };
  report(source.yearStructures, LEGACY_SOURCES.yearStructures, 'calendar', 'year structure');
  report(source.academicYears, LEGACY_SOURCES.academicYears, 'academic_year', 'academic year');
  report(source.schoolPeriods, LEGACY_SOURCES.schoolPeriods, 'academic_period', 'period');
  report(source.financialYears, LEGACY_SOURCES.financialYears, 'financial_year', 'financial year');

  // The school code of a profile that could not be mapped is not migrated either, and the
  // report says so, so the count of the identifiers adds up.
  for (const row of source.schoolDetails) {
    if (legacyText(row, 'school_code') === null) continue;
    context.addUnmappable(
      LEGACY_SOURCES.schoolDetails,
      legacyId(row),
      'institution_identifier',
      'the school profile could not be mapped, so its school code was not migrated'
    );
  }
}

/** The plan of a legacy database whose school profile could not be mapped. */
function emptyPlan(
  source: LegacyCalendarSource,
  context: PlanContext
): CalendarMigrationPlan {
  return {
    referenceDate: context.options.referenceDate,
    referenceTimestamp: context.options.referenceTimestamp,
    institution: null,
    institutionIdentifier: null,
    calendars: [],
    academicYears: [],
    academicPeriods: [],
    financialYears: [],
    mapping: context.mapping,
    unmappable: context.unmappable,
    issues: context.issues,
    assumptions: context.assumptions,
    counts: {
      before: legacyCounts(source),
      planned: {
        institution: 0,
        institution_identifier: 0,
        calendar: 0,
        academic_year: 0,
        academic_period: 0,
        financial_year: 0,
      },
    },
  };
}
