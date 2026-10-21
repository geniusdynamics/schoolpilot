// ABOUTME: The academic part of the plan: the legacy academic years keep their dates and their
// ABOUTME: calendar, and the legacy terms keep their dates, their kind and their sequence.

import type { SqliteRow } from '@/data/adapters/sqlite';
import {
  ACADEMIC_PERIOD_KINDS,
  type AcademicPeriod,
  type AcademicYear,
  type Calendar,
} from '@/domain/schema';
import { generateUuidv7 } from '@/domain/ids';

import {
  canonicalTimestamp,
  legacyDay,
  legacyFlag,
  legacyId,
  legacyInteger,
  legacyRef,
  legacyText,
  LEGACY_SOURCES,
  type LegacyCalendarSource,
} from './001-legacy-calendar';
import type { PlanContext } from './001-calendar-plan';

/** The canonical period kinds, read from the domain model. */
export type PeriodKind = (typeof ACADEMIC_PERIOD_KINDS)[number];

/** A period the legacy school marked as the running one. */
export interface FlaggedPeriod {
  readonly legacyId: string;
  readonly name: string;
  readonly academicYearId: string;
  readonly start_date: string;
  readonly end_date: string;
}

/** The period kind a legacy period definition names. */
function periodKindOf(name: string): PeriodKind | null {
  const normalized = name.trim().toLowerCase();
  if (normalized.includes('half') && normalized.includes('term')) return 'half_term';
  if (normalized.includes('trimester')) return 'trimester';
  if (normalized.includes('semester')) return 'semester';
  if (normalized.includes('quarter')) return 'quarter';
  if (normalized.includes('term')) return 'term';
  return null;
}

/** The academic years: the legacy rows, with their dates and their calendar. */
export function planAcademicYears(
  source: LegacyCalendarSource,
  context: PlanContext,
  institutionId: string,
  calendarByStructureId: ReadonlyMap<string, Calendar>
): { academicYears: AcademicYear[]; byLegacyId: Map<string, AcademicYear> } {
  const academicYears: AcademicYear[] = [];
  const byLegacyId = new Map<string, AcademicYear>();
  const namesByCalendar = new Map<string, Set<string>>();
  for (const row of source.academicYears) {
    const rowId = legacyId(row);
    const structureId = legacyRef(row, 'structure_id');
    const name = legacyText(row, 'name');
    const startDate = legacyDay(row, 'start_date');
    const endDate = legacyDay(row, 'end_date');
    if (structureId === null) {
      context.addUnmappable(
        LEGACY_SOURCES.academicYears,
        rowId,
        'academic_year',
        'the academic year names no year structure'
      );
      continue;
    }
    const calendar = calendarByStructureId.get(structureId);
    if (calendar === undefined) {
      context.addUnmappable(
        LEGACY_SOURCES.academicYears,
        rowId,
        'academic_year',
        `the year structure "${structureId}" is not one the legacy database holds`
      );
      continue;
    }
    if (name === null) {
      context.addUnmappable(
        LEGACY_SOURCES.academicYears,
        rowId,
        'academic_year',
        'the academic year has no name'
      );
      continue;
    }
    const names = namesByCalendar.get(calendar.id) ?? new Set<string>();
    if (names.has(name.toLowerCase())) {
      context.addUnmappable(
        LEGACY_SOURCES.academicYears,
        rowId,
        'academic_year',
        `another academic year in the same calendar is already called "${name}"`
      );
      continue;
    }
    names.add(name.toLowerCase());
    namesByCalendar.set(calendar.id, names);
    if (startDate === null || endDate === null) {
      context.addUnmappable(
        LEGACY_SOURCES.academicYears,
        rowId,
        'academic_year',
        'the academic year has no start and end date'
      );
      continue;
    }
    if (endDate < startDate) {
      context.addUnmappable(
        LEGACY_SOURCES.academicYears,
        rowId,
        'academic_year',
        `the academic year ends (${endDate}) before it starts (${startDate})`
      );
      continue;
    }
    const academicYear: AcademicYear = {
      id: generateUuidv7(),
      institution_id: institutionId,
      calendar_id: calendar.id,
      name,
      start_date: startDate,
      end_date: endDate,
      status: 'planned',
      created_at: canonicalTimestamp(
        legacyText(row, 'created_at'),
        context.options.referenceTimestamp
      ),
      updated_at: canonicalTimestamp(
        legacyText(row, 'updated_at'),
        context.options.referenceTimestamp
      ),
    };
    academicYears.push(academicYear);
    byLegacyId.set(rowId, academicYear);
    context.mapping.push({
      legacyTable: LEGACY_SOURCES.academicYears,
      legacyId: rowId,
      canonicalEntity: 'academic_year',
      canonicalId: academicYear.id,
    });
  }
  return { academicYears, byLegacyId };
}

/**
 * The kind, the sequence and the name a legacy period definition carries.
 *
 * The definition is a template the legacy school shares across its years, so the definition's
 * name becomes the canonical period name: the denormalised `school_periods.name` ("Term 1 - AY
 * 2024/2025") is a display label and is not carried over (spec 02 §1.3).
 */
