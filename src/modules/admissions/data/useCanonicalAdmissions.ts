// ABOUTME: The canonical admissions reads: learners with their placement and guardians, and the
// ABOUTME: lookups the admission form's pickers bind to. Every read goes through the repository.

import { useMemo } from 'react';

import { useCanonicalRepository } from '@/data/canonicalRepository';
import { useEntityQuery, useLookup } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';
import { asId } from '@/domain/ids';
import { LEARNER_STATUSES } from '@/domain/schema';

/** The lifecycle status of a learner, from the canonical status list. */
type LearnerStatus = (typeof LEARNER_STATUSES)[number];

/** The statuses that mean the learner is enrolled at the school. */
const ADMITTED_STATUSES: readonly LearnerStatus[] = [
  'enrolled',
  'suspended',
  'withdrawn',
  'transferred_out',
  'graduated',
  'deceased',
];

/** A learner of the admissions register, with the placement and the guardians of the day. */
export interface AdmissionRegisterRow {
  readonly id: string;
  readonly admission_number: string;
  readonly name: string;
  readonly status: LearnerStatus;
  readonly admission_date: string;
  readonly residence_status: string;
  readonly institution_id: string;
  readonly class_group_id: string | null;
  readonly class_group: string;
  readonly level: string;
  readonly programme: string;
  readonly guardian_ids: readonly string[];
  readonly guardian_names: readonly string[];
  readonly primary_guardian_id: string | null;
  readonly enrolment_id: string | null;
}

/** True when the learner has been admitted, rather than only captured as an applicant. */
export function isAdmitted(status: LearnerStatus): boolean {
  return ADMITTED_STATUSES.includes(status);
}

/** The person label of a learner row. */
function learnerName(row: RepositoryRow<'learner'>): string {
  return `${row.preferred_name ?? row.given_name} ${row.family_name}`.trim();
}

/** The enrolment of a learner that is current: an active one, else the latest by start date. */
function currentEnrolment(
  enrolments: readonly RepositoryRow<'enrolment'>[]
): RepositoryRow<'enrolment'> | undefined {
  const sorted = [...enrolments].sort((a, b) => b.start_date.localeCompare(a.start_date));
  return (
    sorted.find((row) => row.status === 'active' || row.status === 'repeating') ?? sorted[0]
  );
}

/**
 * The learners of the admissions register, with the class group of their current enrolment
 * and the guardians linked to them.
 *
 * The register is read from the canonical registry: an applicant is a learner whose status
 * is `applicant`, an admitted learner is one whose status the school moved on to. The class
 * group is resolved through the lookup, so an archived group still carries its name.
 */
export function useCanonicalAdmissions() {
  const repository = useCanonicalRepository();
  const learnerQuery = useEntityQuery(repository, 'learner');
  const enrolmentQuery = useEntityQuery(repository, 'enrolment');
  const linkQuery = useEntityQuery(repository, 'learner_guardian');
  const guardians = useLookup(repository, 'guardian', {});
  const classGroups = useLookup(repository, 'class_group', {});
  const levels = useLookup(repository, 'level', {});
  const programmes = useLookup(repository, 'programme', {});

  const rows = useMemo<AdmissionRegisterRow[]>(() => {
    const enrolmentsByLearner = new Map<string, RepositoryRow<'enrolment'>[]>();
    for (const enrolment of enrolmentQuery.data?.items ?? []) {
      const list = enrolmentsByLearner.get(enrolment.learner_id) ?? [];
      list.push(enrolment);
      enrolmentsByLearner.set(enrolment.learner_id, list);
    }

    const linksByLearner = new Map<string, RepositoryRow<'learner_guardian'>[]>();
    for (const link of linkQuery.data?.items ?? []) {
      const list = linksByLearner.get(link.learner_id) ?? [];
      list.push(link);
      linksByLearner.set(link.learner_id, list);
    }

    return (learnerQuery.data?.items ?? [])
      .map((learner): AdmissionRegisterRow => {
        const enrolment = currentEnrolment(enrolmentsByLearner.get(learner.id) ?? []);
        const links = [...(linksByLearner.get(learner.id) ?? [])].sort(
          (a, b) => Number(b.is_primary) - Number(a.is_primary)
        );
        const guardianIds = links.map((link) => link.guardian_id);
        const primary = links.find((link) => link.is_primary) ?? links[0];
        const classGroupId = enrolment?.class_group_id ?? null;
        return {
          id: learner.id,
          admission_number: learner.admission_number,
          name: learnerName(learner),
          status: learner.status,
          admission_date: learner.admission_date ?? '',
          residence_status: learner.residence_status,
          institution_id: learner.institution_id,
          class_group_id: classGroupId,
          class_group: classGroupId
            ? classGroups.label(asId<'class_group'>(classGroupId), classGroupId)
            : '',
          level: enrolment
            ? levels.label(asId<'level'>(enrolment.level_id), enrolment.level_id)
            : '',
          programme: enrolment
            ? programmes.label(asId<'programme'>(enrolment.programme_id), enrolment.programme_id)
            : '',
          guardian_ids: guardianIds,
          guardian_names: guardianIds.map((id) =>
            guardians.label(asId<'guardian'>(id), id)
          ),
          primary_guardian_id: primary?.guardian_id ?? null,
          enrolment_id: enrolment?.id ?? null,
        };
      })
      .sort((a, b) =>
        `${b.admission_date}${b.admission_number}`.localeCompare(
          `${a.admission_date}${a.admission_number}`
        )
      );
  }, [learnerQuery.data, enrolmentQuery.data, linkQuery.data, classGroups, levels, programmes, guardians]);

  return {
    rows,
    status: learnerQuery.status,
    isLoading:
      learnerQuery.status === 'loading' ||
      enrolmentQuery.status === 'loading' ||
      linkQuery.status === 'loading',
    error: learnerQuery.error ?? enrolmentQuery.error ?? linkQuery.error,
    refetch: learnerQuery.refetch,
    guardianLookup: guardians,
  };
}

/**
 * The lookups the admission form's pickers bind to: the programmes and levels of the school,
 * the class groups of the year, and the guardians a registrar can link instead of copying.
 */
export function useAdmissionLookups() {
  const repository = useCanonicalRepository();
  return {
    programmes: useLookup(repository, 'programme', {}),
    levels: useLookup(repository, 'level', {}),
    classGroups: useLookup(repository, 'class_group', {}),
    guardians: useLookup(repository, 'guardian', {}),
  };
}

/** The guardian row a picker selected, or undefined when none was picked. */
export function selectedGuardianRow(
  lookup: ReturnType<typeof useAdmissionLookups>['guardians'],
  guardianId: string
): RepositoryRow<'guardian'> | undefined {
  return guardianId ? lookup.resolve(asId<'guardian'>(guardianId)) : undefined;
}
