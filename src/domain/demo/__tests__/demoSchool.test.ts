// ABOUTME: The demo school seed, proven against a real SQLite database: the rows it writes, the
// ABOUTME: audit trail behind them, its idempotency and the way it fails.

import { afterEach, describe, expect, it } from 'vitest';

import {
  closeTestContext,
  createTestContext,
  type TestContext,
} from '@/data/__tests__/harness';
import { DemoSchoolSeedError, defaultDemoSchool, seedDemoSchool, type DemoSchoolInput } from '@/domain/demo';
import type { EntityName } from '@/domain/schema';

const contexts: TestContext[] = [];

async function freshContext(): Promise<TestContext> {
  const context = await createTestContext({ seed: false });
  contexts.push(context);
  return context;
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => closeTestContext(context)));
});

/** The demo school of the tests: one year, three terms and two classes with two streams each. */
function demoInput(overrides: Partial<DemoSchoolInput> = {}): DemoSchoolInput {
  return {
    school: { name: 'Mwangaza Academy', motto: 'Knowledge and service', address: 'P.O. Box 9, Nakuru' },
    year: {
      name: '2027',
      startDate: '2027-01-05',
      endDate: '2027-11-30',
      terms: [
        { name: 'Term 1', startDate: '2027-01-05', endDate: '2027-04-10' },
        { name: 'Term 2', startDate: '2027-04-28', endDate: '2027-08-01' },
        { name: 'Term 3', startDate: '2027-08-25', endDate: '2027-10-31' },
      ],
    },
    classes: [
      { name: 'Grade 7', streams: ['North', 'South'] },
      { name: 'Grade 8', streams: ['North'] },
    ],
    demo: true,
    ...overrides,
  };
}

async function count(context: TestContext, entity: EntityName): Promise<number> {
  const page = await context.repository.list(entity, { limit: 1 });
  return page.total;
}

