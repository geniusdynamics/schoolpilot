// ABOUTME: The canonical learners the nutrition pages read: learners with their admission number and name.
// ABOUTME: The canonical status decides who is on the roll; ids stay opaque strings.

import { useMemo } from 'react';

import { useEntityQuery, useLookup } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';

import { useCanonicalRepository } from './canonicalRepository';

type LearnerRow = RepositoryRow<'learner'>;

/** A canonical learner, shaped the way the nutrition pages read a student. */
export interface CanonicalLearner {
  readonly id: string;
  readonly admission_no: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly display_name: string;
  /** The class group the learner is enrolled in, when there is one. */
  readonly class_group_id: string | null;
  readonly class_name: string;
  /** True while the learner is enrolled and on the roll. */
  readonly is_active: boolean;
}

/** A learner is on the roll while the enrolment is running. */
export function isLearnerOnRoll(row: LearnerRow): boolean {
  return row.status === 'enrolled' && !row.deleted_at;
}

/** The canonical learners of the institution. */
export function useCanonicalLearners() {
  const repository = useCanonicalRepository();
  const learnersQuery = useEntityQuery(repository, 'learner');
  const learnersLookup = useLookup(repository, 'learner', {});
  const enrolmentsQuery = useEntityQuery(repository, 'enrolment');
  const classGroupsQuery = useEntityQuery(repository, 'class_group');

  const classGroupNameById = useMemo(
    () => new Map<string, string>((classGroupsQuery.data?.items ?? []).map((row) => [row.id, row.name] as const)),
    [classGroupsQuery.data]
  );

  const classGroupByLearner = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of enrolmentsQuery.data?.items ?? []) {
      if (row.status !== 'active') continue;
      map.set(row.learner_id, row.class_group_id);
    }
    return map;
  }, [enrolmentsQuery.data]);

  const learners = useMemo<CanonicalLearner[]>(
    () =>
      (learnersQuery.data?.items ?? []).map((row) => {
        const classGroupId = classGroupByLearner.get(row.id) ?? null;
        return {
          id: row.id,
          admission_no: row.admission_number,
          first_name: row.given_name,
          last_name: row.family_name,
          display_name: `${row.preferred_name ?? row.given_name} ${row.family_name}`.trim(),
          class_group_id: classGroupId,
          class_name: classGroupId ? classGroupNameById.get(classGroupId) ?? '' : '',
          is_active: isLearnerOnRoll(row),
        };
      }),
    [learnersQuery.data, classGroupByLearner, classGroupNameById]
  );

  return {
    learners,
    learnersLookup,
    status: learnersQuery.status,
    isLoading: learnersQuery.status === 'loading',
    error: learnersQuery.error,
  };
}
