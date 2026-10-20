// ABOUTME: The canonical learners, their class placement and their guardians, shaped for the administration pages.
// ABOUTME: Reads and writes go through the repository and the guardian service; ids stay opaque strings.

import { useMemo } from 'react';

import { useEntityQuery, useLookup } from '@/data/query';
import type { CreateInput, Repository, RepositoryRow, UpdateInput } from '@/data/repository';
import { asId } from '@/domain/ids';
import type { EntityName } from '@/domain/schema';
import { GuardianService, EnrolmentService, type GuardianRelationship } from '@/domain/services';

import { useCanonicalRepository } from './canonicalRepository';

type LearnerRow = RepositoryRow<'learner'>;
type EnrolmentRow = RepositoryRow<'enrolment'>;
type ClassGroupRow = RepositoryRow<'class_group'>;
type GuardianRow = RepositoryRow<'guardian'>;
type LearnerGuardianRow = RepositoryRow<'learner_guardian'>;

/** The identifier scheme the national learner registry uses. */
export const LEARNER_UPI_SCHEME = 'ke.kemis_upi';

/** The legacy status of a learner, derived from the canonical status. */
const LEGACY_STATUS: Record<LearnerRow['status'], string> = {
  applicant: 'Active',
  enrolled: 'Active',
  suspended: 'Suspended',
  withdrawn: 'Withdrawn',
  transferred_out: 'Transferred',
  graduated: 'Alumni',
  deceased: 'Withdrawn',
};

/** The canonical status a legacy status stands for. */
const CANONICAL_STATUS: Record<string, LearnerRow['status']> = {
  Active: 'enrolled',
  Alumni: 'graduated',
  Transferred: 'transferred_out',
  Suspended: 'suspended',
  Expelled: 'withdrawn',
  Withdrawn: 'withdrawn',
};

const LEGACY_GENDER: Record<LearnerRow['gender'], string> = {
  female: 'Female',
  male: 'Male',
  other: 'Other',
  not_stated: 'Other',
};

const CANONICAL_GENDER: Record<string, LearnerRow['gender']> = {
  Female: 'female',
  Male: 'male',
  Other: 'other',
};

/** The legacy status values the learner form offers. */
export const LEARNER_STATUS_OPTIONS = [
  { value: 'Active', label: 'Active' },
  { value: 'Suspended', label: 'Suspended' },
  { value: 'Transferred', label: 'Transferred' },
  { value: 'Alumni', label: 'Alumni' },
  { value: 'Expelled', label: 'Expelled' },
  { value: 'Withdrawn', label: 'Withdrawn' },
] as const;

/** The legacy gender values the learner form offers. */
export const LEARNER_GENDER_OPTIONS = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
] as const;

/** A canonical learner, shaped the way the administration pages read a student. */
export interface CanonicalLearner {
  readonly id: string;
  readonly admission_no: string;
  readonly first_name: string;
  readonly middle_name: string;
  readonly last_name: string;
  readonly display_name: string;
  readonly name: string;
  readonly gender: string;
  readonly status: string;
  readonly date_of_birth: string;
  readonly admission_date: string;
  readonly current_class_stream_id: string | null;
  readonly class_group_id: string | null;
  readonly current_class_name: string;
  readonly current_class_stream_name: string;
  readonly primary_guardian: string;
  readonly primary_guardian_id: string | null;
  readonly primary_guardian_phone: string;
  readonly primary_guardian_relationship: string;
  readonly phone: string;
  readonly email: string;
  readonly upi_no: string;
  readonly previous_school: string;
  readonly county: string;
  readonly religion: string;
  readonly remarks: string;
  readonly is_active: boolean;
  readonly deleted_at: string | null;
  readonly rowVersion: number;
}

/** The values the learner form collects, as the pages hold them. */
export interface LearnerFormValues {
  readonly admission_no: string;
  readonly first_name: string;
  readonly middle_name?: string;
  readonly last_name: string;
  readonly gender: string;
  readonly status: string;
  readonly date_of_birth?: string;
  readonly admission_date?: string;
  readonly current_class_stream_id?: string | null;
  readonly upi_no?: string;
  readonly previous_school?: string;
  readonly county?: string;
  readonly religion?: string;
  readonly remarks?: string;
  readonly phone?: string;
  readonly email?: string;
}

