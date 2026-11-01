// ABOUTME: The sample school's scenarios, one test each: the families, the fates, the staff, the exams
// ABOUTME: in every state, the fee standings with their ledger, and the settling of the alumni.

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { closeTestContext, createTestContext, type TestContext } from '@/data/__tests__/harness';
import type { RepositoryRow } from '@/data/repository';
import { defaultDemoSchool, seedDemoSchool } from '@/domain/demo';
import { AdjustmentsService } from '@/domain/finance/adjustments';
import {
  LedgerService,
  createLedgerAccountMapping,
  createSqliteLedgerStore,
} from '@/domain/finance/ledger';
import type { EntityName } from '@/domain/schema';

/** The day the school is set on: Term 3 of 2026 has just ended, so the year's history is all there. */
const TODAY = '2026-11-01';

// Reconciling every learner with the ledger reads a lot; give it room when the suite runs in parallel.
vi.setConfig({ testTimeout: 180_000, hookTimeout: 240_000 });

let context: TestContext;

beforeAll(async () => {
  context = await createTestContext({ seed: false });
  await seedDemoSchool(context.repository, defaultDemoSchool(new Date(`${TODAY}T09:00:00Z`)));
}, 240_000);

afterAll(async () => {
  await closeTestContext(context);
});

async function rows<E extends EntityName>(
  entity: E,
  where: Record<string, unknown> = {}
): Promise<RepositoryRow<E>[]> {
  return [...(await context.repository.list(entity, { where, limit: 500 })).items];
}

async function learnerNamed(given: string): Promise<RepositoryRow<'learner'>> {
  const [learner] = await rows('learner', { given_name: given });
  if (!learner) throw new Error(`the sample school has no learner named ${given}`);
  return learner;
}

const adjustments = (): AdjustmentsService => new AdjustmentsService({ store: context.repository });

/** What a learner owes, in minor units: positive is owed, negative is credit. */
async function balanceOf(given: string): Promise<number> {
  const learner = await learnerNamed(given);
  return (await adjustments().explainBalance(learner.id)).balance.amount_minor;
}

const countBy = (values: readonly string[]): Record<string, number> => {
  const counts: Record<string, number> = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return counts;
};

