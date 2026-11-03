// ABOUTME: The demo school a fresh installation is seeded with, written through the canonical
// ABOUTME: repository and the domain services so every invariant, audit row and watcher sees real data.

import type { SqliteTransaction } from '@/data/adapters/sqlite';
import type { Repository, RepositoryRow, WriteOptions } from '@/data/repository';
import { createPackRegistry, loadPack, type LoadedPack } from '@/domain/curriculum/registry';
import { seedDefaultLedgerAccounts } from '@/domain/finance/ledger';
import { asId, type Id } from '@/domain/ids';
import type { CurrencyCode } from '@/domain/money';

import type { DemoContext, DemoYear } from './phases/context';
import { termIndexOn } from './phases/context';
import { codeOf, findOne, findOrCreate, sequenceYear } from './phases/helpers';
import { seedAssessment } from './phases/assessment';
import { seedFinance } from './phases/finance';
import { seedPreviousYear } from './phases/history';
import { seedMoney } from './phases/payments';
import { seedPastoral } from './phases/pastoral';
import { applyFates, seedPeople } from './phases/people';
import { seedStaff } from './phases/staff';
import { seedTeaching } from './phases/teaching';

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
  /**
   * The code of the class's level. The curriculum pack's own level code when the school runs one,
   * so the pack's rules name it; derived from the name when the caller does not say.
   */
  readonly code?: string;
}

/** What the demo seed is asked for. */
export interface DemoSchoolInput {
  readonly school: DemoSchoolProfile;
  readonly year: DemoSchoolYear;
  readonly classes: readonly DemoSchoolClass[];
  /**
   * Whether the sample school is written: the staff, the learners and their guardians, last year and
   * this one, the teaching, the exams, the fees with their invoices, payments and ledger, and the
   * registers. Without it only the structure a new school needs is created: institution, calendar,
   * year, periods, programme, levels and class groups.
   */
  readonly demo: boolean;
  /**
   * The day the sample school is set on, as an ISO date: terms that ended before it are history, the
   * one holding it is current. The day of the run when the caller does not say.
   */
  readonly today?: string;
  /**
   * Told the name of each substep as the run reaches it (`structure`, `staff`, `learners`, `fees`, ...),
   * so a caller can show what a long install is doing. The same names a failure reports.
   */
  readonly onProgress?: (step: string) => void;
  /**
   * The code of the curriculum pack the school runs (`ke-cbe`). The programme is pinned to the pack,
   * and the sample school's head teacher installs it through the pack registry, so the pages that
   * read a programme's installed pack - the promotion run first - find one. The document comes from
   * the seed options' `packDocument`; a pack it cannot produce fails the seed.
   */
  readonly curriculumPack?: string;
}

