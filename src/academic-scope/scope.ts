// ABOUTME: The pure resolver behind every learner-facing filter bar: Year → Class (grade) → Stream
// ABOUTME: (year-scoped class group) → Period, validated by ids, never by display names.

import { classGroupLabel } from '@/utils/academicLabels';

/** A year row the scope reads. */
export interface ScopeYear {
  readonly id: string;
  readonly name: string;
  readonly start_date: string;
  readonly end_date: string;
  readonly status?: string | null;
}

/** A period row the scope reads. */
export interface ScopePeriod {
  readonly id: string;
  readonly name: string;
  readonly academic_year_id: string;
  readonly kind?: string;
  readonly sequence?: number;
  readonly start_date: string;
  readonly end_date: string;
  readonly status?: string | null;
}

/** A level (grade) row the scope reads. */
export interface ScopeLevel {
  readonly id: string;
  readonly name: string;
  readonly ordinal?: number;
  readonly programme_id?: string;
}

/** A class-group (stream) row the scope reads. */
export interface ScopeClassGroup {
  readonly id: string;
  readonly name: string;
  readonly academic_year_id: string;
  readonly level_id: string;
  readonly programme_id?: string;
}

/** A programme row, needed only to disambiguate level names shared across programmes. */
export interface ScopeProgramme {
  readonly id: string;
  readonly name: string;
}

export interface ScopeRows {
  readonly years: readonly ScopeYear[];
  readonly periods: readonly ScopePeriod[];
  readonly levels: readonly ScopeLevel[];
  readonly classGroups: readonly ScopeClassGroup[];
  readonly programmes?: readonly ScopeProgramme[];
}

/**
 * The selection state. `null` means "not chosen yet, resolve the default"; `''` means an explicit
 * "All"; any other string is a chosen row id. Setters cascade: choosing a year resets the class,
 * stream and period so a stale child selection can never survive a parent change.
 */
export interface ScopeSelection {
  readonly yearId?: string | null;
  readonly levelId?: string | null;
  readonly classGroupId?: string | null;
  readonly periodId?: string | null;
}

/** A level offered for the chosen year, with the label the picker shows. */
export interface ScopedLevel {
  readonly id: string;
  readonly label: string;
}

/** A stream offered for the chosen year and class, with the label the picker shows. */
export interface ScopedStream {
  readonly id: string;
  readonly label: string;
}

/** The resolved scope: validated ids (never null) plus the options the pickers list. */
export interface ResolvedScope {
  readonly effective: {
    readonly yearId: string;
    readonly levelId: string;
    readonly classGroupId: string;
    readonly periodId: string;
  };
  readonly year: ScopeYear | null;
  readonly years: readonly ScopeYear[];
  readonly levelsOfYear: readonly ScopedLevel[];
  readonly streams: readonly ScopedStream[];
  readonly periodsOfYear: readonly ScopePeriod[];
  /** The selection fields the resolver had to clear because they did not belong. */
  readonly adjusted: readonly string[];
}

/** The year today sits in, else the flagged current year, else the latest to start. */
function defaultYearOf(years: readonly ScopeYear[], today: string): ScopeYear | null {
  if (years.length === 0) return null;
  const byDate = years.find((year) => year.start_date <= today && today <= year.end_date);
  if (byDate) return byDate;
  const flagged = years.find((year) => year.status === 'current');
  if (flagged) return flagged;
  return [...years].sort((left, right) => right.start_date.localeCompare(left.start_date))[0];
}

/**
 * Validates a selection against the rows and resolves every default.
 *
 * Membership is by id, never by name: two years' "Term 1" and two grades' "East" are different
 * rows, so a selection from another year or grade is dropped (and named in `adjusted`) rather
 * than silently matching a same-named row of the current scope.
 */
