// ABOUTME: The canonical staff the administration pages read, shaped for the staff grids and forms.
// ABOUTME: Names are resolved through the department and job-title lookups; ids stay opaque strings.

import { useMemo } from 'react';

import { useEntityQuery, useLookup } from '@/data/query';
import type { CreateInput, Repository, RepositoryRow, UpdateInput } from '@/data/repository';
import { asId } from '@/domain/ids';
import type { Email, Phone } from '@/domain/schema';

import { useCanonicalRepository } from './canonicalRepository';

type StaffRow = RepositoryRow<'staff'>;

/** The identifier schemes a member of staff carries. */
export const STAFF_NATIONAL_ID_SCHEME = 'national_id';
export const STAFF_EMPLOYER_NUMBER_SCHEME = 'employer_number';

/** A canonical staff member, shaped the way the administration pages read one. */
export interface CanonicalStaffMember {
  readonly id: string;
  readonly institution_id: string;
  readonly employee_number: string;
  /** The legacy column name the staff grids read. */
  readonly staff_no: string;
  readonly given_name: string;
  readonly first_name: string;
  readonly family_name: string;
  readonly last_name: string;
  readonly display_name: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly gender: string;
  readonly date_of_birth: string;
  readonly employment_type: string;
  readonly job_title_id: string | null;
  readonly designation_id: string | null;
  readonly job_title: string;
  readonly designation_title: string;
  readonly department_ids: readonly string[];
  readonly department_id: string | null;
  readonly department: string;
  readonly department_name: string;
  readonly hod_of_department_id: string | null;
  readonly hod_of_department_name: string;
  readonly national_id: string;
  readonly employer_number: string;
  readonly is_active: boolean;
  readonly start_date: string;
  readonly end_date: string | null;
  readonly deleted_at: string | null;
  readonly created_at: string;
  readonly rowVersion: number;
}

/** The values the staff form collects, mapped from a canonical row. */
export interface StaffFormValues {
  readonly staff_no: string;
  readonly first_name: string;
  readonly last_name: string;
  readonly phone: string;
  readonly email: string;
  readonly gender: string;
  readonly employment_type: string;
  readonly department_id: string | null;
  readonly designation_id: string | null;
  readonly start_date: string;
  readonly end_date: string | null;
  readonly is_active: boolean;
  readonly national_id: string;
  readonly employer_number: string;
}

/** The canonical employment types, in the order the staff form offers them. */
export const EMPLOYMENT_TYPE_OPTIONS = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'board_employed', label: 'Board of Management' },
  { value: 'volunteer', label: 'Volunteer' },
  { value: 'intern', label: 'Intern / Attachment' },
] as const;

/** The canonical person genders, in the order the staff form offers them. */
export const GENDER_OPTIONS = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'not_stated', label: 'Not stated' },
] as const;

/** A phone the schema accepts: an E.164 number, kept when the caller already wrote one. */
function toPhone(value: string | undefined): Phone | undefined {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return undefined;
  const digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) return { number: digits };
  const national = digits.replace(/^0+/, '');
  return national ? { number: `+254${national}` } : undefined;
}

/** The phone number as the staff grid shows it. */
export function phoneOf(row: StaffRow): string {
  return row.phones?.[0]?.number ?? '';
}

function toEmail(value: string | undefined): Email | undefined {
  const trimmed = (value ?? '').trim();
  return trimmed ? { address: trimmed } : undefined;
}

/** The employer number and the national id a staff member carries as identifiers. */
export interface StaffIdentifiers {
  readonly nationalId: string;
  readonly employerNumber: string;
}

