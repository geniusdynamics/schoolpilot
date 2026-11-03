// ABOUTME: The transport billing rules: one charge per assigned learner posted as an invoice line
// ABOUTME: of its own kind, idempotent per learner and period, with a closed period refused and an
// ABOUTME: unenrolled learner skipped by name.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createNodeSqliteAdapter, type SqliteAdapter } from '@/data/adapters/sqlite';
import { applySchemaMigrations } from '@/data/migrations';
import { createRepository, type Repository } from '@/data/repository';
import { LedgerService, createSqliteLedgerStore } from '@/domain/finance/ledger';
import { SequenceService, createSqliteSequenceStore } from '@/domain/sequences';

import { isTransportError } from '../errors';
import { TransportBillingService } from '../service';

const CLOCK = new Date('2027-02-10T09:00:00.000Z');
const INSTITUTION = '00000000-0000-7000-8000-000000000001';
const REVENUE_ACCOUNT = '4100';

interface School {
  readonly institutionId: string;
  readonly periodId: string;
  readonly routeId: string;
  readonly enrolledLearnerId: string;
  readonly unenrolledLearnerId: string;
}

let adapter: SqliteAdapter;
let repository: Repository;
let ledger: LedgerService;
let service: TransportBillingService;

async function seedSchool(): Promise<School> {
  const institution = await repository.create('institution', {
    name: 'Mwangaza Secondary School',
    short_name: 'Mwangaza',
    country: 'KE',
    ownership: 'public',
    gender_policy: 'mixed',
    boarding_policy: 'day',
    default_locale: 'en-KE',
    time_zone: 'Africa/Nairobi',
    base_currency: 'KES',
  });
  const institutionId = institution.id;

  const calendar = await repository.create('calendar', {
    institution_id: institutionId,
    name: 'National Calendar',
    programme_ids: [],
  });
  const year = await repository.create('academic_year', {
    institution_id: institutionId,
    calendar_id: calendar.id,
    name: '2027',
    start_date: '2027-01-05',
    end_date: '2027-11-30',
    status: 'current',
  });
  const period = await repository.create('academic_period', {
    institution_id: institutionId,
    academic_year_id: year.id,
    kind: 'term',
    sequence: 1,
    name: 'Term 1 2027',
    start_date: '2027-01-05',
    end_date: '2027-04-10',
    is_reporting: true,
    is_billing: true,
    status: 'current',
  });
  const programme = await repository.create('programme', {
    institution_id: institutionId,
    curriculum_pack_code: 'ke-cbe',
    pack_version: '1.0.0',
    name: 'CBE Junior School',
    calendar_id: calendar.id,
    status: 'active',
  });
  const stage = await repository.create('stage', {
    institution_id: institutionId,
    programme_id: programme.id,
    code: 'JS',
    name: 'Junior School',
    sequence: 1,
  });
  const level = await repository.create('level', {
    institution_id: institutionId,
    stage_id: stage.id,
    code: 'G7',
    name: 'Grade 7',
    ordinal: 1,
    is_terminal: false,
  });
  const campus = await repository.create('campus', {
    institution_id: institutionId,
    name: 'Main Campus',
    is_main: true,
  });
  const classGroup = await repository.create('class_group', {
    institution_id: institutionId,
    campus_id: campus.id,
    academic_year_id: year.id,
    programme_id: programme.id,
    level_id: level.id,
    name: 'Blue',
    homeroom_teacher_ids: [],
  });

  const learner = (given: string, family: string, admission: string) =>
    repository.create('learner', {
      institution_id: institutionId,
      given_name: given,
      family_name: family,
      name_order: 'given_first',
      gender: 'female',
      admission_number: admission,
      status: 'enrolled',
      residence_status: 'day',
    });

  const enrolled = await learner('Jane', 'Wanjiru', 'ADM-1');
  const unenrolled = await learner('Peter', 'Otieno', 'ADM-2');

  await repository.create('enrolment', {
    institution_id: institutionId,
    learner_id: enrolled.id,
    academic_year_id: year.id,
    programme_id: programme.id,
    level_id: level.id,
    class_group_id: classGroup.id,
    status: 'active',
    start_date: '2027-01-05',
    end_date: null,
    entry_reason: 'new_admission',
  });

  const route = await repository.create('transport_route', {
    institution_id: institutionId,
    name: 'Westlands',
    cost: { amount_minor: 150_000, currency: 'KES' },
    revenue_account_code: REVENUE_ACCOUNT,
    active: true,
  });

  for (const assigned of [enrolled, unenrolled]) {
    await repository.create('transport_assignment', {
      institution_id: institutionId,
      learner_id: assigned.id,
      route_id: route.id,
      academic_period_id: period.id,
      status: 'active',
    });
  }

  return {
    institutionId,
    periodId: period.id,
    routeId: route.id,
    enrolledLearnerId: enrolled.id,
    unenrolledLearnerId: unenrolled.id,
  };
}

function bill(school: School) {
  return service.billRoute({
    institutionId: school.institutionId,
    routeId: school.routeId,
    academicPeriodId: school.periodId,
    issueDate: '2027-02-10',
  });
}