/** The primary contact of a learner, ready for the directory and the edit form. */
export interface PrimaryGuardian {
  readonly guardian: GuardianRow;
  readonly link: LearnerGuardianRow;
  readonly name: string;
  readonly phone: string;
  readonly relationship: string;
}

export interface LearnerGuardianInput {
  readonly guardianId?: string | null;
  readonly name: string;
  readonly phone: string;
  readonly relationship: string;
}

function attributeOf(row: LearnerRow, key: string): string {
  const value = row.attributes?.[key];
  return typeof value === 'string' ? value : '';
}

function toPhone(value: string | undefined): { number: string } | undefined {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return { number: digits };
  const national = digits.replace(/^0+/, '');
  return national ? { number: `+254${national}` } : undefined;
}

/** Maps a canonical learner row into the view the administration pages read. */
export function toCanonicalLearner(
  row: LearnerRow,
  placement: { readonly classGroup?: ClassGroupRow; readonly levelName: string } | undefined,
  guardian: PrimaryGuardian | undefined,
  upi: string
): CanonicalLearner {
  const first = row.given_name ?? '';
  const middle = row.middle_names?.[0] ?? '';
  const last = row.family_name ?? '';
  const displayName = `${row.preferred_name ?? first} ${last}`.trim();
  const classGroup = placement?.classGroup;
  return {
    id: row.id,
    admission_no: row.admission_number,
    first_name: first,
    middle_name: middle,
    last_name: last,
    display_name: displayName,
    name: displayName || row.admission_number,
    gender: LEGACY_GENDER[row.gender],
    status: LEGACY_STATUS[row.status],
    date_of_birth: row.date_of_birth ?? '',
    admission_date: row.admission_date ?? '',
    current_class_stream_id: classGroup?.id ?? null,
    class_group_id: classGroup?.id ?? null,
    current_class_name: placement?.levelName ?? '',
    current_class_stream_name: classGroup?.name ?? '',
    primary_guardian: guardian?.name ?? '',
    primary_guardian_id: guardian?.guardian.id ?? null,
    primary_guardian_phone: guardian?.phone ?? '',
    primary_guardian_relationship: guardian?.relationship ?? 'Guardian',
    phone: row.phones?.[0]?.number ?? '',
    email: row.emails?.[0]?.address ?? '',
    upi_no: upi,
    previous_school: row.previous_school ?? '',
    county: row.address?.region ?? '',
    religion: attributeOf(row, 'religion'),
    remarks: attributeOf(row, 'remarks'),
    is_active: row.status === 'enrolled',
    deleted_at: row.deleted_at ?? null,
    rowVersion: row.rowVersion,
  };
}

function attributesOf(values: LearnerFormValues): Record<string, string> | undefined {
  const attributes: Record<string, string> = {};
  if (values.religion?.trim()) attributes.religion = values.religion.trim();
  if (values.remarks?.trim()) attributes.remarks = values.remarks.trim();
  return Object.keys(attributes).length > 0 ? attributes : undefined;
}

function personFieldsOf(values: LearnerFormValues) {
  const phone = toPhone(values.phone);
  const email = values.email?.trim();
  return {
    given_name: values.first_name.trim(),
    family_name: values.last_name.trim(),
    name_order: 'given_first' as const,
    gender: CANONICAL_GENDER[values.gender] ?? 'not_stated',
    ...(values.middle_name?.trim() ? { middle_names: [values.middle_name.trim()] } : {}),
    ...(values.date_of_birth ? { date_of_birth: values.date_of_birth } : {}),
    ...(phone ? { phones: [phone] } : {}),
    ...(email ? { emails: [{ address: email }] } : {}),
    ...(values.county?.trim() ? { address: { region: values.county.trim() } } : {}),
    ...(attributesOf(values) ? { attributes: attributesOf(values) } : {}),
  };
}

