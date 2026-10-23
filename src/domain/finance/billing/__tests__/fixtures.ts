// ABOUTME: The billing-run test fixture: a real SQLite database with the seeded canonical rows, a
// ABOUTME: published schedule of cells, learners and enrolments a run can bill, and the ids it
// ABOUTME: addresses. Shared by the service tests and the performance test.

import type { CreateInput, RepositoryRow } from '@/data/repository';
import { closeTestContext, createTestContext, type TestContext } from '@/data/__tests__/harness';
import { asId, type Id } from '@/domain/ids';
import { fromMinor, type CurrencyCode, type Money } from '@/domain/money';

import { BillingRunService } from '../service';
import type { BillingRunRequest, BillingRunScope } from '../types';

/** A residence a cell can address. */
export type TestResidence = 'day' | 'boarder' | 'weekly_boarder';

/** One line of a published test schedule. */
export interface TestCellLine {
  readonly feeItemId: Id<'fee_item'>;
  readonly amountMinor: number;
  readonly levelId?: Id<'level'>;
  readonly residence?: TestResidence;
  readonly frequency?: 'per_term' | 'per_year' | 'monthly' | 'one_off_at_admission';
  readonly prorationRule?: 'full' | 'none' | 'pro_rata_weeks' | 'pro_rata_days' | 'from_half_term';
}

/** A published schedule version the fixture writes. */
export interface TestScheduleSpec {
  readonly name: string;
  readonly version?: number;
  readonly levelIds: readonly Id<'level'>[];
  readonly residences: readonly TestResidence[];
  readonly feeCategoryIds: readonly Id<'fee_category'>[];
  readonly newLearnersOnly?: boolean;
  readonly lines: readonly TestCellLine[];
}

/** One learner and their enrolment. */
export interface TestLearnerSpec {
  readonly admissionNumber: string;
  readonly residence: TestResidence;
  readonly levelId: Id<'level'>;
  readonly startDate: string;
  readonly endDate?: string | null;
  readonly status?: 'active' | 'repeating' | 'left' | 'completed';
  readonly exitReason?: 'promoted' | 'graduated' | 'transferred_out' | 'withdrawn' | 'expelled' | 'deceased';
  readonly admissionDate?: string;
  readonly feeCategoryIds?: readonly Id<'fee_category'>[];
}

/** The ids and helpers one test works with. */
export interface BillingFixture {
  readonly context: TestContext;
  readonly institutionId: Id<'institution'>;
  readonly academicYearId: Id<'academic_year'>;
  readonly periodId: Id<'academic_period'>;
  readonly levelId: Id<'level'>;
  readonly classGroupId: Id<'class_group'>;
  readonly feeCategoryId: Id<'fee_category'>;
  readonly seededLearnerId: Id<'learner'>;
  readonly currency: CurrencyCode;
  feeItem(code: string, name: string, revenueAccountCode?: string): Promise<Id<'fee_item'>>;
  level(code: string, name: string, ordinal: number): Promise<Id<'level'>>;
  publishSchedule(spec: TestScheduleSpec): Promise<RepositoryRow<'fee_schedule'>>;
  addLine(scheduleId: Id<'fee_schedule'>, line: TestCellLine): Promise<RepositoryRow<'fee_schedule_line'>>;
  enrol(spec: TestLearnerSpec): Promise<Id<'learner'>>;
  service(nowIso?: string): BillingRunService;
  request(scope: Partial<BillingRunScope> & { periodId?: Id<'academic_period'> }, extra?: Partial<BillingRunRequest>): BillingRunRequest;
  close(): Promise<void>;
}

/** Money in the institution's currency, from whole minor units. */
export function money(minor: number, currency: CurrencyCode = 'KES'): Money {
  return fromMinor(minor, currency);
}

/**
 * Opens a fixture on a fresh database.
 *
 * The seeded canonical fixtures already hold one published schedule whose only line names no
 * residence while its header spans two, so the matrix cannot resolve it. The fixture archives that
 * version, so a test's own schedule is the only one in force and the numbers are the test's own.
 */
