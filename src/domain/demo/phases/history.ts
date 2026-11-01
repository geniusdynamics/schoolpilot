// ABOUTME: The school's previous academic year: a closed year with its financial year, its terms and
// ABOUTME: the same class groups, so the demo has alumni, promotions and arrears that span years.

import type { RepositoryRow, WriteOptions, Repository } from '@/data/repository';
import { asId, type Id } from '@/domain/ids';

import type { DemoYear } from './context';
import { findOrCreate, sequenceYear, shiftYear } from './helpers';

interface HistoryInput {
  readonly repository: Repository;
  readonly institutionId: Id<'institution'>;
  readonly campusId: Id<'campus'>;
  readonly calendarId: Id<'calendar'>;
  readonly programmeId: Id<'programme'>;
  readonly current: DemoYear;
  readonly options: WriteOptions;
  readonly count: (entity: string) => void;
}

/**
 * Writes the academic year before the current one: closed, with three closed terms, its own
 * financial year, and a class group for every level and stream of the current year.
 *
 * The dates are the current year's, one year earlier, so the terms and the class groups line up and
 * a learner who was in Grade 7 then is in Grade 8 now. Rows are found by natural key first, so a
 * re-run reuses the year.
 */
export async function seedPreviousYear(input: HistoryInput): Promise<DemoYear> {
  const { repository, institutionId, campusId, calendarId, programmeId, current, options } = input;
  const name = String(sequenceYear(current.year.start_date) - 1);

  const financialYear = await findOrCreate<'financial_year'>(
    repository,
    'financial_year',
    { where: { institution_id: institutionId, name: `${name} financial year` } },
    () => ({
      institution_id: institutionId,
      name: `${name} financial year`,
      start_date: `${name}-01-01`,
      end_date: `${name}-12-31`,
      status: 'closed',
    }),
    options,
    () => input.count('financial_year')
  );

  const year = await findOrCreate<'academic_year'>(
    repository,
    'academic_year',
    { where: { calendar_id: calendarId, name } },
    () => ({
      institution_id: institutionId,
      calendar_id: calendarId,
      name,
      start_date: shiftYear(current.year.start_date, -1),
      end_date: shiftYear(current.year.end_date, -1),
      status: 'closed',
      financial_year_id: asId<'financial_year'>(financialYear.id),
    }),
    options,
    () => input.count('academic_year')
  );

  const terms: RepositoryRow<'academic_period'>[] = [];
  for (const term of current.terms) {
    const row = await findOrCreate<'academic_period'>(
      repository,
      'academic_period',
      { where: { academic_year_id: year.id, sequence: term.sequence } },
      () => ({
        institution_id: institutionId,
        academic_year_id: asId<'academic_year'>(year.id),
        kind: 'term',
        sequence: term.sequence,
        name: term.name,
        start_date: shiftYear(term.start_date, -1),
        end_date: shiftYear(term.end_date, -1),
        is_reporting: true,
        is_billing: true,
        status: 'closed',
      }),
      options,
      () => input.count('academic_period')
    );
    terms.push(row);
  }

  const classGroups: RepositoryRow<'class_group'>[] = [];
  for (const group of current.classGroups) {
    const row = await findOrCreate<'class_group'>(
      repository,
      'class_group',
      {
        where: {
          campus_id: campusId,
          academic_year_id: year.id,
          programme_id: programmeId,
          level_id: group.level_id,
          name: group.name,
        },
      },
      () => ({
        institution_id: institutionId,
        campus_id: campusId,
        academic_year_id: asId<'academic_year'>(year.id),
        programme_id: programmeId,
        level_id: asId<'level'>(group.level_id),
        name: group.name,
        capacity: group.capacity ?? 40,
        homeroom_teacher_ids: [],
      }),
      options,
      () => input.count('class_group')
    );
    classGroups.push(row);
  }

  return { year, financialYear, terms: terms.sort((a, b) => a.sequence - b.sequence), classGroups };
}