/** What the seed reads from outside the domain. */
export interface DemoSeedOptions {
  /** The document of the shipped pack a code names, or undefined when the installation ships none. */
  readonly packDocument?: (code: string) => unknown;
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

/** The curriculum pack the school runs: the shipped document and what the loader made of it. */
interface DemoCurriculum {
  readonly document: unknown;
  readonly pack: LoadedPack;
}

/** The pack a code names, loaded; a pack the installation cannot produce or load fails the seed. */
function curriculumOf(code: string, seedOptions: DemoSeedOptions): DemoCurriculum {
  const document = seedOptions.packDocument?.(code);
  if (document === undefined || document === null) {
    throw new Error(`the demo school runs the ${code} curriculum pack, but the installation ships no such pack`);
  }
  const loaded = loadPack(document);
  if (!loaded.ok) {
    throw new Error(
      `the ${code} curriculum pack does not load: ${loaded.issues
        .map((issue) => `${issue.path} ${issue.check}`)
        .join(', ')}`
    );
  }
  return { document, pack: loaded.pack };
}

/**
 * Records the school's curriculum pack as installed, through the pack registry the setup wizard
 * uses. The head teacher installs it: the registry names a real user on every write it makes.
 */
async function installCurriculum(ctx: DemoContext, curriculum: DemoCurriculum): Promise<void> {
  const head = await findOne(ctx.repository, 'user', {
    where: { institution_id: ctx.institutionId, username: 'headteacher' },
  });
  if (!head) throw new Error('the sample school has no head teacher login to install its curriculum');
  const registry = createPackRegistry({
    repository: ctx.repository,
    actor: head.id,
    source: () => curriculum.document,
  });
  await registry.install(ctx.programmeId, curriculum.document, { reason: ctx.options.reason });
  ctx.count('curriculum_pack');
}

const CAMPUS_NAME = 'Main Campus';
const CALENDAR_NAME = 'School Calendar';
const PROGRAMME_NAME = 'School Programme';
const STAGE_NAME = 'School';

/** The calendar day of the run, in the school's own calendar. */
function todayOf(input: DemoSchoolInput): string {
  return input.today ?? new Date().toISOString().slice(0, 10);
}

/**
 * Seeds a school through the canonical repository.
 *
 * The structure a new school cannot work without (the institution, its calendar, the academic
 * year and its terms, the programme, the levels and the year-scoped class groups) is written on
 * every run, so the wizard can be re-opened without duplicating anything. The sample school - last
 * year and this one, with its staff, its families and learners in every situation the school meets,
 * its teaching and exams, its fee book with invoices, payments and ledger, and its registers - is
 * written only when `demo` is set and the school has no learners yet.
 *
 * Every row is written through the repository or the domain services, so the entity schema, the
 * invariants of spec 02 §12, the tenancy rule, the audit trail and the concurrency columns are all
 * exercised. Learners are admitted through `AdmissionService`, invoices are posted by the billing
 * run, payments and credit notes go through the payments and adjustments services, and the
 * registers through `AttendanceService`: the golden paths of the product create the demo data.
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
  input: DemoSchoolInput,
  seedOptions: DemoSeedOptions = {}
): Promise<DemoSchoolResult> {
  const curriculum = input.curriculumPack
    ? curriculumOf(input.curriculumPack, seedOptions)
    : null;
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
    input.onProgress?.(name);
  };

  try {
    return await repository.transaction(seed);
  } catch (error) {
    if (error instanceof DemoSchoolSeedError) throw error;
    throw new DemoSchoolSeedError(running, { ...counts }, error);
  }

  // The body of the seed, run inside one repository transaction: every write it makes joins it.
  async function seed(tx: SqliteTransaction): Promise<DemoSchoolResult> {
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

    // The chart belongs to the school, not to the code: write the default accounts here, where
    // the school is being created, so the ledger and the accounting screens read the same rows.
    at('ledger accounts');
    const chart = await seedDefaultLedgerAccounts(repository, institutionId, options);
    for (let index = 0; index < chart.created; index += 1) count('ledger_account');

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
        curriculum_pack_code: curriculum?.pack.code ?? codeOf(locale.split('-')[1] ?? 'CBE', 'CBE'),
        pack_version: curriculum?.pack.version ?? '1.0.0',
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

    // Terms are numbered from 1: the sequence is what an invoice number prints for its term.
    const periods = await repository.list('academic_period', {
      where: { academic_year_id: academicYearId },
      limit: 50,
    });
    const storedTerms = [...periods.items];
    for (const [index, term] of year.terms.entries()) {
      if (storedTerms.some((row) => row.kind === 'term' && row.sequence === index + 1)) continue;
      const otherCurrent = storedTerms.some((row) => row.status === 'current');
      const row = await repository.create(
        'academic_period',
        {
          institution_id: institutionId,
          academic_year_id: academicYearId,
          kind: 'term',
          sequence: index + 1,
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
    const terms = storedTerms
      .filter((row) => row.kind === 'term')
      .sort((left, right) => left.sequence - right.sequence);
    if (terms.length === 0 && input.demo) {
      throw new Error('the academic year has no term to place the demo in');
    }

    const levels: RepositoryRow<'level'>[] = [];
    for (const [index, klass] of classes.entries()) {
      const name = klass.name.trim();
      if (!name) continue;
      const code = (klass.code?.trim() || codeOf(name, `LEVEL${index + 1}`)).slice(0, 50);
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

    // The structure is complete; the sample school needs a class group and a term to land in.
    let demoSeeded = false;
    if (input.demo && terms.length > 0) {
      const learners = await repository.list('learner', {
        where: { institution_id: institutionId },
        limit: 1,
      });
      // A real school must never receive the demo people, and a second run must not duplicate the first.
      if (learners.items.length === 0) {
        const today = todayOf(input);
        const current: DemoYear = { year: academicYear, financialYear, terms, classGroups };
        const base = {
          repository,
          tx,
          institutionId,
          campusId: asId<'campus'>(campus.id),
          calendarId: asId<'calendar'>(calendar.id),
          programmeId,
          currency: currency as CurrencyCode,
          today,
          levels,
          options,
          count,
          at,
        };
        at('history');
        const previous = await seedPreviousYear({ ...base, current });
        await seedSampleSchool(
          {
            ...base,
            current,
            previous,
            currentTermIndex: termIndexOn(terms, today),
          },
          curriculum
        );
        demoSeeded = true;
      }
    }

    return {
      institutionId,
      created,
      demoSeeded,
      counts: { ...counts },
    };
  }
}

/**
 * Writes the sample school over its structure, in the order its life happened: the staff, the people
 * (admitted last year or this, promoted, graduated or gone), what is taught and the exams sat, the fee
 * book and every term's invoices, what the families paid and what became of the alumni's accounts,
 * and the registers of the last days.
 */
async function seedSampleSchool(ctx: DemoContext, curriculum: DemoCurriculum | null): Promise<void> {
  ctx.at('staff');
  const staff = await seedStaff(ctx);

  ctx.at('learners');
  const roster = await seedPeople(ctx, staff);
  // The people's logins exist now, so the head teacher can install the curriculum.
  if (curriculum) await installCurriculum(ctx, curriculum);

  const teaching = await seedTeaching(ctx, staff, roster);
  await seedAssessment(ctx, roster, teaching);

  // The people who take the money and approve what leaves: the bursar and the head teacher's logins.
  const userOf = async (username: string): Promise<string | undefined> =>
    (await findOne(ctx.repository, 'user', { where: { institution_id: ctx.institutionId, username } }))?.id;
  const actors = { bursarId: await userOf('finance'), headId: await userOf('headteacher') };

  const finance = await seedFinance(ctx, roster, actors.bursarId);
  await seedMoney(ctx, roster, finance, actors);
  await seedPastoral(ctx, staff, roster);
  await applyFates(ctx, roster);
}