/** The writable values of a learner create, validated by the entity schema before the write. */
export function learnerCreateInput(
  values: LearnerFormValues,
  institutionId: string
): CreateInput<'learner'> {
  return {
    institution_id: institutionId,
    ...personFieldsOf(values),
    admission_number: values.admission_no.trim(),
    status: CANONICAL_STATUS[values.status] ?? 'enrolled',
    residence_status: 'day',
    ...(values.admission_date ? { admission_date: values.admission_date } : {}),
    ...(values.previous_school?.trim() ? { previous_school: values.previous_school.trim() } : {}),
  };
}

/** The patch of a learner edit, validated by the entity schema before the write. */
export function learnerUpdateInput(values: LearnerFormValues): UpdateInput<'learner'> {
  return {
    ...personFieldsOf(values),
    admission_number: values.admission_no.trim(),
    status: CANONICAL_STATUS[values.status] ?? 'enrolled',
    ...(values.admission_date ? { admission_date: values.admission_date } : {}),
    ...(values.previous_school !== undefined
      ? { previous_school: values.previous_school.trim() }
      : {}),
  };
}

/** The canonical relationship a legacy relationship label stands for. */
export function guardianRelationshipOf(label: string): GuardianRelationship {
  switch (label.toLowerCase()) {
    case 'mother':
      return 'mother';
    case 'father':
      return 'father';
    case 'grandparent':
      return 'grandparent';
    case 'sibling':
      return 'sibling';
    case 'sponsor':
      return 'sponsor';
    case 'other':
      return 'other';
    default:
      return 'guardian';
  }
}

/** Splits a full name into the given and family names the person shape holds. */
export function splitPersonName(fullName: string): { givenName: string; familyName: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { givenName: '', familyName: '' };
  if (parts.length === 1) return { givenName: parts[0] as string, familyName: parts[0] as string };
  return {
    givenName: parts.slice(0, -1).join(' '),
    familyName: parts[parts.length - 1] as string,
  };
}

/**
 * Saves the primary contact of a learner.
 *
 * A guardian the school already holds, matched by phone, is linked instead of created a
 * second time (spec 02 §13). The link that was primary steps down through the service.
 */
export async function savePrimaryGuardian(
  repository: Repository,
  input: {
    readonly institutionId: string;
    readonly learnerId: string;
    readonly current: LearnerGuardianInput;
    readonly next: LearnerGuardianInput;
  }
): Promise<void> {
  const service = new GuardianService({ repository });
  const name = input.next.name.trim();
  if (!name) {
    if (input.current.guardianId) {
      await service.unlinkGuardian(
        asId<'learner'>(input.learnerId),
        asId<'guardian'>(input.current.guardianId)
      );
    }
    return;
  }

  const { givenName, familyName } = splitPersonName(name);
  const phone = toPhone(input.next.phone);

  let guardian: GuardianRow | undefined;
  if (input.next.guardianId) {
    const existing = await repository.get('guardian', asId<'guardian'>(input.next.guardianId));
    if (existing) {
      guardian = await service.updateGuardian(existing.id, {
        givenName,
        familyName,
        ...(phone ? { phones: [phone] } : {}),
      });
    }
  }
  if (!guardian) {
    const matches = input.next.phone
      ? await service.findByPhone(input.next.phone, {
          institutionId: asId<'institution'>(input.institutionId),
        })
      : [];
    guardian =
      matches[0] ??
      (await service.addGuardian({
        institutionId: asId<'institution'>(input.institutionId),
        givenName,
        familyName,
        nameOrder: 'given_first',
        ...(phone ? { phones: [phone] } : {}),
      }));
  }

  const relationship = guardianRelationshipOf(input.next.relationship);
  if (input.current.guardianId === guardian.id) {
    if (input.current.relationship !== relationship) {
      const links = await repository.list('learner_guardian', {
        where: {
          learner_id: asId<'learner'>(input.learnerId),
          guardian_id: guardian.id,
        },
        limit: 1,
      });
      const link = links.items[0];
      if (link) {
        await repository.update(
          'learner_guardian',
          link.id,
          { relationship },
          { expectedVersion: link.rowVersion }
        );
      }
    }
    return;
  }

  if (input.current.guardianId) {
    await service.unlinkGuardian(
      asId<'learner'>(input.learnerId),
      asId<'guardian'>(input.current.guardianId)
    );
  }
  await service.linkGuardian({
    learnerId: asId<'learner'>(input.learnerId),
    guardianId: guardian.id,
    relationship,
    isPrimary: true,
  });
}