describe('the families', () => {
  it('links siblings to the same parents instead of copying them, and puts them in one household', async () => {
    const amani = await learnerNamed('Amani');
    const baraka = await learnerNamed('Baraka');
    const guardiansOf = async (learnerId: string) =>
      (await rows('learner_guardian', { learner_id: learnerId })).map((link) => link.guardian_id).sort();

    expect(await guardiansOf(amani.id)).toHaveLength(2);
    expect(await guardiansOf(amani.id)).toEqual(await guardiansOf(baraka.id));
    expect(amani.household_id).toBeTruthy();
    expect(amani.household_id).toBe(baraka.household_id);

    // They are in different classes, and the older sibling owes no more than the younger.
    const classOf = async (learnerId: string) =>
      (await rows('enrolment', { learner_id: learnerId, status: 'active' }))[0]?.class_group_id;
    expect(await classOf(amani.id)).not.toBe(await classOf(baraka.id));
    expect(await balanceOf('Amani')).toBeLessThanOrEqual(await balanceOf('Baraka'));
  });

  it('puts twins in the same class', async () => {
    const chloe = await learnerNamed('Chloe');
    const cyrus = await learnerNamed('Cyrus');
    const classOf = async (learnerId: string) =>
      (await rows('enrolment', { learner_id: learnerId, status: 'active' }))[0]?.class_group_id;
    expect(await classOf(chloe.id)).toBeTruthy();
    expect(await classOf(chloe.id)).toBe(await classOf(cyrus.id));
    expect(chloe.family_name).toBe(cyrus.family_name);
  });

  it('gives two learners each their own separate mother and father', async () => {
    const guardiansOf = async (given: string) => {
      const learner = await learnerNamed(given);
      const links = await rows('learner_guardian', { learner_id: learner.id });
      return links.map((link) => `${link.relationship}:${link.guardian_id}`).sort();
    };
    const david = await guardiansOf('David');
    const esther = await guardiansOf('Esther');
    expect(david.map((entry) => entry.split(':')[0])).toEqual(['father', 'mother']);
    expect(esther.map((entry) => entry.split(':')[0])).toEqual(['father', 'mother']);
    expect(new Set([...david, ...esther]).size).toBe(4);
  });

  it('has single mothers, single fathers, and a learner who has only a grandparent', async () => {
    const relationshipsOf = async (given: string) => {
      const learner = await learnerNamed(given);
      return (await rows('learner_guardian', { learner_id: learner.id })).map((link) => link.relationship);
    };
    expect(await relationshipsOf('Farida')).toEqual(['mother']);
    expect(await relationshipsOf('Imani')).toEqual(['mother']);
    expect(await relationshipsOf('Joseph')).toEqual(['father']);
    expect(await relationshipsOf('Liam')).toEqual(['father']);
    expect(await relationshipsOf('Kendi')).toEqual(['grandparent']);
  });

  it("knows which guardians work at the school, so a staff child's discount can find them", async () => {
    const staff = await rows('staff');
    const byNumber = new Map(staff.map((row) => [row.employee_number, row] as const));
    const staffGuardianOf = async (given: string) => {
      const learner = await learnerNamed(given);
      const [link] = await rows('learner_guardian', { learner_id: learner.id });
      const guardian = link ? await context.repository.get('guardian', link.guardian_id as never) : null;
      return guardian?.is_staff_member_id;
    };
    // A teacher's child, and the storekeeper's.
    expect(await staffGuardianOf('Brian')).toBe(byNumber.get('EMP/004')?.id);
    expect(await staffGuardianOf('Zawadi')).toBe(byNumber.get('EMP/013')?.id);
    expect(await staffGuardianOf('Amani')).toBeUndefined();
  });
});

describe('the fates', () => {
  it('has current learners, a suspended one, graduates, transfers and an expulsion', async () => {
    const learners = await rows('learner');
    expect(learners).toHaveLength(33);
    expect(countBy(learners.map((row) => row.status))).toEqual({
      enrolled: 23,
      suspended: 1,
      graduated: 6,
      transferred_out: 2,
      withdrawn: 1,
    });

    // How each left is on the enrolment: promoted into this year, graduated, transferred, expelled.
    const enrolments = await rows('enrolment');
    expect(countBy(enrolments.flatMap((row) => (row.exit_reason ? [row.exit_reason] : [])))).toEqual({
      promoted: 18,
      graduated: 6,
      transferred_out: 2,
      expelled: 1,
    });
  });

  it("rolls last year's learners into this year's classes", async () => {
    const amani = await learnerNamed('Amani');
    const enrolments = (await rows('enrolment', { learner_id: amani.id })).sort((a, b) =>
      a.start_date.localeCompare(b.start_date)
    );
    expect(enrolments).toHaveLength(2);
    expect(enrolments[0]).toMatchObject({ status: 'completed', exit_reason: 'promoted' });
    expect(enrolments[1]).toMatchObject({ status: 'active', entry_reason: 'promoted' });
    const levelOf = async (levelId: string) => (await context.repository.get('level', levelId as never))?.ordinal;
    expect((await levelOf(enrolments[1]?.level_id ?? '')) ?? 0).toBe((await levelOf(enrolments[0]?.level_id ?? '') ?? 0) + 1);
  });

  it('records medical needs for at least five learners', async () => {
    const learners = await rows('learner');
    const withNeeds = learners.filter(
      (row) =>
        (row.medical?.allergies?.length ?? 0) + (row.medical?.conditions?.length ?? 0) > 0
    );
    expect(withNeeds.length).toBeGreaterThanOrEqual(5);
  });

  it('marks a learner as suspended with the incident, the leave and the days away', async () => {
    const kevin = await learnerNamed('Kevin');
    expect(kevin.status).toBe('suspended');
    expect((await rows('conduct_incident', { learner_id: kevin.id })).map((row) => row.category)).toContain('violence');
    expect((await rows('leave_out', { learner_id: kevin.id })).map((row) => row.kind)).toEqual(['disciplinary']);
    const marks = await rows('attendance_mark', { learner_id: kevin.id });
    expect(marks.filter((mark) => mark.status === 'suspended')).toHaveLength(5);
  });
});