function resolvePeriodDefinition(
  definition: SqliteRow,
  rowId: string,
  context: PlanContext
): { name: string; kind: PeriodKind; sequence: number } | null {
  const name = legacyText(definition, 'name');
  if (name === null) {
    context.addUnmappable(
      LEGACY_SOURCES.schoolPeriods,
      rowId,
      'academic_period',
      'the period definition has no name'
    );
    return null;
  }
  const kind = periodKindOf(name);
  if (kind === null) {
    context.addUnmappable(
      LEGACY_SOURCES.schoolPeriods,
      rowId,
      'academic_period',
      `the period definition "${name}" names no period kind the canonical model knows`
    );
    return null;
  }
  const sequence = legacyInteger(definition, 'sequence_order');
  if (sequence === null) {
    context.addUnmappable(
      LEGACY_SOURCES.schoolPeriods,
      rowId,
      'academic_period',
      'the period definition has no sequence number'
    );
    return null;
  }
  return { name, kind, sequence };
}

/** The academic periods: the legacy terms, with their dates, their kind and their sequence. */
export function planAcademicPeriods(
  source: LegacyCalendarSource,
  context: PlanContext,
  institutionId: string,
  academicYearByLegacyId: ReadonlyMap<string, AcademicYear>
): { academicPeriods: AcademicPeriod[]; flaggedPeriods: FlaggedPeriod[] } {
  const definitionsById = new Map<string, SqliteRow>();
  for (const row of source.periodDefinitions) definitionsById.set(legacyId(row), row);

  const academicPeriods: AcademicPeriod[] = [];
  const flaggedPeriods: FlaggedPeriod[] = [];
  const keys = new Set<string>();
  for (const row of source.schoolPeriods) {
    const rowId = legacyId(row);
    const legacyYearId = legacyRef(row, 'academic_year_id');
    const legacyDefinitionId = legacyRef(row, 'period_definition_id');
    const startDate = legacyDay(row, 'start_date');
    const endDate = legacyDay(row, 'end_date');
    if (legacyYearId === null) {
      context.addUnmappable(
        LEGACY_SOURCES.schoolPeriods,
        rowId,
        'academic_period',
        'the period names no academic year'
      );
      continue;
    }
    const academicYear = academicYearByLegacyId.get(legacyYearId);
    if (academicYear === undefined) {
      context.addUnmappable(
        LEGACY_SOURCES.schoolPeriods,
        rowId,
        'academic_period',
        `the academic year "${legacyYearId}" is not one the legacy database holds`
      );
      continue;
    }
    if (legacyDefinitionId === null) {
      context.addUnmappable(
        LEGACY_SOURCES.schoolPeriods,
        rowId,
        'academic_period',
        'the period names no period definition'
      );
      continue;
    }
    const definition = definitionsById.get(legacyDefinitionId);
    if (definition === undefined) {
      context.addUnmappable(
        LEGACY_SOURCES.schoolPeriods,
        rowId,
        'academic_period',
        `the period definition "${legacyDefinitionId}" is not one the legacy database holds`
      );
      continue;
    }
    const resolved = resolvePeriodDefinition(definition, rowId, context);
    if (resolved === null) continue;
    const { name: definitionName, kind, sequence } = resolved;
    if (startDate === null || endDate === null) {
      context.addUnmappable(
        LEGACY_SOURCES.schoolPeriods,
        rowId,
        'academic_period',
        'the period has no start and end date'
      );
      continue;
    }
    if (endDate < startDate) {
      context.addUnmappable(
        LEGACY_SOURCES.schoolPeriods,
        rowId,
        'academic_period',
        `the period ends (${endDate}) before it starts (${startDate})`
      );
      continue;
    }
    const key = `${academicYear.id}|${kind}|${sequence}`;
    if (keys.has(key)) {
      context.addUnmappable(
        LEGACY_SOURCES.schoolPeriods,
        rowId,
        'academic_period',
        `another period in the same academic year already has the sequence number ${sequence}`
      );
      continue;
    }
    keys.add(key);
    const period: AcademicPeriod = {
      id: generateUuidv7(),
      institution_id: institutionId,
      academic_year_id: academicYear.id,
      kind,
      sequence,
      name: definitionName,
      start_date: startDate,
      end_date: endDate,
      is_reporting: true,
      is_billing: true,
      status: 'planned',
      created_at: canonicalTimestamp(
        legacyText(row, 'created_at'),
        context.options.referenceTimestamp
      ),
      updated_at: canonicalTimestamp(
        legacyText(row, 'updated_at'),
        context.options.referenceTimestamp
      ),
    };
    academicPeriods.push(period);
    if (legacyFlag(row, 'is_active')) {
      flaggedPeriods.push({
        legacyId: rowId,
        name: definitionName,
        academicYearId: academicYear.id,
        start_date: startDate,
        end_date: endDate,
      });
    }
    context.mapping.push({
      legacyTable: LEGACY_SOURCES.schoolPeriods,
      legacyId: rowId,
      canonicalEntity: 'academic_period',
      canonicalId: period.id,
    });
  }
  return { academicPeriods, flaggedPeriods };
}
