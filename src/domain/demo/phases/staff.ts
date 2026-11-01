// ABOUTME: The staff of the demo school: departments with their heads, job titles, the members of staff
// ABOUTME: with how they are employed, and the class teacher of every class group.

import type { RepositoryRow } from '@/data/repository';
import { asId } from '@/domain/ids';

import { DEPARTMENTS, JOB_TITLES, STAFF } from '../cast';
import type { DemoContext } from './context';
import { findOrCreate, sequenceYear } from './helpers';

/** The class teachers, in the order they take the class groups of the current year. */
const CLASS_TEACHERS = ['deputy', 'science', 'english', 'humanities', 'maths', 'kiswahili'] as const;

export interface DemoStaff {
  /** The members of staff by the key the cast names them with. */
  readonly byKey: ReadonlyMap<string, RepositoryRow<'staff'>>;
  readonly all: readonly RepositoryRow<'staff'>[];
}

/** Writes the departments, the job titles and the staff, and gives every class group its class teacher. */
export async function seedStaff(ctx: DemoContext): Promise<DemoStaff> {
  const { repository, institutionId, options } = ctx;

  const departments = new Map<string, RepositoryRow<'department'>>();
  for (const department of DEPARTMENTS) {
    const row = await findOrCreate<'department'>(
      repository,
      'department',
      { where: { institution_id: institutionId, name: department.name } },
      () => ({ institution_id: institutionId, name: department.name, kind: department.kind }),
      options,
      () => ctx.count('department')
    );
    departments.set(department.name, row);
  }

  const jobTitles = new Map<string, RepositoryRow<'job_title'>>();
  for (const title of JOB_TITLES) {
    const row = await findOrCreate<'job_title'>(
      repository,
      'job_title',
      { where: { institution_id: institutionId, name: title.name } },
      () => ({ institution_id: institutionId, name: title.name, category: title.category }),
      options,
      () => ctx.count('job_title')
    );
    jobTitles.set(title.name, row);
  }

  const currentYear = sequenceYear(ctx.current.year.start_date);
  const byKey = new Map<string, RepositoryRow<'staff'>>();
  const all: RepositoryRow<'staff'>[] = [];
  for (const person of STAFF) {
    const department = departments.get(person.department);
    const jobTitle = jobTitles.get(person.title);
    const row = await findOrCreate<'staff'>(
      repository,
      'staff',
      { where: { institution_id: institutionId, employee_number: person.number } },
      () => ({
        institution_id: institutionId,
        given_name: person.given,
        family_name: person.family,
        name_order: 'given_first',
        gender: person.gender,
        employee_number: person.number,
        employment_type: person.employment,
        ...(jobTitle ? { job_title_id: asId<'job_title'>(jobTitle.id) } : {}),
        department_ids: department ? [asId<'department'>(department.id)] : [],
        // Whether the government or the board pays a salary is what the payroll reads.
        payroll_profile: { payer: person.employment === 'permanent' ? 'TSC' : 'BOM' },
        start_date: `${currentYear - person.startedYearsAgo}-01-06`,
      }),
      options,
      () => ctx.count('staff')
    );
    byKey.set(person.key, row);
    all.push(row);
  }

  // The head of a department is the member of staff the roster marks as its head.
  for (const person of STAFF) {
    if (!person.head) continue;
    const department = departments.get(person.department);
    const member = byKey.get(person.key);
    if (!department || !member || department.head_staff_id === member.id) continue;
    const updated = await repository.update(
      'department',
      department.id,
      { head_staff_id: asId<'staff'>(member.id) },
      { expectedVersion: department.rowVersion, ...options }
    );
    departments.set(person.department, updated);
  }

  // Every class group of the current year has a class teacher, taken in turn from the teaching staff.
  for (const [index, group] of ctx.current.classGroups.entries()) {
    const teacher = byKey.get(CLASS_TEACHERS[index % CLASS_TEACHERS.length] ?? 'deputy');
    if (!teacher || group.homeroom_teacher_ids.includes(teacher.id)) continue;
    await repository.update(
      'class_group',
      group.id,
      { homeroom_teacher_ids: [asId<'staff'>(teacher.id)] },
      { expectedVersion: group.rowVersion, ...options }
    );
  }

  return { byKey, all };
}