describe('the staff and what is taught', () => {
  it('employs people in each way, some for under a year, each department headed', async () => {
    const staff = await rows('staff');
    expect(staff).toHaveLength(18);
    expect(new Set(staff.map((row) => row.employment_type))).toEqual(new Set(['permanent', 'board_employed', 'contract']));
    expect(staff.filter((row) => row.start_date >= '2026-01-01')).toHaveLength(2);
    expect(staff.filter((row) => row.start_date < '2025-01-01').length).toBeGreaterThan(10);

    const departments = await rows('department');
    expect(departments.length).toBeGreaterThanOrEqual(10);
    expect(departments.every((row) => row.head_staff_id)).toBe(true);
  });

  it("gives every class this year a class teacher and the demo teacher two subjects across the levels", async () => {
    const year = (await rows('academic_year', { name: '2026' }))[0];
    const groups = await rows('class_group', { academic_year_id: year?.id ?? '' });
    expect(groups).toHaveLength(6);
    expect(groups.every((group) => group.homeroom_teacher_ids.length === 1)).toBe(true);

    const login = (await rows('user', { username: 'teacher' }))[0];
    const teacher = (await rows('staff')).find((row) => row.user_id === login?.id);
    expect(teacher?.employee_number).toBe('EMP/008');
    const assignments = await rows('teaching_assignment', { staff_id: teacher?.id ?? '' });
    const groupsTaught = await Promise.all(
      assignments.map((assignment) => context.repository.get('teaching_group', assignment.teaching_group_id as never))
    );
    // Two subjects in every class, and besides them the football team he coaches.
    const lessons = groupsTaught.filter((group) => group?.kind === 'whole_class');
    expect(new Set(lessons.map((group) => group?.learning_area_id)).size).toBe(2);
    expect(new Set(lessons.flatMap((group) => group?.level_ids ?? [])).size).toBe(3);
    expect(groupsTaught.filter((group) => group?.kind === 'elective')).toHaveLength(1);
  });

  it('teaches one subject across the whole school with a single teacher', async () => {
    const english = (await rows('staff')).find((row) => row.employee_number === 'EMP/004');
    const assignments = await rows('teaching_assignment', { staff_id: english?.id ?? '' });
    const groups = await Promise.all(
      assignments.map((assignment) => context.repository.get('teaching_group', assignment.teaching_group_id as never))
    );
    const wholeClass = groups.filter((group) => group?.kind === 'whole_class');
    expect(wholeClass).toHaveLength(3);
    expect(new Set(wholeClass.map((group) => group?.learning_area_id)).size).toBe(1);
  });

  it('offers nine core areas, electives and seven clubs, and splits two subjects into papers', async () => {
    const areas = await rows('learning_area');
    expect(countBy(areas.map((row) => row.kind))).toEqual({ core: 9, elective: 3, co_curricular: 7 });
    expect(await rows('learning_area_enrolment')).toHaveLength(10);

    const components = await rows('component');
    expect(countBy(components.map((row) => areas.find((area) => area.id === row.learning_area_id)?.code ?? '?'))).toEqual({
      ENG: 3,
      SCI: 2,
    });

    const scales = await rows('grading_scale');
    expect(scales.map((row) => row.kind).sort()).toEqual(['letter', 'numeric_bands']);
  });

  it('keeps Girl Guides to girls', async () => {
    const [guides] = await rows('teaching_group', { name: 'Girl Guides' });
    const members = await rows('teaching_group_member', { teaching_group_id: guides?.id ?? '' });
    expect(members.length).toBeGreaterThanOrEqual(3);
    for (const member of members) {
      const enrolment = await context.repository.get('enrolment', member.enrolment_id as never);
      const learner = await context.repository.get('learner', enrolment?.learner_id as never);
      expect(learner?.gender).toBe('female');
    }
  });
});