/** The canonical learners of the institution, with their class placement and primary contact. */
export function useCanonicalLearners() {
  const repository = useCanonicalRepository();
  const learnersQuery = useEntityQuery(repository, 'learner');
  const learnersLookup = useLookup(repository, 'learner', {});
  const enrolmentsQuery = useEntityQuery(repository, 'enrolment');
  const classGroupsQuery = useEntityQuery(repository, 'class_group');
  const levels = useLookup(repository, 'level', {});
  const guardiansQuery = useEntityQuery(repository, 'guardian');
  const linksQuery = useEntityQuery(repository, 'learner_guardian');
  const identifiersQuery = useEntityQuery(repository, 'identifier', {
    where: { owner_type: 'learner' },
  });

  const classGroupById = useMemo(() => {
    const map = new Map<string, ClassGroupRow>();
    for (const row of classGroupsQuery.data?.items ?? []) map.set(row.id, row);
    return map;
  }, [classGroupsQuery.data]);

  const placementByLearner = useMemo(() => {
    const map = new Map<string, EnrolmentRow>();
    for (const row of enrolmentsQuery.data?.items ?? []) {
      if (row.status !== 'active') continue;
      map.set(row.learner_id, row);
    }
    return map;
  }, [enrolmentsQuery.data]);

  const guardianById = useMemo(() => {
    const map = new Map<string, GuardianRow>();
    for (const row of guardiansQuery.data?.items ?? []) map.set(row.id, row);
    return map;
  }, [guardiansQuery.data]);

  const primaryGuardianByLearner = useMemo(() => {
    const map = new Map<string, PrimaryGuardian>();
    for (const link of linksQuery.data?.items ?? []) {
      if (!link.is_primary) continue;
      const guardian = guardianById.get(link.guardian_id);
      if (!guardian) continue;
      map.set(link.learner_id, {
        guardian,
        link,
        name: `${guardian.preferred_name ?? guardian.given_name} ${guardian.family_name}`.trim(),
        phone: guardian.phones?.[0]?.number ?? '',
        relationship: link.relationship,
      });
    }
    return map;
  }, [linksQuery.data, guardianById]);

  const upiByLearner = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of identifiersQuery.data?.items ?? []) {
      if (row.scheme === LEARNER_UPI_SCHEME) map.set(row.owner_id, row.value);
    }
    return map;
  }, [identifiersQuery.data]);

  const learners = useMemo<CanonicalLearner[]>(
    () =>
      (learnersQuery.data?.items ?? []).map((row) => {
        const enrolment = placementByLearner.get(row.id);
        const classGroup = enrolment ? classGroupById.get(enrolment.class_group_id) : undefined;
        const levelName = classGroup ? levels.label(asId<'level'>(classGroup.level_id), '') : '';
        return toCanonicalLearner(
          row,
          { ...(classGroup ? { classGroup } : {}), levelName },
          primaryGuardianByLearner.get(row.id),
          upiByLearner.get(row.id) ?? ''
        );
      }),
    [learnersQuery.data, placementByLearner, classGroupById, levels, primaryGuardianByLearner, upiByLearner]
  );

  return {
    learners,
    learnerRows: learnersQuery.data?.items ?? [],
    learnersLookup,
    classGroupRows: classGroupsQuery.data?.items ?? [],
    guardianRows: guardiansQuery.data?.items ?? [],
    status: learnersQuery.status,
    isLoading:
      learnersQuery.status === 'loading' ||
      enrolmentsQuery.status === 'loading' ||
      classGroupsQuery.status === 'loading',
    error: learnersQuery.error,
  };
}

/** The entity names the learner directory writes through. */
export const LEARNER_WRITE_ENTITIES: readonly EntityName[] = [
  'learner',
  'guardian',
  'learner_guardian',
  'identifier',
  'enrolment',
];