export function resolveAcademicScope(input: {
  readonly rows: ScopeRows;
  readonly selection: ScopeSelection;
  readonly today?: string;
}): ResolvedScope {
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  const { years, periods, levels, classGroups, programmes } = input.rows;
  const adjusted: string[] = [];

  const yearsSorted = [...years].sort((left, right) => left.start_date.localeCompare(right.start_date));

  const askedYear = input.selection.yearId ?? null;
  const year =
    (askedYear ? years.find((row) => row.id === askedYear) : undefined) ?? defaultYearOf(yearsSorted, today);
  if (askedYear && (!year || year.id !== askedYear)) adjusted.push('yearId');

  const groupsOfYear = year
    ? classGroups.filter((group) => group.academic_year_id === year.id)
    : [];
  const levelById = new Map(levels.map((level) => [level.id, level]));
  const programmeById = new Map((programmes ?? []).map((programme) => [programme.id, programme]));

  // Levels are offered only when the chosen year has a class group at that level.
  const levelIdsOfYear = [...new Set(groupsOfYear.map((group) => group.level_id))];
  const levelsOfYearRaw = levelIdsOfYear
    .map((id) => levelById.get(id))
    .filter((level): level is ScopeLevel => level !== undefined)
    .sort(
      (left, right) =>
        (left.ordinal ?? 0) - (right.ordinal ?? 0) || left.name.localeCompare(right.name)
    );

  const nameCounts = new Map<string, number>();
  for (const level of levelsOfYearRaw) {
    nameCounts.set(level.name, (nameCounts.get(level.name) ?? 0) + 1);
  }
  const levelsOfYear: ScopedLevel[] = levelsOfYearRaw.map((level) => {
    const programmeName =
      level.programme_id != null ? programmeById.get(level.programme_id)?.name : undefined;
    const ambiguous = (nameCounts.get(level.name) ?? 0) > 1 && programmeName;
    return { id: level.id, label: ambiguous ? `${level.name} · ${programmeName}` : level.name };
  });

  const askedLevel = input.selection.levelId ?? null;
  const levelValid = askedLevel !== null && levelsOfYear.some((level) => level.id === askedLevel);
  const levelId = askedLevel !== null && askedLevel !== '' && !levelValid ? '' : levelValid ? (askedLevel as string) : '';
  if (askedLevel != null && askedLevel !== '' && !levelValid) adjusted.push('levelId');

  const streamsRaw = (levelId ? groupsOfYear.filter((group) => group.level_id === levelId) : groupsOfYear)
    .map((group) => {
      const level = levelById.get(group.level_id);
      return {
        id: group.id,
        label: classGroupLabel({ gradeLevel: level?.name, name: group.name }),
        ordinal: level?.ordinal ?? 0,
      };
    })
    .sort((left, right) => left.ordinal - right.ordinal || left.label.localeCompare(right.label));

  const askedGroup = input.selection.classGroupId ?? null;
  const groupValid =
    askedGroup !== null && askedGroup !== '' && streamsRaw.some((stream) => stream.id === askedGroup);
  const classGroupId = groupValid ? (askedGroup as string) : '';
  if (askedGroup != null && askedGroup !== '' && !groupValid) adjusted.push('classGroupId');

  const periodsOfYear = year
    ? periods
        .filter((period) => period.academic_year_id === year.id)
        .sort(
          (left, right) =>
            left.start_date.localeCompare(right.start_date) ||
            (left.sequence ?? 0) - (right.sequence ?? 0)
        )
    : [];

  const askedPeriod = input.selection.periodId ?? null;
  const periodValid =
    askedPeriod !== null && askedPeriod !== '' && periodsOfYear.some((period) => period.id === askedPeriod);
  const periodId = periodValid ? (askedPeriod as string) : '';
  if (askedPeriod != null && askedPeriod !== '' && !periodValid) adjusted.push('periodId');

  return {
    effective: {
      yearId: year?.id ?? '',
      levelId,
      classGroupId,
      periodId,
    },
    year,
    years: yearsSorted,
    levelsOfYear,
    streams: streamsRaw.map(({ id, label }) => ({ id, label })),
    periodsOfYear,
    adjusted,
  };
}