describe('the exams', () => {
  it("publishes past terms, closes this term's mid-term, and leaves its end-of-term exam open", async () => {
    const assessments = await rows('assessment');
    expect(assessments).toHaveLength(36);
    expect(countBy(assessments.map((row) => `${row.kind}:${row.status}`))).toEqual({
      'end_term:published': 18,
      'mid_term:closed': 9,
      'end_term:open': 9,
    });
  });

  it('is part-way through entering marks: some areas in full, one for one stream only, some not at all', async () => {
    const [period] = (await rows('academic_period', { name: 'Term 3' })).filter((row) => row.start_date.startsWith('2026'));
    const open = (await rows('assessment', { academic_period_id: period?.id ?? '', status: 'open' }));
    const areas = await rows('learning_area');
    const enteredFor = async (code: string): Promise<number> => {
      const areaId = areas.find((area) => area.code === code)?.id;
      const assessment = open.find((row) => row.learning_area_ids.includes(areaId as never));
      return assessment ? (await rows('mark', { assessment_id: assessment.id })).length : -1;
    };
    const english = await enteredFor('ENG');
    const agriculture = await enteredFor('AGR');
    expect(english).toBe(24);
    expect(await enteredFor('KIS')).toBe(0);
    expect(await enteredFor('CAS')).toBe(0);
    expect(agriculture).toBeGreaterThan(0);
    expect(agriculture).toBeLessThan(english);
  });
});