describe('the demo school seed', () => {
  it('writes the school through the repository, with the canonical shape of every row', async () => {
    const context = await freshContext();
    const result = await seedDemoSchool(context.repository, demoInput());

    expect(result.created).toBe(true);
    expect(result.demoSeeded).toBe(true);
    expect(result.counts.institution).toBe(1);
    expect(result.counts.learner).toBeGreaterThan(0);

    const institutions = await context.repository.list('institution', { limit: 5 });
    expect(institutions.items).toHaveLength(1);
    expect(institutions.items[0]).toMatchObject({
      name: 'Mwangaza Academy',
      motto: 'Knowledge and service',
      country: 'KE',
      base_currency: 'KES',
      time_zone: 'Africa/Nairobi',
    });
    expect(typeof institutions.items[0].rowVersion).toBe('number');
    expect(institutions.items[0].created_at).toBeTruthy();

    const years = await context.repository.list('academic_year', { limit: 5 });
    expect(years.items).toHaveLength(1);
    expect(years.items[0]).toMatchObject({ name: '2027', status: 'current' });

    const periods = await context.repository.list('academic_period', { limit: 10 });
    expect(periods.items).toHaveLength(3);
    expect(periods.items.filter((row) => row.status === 'current')).toHaveLength(1);
    expect(periods.items.every((row) => row.kind === 'term')).toBe(true);

    const classGroups = await context.repository.list('class_group', { limit: 10 });
    expect(classGroups.items).toHaveLength(3);
    expect(classGroups.items.every((row) => row.homeroom_teacher_ids.length === 1)).toBe(true);

    const learners = await context.repository.list('learner', { limit: 50 });
    expect(learners.items.length).toBeGreaterThanOrEqual(10);
    expect(learners.items.every((row) => row.status === 'enrolled')).toBe(true);
    expect(learners.items.every((row) => row.admission_number.startsWith('ADM/2027/'))).toBe(true);

    const enrolments = await context.repository.list('enrolment', { limit: 50 });
    expect(enrolments.items).toHaveLength(learners.items.length);
    expect(enrolments.items.every((row) => row.status === 'active')).toBe(true);
    expect(enrolments.items.every((row) => row.academic_year_id === years.items[0].id)).toBe(true);

    const guardians = await context.repository.list('guardian', { limit: 50 });
    // The first two learners are siblings, so their guardian is linked, never copied.
    expect(guardians.items).toHaveLength(learners.items.length - 1);
    const links = await context.repository.list('learner_guardian', { limit: 50 });
    expect(links.items).toHaveLength(learners.items.length);
    expect(links.items.filter((row) => row.is_primary)).toHaveLength(learners.items.length);

    const teachingGroups = await context.repository.list('teaching_group', { limit: 50 });
    expect(teachingGroups.items.length).toBeGreaterThan(0);
    const members = await context.repository.list('teaching_group_member', { limit: 200 });
    expect(members.items.length).toBeGreaterThanOrEqual(learners.items.length);

    const assessments = await context.repository.list('assessment', { limit: 10 });
    expect(assessments.items).toHaveLength(4);
    const marks = await context.repository.list('mark', { limit: 200 });
    expect(marks.items.length).toBe(learners.items.length * assessments.items.length);

    const feeItems = await context.repository.list('fee_item', { limit: 10 });
    expect(feeItems.items).toHaveLength(3);
    const schedule = await context.repository.list('fee_schedule', { limit: 5 });
    expect(schedule.items).toHaveLength(1);
    const lines = await context.repository.list('fee_schedule_line', { limit: 10 });
    expect(lines.items).toHaveLength(3);

    const invoices = await context.repository.list('invoice', { limit: 50 });
    expect(invoices.items).toHaveLength(learners.items.length);
    const invoiceLines = await context.repository.list('invoice_line', { limit: 100 });
    expect(invoiceLines.items).toHaveLength(learners.items.length * 3);
    const payments = await context.repository.list('payment', { limit: 10 });
    expect(payments.items).toHaveLength(3);
    const allocations = await context.repository.list('payment_allocation', { limit: 10 });
    expect(allocations.items).toHaveLength(3);
    const receipts = await context.repository.list('receipt', { limit: 10 });
    expect(receipts.items).toHaveLength(3);

    const sessions = await context.repository.list('attendance_session', { limit: 10 });
    expect(sessions.items).toHaveLength(3);
    const attendanceMarks = await context.repository.list('attendance_mark', { limit: 50 });
    expect(attendanceMarks.items).toHaveLength(learners.items.length);
    expect(attendanceMarks.items.some((row) => row.status === 'late')).toBe(true);
  });

  it('records every create in the audit trail', async () => {
    const context = await freshContext();
    await seedDemoSchool(context.repository, demoInput());

    const learners = await context.repository.list('learner', { limit: 50 });
    const trail = await context.repository.auditTrail('learner', learners.items[0].id);
    expect(trail.length).toBeGreaterThan(0);
    expect(trail[0]).toMatchObject({ entity: 'learner', action: 'create' });
    expect(trail[0].after).toMatchObject({ admission_number: learners.items[0].admission_number });

    const classGroups = await context.repository.list('class_group', { limit: 10 });
    const classTrail = await context.repository.auditLog({ entity: 'class_group', limit: 100 });
    const creates = classTrail.filter((event) => event.action === 'create');
    expect(creates).toHaveLength(classGroups.items.length);
    // The homeroom teacher of every class group is set right after it is created, so the trail
    // holds that update too.
    expect(classTrail.some((event) => event.action === 'update')).toBe(true);
  });

  it('is idempotent: a second run reuses the school instead of duplicating it', async () => {
    const context = await freshContext();
    const first = await seedDemoSchool(context.repository, demoInput());
    const before = {
      institution: await count(context, 'institution'),
      learner: await count(context, 'learner'),
      enrolment: await count(context, 'enrolment'),
      classGroup: await count(context, 'class_group'),
      mark: await count(context, 'mark'),
      invoice: await count(context, 'invoice'),
    };

    const second = await seedDemoSchool(context.repository, demoInput());

    expect(second.created).toBe(false);
    expect(second.demoSeeded).toBe(false);
    expect(second.institutionId).toBe(first.institutionId);
    expect(await count(context, 'institution')).toBe(before.institution);
    expect(await count(context, 'learner')).toBe(before.learner);
    expect(await count(context, 'enrolment')).toBe(before.enrolment);
    expect(await count(context, 'class_group')).toBe(before.classGroup);
    expect(await count(context, 'mark')).toBe(before.mark);
    expect(await count(context, 'invoice')).toBe(before.invoice);

    // A wizard re-run that renames the school moves the canonical row with it.
    await seedDemoSchool(
      context.repository,
      demoInput({ school: { name: 'Mwangaza Junior School' }, demo: false })
    );
    const [school] = (await context.repository.list('institution', { limit: 2 })).items;
    expect(school.name).toBe('Mwangaza Junior School');
    expect(await count(context, 'institution')).toBe(1);
  });

  it('gives a fresh canonical database the structure a learner needs, even without the demo', async () => {
    const context = await freshContext();
    const result = await seedDemoSchool(context.repository, demoInput({ demo: false }));

    expect(result.demoSeeded).toBe(false);
    expect(await count(context, 'institution')).toBe(1);
    expect(await count(context, 'academic_year')).toBe(1);
    expect(await count(context, 'academic_period')).toBe(3);
    expect(await count(context, 'programme')).toBe(1);
    expect(await count(context, 'level')).toBe(2);
    expect(await count(context, 'class_group')).toBe(3);
    expect(await count(context, 'learner')).toBe(0);
    expect(await count(context, 'enrolment')).toBe(0);

    // The class-group picker of the admission page has something to offer.
    const groups = await context.repository.list('class_group', { limit: 10 });
    expect(groups.items.every((row) => row.programme_id && row.level_id && row.academic_year_id)).toBe(true);
  });

  it('fails loudly and reports what it could not create', async () => {
    const context = await freshContext();
    const structure = await seedDemoSchool(context.repository, demoInput({ demo: false }));

    // A national learner identifier the school already recorded: the second admission of the
    // demo is refused while it is being planned, before it writes anything.
    const holder = await context.repository.create('guardian', {
      institution_id: structure.institutionId,
      given_name: 'Holder',
      family_name: 'Guardian',
      name_order: 'given_first',
      gender: 'female',
    });
    await context.repository.create('identifier', {
      institution_id: structure.institutionId,
      owner_type: 'guardian',
      owner_id: holder.id,
      scheme: 'ke.kemis_upi',
      value: 'UPI/2027/002',
    });

    const failure = await seedDemoSchool(context.repository, demoInput()).catch(
      (error: unknown) => error
    );

    expect(failure).toBeInstanceOf(DemoSchoolSeedError);
    const seedFailure = failure as DemoSchoolSeedError;
    expect(seedFailure.step).toBe('institution');
    expect(seedFailure.counts.learner).toBe(1);
    expect(seedFailure.message).toContain('ke.kemis_upi');

    // The first admission landed; the refused one left no learner, guardian or enrolment behind.
    const learners = await context.repository.list('learner', { limit: 50 });
    expect(learners.items.map((row) => row.admission_number)).not.toContain('ADM/2027/002');
    const guardians = await context.repository.list('guardian', { limit: 50 });
    expect(guardians.items.map((row) => row.phones?.[0]?.number)).not.toContain('+254711000103');
    const enrolments = await context.repository.list('enrolment', { limit: 50 });
    expect(enrolments.items).toHaveLength(1);
  });

  it('seeds the demo school the onboarding installs', async () => {
    const context = await freshContext();
    const result = await seedDemoSchool(
      context.repository,
      defaultDemoSchool(new Date('2026-10-20T12:00:00Z'))
    );

    expect(result.demoSeeded).toBe(true);
    expect(await count(context, 'class_group')).toBe(6);
    expect(await count(context, 'learner')).toBe(12);

    // Every class group of the demo holds a learner and a taken register.
    const groups = await context.repository.list('class_group', { limit: 10 });
    const enrolments = await context.repository.list('enrolment', { limit: 50 });
    expect(new Set(enrolments.items.map((row) => row.class_group_id)).size).toBe(groups.items.length);
    const sessions = await context.repository.list('attendance_session', { limit: 10 });
    expect(sessions.items.map((row) => row.class_group_id).sort()).toEqual(
      groups.items.map((row) => row.id).sort()
    );
  });

  it('refuses a term that lies outside the academic year before it admits anyone', async () => {
    const context = await freshContext();
    const input = demoInput({
      year: {
        name: '2027',
        startDate: '2027-01-05',
        endDate: '2027-11-30',
        terms: [
          { name: 'Term 1', startDate: '2026-01-05', endDate: '2026-04-10' },
          { name: 'Term 2', startDate: '2027-04-28', endDate: '2027-08-01' },
          { name: 'Term 3', startDate: '2027-08-25', endDate: '2027-10-31' },
        ],
      },
    });

    const failure = await seedDemoSchool(context.repository, input).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(DemoSchoolSeedError);
    expect((failure as DemoSchoolSeedError).step).toBe('institution');
    expect(await count(context, 'class_group')).toBe(0);
    expect(await count(context, 'learner')).toBe(0);
  });
});
