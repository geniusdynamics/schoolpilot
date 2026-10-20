// ABOUTME: The canonical staff the HR pages read: staff rows with their job title and department resolved.
// ABOUTME: Names are resolved through lookups; ids stay opaque strings.

import { useMemo } from 'react';

import { useEntityQuery, useLookup } from '@/data/query';
import type { RepositoryRow } from '@/data/repository';
import { asId } from '@/domain/ids';

import { useCanonicalRepository } from './canonicalRepository';

/** A canonical staff member, shaped the way the HR pages read a staff member. */
export interface CanonicalStaffMember {
  readonly id: string;
  readonly employee_number: string;
  readonly given_name: string;
  readonly family_name: string;
  readonly display_name: string;
  readonly phone: string;
  readonly email: string;
  readonly date_of_birth: string;
  readonly gender: string;
  readonly employment_type: string;
  readonly job_title_id: string | null;
  readonly job_title: string;
  readonly department_ids: readonly string[];
  readonly department: string;
  readonly is_active: boolean;
  readonly created_at: string;
}

type StaffRow = RepositoryRow<'staff'>;

/** Resolves a staff row into the shape the HR pages read. */
export function toCanonicalStaffMember(
  row: StaffRow,
  jobTitleLabel: (id: string) => string,
  departmentLabel: (id: string) => string
): CanonicalStaffMember {
  const givenName = row.given_name ?? '';
  const familyName = row.family_name ?? '';
  const departmentIds = row.department_ids ?? [];
  return {
    id: row.id,
    employee_number: row.employee_number ?? '',
    given_name: givenName,
    family_name: familyName,
    display_name: `${row.preferred_name ?? givenName} ${familyName}`.trim(),
    phone: row.phones?.[0]?.number ?? '',
    email: row.emails?.[0]?.address ?? '',
    date_of_birth: row.date_of_birth ?? '',
    gender: row.gender ?? '',
    employment_type: row.employment_type ?? '',
    job_title_id: row.job_title_id ?? null,
    job_title: row.job_title_id ? jobTitleLabel(row.job_title_id) : '',
    department_ids: departmentIds,
    department: departmentIds.map((id) => departmentLabel(id)).filter(Boolean).join(', '),
    // A staff member is on the books until the employment ends.
    is_active: !row.end_date,
    created_at: row.created_at ?? '',
  };
}

/** The canonical staff of the institution, with the job title and department of each. */
export function useCanonicalStaff() {
  const repository = useCanonicalRepository();
  const staffQuery = useEntityQuery(repository, 'staff');
  const staffLookup = useLookup(repository, 'staff', {});
  const jobTitles = useLookup(repository, 'job_title', {});
  const departments = useLookup(repository, 'department', {});

  const staff = useMemo(
    () =>
      (staffQuery.data?.items ?? []).map((row) =>
        toCanonicalStaffMember(
          row,
          (id) => jobTitles.label(asId<'job_title'>(id), ''),
          (id) => departments.label(asId<'department'>(id), '')
        )
      ),
    [staffQuery.data, jobTitles, departments]
  );

  return {
    staff,
    /** The lookup a staff picker binds to. */
    staffLookup,
    status: staffQuery.status,
    isLoading: staffQuery.status === 'loading',
    error: staffQuery.error,
  };
}
