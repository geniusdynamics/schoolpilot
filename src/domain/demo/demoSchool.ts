// ABOUTME: The demo school a fresh installation is seeded with, written through the canonical
// ABOUTME: repository and the domain services so every invariant, audit row and watcher sees real data.

import type {
  CreateInput,
  ListQuery,
  Page,
  Repository,
  RepositoryRow,
  WriteOptions,
} from '@/data/repository';
import { asId, type Id } from '@/domain/ids';
import type { EntityName } from '@/domain/schema';
import { AdmissionService, AttendanceService } from '@/domain/services';

/** The school profile the demo is seeded with. */
export interface DemoSchoolProfile {
  readonly name: string;
  readonly motto?: string;
  readonly address?: string;
  readonly phone?: string;
  /** ISO-3166 alpha-2, `KE` when the caller does not say. */
  readonly country?: string;
  /** BCP-47 locale, `en-KE` when the caller does not say. */
  readonly locale?: string;
  /** IANA time zone, `Africa/Nairobi` when the caller does not say. */
  readonly timeZone?: string;
  /** ISO-4217 currency, `KES` when the caller does not say. */
  readonly currency?: string;
}

/** One term of the first academic year. */
export interface DemoSchoolTerm {
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
}

/** The first academic year of the demo school. */
export interface DemoSchoolYear {
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly terms: readonly DemoSchoolTerm[];
}

/** One class of the demo school and the streams it is split into. */
export interface DemoSchoolClass {
  readonly name: string;
  readonly streams: readonly string[];
}

/** What the demo seed is asked for. */
export interface DemoSchoolInput {
  readonly school: DemoSchoolProfile;
  readonly year: DemoSchoolYear;
  readonly classes: readonly DemoSchoolClass[];
  /**
   * Whether the sample people, teaching, assessment, finance and attendance rows are written.
   * Without it only the structure a new school needs is created: institution, calendar, year,
   * periods, programme, levels and class groups.
   */
  readonly demo: boolean;
}

/** The rows the seed created, per entity. Reused rows are not counted. */
export type DemoSchoolCounts = Readonly<Record<string, number>>;

/** What a run of the seed did. */
export interface DemoSchoolResult {
  readonly institutionId: Id<'institution'>;
  /** False when the school already existed and the run reused it. */
  readonly created: boolean;
  /** False when the demo rows were not written because the school already had learners. */
  readonly demoSeeded: boolean;
  readonly counts: DemoSchoolCounts;
}

/** A seed that could not finish: the step that failed and what the attempt had written. */
export class DemoSchoolSeedError extends Error {
  constructor(
    readonly step: string,
    readonly counts: DemoSchoolCounts,
    cause: unknown
  ) {
    super(
      `the demo school could not be seeded at "${step}": ` +
        (cause instanceof Error ? cause.message : String(cause))
    );
    this.name = 'DemoSchoolSeedError';
    this.cause = cause;
  }
}

const CAMPUS_NAME = 'Main Campus';
const CALENDAR_NAME = 'School Calendar';
const PROGRAMME_NAME = 'School Programme';
const STAGE_NAME = 'School';
const ACADEMIC_DEPARTMENT = 'Academic';
const TEACHER_TITLE = 'Teacher';
const HEAD_TEACHER_TITLE = 'Head Teacher';

/** The learning areas the demo teaches, and the teaching group each one opens. */
const LEARNING_AREAS = [
  { code: 'ENG', name: 'English', short: 'Eng', group: 'languages' },
  { code: 'MAT', name: 'Mathematics', short: 'Maths', group: 'mathematics' },
  { code: 'SCI', name: 'Science', short: 'Sci', group: 'sciences' },
  { code: 'KIS', name: 'Kiswahili', short: 'Kis', group: 'languages' },
] as const;

/** The fee items of the demo school, in minor units of the base currency. */
const FEE_ITEMS = [
  { code: 'TUITION', name: 'Tuition', category: 'tuition', amountMinor: 4_500_00 },
  { code: 'MEALS', name: 'Meals', category: 'meals', amountMinor: 1_200_00 },
  { code: 'TRANSPORT', name: 'Transport', category: 'transport', amountMinor: 800_00 },
] as const;