/** Maps a canonical staff row into the view the administration pages read. */
export function toCanonicalStaffMember(
  row: StaffRow,
  jobTitleLabel: (id: string) => string,
  departmentLabel: (id: string) => string,
  identifiers: StaffIdentifiers = { nationalId: '', employerNumber: '' },
  headedDepartment?: { readonly id: string; readonly name: string }
): CanonicalStaffMember {
  const givenName = row.given_name ?? '';
  const familyName = row.family_name ?? '';
  const departmentIds = row.department_ids ?? [];
  const displayName = `${row.preferred_name ?? givenName} ${familyName}`.trim();
  const department = departmentIds.map((id) => departmentLabel(id)).filter(Boolean).join(', ');
  return {
    id: row.id,
    institution_id: row.institution_id,
    employee_number: row.employee_number,
    staff_no: row.employee_number,
    given_name: givenName,
    first_name: givenName,
    family_name: familyName,
    last_name: familyName,
    display_name: displayName,
    name: displayName || row.employee_number,
    phone: phoneOf(row),
    email: row.emails?.[0]?.address ?? '',
    gender: row.gender ?? '',
    date_of_birth: row.date_of_birth ?? '',
    employment_type: row.employment_type,
    job_title_id: row.job_title_id ?? null,
    designation_id: row.job_title_id ?? null,
    job_title: row.job_title_id ? jobTitleLabel(row.job_title_id) : '',
    designation_title: row.job_title_id ? jobTitleLabel(row.job_title_id) : '',
    department_ids: departmentIds,
    department_id: departmentIds[0] ?? null,
    department,
    department_name: department,
    hod_of_department_id: headedDepartment?.id ?? null,
    hod_of_department_name: headedDepartment?.name ?? '',
    national_id: identifiers.nationalId,
    employer_number: identifiers.employerNumber,
    // A staff member is on the books until the employment ends.
    is_active: !row.end_date,
    start_date: row.start_date,
    end_date: row.end_date ?? null,
    deleted_at: row.deleted_at ?? null,
    created_at: row.created_at ?? '',
    rowVersion: row.rowVersion,
  };
}

/** The writable values of a staff form, validated by the entity schema before the write. */
export function staffCreateInput(
  values: StaffFormValues,
  institutionId: string
): CreateInput<'staff'> {
  const phone = toPhone(values.phone);
  const email = toEmail(values.email);
  const departmentId = values.department_id;
  return {
    institution_id: institutionId,
    given_name: values.first_name.trim(),
    family_name: values.last_name.trim(),
    name_order: 'given_first',
    gender: (values.gender || 'not_stated') as StaffRow['gender'],
    employee_number: values.staff_no.trim(),
    employment_type: (values.employment_type || 'permanent') as StaffRow['employment_type'],
    department_ids: departmentId ? [departmentId] : [],
    start_date: values.start_date || new Date().toISOString().slice(0, 10),
    ...(values.designation_id ? { job_title_id: values.designation_id } : {}),
    ...(values.end_date ? { end_date: values.end_date } : {}),
    ...(phone ? { phones: [phone] } : {}),
    ...(email ? { emails: [email] } : {}),
  };
}

/** The patch of a staff edit, validated by the entity schema before the write. */
export function staffUpdateInput(values: StaffFormValues): UpdateInput<'staff'> {
  const phone = toPhone(values.phone);
  const email = toEmail(values.email);
  const departmentId = values.department_id;
  return {
    given_name: values.first_name.trim(),
    family_name: values.last_name.trim(),
    gender: (values.gender || 'not_stated') as StaffRow['gender'],
    employee_number: values.staff_no.trim(),
    employment_type: (values.employment_type || 'permanent') as StaffRow['employment_type'],
    department_ids: departmentId ? [departmentId] : [],
    ...(values.designation_id ? { job_title_id: values.designation_id } : {}),
    ...(values.end_date ? { end_date: values.end_date } : { end_date: null }),
    ...(phone ? { phones: [phone] } : { phones: [] }),
    ...(email ? { emails: [email] } : { emails: [] }),
  };
}