describe('the fees and the money', () => {
  it("balances the ledger and reconciles every learner's documents with it", async () => {
    const ledger = new LedgerService({
      store: createSqliteLedgerStore(context.adapter),
      mapping: createLedgerAccountMapping(),
    });
    const trial = await ledger.trialBalance({ currency: 'KES' });
    expect(trial.balanced).toBe(true);
    expect(trial.totalDebit.amount_minor).toBeGreaterThan(0);
    // Receivables, learner credit, opening balances and a revenue account per vote head are all in use.
    const codes = new Set(trial.rows.map((row) => row.accountCode));
    for (const code of ['1100', '2150', '3000', '4100', '4200', '4900', '4950', '4960']) {
      expect(codes.has(code), code).toBe(true);
    }

    const service = adjustments();
    for (const learner of await rows('learner')) {
      const explained = await service.explainBalance(learner.id);
      expect(explained.agrees, `${learner.given_name} ${learner.family_name}`).toBe(true);
    }
  });

  it('leaves each family in the standing the notes ask for', async () => {
    // Boniface, whose refund was paid, is left out: a paid refund debits "refunds payable" and credits the
    // bank, and nothing releases the learner's credit, so his statement still shows the credit.
    const settled = ['Amani', 'Baraka', 'Kendi', 'Brian', 'Tumaini', 'Lilian', 'Moses', 'Ruth', 'Purity', 'Angela', 'Felix'];
    for (const given of settled) expect(await balanceOf(given), given).toBe(0);

    // Owing: this term only, two terms, across years, a bounced cheque, a part-paid plan, an unsettled uniform.
    const owing = ['Chloe', 'Cyrus', 'David', 'Esther', 'Ian', 'Joy', 'Kevin', 'Nadia', 'Quentin', 'Zawadi', 'Joseph', 'Liam', 'Sharon', 'Tom', 'Victor', 'Dennis', 'Evelyn'];
    for (const given of owing) expect(await balanceOf(given), given).toBeGreaterThan(0);

    // Paid ahead: more than the term, and enough over to cover next term; and a refund requested but not yet paid.
    for (const given of ['Farida', 'Imani', 'Omar', 'Catherine']) expect(await balanceOf(given), given).toBeLessThan(0);
    expect(await balanceOf('Imani')).toBeLessThan(await balanceOf('Farida'));
  });

  it('numbers invoices from the year and the term, with terms counted from 1', async () => {
    const invoices = await rows('invoice');
    expect(invoices.length).toBeGreaterThan(140);
    expect(invoices.every((row) => /^INV\/\d{4}\/[123]\/\d{6}$/.test(row.number))).toBe(true);
    expect(new Set(invoices.map((row) => row.number)).size).toBe(invoices.length);
    expect(new Set(invoices.map((row) => row.number.slice(0, 8)))).toEqual(new Set(['INV/2025', 'INV/2026']));
  });

  it('keeps a fee book where every vote head has a GL account and its own place in the payment order', async () => {
    const items = await rows('fee_item');
    expect(items).toHaveLength(12);
    expect(items.every((row) => /^4\d{3}$/.test(row.revenue_account_code ?? ''))).toBe(true);
    expect(new Set(items.map((row) => row.priority)).size).toBe(items.length);
    expect(items.find((row) => row.code === 'TUITION')?.priority).toBe(1);
  });

  it("publishes this year's and last year's fees, and has next year's at every step of the approval", async () => {
    const schedules = await rows('fee_schedule');
    const statusOf = (name: string) => schedules.find((row) => row.name === name)?.status;
    expect(statusOf('2025 fees')).toBe('published');
    expect(statusOf('2026 fees')).toBe('published');
    expect(statusOf('2027 fees - Grade 7')).toBe('draft');
    expect(statusOf('2027 fees - Grade 8')).toBe('submitted');
    expect(statusOf('2027 fees - Grade 9')).toBe('approved');
    expect(await rows('discount_rule')).toHaveLength(5);
    expect(await rows('sponsorship')).toHaveLength(2);
  });

  it('takes payments by every channel with a receipt each, and bounces one cheque so its invoice owes again', async () => {
    const payments = await rows('payment');
    expect(new Set(payments.map((row) => row.channel))).toEqual(new Set(['cash', 'bank_deposit', 'mobile_money', 'cheque']));
    const receipts = await rows('receipt');
    expect(receipts).toHaveLength(payments.length);
    expect(new Set(receipts.map((row) => row.number)).size).toBe(receipts.length);
    expect(payments.some((row) => row.status === 'cleared')).toBe(true);

    const liam = await learnerNamed('Liam');
    const bounced = payments.filter((row) => row.status === 'bounced');
    expect(bounced).toHaveLength(1);
    expect(bounced[0]?.learner_id).toBe(liam.id);

    // The cheque's allocations were reversed, so the term it was meant for is only part paid: the
    // 50% paid afterwards by deposit is all it holds.
    const lastTerm = (await rows('invoice', { learner_id: liam.id })).find((invoice) => invoice.number.startsWith('INV/2026/3/'));
    const paid = (await rows('payment_allocation', { invoice_id: lastTerm?.id ?? '' })).reduce(
      (sum, allocation) => sum + allocation.amount.amount_minor,
      0
    );
    expect(lastTerm?.status).toBe('partially_paid');
    expect(paid).toBe(Math.round((lastTerm?.total.amount_minor ?? 0) * 0.5));
  });

  it('puts an unrestricted payment on the oldest balance first', async () => {
    const esther = await learnerNamed('Esther');
    const lastTermOfLastYear = (await rows('invoice', { learner_id: esther.id })).find((row) =>
      row.number.startsWith('INV/2025/3/')
    );
    const allocations = await rows('payment_allocation', { invoice_id: lastTermOfLastYear?.id ?? '' });
    const paid = allocations.reduce((sum, allocation) => sum + allocation.amount.amount_minor, 0);
    // She paid 40% of the term at the time, and a lump sum of 5,000 this year that went here first.
    expect(paid).toBe(Math.round((lastTermOfLastYear?.total.amount_minor ?? 0) * 0.4) + 500_000);
    expect(lastTermOfLastYear?.status).toBe('partially_paid');
  });

  it("gives a teacher's child, a support staff member's child and the proprietor's child their discounts", async () => {
    const discountOf = async (given: string) => {
      const learner = await learnerNamed(given);
      const notes = await rows('credit_note', { learner_id: learner.id });
      const invoices = await rows('invoice', { learner_id: learner.id });
      let tuition = 0;
      let billed = 0;
      for (const invoice of invoices) {
        for (const line of await rows('invoice_line', { invoice_id: invoice.id })) {
          billed += line.kind === 'fee' ? line.amount.amount_minor : 0;
          if (line.description.startsWith('TUITION')) tuition += line.amount.amount_minor;
        }
      }
      const credited = notes.reduce((sum, note) => sum + note.amount.amount_minor, 0);
      return { notes: notes.length, credited, tuition, billed };
    };

    const brian = await discountOf('Brian');
    expect(brian.notes).toBe(3);
    expect(Math.abs(brian.credited - brian.tuition * 0.5)).toBeLessThanOrEqual(brian.notes);
    const zawadi = await discountOf('Zawadi');
    expect(Math.abs(zawadi.credited - zawadi.tuition * 0.25)).toBeLessThanOrEqual(zawadi.notes);
    // The proprietor's child is not billed: every shilling of fees is credited.
    const tumaini = await discountOf('Tumaini');
    expect(tumaini.credited).toBe(tumaini.billed);
  });

  it('carries a balance forward, a lost book, a bus fare and a uniform on the invoices', async () => {
    const linesOf = async (given: string) => {
      const learner = await learnerNamed(given);
      const invoices = await rows('invoice', { learner_id: learner.id });
      return (await Promise.all(invoices.map((invoice) => rows('invoice_line', { invoice_id: invoice.id })))).flat();
    };
    const purity = await linesOf('Purity');
    expect(purity.find((line) => line.kind === 'opening_balance')?.amount.amount_minor).toBe(400_000);
    expect((await linesOf('Esther')).some((line) => line.kind === 'fine' && line.description.startsWith('Library fine'))).toBe(true);
    expect((await linesOf('Quentin')).some((line) => line.kind === 'fine')).toBe(true);
    expect((await linesOf('Cyrus')).filter((line) => line.description.startsWith('School bus'))).toHaveLength(3);
    expect((await linesOf('Ian')).some((line) => line.description.startsWith('Uniform'))).toBe(true);
  });

  it('settles the alumni: a refund paid and one waiting, a write-off waiting and one approved, one cleared and one refused', async () => {
    const refunds = await rows('refund');
    expect(refunds.map((row) => row.status).sort()).toEqual(['paid', 'requested']);

    const service = adjustments();
    const writeOffStates = async (given: string) =>
      (await service.writeOffsOf((await learnerNamed(given)).id)).map((document) => document.state);
    expect(await writeOffStates('Evelyn')).toEqual(['requested']);
    expect(await writeOffStates('Felix')).toEqual(['approved']);

    expect((await service.clearanceOf((await learnerNamed('Angela')).id))?.state).toBe('cleared');
    expect((await service.clearanceOf((await learnerNamed('Dennis')).id))?.state).toBe('refused');
  });
});

describe('the daily life', () => {
  it('has taken ten days of registers for every class, with lateness, absence and a clinic day', async () => {
    const sessions = await rows('attendance_session');
    expect(sessions).toHaveLength(60);
    expect(new Set(sessions.map((row) => row.class_group_id)).size).toBe(6);
    expect(new Set(sessions.map((row) => row.date)).size).toBe(10);

    const marks = await rows('attendance_mark');
    const statuses = new Set(marks.map((row) => row.status));
    for (const status of ['present', 'late', 'absent', 'suspended']) expect(statuses.has(status as never), status).toBe(true);
    expect(marks.length).toBeGreaterThan(200);
  });

  it('records conduct incidents and clinic visits with who they involved', async () => {
    const incidents = await rows('conduct_incident');
    expect(new Set(incidents.map((row) => row.category)).size).toBeGreaterThanOrEqual(5);
    expect(incidents.some((row) => row.confidential)).toBe(true);

    const visits = await rows('health_visit');
    expect(visits.length).toBeGreaterThanOrEqual(5);
    expect(visits.some((row) => row.referred)).toBe(true);
    const asthma = await learnerNamed('Amani');
    expect(visits.some((row) => row.learner_id === asthma.id)).toBe(true);
  });
});
