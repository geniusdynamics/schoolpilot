// ABOUTME: The scenario the scope tests run against: a real SQLite database with two classes, two
// ABOUTME: subject teachers, a class teacher, an accountant and an administrator, seeded through the repository.

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { createRepository, type CreateInput, type Repository } from '@/data/repository';

/** The date the scope is resolved at: inside the academic year of the scenario. */
export const AT = '2027-03-01';

/** The ids the scenario holds. */
export interface Scenario {
  readonly adapter: SqliteAdapter;
  /** The repository the scenario was seeded with; it carries no authorisation. */
  readonly repository: Repository;
  readonly institutionId: string;
  readonly otherInstitutionId: string;
  readonly learningAreaId: string;
  readonly mathsAreaId: string;
  readonly componentId: string;
  readonly assessmentId: string;
  readonly mathsAssessmentId: string;
  readonly classGroupIds: { readonly blue: string; readonly green: string };
  readonly learnerIds: { readonly blue: string; readonly green: string; readonly other: string };
  readonly enrolmentIds: { readonly blue: string; readonly green: string };
  readonly teachingGroupIds: { readonly blue: string; readonly green: string; readonly maths: string };
  readonly assignmentIds: { readonly blue: string; readonly green: string };
  readonly invoiceIds: { readonly local: string; readonly other: string };
  readonly markIds: { readonly blue: string; readonly green: string; readonly maths: string };
  readonly userIds: {
    readonly teacher: string;
    readonly otherTeacher: string;
    readonly classTeacher: string;
    readonly accountant: string;
    readonly administrator: string;
    readonly registrar: string;
    readonly nurse: string;
    readonly disabled: string;
  };
  readonly staffIds: {
    readonly teacher: string;
    readonly otherTeacher: string;
    readonly classTeacher: string;
    readonly accountant: string;
    readonly administrator: string;
    readonly registrar: string;
    readonly nurse: string;
    readonly disabled: string;
  };
}