/** The people the demo admits, in a fixed order so two runs write the same school. */
const DEMO_LEARNERS = [
  { given: 'Amani', family: 'Wekesa', gender: 'female' },
  { given: 'Baraka', family: 'Wekesa', gender: 'male' },
  { given: 'Chloe', family: 'Mwangi', gender: 'female' },
  { given: 'David', family: 'Otieno', gender: 'male' },
  { given: 'Esther', family: 'Njeri', gender: 'female' },
  { given: 'Farouk', family: 'Hassan', gender: 'male' },
  { given: 'Grace', family: 'Mutua', gender: 'female' },
  { given: 'Hassan', family: 'Ali', gender: 'male' },
  { given: 'Imani', family: 'Kariuki', gender: 'female' },
  { given: 'Joseph', family: 'Ochieng', gender: 'male' },
  { given: 'Kendi', family: 'Kimani', gender: 'female' },
  { given: 'Liam', family: 'Barasa', gender: 'male' },
] as const;

/** The guardians of the demo learners; the first two share one person, so an admission links a sibling. */
const DEMO_GUARDIANS = [
  { given: 'Naomi', family: 'Wekesa', relationship: 'mother', phone: '+254711000101' },
  { given: 'Naomi', family: 'Wekesa', relationship: 'mother', phone: '+254711000101' },
  { given: 'Peter', family: 'Mwangi', relationship: 'father', phone: '+254711000103' },
  { given: 'Alice', family: 'Otieno', relationship: 'mother', phone: '+254711000104' },
  { given: 'Samuel', family: 'Njeri', relationship: 'father', phone: '+254711000105' },
  { given: 'Halima', family: 'Hassan', relationship: 'mother', phone: '+254711000106' },
  { given: 'Joseph', family: 'Mutua', relationship: 'father', phone: '+254711000107' },
  { given: 'Fatuma', family: 'Ali', relationship: 'mother', phone: '+254711000108' },
  { given: 'Anne', family: 'Kariuki', relationship: 'mother', phone: '+254711000109' },
  { given: 'Michael', family: 'Ochieng', relationship: 'father', phone: '+254711000110' },
  { given: 'Rose', family: 'Kimani', relationship: 'mother', phone: '+254711000111' },
  { given: 'Daniel', family: 'Barasa', relationship: 'father', phone: '+254711000112' },
] as const;

const DEMO_STAFF = [
  { given: 'Wanjiku', family: 'Kamau', gender: 'female', title: HEAD_TEACHER_TITLE, number: 'EMP/001' },
  { given: 'Peter', family: 'Otieno', gender: 'male', title: TEACHER_TITLE, number: 'EMP/002' },
  { given: 'Mercy', family: 'Achieng', gender: 'female', title: TEACHER_TITLE, number: 'EMP/003' },
  { given: 'Daniel', family: 'Kiptoo', gender: 'male', title: TEACHER_TITLE, number: 'EMP/004' },
] as const;

/** A small deterministic generator, so two runs of the seed write the same scores. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

/** The YYYY part of a date, for the document sequences. */
function sequenceYear(date: string): number {
  const year = Number.parseInt(date.slice(0, 4), 10);
  return Number.isFinite(year) ? year : new Date().getFullYear();
}

