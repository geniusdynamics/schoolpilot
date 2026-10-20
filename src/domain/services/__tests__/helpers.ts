// ABOUTME: The fixtures the service tests share: a real SQLite database with the canonical
// ABOUTME: registry seeded, and the rows a test adds on top of it.

import type { CreateInput, Repository, RepositoryRow } from '@/data/repository';
import {
  closeTestContext,
  createTestContext,
  seededId,
  type TestContext,
} from '@/data/repository/__tests__/helpers';
import { asId, type Id } from '@/domain/ids';
import type { EntityName } from '@/domain/schema';

import type {
  AdmissionGuardianInput,
  AdmissionLearnerInput,
} from '../admissionService';

export { closeTestContext, createTestContext, seededId };
export type { TestContext };

/** The world a service test works in. */
export interface ServiceFixture {
  readonly context: TestContext;
  readonly repository: Repository;
  readonly institutionId: Id<'institution'>;
  readonly campusId: Id<'campus'>;
  readonly calendarId: Id<'calendar'>;
  readonly academicYearId: Id<'academic_year'>;
  readonly academicPeriodId: Id<'academic_period'>;
  readonly programmeId: Id<'programme'>;
  readonly levelId: Id<'level'>;
  readonly stageId: Id<'stage'>;
  readonly classGroupId: Id<'class_group'>;
  readonly staffId: Id<'staff'>;
}

/** Opens the database and names the rows of the seeded registry. */
export async function createServiceFixture(): Promise<ServiceFixture> {
  const context = await createTestContext();

  return {
    context,
    repository: context.repository,
    institutionId: seededId(context, 'institution'),
    campusId: seededId(context, 'campus'),
    calendarId: seededId(context, 'calendar'),
    academicYearId: seededId(context, 'academic_year'),
    academicPeriodId: seededId(context, 'academic_period'),
    programmeId: seededId(context, 'programme'),
    levelId: seededId(context, 'level'),
    stageId: seededId(context, 'stage'),
    classGroupId: seededId(context, 'class_group'),
    staffId: seededId(context, 'staff'),
  };
}

/** A counter that keeps the names of the rows a test creates apart. */
let sequence = 0;

function nextSuffix(): string {
  sequence += 1;
  return String(sequence);
}

/** The id of a row that does not exist, for the tests of a missing reference. */
export function missingId<E extends EntityName>(suffix: string): Id<E> {
  return asId<E>(`01930000-0000-7000-8000-${suffix}`);
}

/** A learner of the test, with a fresh admission number. */
export async function createLearner(
  fixture: ServiceFixture,
  overrides: Partial<CreateInput<'learner'>> = {}
): Promise<RepositoryRow<'learner'>> {
  return fixture.repository.create('learner', {
    institution_id: fixture.institutionId,
    given_name: 'Test',
    family_name: `Learner ${nextSuffix()}`,
    name_order: 'given_first',
    gender: 'not_stated',
    admission_number: `ADM/TEST/${nextSuffix()}`,
    status: 'enrolled',
    residence_status: 'day',
    ...overrides,
  });
}

/** A class group of the year, level and programme of the test. */
export async function createClassGroup(
  fixture: ServiceFixture,
  overrides: {
    readonly name?: string;
    readonly academicYearId?: Id<'academic_year'>;
    readonly levelId?: Id<'level'>;
  } = {}
): Promise<RepositoryRow<'class_group'>> {
  return fixture.repository.create('class_group', {
    institution_id: fixture.institutionId,
    campus_id: fixture.campusId,
    academic_year_id: overrides.academicYearId ?? fixture.academicYearId,
    programme_id: fixture.programmeId,
    level_id: overrides.levelId ?? fixture.levelId,
    name: overrides.name ?? `Blue ${nextSuffix()}`,
    homeroom_teacher_ids: [],
  });
}

/** Another academic year of the calendar. */
export async function createAcademicYear(
  fixture: ServiceFixture,
  overrides: {
    readonly name?: string;
    readonly startDate?: string;
    readonly endDate?: string;
  } = {}
): Promise<RepositoryRow<'academic_year'>> {
  return fixture.repository.create('academic_year', {
    institution_id: fixture.institutionId,
    calendar_id: fixture.calendarId,
    name: overrides.name ?? `20${30 + Number(nextSuffix())}`,
    start_date: overrides.startDate ?? '2028-01-05',
    end_date: overrides.endDate ?? '2028-11-30',
    status: 'planned',
  });
}

/** Another level of the programme. */
export async function createLevel(
  fixture: ServiceFixture,
  code: string
): Promise<RepositoryRow<'level'>> {
  return fixture.repository.create('level', {
    institution_id: fixture.institutionId,
    stage_id: fixture.stageId,
    code,
    name: `Level ${code}`,
    ordinal: 90,
    is_terminal: false,
  });
}

/** The learner an admission form collects. */
export function learnerInput(
  overrides: Partial<AdmissionLearnerInput> = {}
): AdmissionLearnerInput {
  return {
    givenName: 'Admitted',
    familyName: `Learner ${nextSuffix()}`,
    nameOrder: 'given_first',
    gender: 'female',
    dateOfBirth: '2014-02-03',
    phones: [{ number: `+254711${String(nextSuffix()).padStart(6, '0')}` }],
    ...overrides,
  };
}

/** The guardian an admission form collects. */
export function guardianInput(
  overrides: Partial<AdmissionGuardianInput> = {}
): AdmissionGuardianInput {
  return {
    givenName: 'Grace',
    familyName: `Guardian ${nextSuffix()}`,
    nameOrder: 'given_first',
    gender: 'female',
    relationship: 'mother',
    isPrimary: true,
    ...overrides,
  };
}