/** Opens a real database and seeds the scenario into it. */
export async function createScenario(): Promise<Scenario> {
  const adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
  await adapter.open();

  const repository = createRepository({ adapter });
  await repository.setup();

  const institution = await repository.create('institution', {
    name: 'Mwangaza Secondary School',
    short_name: 'Mwangaza',
    country: 'KE',
    ownership: 'public',
    gender_policy: 'mixed',
    boarding_policy: 'mixed',
    default_locale: 'en-KE',
    time_zone: 'Africa/Nairobi',
    base_currency: 'KES',
  });

  const otherInstitution = await repository.create('institution', {
    name: 'Hillcrest Academy',
    country: 'KE',
    ownership: 'private',
    gender_policy: 'mixed',
    boarding_policy: 'day',
    default_locale: 'en-KE',
    time_zone: 'Africa/Nairobi',
    base_currency: 'KES',
  });

  const campus = await repository.create('campus', {
    institution_id: institution.id,
    name: 'Main Campus',
    is_main: true,
  });

  const calendar = await repository.create('calendar', {
    institution_id: institution.id,
    name: '2027 Calendar',
    programme_ids: [],
  });

  const academicYear = await repository.create('academic_year', {
    institution_id: institution.id,
    calendar_id: calendar.id,
    name: '2027',
    start_date: '2027-01-01',
    end_date: '2027-12-31',
    status: 'current',
  });

  const academicPeriod = await repository.create('academic_period', {
    institution_id: institution.id,
    academic_year_id: academicYear.id,
    kind: 'term',
    sequence: 1,
    name: 'Term 1',
    start_date: '2027-01-05',
    end_date: '2027-04-30',
    is_reporting: true,
    is_billing: true,
    status: 'current',
  });

  const programme = await repository.create('programme', {
    institution_id: institution.id,
    curriculum_pack_code: 'cbe',
    pack_version: '2027.1',
    name: 'Junior Secondary',
    calendar_id: calendar.id,
    status: 'active',
  });

  const stage = await repository.create('stage', {
    institution_id: institution.id,
    programme_id: programme.id,
    code: 'JUNIOR',
    name: 'Junior Secondary',
    sequence: 1,
  });

  const level = await repository.create('level', {
    institution_id: institution.id,
    stage_id: stage.id,
    code: 'G7',
    name: 'Grade 7',
    ordinal: 1,
    is_terminal: false,
  });

  const learningArea = await repository.create('learning_area', {
    institution_id: institution.id,
    programme_id: programme.id,
    code: 'ENG',
    name: 'English',
    kind: 'core',
    level_ids: [level.id],
    pathway_ids: [],
  });

  const mathsArea = await repository.create('learning_area', {
    institution_id: institution.id,
    programme_id: programme.id,
    code: 'MATH',
    name: 'Mathematics',
    kind: 'core',
    level_ids: [level.id],
    pathway_ids: [],
  });

  const component = await repository.create('component', {
    institution_id: institution.id,
    learning_area_id: learningArea.id,
    code: 'COMP',
    name: 'Comprehension',
    kind: 'paper',
  });

  const userIds = {
    teacher: await createUser(repository, institution.id, 'teacher.ambua'),
    otherTeacher: await createUser(repository, institution.id, 'teacher.otieno'),
    classTeacher: await createUser(repository, institution.id, 'teacher.njeri'),
    accountant: await createUser(repository, institution.id, 'accounts.mwangi'),
    administrator: await createUser(repository, institution.id, 'admin.wafula'),
    registrar: await createUser(repository, institution.id, 'registrar.akoth'),
    nurse: await createUser(repository, institution.id, 'nurse.chege'),
    disabled: await createUser(repository, institution.id, 'disabled.odhiambo', 'disabled'),
  };

  const staffIds = {
    teacher: await createStaff(repository, institution.id, userIds.teacher, 'TSC/100'),
    otherTeacher: await createStaff(repository, institution.id, userIds.otherTeacher, 'TSC/101'),
    classTeacher: await createStaff(repository, institution.id, userIds.classTeacher, 'TSC/102'),
    accountant: await createStaff(repository, institution.id, userIds.accountant, 'TSC/103'),
    administrator: await createStaff(repository, institution.id, userIds.administrator, 'TSC/104'),
    registrar: await createStaff(repository, institution.id, userIds.registrar, 'TSC/105'),
    nurse: await createStaff(repository, institution.id, userIds.nurse, 'TSC/106'),
    disabled: await createStaff(repository, institution.id, userIds.disabled, 'TSC/107'),
  };

  const blue = await repository.create('class_group', {
    institution_id: institution.id,
    campus_id: campus.id,
    academic_year_id: academicYear.id,
    programme_id: programme.id,
    level_id: level.id,
    name: 'Blue',
    homeroom_teacher_ids: [staffIds.classTeacher],
  });

  const green = await repository.create('class_group', {
    institution_id: institution.id,
    campus_id: campus.id,
    academic_year_id: academicYear.id,
    programme_id: programme.id,
    level_id: level.id,
    name: 'Green',
    homeroom_teacher_ids: [staffIds.otherTeacher],
  });

  const blueLearner = await createLearner(
    repository,
    institution.id,
    'Amani',
    'Wekesa',
    'GA/2027/001',
    { medical: { allergies: ['penicillin'] } }
  );
  const greenLearner = await createLearner(repository, institution.id, 'Brian', 'Otieno', 'GA/2027/002');
  const otherLearner = await createLearner(
    repository,
    otherInstitution.id,
    'Carol',
    'Kimani',
    'GA/2027/003'
  );

  const blueEnrolment = await repository.create('enrolment', {
    institution_id: institution.id,
    learner_id: blueLearner,
    academic_year_id: academicYear.id,
    programme_id: programme.id,
    level_id: level.id,
    class_group_id: blue.id,
    status: 'active',
    start_date: '2027-01-05',
    end_date: null,
    entry_reason: 'new_admission',
    exit_reason: null,
  });

  const greenEnrolment = await repository.create('enrolment', {
    institution_id: institution.id,
    learner_id: greenLearner,
    academic_year_id: academicYear.id,
    programme_id: programme.id,
    level_id: level.id,
    class_group_id: green.id,
    status: 'active',
    start_date: '2027-01-05',
    end_date: null,
    entry_reason: 'new_admission',
    exit_reason: null,
  });

  const blueGroup = await repository.create('teaching_group', {
    institution_id: institution.id,
    campus_id: campus.id,
    academic_year_id: academicYear.id,
    learning_area_id: learningArea.id,
    name: 'Grade 7 English Blue',
    level_ids: [level.id],
    class_group_ids: [blue.id],
    teacher_ids: [staffIds.teacher],
    kind: 'whole_class',
  });

  const greenGroup = await repository.create('teaching_group', {
    institution_id: institution.id,
    campus_id: campus.id,
    academic_year_id: academicYear.id,
    learning_area_id: learningArea.id,
    name: 'Grade 7 English Green',
    level_ids: [level.id],
    class_group_ids: [green.id],
    teacher_ids: [staffIds.otherTeacher],
    kind: 'whole_class',
  });

  // A group of another subject that teaches the same learner: its mark is valid data, and it is
  // out of the scope of the teacher of the English group.
  const mathsGroup = await repository.create('teaching_group', {
    institution_id: institution.id,
    campus_id: campus.id,
    academic_year_id: academicYear.id,
    learning_area_id: mathsArea.id,
    name: 'Grade 7 Mathematics Blue',
    level_ids: [level.id],
    class_group_ids: [blue.id],
    teacher_ids: [],
    kind: 'whole_class',
  });

  await repository.create('teaching_group_member', {
    institution_id: institution.id,
    teaching_group_id: blueGroup.id,
    enrolment_id: blueEnrolment.id,
    valid_from: '2027-01-05',
    valid_to: null,
  });

  await repository.create('teaching_group_member', {
    institution_id: institution.id,
    teaching_group_id: greenGroup.id,
    enrolment_id: greenEnrolment.id,
    valid_from: '2027-01-05',
    valid_to: null,
  });

  await repository.create('teaching_group_member', {
    institution_id: institution.id,
    teaching_group_id: mathsGroup.id,
    enrolment_id: blueEnrolment.id,
    valid_from: '2027-01-05',
    valid_to: null,
  });

  const blueAssignment = await repository.create('teaching_assignment', {
    institution_id: institution.id,
    staff_id: staffIds.teacher,
    teaching_group_id: blueGroup.id,
    role: 'main',
    valid_from: '2027-01-05',
    valid_to: null,
  });

  const greenAssignment = await repository.create('teaching_assignment', {
    institution_id: institution.id,
    staff_id: staffIds.otherTeacher,
    teaching_group_id: greenGroup.id,
    role: 'main',
    valid_from: '2027-01-05',
    valid_to: null,
  });

  const assessment = await repository.create('assessment', {
    institution_id: institution.id,
    academic_period_id: academicPeriod.id,
    kind: 'end_term',
    name: 'Term 1 English Examination',
    level_ids: [level.id],
    class_group_ids: [blue.id, green.id],
    learning_area_ids: [learningArea.id],
    component_ids: [component.id],
    max_score: 100,
    date_window: { start_date: '2027-03-20', end_date: '2027-03-24' },
    status: 'open',
  });

  const blueMark = await repository.create('mark', {
    institution_id: institution.id,
    assessment_id: assessment.id,
    enrolment_id: blueEnrolment.id,
    learning_area_id: learningArea.id,
    component_id: component.id,
    score: '75',
    status_code: 'present',
    version: 1,
  });

  const greenMark = await repository.create('mark', {
    institution_id: institution.id,
    assessment_id: assessment.id,
    enrolment_id: greenEnrolment.id,
    learning_area_id: learningArea.id,
    component_id: component.id,
    score: '62',
    status_code: 'present',
    version: 1,
  });

  const mathsAssessment = await repository.create('assessment', {
    institution_id: institution.id,
    academic_period_id: academicPeriod.id,
    kind: 'end_term',
    name: 'Term 1 Mathematics Examination',
    level_ids: [level.id],
    class_group_ids: [blue.id],
    learning_area_ids: [mathsArea.id],
    component_ids: [],
    max_score: 100,
    date_window: { start_date: '2027-03-20', end_date: '2027-03-24' },
    status: 'open',
  });

  const mathsMark = await repository.create('mark', {
    institution_id: institution.id,
    assessment_id: mathsAssessment.id,
    enrolment_id: blueEnrolment.id,
    learning_area_id: mathsArea.id,
    score: '55',
    status_code: 'present',
    version: 1,
  });
  const invoice = await repository.create('invoice', {
    institution_id: institution.id,
    number: 'INV-2027-001',
    learner_id: blueLearner,
    issue_date: '2027-02-01',
    total: { amount_minor: 500000, currency: 'KES' },
    status: 'draft',
  });

  const otherInvoice = await repository.create('invoice', {
    institution_id: otherInstitution.id,
    number: 'INV-2027-002',
    learner_id: otherLearner,
    issue_date: '2027-02-01',
    total: { amount_minor: 250000, currency: 'KES' },
    status: 'draft',
  });

  return {
    adapter,
    repository,
    institutionId: institution.id,
    otherInstitutionId: otherInstitution.id,
    learningAreaId: learningArea.id,
    mathsAreaId: mathsArea.id,
    componentId: component.id,
    assessmentId: assessment.id,
    mathsAssessmentId: mathsAssessment.id,
    classGroupIds: { blue: blue.id, green: green.id },
    learnerIds: { blue: blueLearner, green: greenLearner, other: otherLearner },
    enrolmentIds: { blue: blueEnrolment.id, green: greenEnrolment.id },
    teachingGroupIds: { blue: blueGroup.id, green: greenGroup.id, maths: mathsGroup.id },
    assignmentIds: { blue: blueAssignment.id, green: greenAssignment.id },
    invoiceIds: { local: invoice.id, other: otherInvoice.id },
    markIds: { blue: blueMark.id, green: greenMark.id, maths: mathsMark.id },
    userIds,
    staffIds,
  };
}