/** Where a learner is placed, and the day the placement starts. */
export interface LearnerPlacement {
  readonly classGroupId?: string | null;
  readonly startDate?: string;
}

/** The learner, the guardian and the first enrolment written in one transaction. */
export async function admitLearner(
  repository: Repository,
  input: {
    readonly institutionId: string;
    readonly values: LearnerFormValues;
    readonly guardian?: LearnerGuardianInput;
    readonly placement?: LearnerPlacement;
  }
): Promise<{ readonly learnerId: string; readonly enrolmentId: string | null }> {
  const learnerId = await repository.transaction(async () => {
    const learner = await repository.create(
      'learner',
      learnerCreateInput(input.values, input.institutionId)
    );
    const learnerId = learner.id;

    if (input.values.upi_no?.trim()) {
      const identifiers = new GuardianService({ repository });
      await identifiers.addIdentifier({
        owner: { ownerType: 'learner', ownerId: asId<'learner'>(learnerId) },
        scheme: LEARNER_UPI_SCHEME,
        value: input.values.upi_no.trim(),
      });
    }

    if (input.placement?.classGroupId) {
      const enrolments = new EnrolmentService({ repository });
      await enrolments.enrol({
        learnerId: asId<'learner'>(learnerId),
        classGroupId: asId<'class_group'>(input.placement.classGroupId),
        startDate:
          input.placement.startDate ||
          input.values.admission_date ||
          new Date().toISOString().slice(0, 10),
      });
    }

    if (input.guardian?.name?.trim()) {
      await savePrimaryGuardian(repository, {
        institutionId: input.institutionId,
        learnerId,
        current: { name: '', phone: '', relationship: 'Guardian' },
        next: input.guardian,
      });
    }

    return learnerId;
  });

  const enrolments = await repository.list('enrolment', {
    where: { learner_id: learnerId },
    limit: 1,
  });
  return { learnerId, enrolmentId: enrolments.items[0]?.id ?? null };
}

/** Corrects a learner, moves the placement and keeps the primary guardian in step. */
export async function updateLearner(
  repository: Repository,
  input: {
    readonly learner: LearnerRow;
    readonly values: LearnerFormValues;
    readonly guardian?: LearnerGuardianInput;
    readonly currentGuardian?: LearnerGuardianInput;
    readonly placement?: LearnerPlacement;
  }
): Promise<void> {
  await repository.transaction(async () => {
    await repository.update('learner', input.learner.id, learnerUpdateInput(input.values), {
      expectedVersion: input.learner.rowVersion,
    });

    const classGroupId = input.placement?.classGroupId ?? null;
    const enrolments = await repository.list('enrolment', {
      where: { learner_id: input.learner.id },
      limit: 100,
    });
    const active = enrolments.items.find((row) => row.status === 'active');
    if (classGroupId && (!active || active.class_group_id !== classGroupId)) {
      const service = new EnrolmentService({ repository });
      if (active) {
        await service.transfer(active.id, {
          toClassGroupId: asId<'class_group'>(classGroupId),
          effectiveDate: new Date().toISOString().slice(0, 10),
          reason: 'placement corrected in the learner directory',
        });
      } else {
        await service.enrol({
          learnerId: asId<'learner'>(input.learner.id),
          classGroupId: asId<'class_group'>(classGroupId),
          startDate: input.values.admission_date || new Date().toISOString().slice(0, 10),
        });
      }
    } else if (active && input.placement && !classGroupId) {
      await service_end(repository, active.id);
    }

    if (input.guardian) {
      await savePrimaryGuardian(repository, {
        institutionId: input.learner.institution_id,
        learnerId: input.learner.id,
        current: input.currentGuardian ?? { name: '', phone: '', relationship: 'Guardian' },
        next: input.guardian,
      });
    }
  });
}

/** Ends the active enrolment of a learner that the directory took out of its class. */
async function service_end(repository: Repository, enrolmentId: string): Promise<void> {
  const service = new EnrolmentService({ repository });
  await service.end(asId<'enrolment'>(enrolmentId), {
    exitReason: 'withdrawn',
    endDate: new Date().toISOString().slice(0, 10),
  });
}
