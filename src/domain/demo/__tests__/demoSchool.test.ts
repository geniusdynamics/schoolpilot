// ABOUTME: The demo school seed, proven against a real SQLite database: the structure it always writes,
// ABOUTME: the audit trail behind it, its idempotency, the way it fails, and that the school it writes bills.

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  closeTestContext,
  createTestContext,
  type TestContext,
} from '@/data/__tests__/harness';
import { shippedPackDocument } from '@/components/setup/packs/packLibrary';
import { DemoSchoolSeedError, defaultDemoSchool, seedDemoSchool, type DemoSchoolInput } from '@/domain/demo';
import { BillingRunService } from '@/domain/finance/billing';
import { asId } from '@/domain/ids';
import type { EntityName } from '@/domain/schema';

// Writing a whole school takes about five seconds alone and more when the suite runs in parallel.
vi.setConfig({ testTimeout: 180_000, hookTimeout: 180_000 });

const contexts: TestContext[] = [];

async function freshContext(): Promise<TestContext> {
  const context = await createTestContext({ seed: false });
  contexts.push(context);
  return context;
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => closeTestContext(context)));
});

/** The demo school of the tests: one year, three terms and two levels, the first with two streams. */
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
    today: '2027-10-31',
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

    // This year, last year, and the year being planned.
    const years = await context.repository.list('academic_year', { limit: 10 });
    expect(years.items.map((row) => [row.name, row.status]).sort()).toEqual([
      ['2026', 'closed'],
      ['2027', 'current'],
      ['2028', 'planned'],
    ]);

    // Terms are numbered from 1: the number is what an invoice prints for its term.
    const periods = await context.repository.list('academic_period', { limit: 20 });
    expect(periods.items).toHaveLength(6);
    expect(periods.items.every((row) => row.kind === 'term')).toBe(true);
    expect(periods.items.filter((row) => row.status === 'current')).toHaveLength(1);
    expect(periods.items.map((row) => row.sequence).sort()).toEqual([1, 1, 2, 2, 3, 3]);

    // Every class group of the year has a class teacher; last year's are kept for the people who were in
    // them, and next year's are set up for the promotion run to place learners in.
    const classGroups = await context.repository.list('class_group', { limit: 20 });
    expect(classGroups.items).toHaveLength(9);
    const current = years.items.find((row) => row.name === '2027');
    const ofThisYear = classGroups.items.filter((row) => row.academic_year_id === current?.id);
    expect(ofThisYear).toHaveLength(3);
    expect(ofThisYear.every((row) => row.homeroom_teacher_ids.length === 1)).toBe(true);

    const learners = await context.repository.list('learner', { limit: 100 });
    expect(learners.items.length).toBeGreaterThanOrEqual(30);
    // An admission number is the number of the year the learner joined: last year for those who were here.
    expect(learners.items.every((row) => /^ADM\/202[67]\/\d{3}$/.test(row.admission_number))).toBe(true);

    const guardians = await context.repository.list('guardian', { limit: 100 });
    const links = await context.repository.list('learner_guardian', { limit: 100 });
    // Siblings share a parent, so there are fewer guardians than links.
    expect(guardians.items.length).toBeLessThan(links.items.length);
    expect(new Set(links.items.map((row) => row.learner_id)).size).toBe(learners.items.length);
    expect(links.items.filter((row) => row.is_primary)).toHaveLength(learners.items.length);

    // A membership puts the learner into a group that names their class. A group named after the level
    // and area is shared by the level's streams, so every stream has to appear in its `class_group_ids`
    // or the class marks grid reads that stream as "not registered".
    const enrolments = await context.repository.list('enrolment', { limit: 200 });
    const teachingGroups = await context.repository.list('teaching_group', { limit: 200 });
    const members = await context.repository.list('teaching_group_member', { limit: 500 });
    const enrolmentClass = new Map(enrolments.items.map((row) => [String(row.id), String(row.class_group_id)] as const));
    const wholeClass = new Map(
      teachingGroups.items.filter((row) => row.kind === 'whole_class').map((row) => [String(row.id), row.class_group_ids.map(String)] as const)
    );
    for (const member of members.items) {
      const classes = wholeClass.get(String(member.teaching_group_id));
      // Electives and clubs gather learners from any class; a lesson's group names the classes it teaches.
      if (classes) expect(classes).toContain(enrolmentClass.get(String(member.enrolment_id)));
    }

    // The demo logins are canonical users, and the rows they are linked to resolve both scopes.
    const logins = await context.repository.list('user', { limit: 20 });
    const byName = new Map(logins.items.map((row) => [row.username, row] as const));
    expect(byName.get('teacher')?.person_ref?.type).toBe('staff');
    expect(byName.get('student')?.person_ref?.type).toBe('learner');
    expect(byName.get('parent')?.person_ref?.type).toBe('guardian');
    expect(byName.get('finance')?.person_ref?.type).toBe('staff');
    const staffRows = await context.repository.list('staff', { limit: 50 });
    expect(staffRows.items.some((row) => row.user_id === byName.get('teacher')?.id)).toBe(true);
  });

  it('records every create in the audit trail', async () => {
    const context = await freshContext();
    await seedDemoSchool(context.repository, demoInput());

    const learners = await context.repository.list('learner', { limit: 50 });
    const trail = await context.repository.auditTrail('learner', learners.items[0].id);
    expect(trail.length).toBeGreaterThan(0);
    expect(trail[0]).toMatchObject({ entity: 'learner', action: 'create' });
    expect(trail[0].after).toMatchObject({ admission_number: learners.items[0].admission_number });

    const classGroups = await context.repository.list('class_group', { limit: 20 });
    const classTrail = await context.repository.auditLog({ entity: 'class_group', limit: 200 });
    const creates = classTrail.filter((event) => event.action === 'create');
    expect(creates).toHaveLength(classGroups.items.length);
    // The class teacher of every class group is set right after it is created, so the trail holds that too.
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
      payment: await count(context, 'payment'),
      academicYear: await count(context, 'academic_year'),
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
    expect(await count(context, 'payment')).toBe(before.payment);
    expect(await count(context, 'academic_year')).toBe(before.academicYear);

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
    // A blank school holds no people, no fees and no history: that is the wizard's and the school's to write.
    for (const entity of ['learner', 'enrolment', 'staff', 'invoice', 'payment', 'fee_item', 'learning_area'] as const) {
      expect(await count(context, entity), entity).toBe(0);
    }

    // The class-group picker of the admission page has something to offer.
    const groups = await context.repository.list('class_group', { limit: 10 });
    expect(groups.items.every((row) => row.programme_id && row.level_id && row.academic_year_id)).toBe(true);
  });

  it('fails loudly, names the substep and leaves nothing behind', async () => {
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
      value: 'UPI/2027/0002',
    });

    const failure = await seedDemoSchool(context.repository, demoInput()).catch(
      (error: unknown) => error
    );

    expect(failure).toBeInstanceOf(DemoSchoolSeedError);
    const seedFailure = failure as DemoSchoolSeedError;
    // The refusal happened while admitting, not while creating the institution.
    expect(seedFailure.step).toBe('learners');
    expect(seedFailure.counts.learner).toBe(1);
    expect(seedFailure.message).toContain('ke.kemis_upi');

    // The run is one transaction, so even the first admission was rolled back with it.
    expect((await context.repository.list('learner', { limit: 50 })).total).toBe(0);
    const guardians = await context.repository.list('guardian', { limit: 50 });
    expect(guardians.items.some((row) => row.given_name === 'Naomi')).toBe(false);
    expect((await context.repository.list('enrolment', { limit: 50 })).total).toBe(0);
    // The previous year and the staff written before the failure went with it.
    expect(await count(context, 'staff')).toBe(0);
    expect(await count(context, 'academic_year')).toBe(1);
  });

  it('leaves no partial school when a late step fails', async () => {
    const context = await freshContext();
    const create = context.repository.create.bind(context.repository);
    vi.spyOn(context.repository, 'create').mockImplementation(async (entity, input, options) => {
      if (entity === 'health_visit') throw new Error('the clinic book could not be written');
      return create(entity, input, options);
    });

    const failure = await seedDemoSchool(context.repository, demoInput()).catch(
      (error: unknown) => error
    );
    vi.mocked(context.repository.create).mockRestore();

    expect(failure).toBeInstanceOf(DemoSchoolSeedError);
    const seedFailure = failure as DemoSchoolSeedError;
    expect(seedFailure.step).toBe('pastoral');
    // The attempt had reached the last step: the counts show how far it got.
    expect(seedFailure.counts.learner).toBeGreaterThanOrEqual(30);
    // Three terms of last year and three of this one were billed before the clinic book was reached.
    expect(seedFailure.counts.billing_run).toBe(6);
    expect(seedFailure.counts.payment).toBeGreaterThan(50);

    // Nothing of the attempt survives: no school, no learners, no invoices, no payments, no ledger.
    for (const entity of ['institution', 'learner', 'enrolment', 'mark', 'invoice', 'payment', 'receipt', 'attendance_session', 'credit_note'] as const) {
      expect(await count(context, entity), entity).toBe(0);
    }
    // The ledger's tables were created inside the run, so a rolled-back run may leave no table at all.
    const entries = await context.adapter
      .get<{ n: number }>('SELECT COUNT(*) AS n FROM journal_entry')
      .catch(() => null);
    expect(entries?.n ?? 0).toBe(0);
  });

  it('refuses a curriculum pack the installation does not ship, writing nothing', async () => {
    const context = await freshContext();
    await expect(
      seedDemoSchool(context.repository, demoInput({ curriculumPack: 'xx-none' }), {
        packDocument: shippedPackDocument,
      })
    ).rejects.toThrow(/xx-none curriculum pack/);
    expect(await count(context, 'institution')).toBe(0);
  });

  it('seeds the demo school the onboarding installs, on the day it is run', async () => {
    const context = await freshContext();
    const result = await seedDemoSchool(
      context.repository,
      defaultDemoSchool(new Date('2026-10-20T12:00:00Z')),
      { packDocument: shippedPackDocument }
    );

    expect(result.demoSeeded).toBe(true);
    // Three levels of two streams: last year, this year and next.
    expect(await count(context, 'class_group')).toBe(18);
    expect(await count(context, 'learner')).toBe(33);

    // Every class group of this year holds a learner and has had its register taken.
    const years = await context.repository.list('academic_year', { limit: 10 });
    const current = years.items.find((row) => row.name === '2026');
    const groups = (await context.repository.list('class_group', { limit: 20 })).items.filter(
      (row) => row.academic_year_id === current?.id
    );
    const enrolments = await context.repository.list('enrolment', { limit: 200 });
    const taught = new Set(enrolments.items.filter((row) => row.status === 'active').map((row) => row.class_group_id));
    expect(groups.every((group) => taught.has(group.id))).toBe(true);
    const sessions = await context.repository.list('attendance_session', { limit: 200 });
    expect(new Set(sessions.items.map((row) => row.class_group_id))).toEqual(new Set(groups.map((group) => group.id)));
  });

  it('tells a caller the step it is on, in order, so a long install can say what it is doing', async () => {
    const context = await freshContext();
    const steps: string[] = [];
    await seedDemoSchool(context.repository, demoInput({ onProgress: (step) => steps.push(step) }));

    // Each step is reported when it begins, and a step that runs in several parts is not repeated out of order.
    const distinct = steps.filter((step, index) => step !== steps[index - 1]);
    for (const step of ['structure', 'history', 'staff', 'learners', 'curriculum', 'teaching', 'assessment', 'fees', 'payments', 'register', 'departures']) {
      expect(distinct, step).toContain(step);
    }
    expect(distinct.indexOf('structure')).toBeLessThan(distinct.indexOf('learners'));
    expect(distinct.indexOf('learners')).toBeLessThan(distinct.indexOf('fees'));
    expect(distinct.indexOf('fees')).toBeLessThan(distinct.indexOf('payments'));
    expect(distinct.indexOf('payments')).toBeLessThan(distinct.indexOf('departures'));
  });

  it('sets the school on the day it is run: in the first term there is no term behind it, only last year', async () => {
    const context = await freshContext();
    const result = await seedDemoSchool(context.repository, demoInput({ today: '2027-02-10' }));
    expect(result.demoSeeded).toBe(true);

    // Last year's three terms and this year's first were billed; the later terms have not begun.
    expect(result.counts.billing_run).toBe(4);
    const assessments = await context.repository.list('assessment', { limit: 100 });
    expect(assessments.items.some((row) => row.status === 'published')).toBe(false);
    expect(new Set(assessments.items.map((row) => row.academic_period_id)).size).toBe(1);

    // Nobody has left yet: a story that ends after a term is told when the term has ended.
    const statuses = (await context.repository.list('learner', { limit: 100 })).items.map((row) => row.status);
    expect(statuses.filter((status) => status === 'transferred_out' || status === 'withdrawn')).toHaveLength(0);
    // The alumni of last year are still alumni.
    expect(statuses.filter((status) => status === 'graduated')).toHaveLength(6);
  });

  it('prices every learner it admits: the seeded schedule resolves for the whole sample school', async () => {
    const context = await freshContext();
    await seedDemoSchool(context.repository, demoInput());

    const year = (await context.repository.list('academic_year', { where: { name: '2027' }, limit: 1 })).items[0];
    const periods = await context.repository.list('academic_period', {
      where: { academic_year_id: year?.id ?? '' },
      limit: 50,
    });
    const period = periods.items.find((row) => row.name === 'Term 3') ?? periods.items[0];

    const preview = await new BillingRunService({
      store: context.repository,
      now: () => new Date('2027-10-31T08:00:00.000Z'),
    }).preview({ scope: { periodId: asId<'academic_period'>(period?.id ?? '') } });

    // The run prices a cell of level x residence x fee category, so the seed has to give every line the
    // level it prices and declare the one residence and one category its learners are in. A cell the
    // matrix cannot resolve is reported `cell_unresolved` or `no_schedule`. Every learner the seed admits
    // already holds a posted invoice for the term, so a cell that does resolve is reported `already_billed`.
    const unresolved = preview.skips.filter(
      (skip) => skip.code === 'cell_unresolved' || skip.code === 'no_schedule'
    );
    expect(unresolved, JSON.stringify(unresolved)).toEqual([]);
    expect(preview.skips.length).toBeGreaterThan(0);
    expect(preview.skips.every((skip) => skip.code === 'already_billed')).toBe(true);
  });
});