/** A mark for an enrolment, ready to be written by a teacher. */
export function markInput(
  scenario: Scenario,
  enrolmentId: string,
  overrides: Partial<CreateInput<'mark'>> = {}
): CreateInput<'mark'> {
  return {
    institution_id: scenario.institutionId,
    assessment_id: scenario.assessmentId,
    enrolment_id: enrolmentId,
    learning_area_id: scenario.learningAreaId,
    status_code: 'present',
    score: '70',
    version: 1,
    ...overrides,
  };
}

async function createUser(
  repository: Repository,
  institutionId: string,
  username: string,
  status: 'active' | 'disabled' | 'locked' = 'active'
): Promise<string> {
  const user = await repository.create('user', {
    institution_id: institutionId,
    username,
    password_hash: '$argon2id$v=19$m=65536,t=3,p=1$hash',
    status,
    mfa: false,
  });
  return user.id;
}

async function createStaff(
  repository: Repository,
  institutionId: string,
  userId: string,
  employeeNumber: string
): Promise<string> {
  const staff = await repository.create('staff', {
    institution_id: institutionId,
    given_name: 'Grace',
    family_name: 'Wekesa',
    name_order: 'given_first',
    gender: 'female',
    employee_number: employeeNumber,
    employment_type: 'permanent',
    department_ids: [],
    start_date: '2020-01-01',
    end_date: null,
    user_id: userId,
  });
  return staff.id;
}

async function createLearner(
  repository: Repository,
  institutionId: string,
  givenName: string,
  familyName: string,
  admissionNumber: string,
  extra: Partial<CreateInput<'learner'>> = {}
): Promise<string> {
  const learner = await repository.create('learner', {
    institution_id: institutionId,
    given_name: givenName,
    family_name: familyName,
    name_order: 'given_first',
    gender: 'female',
    admission_number: admissionNumber,
    status: 'enrolled',
    residence_status: 'day',
    ...extra,
  });
  return learner.id;
}