/** The canonical staff of the institution, with the job title and department of each. */
export function useCanonicalStaff() {
  const repository = useCanonicalRepository();
  const staffQuery = useEntityQuery(repository, 'staff');
  const staffLookup = useLookup(repository, 'staff', {});
  const jobTitles = useLookup(repository, 'job_title', {});
  const departments = useLookup(repository, 'department', {});
  const identifiersQuery = useEntityQuery(repository, 'identifier', {
    where: { owner_type: 'staff' },
  });

  const identifiersByOwner = useMemo(() => {
    const map = new Map<string, StaffIdentifiers>();
    for (const row of identifiersQuery.data?.items ?? []) {
      const current = map.get(row.owner_id) ?? { nationalId: '', employerNumber: '' };
      if (row.scheme === STAFF_NATIONAL_ID_SCHEME) {
        map.set(row.owner_id, { ...current, nationalId: row.value });
      } else if (row.scheme === STAFF_EMPLOYER_NUMBER_SCHEME) {
        map.set(row.owner_id, { ...current, employerNumber: row.value });
      }
    }
    return map;
  }, [identifiersQuery.data]);

  const headedDepartmentByStaff = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const row of departments.options as readonly RepositoryRow<'department'>[]) {
      if (row.head_staff_id) map.set(row.head_staff_id, { id: row.id, name: row.name });
    }
    return map;
  }, [departments.options]);

  const staff = useMemo<CanonicalStaffMember[]>(
    () =>
      (staffQuery.data?.items ?? []).map((row) =>
        toCanonicalStaffMember(
          row,
          (id) => jobTitles.label(asId<'job_title'>(id), ''),
          (id) => departments.label(asId<'department'>(id), ''),
          identifiersByOwner.get(row.id),
          headedDepartmentByStaff.get(row.id)
        )
      ),
    [staffQuery.data, jobTitles, departments, identifiersByOwner, headedDepartmentByStaff]
  );

  return {
    staff,
    staffRows: staffQuery.data?.items ?? [],
    staffLookup,
    jobTitles,
    departments,
    status: staffQuery.status,
    isLoading:
      staffQuery.status === 'loading' ||
      identifiersQuery.status === 'loading' ||
      departments.status === 'loading',
    error: staffQuery.error,
  };
}

/** The institution the administration pages write into. */
export function useInstitutionId(): string | null {
  const repository = useCanonicalRepository();
  const institutions = useEntityQuery(repository, 'institution', { limit: 1 });
  return institutions.data?.items[0]?.id ?? null;
}

/**
 * Records the national id and the employer number a member of staff carries.
 *
 * Both live in the canonical identifier entity, one row per scheme. A scheme that is
 * present is updated in place; a scheme that is cleared removes its row.
 */
export async function saveStaffIdentifiers(
  repository: Repository,
  input: {
    readonly staffId: string;
    readonly institutionId: string;
    readonly nationalId: string;
    readonly employerNumber: string;
  }
): Promise<void> {
  const existing = await repository.list('identifier', {
    where: { owner_type: 'staff', owner_id: asId<'staff'>(input.staffId) },
    limit: 20,
  });
  const byScheme = new Map(existing.items.map((row) => [row.scheme, row] as const));

  const wanted: ReadonlyArray<readonly [string, string]> = [
    [STAFF_NATIONAL_ID_SCHEME, input.nationalId.trim()],
    [STAFF_EMPLOYER_NUMBER_SCHEME, input.employerNumber.trim()],
  ];

  for (const [scheme, value] of wanted) {
    const current = byScheme.get(scheme);
    if (!value) {
      if (current) await repository.remove('identifier', current.id);
      continue;
    }
    if (current) {
      if (current.value === value) continue;
      await repository.update('identifier', current.id, { value }, {
        expectedVersion: current.rowVersion,
      });
      continue;
    }
    await repository.create('identifier', {
      institution_id: input.institutionId,
      owner_type: 'staff',
      owner_id: asId<'staff'>(input.staffId),
      scheme,
      value,
    });
  }
}
