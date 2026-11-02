// ABOUTME: Labels the academics screens show for a period and a class group: a period carries its
// ABOUTME: academic year and a class group carries its grade, so two schools never share an
// ABOUTME: ambiguous "Term 1" or a bare stream name. Also picks the period the calendar is in.

/** The parts of an academic period a label needs. */
export interface PeriodLabelSource {
  readonly name: string;
  /** The academic year the period belongs to, such as "2026". */
  readonly academicYear?: string | null;
}

/**
 * A period's label with its academic year.
 *
 * Two years' terms share a name ("Term 1"), so a picker that lists both needs the year. A period
 * whose name already carries the year is left alone rather than printing the year twice.
 */
export function periodLabel(period: PeriodLabelSource): string {
  const name = (period.name ?? '').trim();
  const academicYear = (period.academicYear ?? '').trim();
  if (name === '') return academicYear;
  if (academicYear === '' || name.includes(academicYear)) return name;
  return `${name} · ${academicYear}`;
}

/** The parts of a class group a label needs. */
export interface ClassGroupLabelSource {
  /** The grade or level the class belongs to, such as "Grade 7". */
  readonly gradeLevel?: string | null;
  /** The class group's own name, usually the stream, such as "East". */
  readonly name: string;
  /** A stream name when the class group does not carry one as its name. */
  readonly stream?: string | null;
}

/**
 * A class group's label with its grade.
 *
 * A stream is named "East" or "West"; the same name repeats in every grade, so a picker that shows
 * only the stream cannot say which class it is choosing. The grade comes first, then the name.
 */
export function classGroupLabel(group: ClassGroupLabelSource): string {
  const gradeLevel = (group.gradeLevel ?? '').trim();
  const name = (group.name ?? '').trim();
  const stream = (group.stream ?? '').trim();
  const label = name === '' ? stream : name;
  if (gradeLevel === '') return label;
  if (label === '' || label.toLowerCase() === gradeLevel.toLowerCase()) return gradeLevel;
  return `${gradeLevel} · ${label}`;
}

/** The parts of a period a "which one is current" choice needs. */
export interface CurrentPeriodSource {
  readonly status?: string | null;
  readonly start_date?: string | null;
  readonly end_date?: string | null;
}

/**
 * The period the calendar is in today.
 *
 * A stored `current` status can lag behind the calendar (a school does not always close and open
 * terms), so a period whose dates cover today wins, then the one flagged current, then the first.
 * The first period is the last resort, not the default.
 */
export function currentPeriodOf<T extends CurrentPeriodSource>(
  periods: readonly T[],
  today: string = new Date().toISOString().slice(0, 10)
): T | null {
  if (periods.length === 0) return null;
  const byDate = periods.find(
    (period) =>
      typeof period.start_date === 'string' &&
      typeof period.end_date === 'string' &&
      period.start_date <= today &&
      today <= period.end_date
  );
  if (byDate !== undefined) return byDate;
  return periods.find((period) => period.status === 'current') ?? periods[0];
}