export async function createBillingFixture(): Promise<BillingFixture> {
  const context = await createTestContext();
  const institutionId = context.seed.idOf('institution');
  const academicYearId = context.seed.idOf('academic_year');
  const periodId = context.seed.idOf('academic_period');
  const levelId = context.seed.idOf('level');
  const classGroupId = context.seed.idOf('class_group');
  const feeCategoryId = context.seed.idOf('fee_category');

  const seededSchedule = await context.repository.get('fee_schedule', context.seed.idOf('fee_schedule'));
  if (seededSchedule && seededSchedule.status !== 'archived') {
    await context.repository.update(
      'fee_schedule',
      seededSchedule.id,
      { status: 'archived' },
      { expectedVersion: seededSchedule.rowVersion, reason: 'the test fixture bills its own version' }
    );
  }

  const feeItem = async (code: string, name: string, revenueAccountCode?: string) => {
    const row = await context.repository.create('fee_item', {
      institution_id: institutionId,
      code,
      name,
      category: 'tuition',
      refundable: false,
      taxable: false,
      priority: 1,
      funding_source: 'parent',
      ...(revenueAccountCode === undefined ? {} : { revenue_account_code: revenueAccountCode }),
    } satisfies CreateInput<'fee_item'>);
    return row.id;
  };

  const level = async (code: string, name: string, ordinal: number) => {
    const row = await context.repository.create(
      'level',
      context.seed.inputFor('level', { code, name, ordinal, is_terminal: false })
    );
    return row.id;
  };

  const addLine = async (scheduleId: Id<'fee_schedule'>, line: TestCellLine) =>
    context.repository.create('fee_schedule_line', {
      institution_id: institutionId,
      fee_schedule_id: scheduleId,
      fee_item_id: line.feeItemId,
      ...(line.levelId === undefined ? {} : { level_id: line.levelId }),
      ...(line.residence === undefined ? {} : { residence_status: line.residence }),
      amount: money(line.amountMinor),
      mandatory: true,
      frequency: line.frequency ?? 'per_term',
      proration_rule: line.prorationRule ?? 'full',
    } satisfies CreateInput<'fee_schedule_line'>);

  const publishSchedule = async (spec: TestScheduleSpec) => {
    const row = await context.repository.create('fee_schedule', {
      institution_id: institutionId,
      name: spec.name,
      academic_year_id: academicYearId,
      academic_period_ids: [periodId],
      programme_ids: [],
      level_ids: [...spec.levelIds],
      residence_statuses: [...spec.residences],
      fee_category_ids: [...spec.feeCategoryIds],
      new_learners_only: spec.newLearnersOnly ?? false,
      version: spec.version ?? 1,
      status: 'published',
    } satisfies CreateInput<'fee_schedule'>);
    for (const line of spec.lines) await addLine(row.id, line);
    return row;
  };

  const enrol = async (spec: TestLearnerSpec) => {
    const learner = await context.repository.create(
      'learner',
      context.seed.inputFor('learner', {
        admission_number: spec.admissionNumber,
        residence_status: spec.residence,
        status: 'enrolled',
        ...(spec.admissionDate === undefined ? {} : { admission_date: spec.admissionDate }),
      })
    );
    const status = spec.status ?? 'active';
    const exitReason = spec.exitReason ?? (status === 'left' ? 'withdrawn' : status === 'completed' ? 'graduated' : undefined);
    await context.repository.create(
      'enrolment',
      context.seed.inputFor('enrolment', {
        learner_id: learner.id,
        level_id: spec.levelId,
        class_group_id: classGroupId,
        start_date: spec.startDate,
        end_date: spec.endDate ?? null,
        status,
        ...(exitReason === undefined ? {} : { exit_reason: exitReason }),
        ...(spec.feeCategoryIds === undefined ? {} : { fee_category_ids: [...spec.feeCategoryIds] }),
      })
    );
    return learner.id;
  };

  const service = (nowIso = '2027-02-01T08:00:00.000Z') =>
    new BillingRunService({ store: context.repository, now: () => new Date(nowIso) });

  const request = (
    scope: Partial<BillingRunScope> & { periodId?: Id<'academic_period'> },
    extra: Partial<BillingRunRequest> = {}
  ): BillingRunRequest => ({
    scope: { periodId: scope.periodId ?? periodId, ...scope },
    issueDate: '2027-02-01',
    ...extra,
  });

  return {
    context,
    institutionId,
    academicYearId,
    periodId,
    levelId,
    classGroupId,
    feeCategoryId,
    seededLearnerId: context.seed.idOf('learner'),
    currency: 'KES',
    feeItem,
    level,
    publishSchedule,
    addLine,
    enrol,
    service,
    request,
    close: () => closeTestContext(context),
  };
}

/** The learner ids a preview or outcome covered, in the order they were reported. */
export function billedLearnerIds(result: { readonly lines: readonly { readonly learnerId: string }[] }): string[] {
  return result.lines.map((line) => line.learnerId);
}

/** The learner ids the repository holds invoices for, in a period. */
export async function invoiceLearnerIds(
  fixture: BillingFixture,
  periodId?: Id<'academic_period'>
): Promise<string[]> {
  const page = await fixture.context.repository.list('invoice', {
    where: { academic_period_id: periodId ?? fixture.periodId },
    limit: 500,
  });
  return page.items.map((invoice) => invoice.learner_id ?? '');
}

/** The id a test addresses a learner by. */
export function learnerId(value: string): Id<'learner'> {
  return asId<'learner'>(value);
}