beforeEach(async () => {
  adapter = createNodeSqliteAdapter({ filename: ':memory:', foreignKeys: true });
  await adapter.open();
  repository = createRepository({ adapter });
  await repository.setup();
  await applySchemaMigrations(adapter);

  ledger = new LedgerService({
    store: createSqliteLedgerStore(adapter),
    now: () => CLOCK,
  });
  service = new TransportBillingService({
    repository,
    numbers: new SequenceService({
      store: createSqliteSequenceStore(adapter),
      now: () => CLOCK,
    }),
    now: () => CLOCK,
  });
});

afterEach(async () => {
  await adapter.close();
});

describe('billing a transport route for a term', () => {
  it('charges each enrolled learner and posts a balanced entry to the route revenue account', async () => {
    const school = await seedSchool();

    const result = await bill(school);

    expect(result.chargedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.skipped[0]).toMatchObject({
      learnerId: school.unenrolledLearnerId,
      learnerName: 'Peter Otieno',
      reason: 'no_active_enrolment',
    });
    expect(result.skipped[0]?.message).toContain('Term 1 2027');
    expect(result.charged[0]).toMatchObject({
      learnerId: school.enrolledLearnerId,
      learnerName: 'Jane Wanjiru',
      amount: { amount_minor: 150_000, currency: 'KES' },
    });

    const invoices = await repository.list('invoice', {
      where: { learner_id: school.enrolledLearnerId },
    });
    expect(invoices.items).toHaveLength(1);
    const [chargedInvoice] = invoices.items;
    expect(chargedInvoice.academic_period_id).toBe(school.periodId);
    expect(chargedInvoice.total).toEqual({ amount_minor: 150_000, currency: 'KES' });

    const lines = await repository.list('invoice_line', {
      where: { invoice_id: chargedInvoice.id },
    });
    expect(lines.items).toHaveLength(1);
    expect(lines.items[0]).toMatchObject({
      kind: 'transport',
      amount: { amount_minor: 150_000, currency: 'KES' },
    });
    expect(lines.items[0]?.description).toContain('Westlands');

    const entries = await ledger.listEntries({
      institutionId: school.institutionId,
      sourceKind: 'invoice',
    });
    expect(entries).toHaveLength(1);
    const [entry] = entries;
    expect(entry?.source).toMatchObject({ id: chargedInvoice.id });
    expect(entry?.totalDebit).toEqual(entry?.totalCredit);
    const debit = entry?.lines.find((line) => line.debit !== null);
    const credit = entry?.lines.find((line) => line.credit !== null);
    expect(debit).toMatchObject({ accountCode: '1100' });
    expect(debit?.debit?.amount_minor).toBe(150_000);
    expect(credit).toMatchObject({ accountCode: REVENUE_ACCOUNT });
    expect(credit?.credit?.amount_minor).toBe(150_000);
  });

  it('does not bill the same learner twice when the action is pressed again', async () => {
    const school = await seedSchool();

    const first = await bill(school);
    const second = await bill(school);

    expect(first.chargedCount).toBe(1);
    expect(second.chargedCount).toBe(0);
    expect(second.skipped).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          learnerId: school.enrolledLearnerId,
          reason: 'already_charged',
        }),
      ])
    );
    expect(second.skipped[0]?.message).toContain(first.charged[0]?.invoiceNumber ?? '');

    const invoices = await repository.list('invoice', {
      where: { learner_id: school.enrolledLearnerId },
    });
    expect(invoices.items).toHaveLength(1);
    expect(
      await ledger.listEntries({ institutionId: school.institutionId, sourceKind: 'invoice' })
    ).toHaveLength(1);
  });

  it('refuses a closed academic period, names it, and writes nothing', async () => {
    const school = await seedSchool();
    const period = await repository.get('academic_period', school.periodId as never);
    if (!period) throw new Error('the seeded period is missing');
    await repository.update(
      'academic_period',
      period.id,
      { status: 'closed' },
      { expectedVersion: period.rowVersion }
    );

    const failure = await bill(school).catch((error: unknown) => error);

    expect(isTransportError(failure, 'period_closed')).toBe(true);
    expect((failure as Error).message).toContain('Term 1 2027');
    expect((await repository.list('invoice', {})).items).toHaveLength(0);
    expect(await ledger.listEntries({ institutionId: school.institutionId })).toHaveLength(0);
  });

  it('skips a learner with no active enrolment and reports the reason', async () => {
    const school = await seedSchool();
    const enrolments = await repository.list('enrolment', {
      where: { learner_id: school.enrolledLearnerId },
    });
    const enrolment = enrolments.items[0];
    if (!enrolment) throw new Error('the seeded enrolment is missing');
    await repository.update(
      'enrolment',
      enrolment.id,
      { status: 'left', exit_reason: 'withdrawn', end_date: '2027-02-01' },
      { expectedVersion: enrolment.rowVersion }
    );

    const result = await bill(school);

    expect(result.chargedCount).toBe(0);
    expect(result.skippedCount).toBe(2);
    expect(result.skipped.map((learner) => learner.reason)).toEqual([
      'no_active_enrolment',
      'no_active_enrolment',
    ]);
    expect(result.skipped.map((learner) => learner.learnerName).sort()).toEqual([
      'Jane Wanjiru',
      'Peter Otieno',
    ]);
    expect((await repository.list('invoice', {})).items).toHaveLength(0);
  });
});