/** A code the canonical text columns accept: upper-case letters and digits. */
function codeOf(value: string, fallback: string): string {
  const code = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return code.slice(0, 50) || fallback;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

/** The first row matching the query, or null. */
async function findOne<E extends EntityName>(
  repository: Repository,
  entity: E,
  query: ListQuery
): Promise<RepositoryRow<E> | null> {
  const page: Page<RepositoryRow<E>> = await repository.list(entity, { ...query, limit: 5 });
  return page.items[0] ?? null;
}

/**
 * The row of `entity` matching the natural key of `query`, created from `input` when it is missing.
 *
 * Every record the seed writes goes through this, so a second run (or a re-opened wizard) reuses
 * the school it finds instead of duplicating it. `onCreated` counts what a run actually wrote.
 */
async function findOrCreate<E extends EntityName>(
  repository: Repository,
  entity: E,
  query: ListQuery,
  input: () => CreateInput<E>,
  options: WriteOptions,
  onCreated: () => void
): Promise<RepositoryRow<E>> {
  const existing = await findOne(repository, entity, query);
  if (existing) return existing;
  const row = await repository.create(entity, input(), options);
  onCreated();
  return row;
}

/**
 * Seeds a school through the canonical repository.
 *
 * The structure a new school cannot work without (the institution, its calendar, the academic
 * year and its terms, the programme, the levels and the year-scoped class groups) is written on
 * every run, so the wizard can be re-opened without duplicating anything. The demo rows - the
 * staff, the learners and their guardians, the enrolments, the teaching groups and their marks,
 * the fee schedule and a few invoices, payments and a register - are written only when `demo` is
 * set and the school has no learners yet.
 *
 * Every row is written through the repository, so the entity schema, the invariants of spec 02
 * §12, the tenancy rule, the audit trail and the concurrency columns are all exercised. The
 * learners are admitted through `AdmissionService`, and the register is taken through
 * `AttendanceService`, so the two golden paths of the product create the demo data.
 *
 * ### Atomicity and failure
 *
 * The whole run is one transaction of the repository, and every service the run calls joins it.
 * A failure therefore leaves nothing behind: no half-built school, no learner without its
 * guardians, no invoice without its lines. The error names the substep that was running - a
 * failure while admitting the third learner reports "learners", not "institution" - and the
 * counts of the attempt, so a caller can see how far it got.
 */
export async function seedDemoSchool(
  repository: Repository,
  input: DemoSchoolInput
): Promise<DemoSchoolResult> {
  const counts: Record<string, number> = {};
  const count = (entity: string): void => {
    counts[entity] = (counts[entity] ?? 0) + 1;
  };
  const options: WriteOptions = { reason: 'demo school seeded', origin: 'demo-seed' };

  // The substep that is running. Every block below names itself before it writes, so a failure
  // reports where it happened instead of the step the run started at.
  let running = 'institution';
  const at = (name: string): void => {
    running = name;
  };

  try {
    return await repository.transaction(seed);
  } catch (error) {
    if (error instanceof DemoSchoolSeedError) throw error;
    throw new DemoSchoolSeedError(running, { ...counts }, error);
  }

  // The body of the seed, run inside one repository transaction: every write it makes joins it.
  async function seed(): Promise<DemoSchoolResult> {
    const schools = await repository.list('institution', { limit: 2 });
    if (schools.items.length > 1) {
      throw new Error('the canonical database holds more than one institution');
    }

    const { school, year, classes } = input;
    const country = school.country ?? 'KE';
    const locale = school.locale ?? 'en-KE';
    const timeZone = school.timeZone ?? 'Africa/Nairobi';
    const currency = school.currency ?? 'KES';

    let institution = schools.items[0] ?? null;
    const created = institution === null;
    if (!institution) {
      institution = await repository.create(
        'institution',
        {
          name: school.name.trim(),
          ...(school.motto?.trim() ? { motto: school.motto.trim() } : {}),
          country,
          ownership: 'private',
          gender_policy: 'mixed',
          boarding_policy: 'day',
          default_locale: locale,
          time_zone: timeZone,
          base_currency: currency,
        },
        options
      );
      count('institution');
    } else if (institution.name !== school.name.trim()) {
      // A wizard re-run may rename the school; the canonical row follows, so the pages and the
      // legacy profile do not disagree.
      institution = await repository.update(
        'institution',
        institution.id,
        { name: school.name.trim() },
        { expectedVersion: institution.rowVersion, ...options }
      );
    }
    const institutionId = asId<'institution'>(institution.id);

    at('structure');

    const campus = await findOrCreate<'campus'>(
      repository,
      'campus',
      { where: { institution_id: institutionId, name: CAMPUS_NAME } },
      () => ({
        institution_id: institutionId,
        name: CAMPUS_NAME,
        is_main: true,
        ...(school.address?.trim() ? { address: school.address.trim() } : {}),
        ...(school.phone?.trim() ? { phone: school.phone.trim() } : {}),
      }),
      options,
      () => count('campus')
    );

    const calendar = await findOrCreate<'calendar'>(
      repository,
      'calendar',
      { where: { institution_id: institutionId, name: CALENDAR_NAME } },
      () => ({ institution_id: institutionId, name: CALENDAR_NAME, programme_ids: [] }),
      options,
      () => count('calendar')
    );

    const financialYearName = `${year.name} financial year`;
    const financialYear = await findOrCreate<'financial_year'>(
      repository,
      'financial_year',
      { where: { institution_id: institutionId, name: financialYearName } },
      () => ({
        institution_id: institutionId,
        name: financialYearName,
        start_date: `${sequenceYear(year.startDate)}-01-01`,
        end_date: `${sequenceYear(year.startDate)}-12-31`,
        status: 'current',
      }),
      options,
      () => count('financial_year')
    );

    const years = await repository.list('academic_year', {
      where: { calendar_id: calendar.id },
      limit: 100,
    });
    const existingYear = years.items.find((row) => row.name === year.name) ?? null;
    let academicYear: RepositoryRow<'academic_year'>;
    if (existingYear) {
      academicYear = existingYear;
    } else {
      const otherCurrent = years.items.some((row) => row.status === 'current');
      academicYear = await repository.create(
        'academic_year',
        {
          institution_id: institutionId,
          calendar_id: asId<'calendar'>(calendar.id),
          name: year.name,
          start_date: year.startDate,
          end_date: year.endDate,
          status: otherCurrent ? 'planned' : 'current',
          financial_year_id: asId<'financial_year'>(financialYear.id),
        },
        options
      );
      count('academic_year');
    }
    const academicYearId = asId<'academic_year'>(academicYear.id);

    const programme = await findOrCreate<'programme'>(
      repository,
      'programme',
      { where: { institution_id: institutionId, name: PROGRAMME_NAME } },
      () => ({
        institution_id: institutionId,
        curriculum_pack_code: codeOf(locale.split('-')[1] ?? 'CBE', 'CBE'),
        pack_version: '1.0.0',
        name: PROGRAMME_NAME,
        calendar_id: asId<'calendar'>(calendar.id),
        status: 'active',
      }),
      options,
      () => count('programme')
    );
    const programmeId = asId<'programme'>(programme.id);

    const stage = await findOrCreate<'stage'>(
      repository,
      'stage',
      { where: { programme_id: programmeId, code: codeOf(STAGE_NAME, 'SCHOOL') } },
      () => ({
        institution_id: institutionId,
        programme_id: programmeId,
        code: codeOf(STAGE_NAME, 'SCHOOL'),
        name: STAGE_NAME,
        sequence: 1,
      }),
      options,
      () => count('stage')
    );
    const stageId = asId<'stage'>(stage.id);

    const periods = await repository.list('academic_period', {
      where: { academic_year_id: academicYearId },
      limit: 50,
    });
    const storedTerms = [...periods.items];
    for (const [index, term] of year.terms.entries()) {
      if (storedTerms.some((row) => row.kind === 'term' && row.sequence === index)) continue;
      const otherCurrent = storedTerms.some((row) => row.status === 'current');
      const row = await repository.create(
        'academic_period',
        {
          institution_id: institutionId,
          academic_year_id: academicYearId,
          kind: 'term',
          sequence: index,
          name: term.name,
          start_date: term.startDate,
          end_date: term.endDate,
          is_reporting: true,
          is_billing: true,
          status: otherCurrent ? 'planned' : 'current',
        },
        options
      );
      storedTerms.push(row);
      count('academic_period');
    }
    const firstTerm = storedTerms
      .filter((row) => row.kind === 'term')
      .sort((left, right) => left.sequence - right.sequence)[0];
    if (!firstTerm && input.demo) {
      throw new Error('the academic year has no term to place the demo in');
    }

    const levels: RepositoryRow<'level'>[] = [];
    for (const [index, klass] of classes.entries()) {
      const name = klass.name.trim();
      if (!name) continue;
      const code = codeOf(name, `LEVEL${index + 1}`).slice(0, 50);
      const level = await findOrCreate<'level'>(
        repository,
        'level',
        { where: { stage_id: stageId, code } },
        () => ({
          institution_id: institutionId,
          stage_id: stageId,
          code,
          name,
          ordinal: index + 1,
          is_terminal: index === classes.length - 1,
        }),
        options,
        () => count('level')
      );
      levels.push(level);
    }

    const classGroups: RepositoryRow<'class_group'>[] = [];
    for (const [index, klass] of classes.entries()) {
      const level = levels[index];
      if (!level) continue;
      const streams = klass.streams.map((stream) => stream.trim()).filter(Boolean);
      for (const stream of streams.length > 0 ? streams : ['Main']) {
        const classGroup = await findOrCreate<'class_group'>(
          repository,
          'class_group',
          {
            where: {
              campus_id: campus.id,
              academic_year_id: academicYearId,
              programme_id: programmeId,
              level_id: level.id,
              name: stream,
            },
          },
          () => ({
            institution_id: institutionId,
            campus_id: asId<'campus'>(campus.id),
            academic_year_id: academicYearId,
            programme_id: programmeId,
            level_id: asId<'level'>(level.id),
            name: stream,
            capacity: 40,
            homeroom_teacher_ids: [],
          }),
          options,
          () => count('class_group')
        );
        classGroups.push(classGroup);
      }
    }
    if (classGroups.length === 0 && input.demo) {
      throw new Error('the school has no class group to place a learner in');
    }

    // The structure is complete; the demo rows need a class group and a term to land in.
    let demoSeeded = false;
    if (input.demo && firstTerm) {
      demoSeeded = await seedDemoPeople(repository, {
        institutionId,
        campusId: asId<'campus'>(campus.id),
        academicYearId,
        programmeId,
        periodId: asId<'academic_period'>(firstTerm.id),
        periodStart: firstTerm.start_date,
        yearStart: year.startDate,
        currency,
        classGroups,
        levels,
        count,
        options,
        at,
      });
    }

    return {
      institutionId,
      created,
      demoSeeded,
      counts: { ...counts },
    };
  }
}

interface DemoPeopleInput {
  readonly institutionId: Id<'institution'>;
  readonly campusId: Id<'campus'>;
  readonly academicYearId: Id<'academic_year'>;
  readonly programmeId: Id<'programme'>;
  readonly periodId: Id<'academic_period'>;
  readonly periodStart: string;
  readonly yearStart: string;
  readonly currency: string;
  readonly classGroups: readonly RepositoryRow<'class_group'>[];
  readonly levels: readonly RepositoryRow<'level'>[];
  readonly count: (entity: string) => void;
  readonly options: WriteOptions;
  /** Names the substep that is running, so a failure reports where it happened. */
  readonly at: (name: string) => void;
}

/**
 * Writes the people, the teaching, the assessment, the fees and the register of the demo school.
 *
 * Returns false when the school already has learners: a real school must never receive the demo
 * people, and a second run of the seed must not duplicate the first.
 */
async function seedDemoPeople(
  repository: Repository,
  input: DemoPeopleInput
): Promise<boolean> {
  const learners = await repository.list('learner', {
    where: { institution_id: input.institutionId },
    limit: 1,
  });
  if (learners.items.length > 0) return false;

  const { institutionId, campusId, academicYearId, programmeId, periodId, currency, options } = input;
  const money = (amountMinor: number) => ({ amount_minor: amountMinor, currency });

  input.at('staff');

  const department = await findOrCreate<'department'>(
    repository,
    'department',
    { where: { institution_id: institutionId, name: ACADEMIC_DEPARTMENT } },
    () => ({ institution_id: institutionId, name: ACADEMIC_DEPARTMENT, kind: 'academic' }),
    options,
    () => input.count('department')
  );

  const jobTitles = new Map<string, RepositoryRow<'job_title'>>();
  for (const [name, category] of [
    [HEAD_TEACHER_TITLE, 'teaching'],
    [TEACHER_TITLE, 'teaching'],
  ] as const) {
    const row = await findOrCreate<'job_title'>(
      repository,
      'job_title',
      { where: { institution_id: institutionId, name } },
      () => ({ institution_id: institutionId, name, category }),
      options,
      () => input.count('job_title')
    );
    jobTitles.set(name, row);
  }

  const staff: RepositoryRow<'staff'>[] = [];
  for (const person of DEMO_STAFF) {
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
        employment_type: 'permanent',
        ...(jobTitle ? { job_title_id: asId<'job_title'>(jobTitle.id) } : {}),
        department_ids: [asId<'department'>(department.id)],
        start_date: '2020-01-06',
      }),
      options,
      () => input.count('staff')
    );
    staff.push(row);
  }
  const headTeacher = staff[0];
  if (!headTeacher) throw new Error('the demo school has no member of staff to take a register');

  // The homeroom teacher of each class group is one of the teachers, in turn.
  for (const [index, group] of input.classGroups.entries()) {
    const teacher = staff[1 + (index % Math.max(staff.length - 1, 1))];
    if (!teacher || group.homeroom_teacher_ids.includes(teacher.id)) continue;
    await repository.update(
      'class_group',
      group.id,
      { homeroom_teacher_ids: [teacher.id] },
      { expectedVersion: group.rowVersion, ...options }
    );
  }

  input.at('curriculum');

  const gradingScale = await findOrCreate<'grading_scale'>(
    repository,
    'grading_scale',
    { where: { programme_id: programmeId, code: 'demo_numeric' } },
    () => ({
      institution_id: institutionId,
      programme_id: programmeId,
      code: 'demo_numeric',
      kind: 'numeric_bands',
      // The bands tile the range exactly. The canonical `grading_scale` carries no upper-bound
      // convention, so the engine reads the bands half-open (min inclusive, max exclusive): a
      // published whole-mark range such as 60-79.99 leaves a gap the engine refuses, and the school
      // then has no band at all. The bound a band is named with is therefore the next band's floor.
      bands: [
        { code: 'EE', label: 'Exceeding expectations', min: 80, max: 100 },
        { code: 'ME', label: 'Meeting expectations', min: 60, max: 80 },
        { code: 'AEP', label: 'Approaching expectations', min: 40, max: 60 },
        { code: 'BE', label: 'Below expectations', min: 0, max: 40 },
      ],
      version: '1',
    }),
    options,
    () => input.count('grading_scale')
  );

  const learningAreas: RepositoryRow<'learning_area'>[] = [];
  for (const area of LEARNING_AREAS) {
    const row = await findOrCreate<'learning_area'>(
      repository,
      'learning_area',
      { where: { programme_id: programmeId, code: area.code } },
      () => ({
        institution_id: institutionId,
        programme_id: programmeId,
        code: area.code,
        name: area.name,
        short_name: area.short,
        group: area.group,
        kind: 'core',
        level_ids: input.levels.map((level) => level.id),
        pathway_ids: [],
      }),
      options,
      () => input.count('learning_area')
    );
    learningAreas.push(row);
  }

  // The learners, their guardians, the identifiers and the first enrolment, through the service.
  input.at('learners');
  const admissions = new AdmissionService({ repository });
  const admitted: Array<{
    learnerId: Id<'learner'>;
    enrolmentId: Id<'enrolment'>;
    classGroupId: Id<'class_group'>;
    guardianId: Id<'guardian'> | null;
  }> = [];
  const year = sequenceYear(input.yearStart);

  for (const [index, person] of DEMO_LEARNERS.entries()) {
    const guardian = DEMO_GUARDIANS[index] ?? DEMO_GUARDIANS[0];
    const level = Math.min(Math.floor(index / 4), Math.max(input.levels.length - 1, 0));
    const groupsOfLevel = input.classGroups.filter(
      (candidate) => candidate.level_id === input.levels[level]?.id
    );
    const target =
      groupsOfLevel[index % Math.max(groupsOfLevel.length, 1)] ??
      input.classGroups[index % input.classGroups.length];
    if (!target) throw new Error('the demo learner has no class group');

    const result = await admissions.admit({
      learner: {
        givenName: person.given,
        familyName: person.family,
        nameOrder: 'given_first',
        gender: person.gender,
        dateOfBirth: `${year - 12 - level}-01-15`,
        admissionNumber: `ADM/${year}/${String(index + 1).padStart(3, '0')}`,
        admissionDate: input.yearStart,
      },
      guardians: [
        {
          givenName: guardian.given,
          familyName: guardian.family,
          nameOrder: 'given_first',
          gender: 'female',
          phones: [{ number: guardian.phone, label: 'mobile' }],
          relationship: guardian.relationship,
          isPrimary: true,
          isFeePayer: true,
          preferredChannel: 'sms',
        },
      ],
      enrolment: { classGroupId: asId<'class_group'>(target.id), startDate: input.yearStart },
      identifiers: [
        {
          owner: 'learner',
          scheme: 'ke.kemis_upi',
          value: `UPI/${year}/${String(index + 1).padStart(3, '0')}`,
        },
      ],
    });
    input.count('learner');
    input.count('enrolment');
    if (result.guardians.length > 0) input.count('guardian');
    input.count('learner_guardian');
    if (result.identifiers.length > 0) input.count('identifier');

    admitted.push({
      learnerId: asId<'learner'>(result.learner.id),
      enrolmentId: asId<'enrolment'>(result.enrolment.id),
      classGroupId: asId<'class_group'>(target.id),
      guardianId: result.guardians[0]
        ? asId<'guardian'>(result.guardians[0].id)
        : (result.links[0] ? asId<'guardian'>(result.links[0].guardian_id) : null),
    });
  }

  // A teaching group for every learning area of every class group, with its members and teacher.
  input.at('teaching');
  const teachingGroups: Array<{
    id: Id<'teaching_group'>;
    learningAreaId: Id<'learning_area'>;
    classGroupId: Id<'class_group'>;
  }> = [];
  for (const [index, area] of learningAreas.entries()) {
    for (const group of input.classGroups) {
      const level = input.levels.find((candidate) => candidate.id === group.level_id);
      if (!level) continue;
      const name = `${level.name} ${area.name}`;
      const teacher = staff[1 + (index % Math.max(staff.length - 1, 1))] ?? headTeacher;
      const teachingGroup = await findOrCreate<'teaching_group'>(
        repository,
        'teaching_group',
        { where: { academic_year_id: academicYearId, learning_area_id: area.id, name } },
        () => ({
          institution_id: institutionId,
          campus_id: campusId,
          academic_year_id: academicYearId,
          learning_area_id: asId<'learning_area'>(area.id),
          name,
          level_ids: [asId<'level'>(level.id)],
          class_group_ids: [asId<'class_group'>(group.id)],
          teacher_ids: [asId<'staff'>(teacher.id)],
          kind: 'whole_class',
        }),
        options,
        () => input.count('teaching_group')
      );
      const teachingGroupId = asId<'teaching_group'>(teachingGroup.id);
      teachingGroups.push({
        id: teachingGroupId,
        learningAreaId: asId<'learning_area'>(area.id),
        classGroupId: asId<'class_group'>(group.id),
      });

      const assignment = await findOne(repository, 'teaching_assignment', {
        where: { staff_id: teacher.id, teaching_group_id: teachingGroupId },
      });
      if (!assignment) {
        await repository.create(
          'teaching_assignment',
          {
            institution_id: institutionId,
            staff_id: asId<'staff'>(teacher.id),
            teaching_group_id: teachingGroupId,
            role: 'main',
            valid_from: input.yearStart,
          },
          options
        );
        input.count('teaching_assignment');
      }

      for (const learner of admitted.filter((row) => row.classGroupId === group.id)) {
        const member = await findOne(repository, 'teaching_group_member', {
          where: { teaching_group_id: teachingGroupId, enrolment_id: learner.enrolmentId },
        });
        if (member) continue;
        await repository.create(
          'teaching_group_member',
          {
            institution_id: institutionId,
            teaching_group_id: teachingGroupId,
            enrolment_id: learner.enrolmentId,
            valid_from: input.yearStart,
          },
          options
        );
        input.count('teaching_group_member');
      }
    }
  }

  // One end-of-term assessment per learning area, with a mark for every learner of it.
  input.at('assessment');
  const random = createRandom(20261020);
  const assessmentDate = addDays(input.periodStart, 30);
  for (const area of learningAreas) {
    const assessment = await repository.create(
      'assessment',
      {
        institution_id: institutionId,
        academic_period_id: periodId,
        kind: 'end_term',
        name: `End of term ${area.name}`,
        scheme_slot: 'ET',
        level_ids: input.levels.map((level) => level.id),
        class_group_ids: input.classGroups.map((group) => group.id),
        learning_area_ids: [asId<'learning_area'>(area.id)],
        component_ids: [],
        max_score: 100,
        date_window: { start_date: assessmentDate, end_date: assessmentDate },
        // Open, not published: this assessment is seeded with the marks the school entered, and the
        // canonical lifecycle is draft -> open -> closed -> moderated -> published. Seeding it as
        // published would put every demo assessment past moderation, where mark entry correctly
        // requires an audited override - a sample school nobody could mark.
        status: 'open',
        grading_scale_id: asId<'grading_scale'>(gradingScale.id),
      },
      options
    );
    input.count('assessment');

    for (const learner of admitted) {
      const groupForArea = teachingGroups.find(
        (candidate) =>
          candidate.learningAreaId === asId<'learning_area'>(area.id) &&
          candidate.classGroupId === learner.classGroupId
      );
      if (!groupForArea) continue;
      const score = 45 + Math.round(random() * 50);
      await repository.create(
        'mark',
        {
          institution_id: institutionId,
          assessment_id: asId<'assessment'>(assessment.id),
          enrolment_id: learner.enrolmentId,
          learning_area_id: asId<'learning_area'>(area.id),
          score: `${score}.0`,
          status_code: 'present',
          version: 1,
          entered_at: `${assessmentDate}T15:00:00.000Z`,
        },
        options
      );
      input.count('mark');
    }
  }

  // The fee items, one published schedule and its lines.
  input.at('fees');
  const feeItems: RepositoryRow<'fee_item'>[] = [];
  for (const item of FEE_ITEMS) {
    const row = await findOrCreate<'fee_item'>(
      repository,
      'fee_item',
      { where: { institution_id: institutionId, code: item.code } },
      () => ({
        institution_id: institutionId,
        code: item.code,
        name: item.name,
        category: item.category,
        refundable: false,
        taxable: false,
        priority: 1,
        funding_source: 'parent',
      }),
      options,
      () => input.count('fee_item')
    );
    feeItems.push(row);
  }

  // A fee schedule prices a cell of level x residence x category. The demo bills day scholars of one
  // category, and both dimensions must be declared as exactly one value: a dimension with none
  // refuses every cell ("the schedule declares no fee category"), and one with several demands the
  // caller name a value the learner data does not carry. Declaring boarder here while no learner is
  // one is what made the sample school unbillable by the billing run.
  const feeCategory = await findOrCreate<'fee_category'>(
    repository,
    'fee_category',
    { where: { institution_id: institutionId, code: 'DAY' } },
    () => ({
      institution_id: institutionId,
      code: 'DAY',
      name: 'Day scholar',
    }),
    options,
    () => input.count('fee_category')
  );

  const scheduleName = `${input.yearStart.slice(0, 4)} fees`;
  const schedule = await findOrCreate<'fee_schedule'>(
    repository,
    'fee_schedule',
    { where: { institution_id: institutionId, name: scheduleName } },
    () => ({
      institution_id: institutionId,
      name: scheduleName,
      academic_year_id: academicYearId,
      academic_period_ids: [periodId],
      programme_ids: [programmeId],
      level_ids: input.levels.map((level) => level.id),
      residence_statuses: ['day'],
      fee_category_ids: [feeCategory.id],
      campus_id: campusId,
      new_learners_only: false,
      version: 1,
      status: 'published',
    }),
    options,
    () => input.count('fee_schedule')
  );

  for (const [index, item] of feeItems.entries()) {
    const amount = FEE_ITEMS[index];
    if (!amount) continue;
    await repository.create(
      'fee_schedule_line',
      {
        institution_id: institutionId,
        fee_schedule_id: asId<'fee_schedule'>(schedule.id),
        fee_item_id: asId<'fee_item'>(item.id),
        amount: money(amount.amountMinor),
        mandatory: true,
        frequency: 'per_term',
        due_dates: [input.yearStart],
        proration_rule: 'full',
        residence_status: 'day',
        fee_category_id: feeCategory.id,
      },
      options
    );
    input.count('fee_schedule_line');
  }

  // A term invoice for every learner, with the lines the schedule says, and a payment for half.
  const invoiceTotal = FEE_ITEMS.reduce((total, item) => total + item.amountMinor, 0);
  for (const [index, learner] of admitted.entries()) {
    const invoice = await repository.create(
      'invoice',
      {
        institution_id: institutionId,
        number: `INV/${input.yearStart.slice(0, 4)}/${String(index + 1).padStart(4, '0')}`,
        learner_id: learner.learnerId,
        academic_period_id: periodId,
        issue_date: input.yearStart,
        due_date: addDays(input.yearStart, 30),
        total: money(invoiceTotal),
        status: 'posted',
      },
      options
    );
    input.count('invoice');
    for (const [lineIndex, item] of feeItems.entries()) {
      const amount = FEE_ITEMS[lineIndex];
      if (!amount) continue;
      await repository.create(
        'invoice_line',
        {
          institution_id: institutionId,
          invoice_id: asId<'invoice'>(invoice.id),
          fee_item_id: asId<'fee_item'>(item.id),
          description: `${amount.name} ${input.yearStart.slice(0, 4)}`,
          amount: money(amount.amountMinor),
          kind: 'fee',
        },
        options
      );
      input.count('invoice_line');
    }

    if (index < 3) {
      const paid = Math.round(invoiceTotal / 2);
      const payment = await repository.create(
        'payment',
        {
          institution_id: institutionId,
          ...(learner.guardianId ? { payer_guardian_id: learner.guardianId } : {}),
          learner_id: learner.learnerId,
          amount: money(paid),
          channel: index === 0 ? 'mobile_money' : 'bank_deposit',
          reference: `DEMO-${String(index + 1).padStart(4, '0')}`,
          received_at: `${addDays(input.yearStart, 3)}T09:30:00.000Z`,
          status: 'posted',
        },
        options
      );
      input.count('payment');

      await repository.create(
        'payment_allocation',
        {
          institution_id: institutionId,
          payment_id: asId<'payment'>(payment.id),
          invoice_id: asId<'invoice'>(invoice.id),
          amount: money(paid),
          allocated_at: `${addDays(input.yearStart, 3)}T09:31:00.000Z`,
        },
        options
      );
      input.count('payment_allocation');

      await repository.create(
        'receipt',
        {
          institution_id: institutionId,
          number: `RCT/${input.yearStart.slice(0, 4)}/${String(index + 1).padStart(4, '0')}`,
          payment_id: asId<'payment'>(payment.id),
          issued_at: `${addDays(input.yearStart, 3)}T09:32:00.000Z`,
          status: 'issued',
        },
        options
      );
      input.count('receipt');
    }
  }

  // The morning register of every class group, taken through the service.
  input.at('register');
  const attendance = new AttendanceService({ repository });
  for (const group of input.classGroups) {
    const session = await attendance.openRegister({
      scope: { kind: 'class_group', id: asId<'class_group'>(group.id) },
      date: input.periodStart,
      session: 'am',
      takenBy: asId<'staff'>(headTeacher.id),
      academicPeriodId: periodId,
      takenAt: `${input.periodStart}T07:45:00.000Z`,
    });
    input.count('attendance_session');

    const learnersOfGroup = admitted.filter((row) => row.classGroupId === group.id);
    for (const [index, learner] of learnersOfGroup.entries()) {
      const status = index === 1 ? 'late' : 'present';
      await attendance.recordMark({
        sessionId: session.id,
        learnerId: learner.learnerId,
        status,
        ...(status === 'late' ? { minutesLate: 12 } : {}),
      });
      input.count('attendance_mark');
    }
  }

  return true;
}
