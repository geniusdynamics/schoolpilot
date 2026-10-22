// ABOUTME: Tests for the promotion run over a real repository: a suggestion is never a decision, a
// ABOUTME: council referral stays pending, an override carries its reason, only the head approves, the
// ABOUTME: commit lands in one transaction, a second commit changes nothing, and an undo reverses it
// ABOUTME: until the next year has been billed.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { ProgressionDefinition, ProgressionLevel, ProgressionStage } from '@/domain/assessment/progression';
import { isRepositoryError, type Repository, type RepositoryRow } from '@/data/repository';
import type { Id } from '@/domain/ids';

import {
  PromotionService,
  canApprovePromotion,
  type PromotionRules,
  type PromotionRun,
} from '../PromotionService';
import {
  closeTestContext,
  createAcademicYear,
  createClassGroup,
  createLearner,
  createLevel,
  createServiceFixture,
  seededId,
  type ServiceFixture,
} from './helpers';

/** The pack rules the test runs: a threshold, a stage transition, a council and a graduation. */
const DEFINITION: ProgressionDefinition = {
  progression: [
    {
      levels: ['G8'],
      rule: 'threshold',
      conditions: [{ metric: 'annual.average', gte: 40 }],
      else: 'repeat',
    },
    {
      levels: ['G9'],
      rule: 'stage_transition',
      to_stage: 'SS',
      requires: ['national_assessment_recorded', 'pathway_placement'],
    },
    {
      levels: ['G11'],
      rule: 'class_council',
      suggest: { metric: 'annual.average', gte: 50 },
    },
  ],
  graduation: [{ levels: ['G12'], rule: 'graduate' }],
};

const LEVELS: readonly ProgressionLevel[] = [
  { code: 'G8', next: 'G9' },
  { code: 'G9', next: 'G10' },
  { code: 'G10', next: 'G11' },
  { code: 'G11', next: 'G12' },
  { code: 'G12', next: null },
];

const STAGES: readonly ProgressionStage[] = [{ code: 'SS', levels: ['G10', 'G11', 'G12'] }];

const RULES: PromotionRules = { definition: DEFINITION, levels: LEVELS, stages: STAGES };

/** One learner of the test, with the level and the facts the evaluator reads. */
interface LearnerSpec {
  readonly name: string;
  readonly level: 'G8' | 'G9' | 'G12';
  readonly average?: string;
  readonly requirements?: Readonly<Record<string, boolean | string | null>>;
}

const LEARNERS: readonly LearnerSpec[] = [
  { name: 'Ada', level: 'G8', average: '55' },
  { name: 'Bea', level: 'G8', average: '30' },
  { name: 'Cia', level: 'G8' },
  { name: 'Dan', level: 'G9', requirements: { national_assessment_recorded: true, pathway_placement: 'STEM' } },
  { name: 'Eve', level: 'G9', requirements: { national_assessment_recorded: true, pathway_placement: null } },
  { name: 'Gia', level: 'G12' },
];

/** The world one test works in. */
interface World {
  readonly fixture: ServiceFixture;
  readonly service: PromotionService;
  readonly run: PromotionRun;
  readonly learners: ReadonlyMap<string, RepositoryRow<'learner'>>;
  /** The acting user of the test, a real `user` row the decisions can point at. */
  readonly userId: Id<'user'>;
  readonly closingYearId: Id<'academic_year'>;
  readonly openingYearId: Id<'academic_year'>;
  readonly openingGroupIds: Readonly<Record<string, Id<'class_group'>>>;
}

/** The row of a run, by learner id. */
function rowOf(run: PromotionRun, learnerId: string) {
  const row = run.rows.find((candidate) => candidate.learnerId === learnerId);
  if (!row) throw new Error(`the run has no row for ${learnerId}`);
  return row;
}

/** The learner id of a learner by given name. */
function learnerIdOf(world: World, name: string): Id<'learner'> {
  const found = [...world.learners.values()].find((row) => row.given_name === name);
  if (!found) throw new Error(`the world has no learner named ${name}`);
  return found.id;
}

/** The enrolment ids of the learners the run acted on, so the seeded rows never confuse a count. */
function runEnrolmentIds(world: World): Set<string> {
  return new Set(world.run.rows.map((row) => row.enrolmentId));
}

/** The decisions the run wrote, and only those. */
async function runDecisions(world: World): Promise<RepositoryRow<'promotion_decision'>[]> {
  const ids = runEnrolmentIds(world);
  const page = await world.fixture.repository.list('promotion_decision', { limit: 200 });
  return page.items.filter((row) => ids.has(row.enrolment_id));
}

async function enrol(
  fixture: ServiceFixture,
  learnerId: Id<'learner'>,
  classGroupId: Id<'class_group'>,
  levelId: Id<'level'>,
  yearId: Id<'academic_year'>,
  startDate: string
): Promise<RepositoryRow<'enrolment'>> {
  return fixture.repository.create('enrolment', {
    institution_id: fixture.institutionId,
    learner_id: learnerId,
    academic_year_id: yearId,
    programme_id: fixture.programmeId,
    level_id: levelId,
    class_group_id: classGroupId,
    status: 'active',
    start_date: startDate,
    entry_reason: 'new_admission',
  });
}

/** Builds a year group of six learners, with the class groups of both years. */
async function buildWorld(): Promise<World> {
  const fixture = await createServiceFixture();
  const userId = seededId(fixture.context, 'user');
  const closingYear = await createAcademicYear(fixture, {
    name: '2028',
    startDate: '2028-01-05',
    endDate: '2028-11-30',
  });
  const openingYear = await createAcademicYear(fixture, {
    name: '2029',
    startDate: '2029-01-05',
    endDate: '2029-11-30',
  });

  const levels = new Map<string, RepositoryRow<'level'>>();
  for (const code of ['G8', 'G9', 'G10', 'G11', 'G12']) {
    levels.set(code, await createLevel(fixture, code));
  }

  const closingGroupIds: Record<string, Id<'class_group'>> = {};
  const openingGroupIds: Record<string, Id<'class_group'>> = {};
  for (const code of ['G8', 'G9', 'G10', 'G12']) {
    const levelId = (levels.get(code) as RepositoryRow<'level'>).id;
    const closing = await createClassGroup(fixture, {
      name: 'Blue',
      academicYearId: closingYear.id,
      levelId,
    });
    closingGroupIds[code] = closing.id;
    if (code === 'G12') continue;
    const opening = await createClassGroup(fixture, {
      name: 'Blue',
      academicYearId: openingYear.id,
      levelId,
    });
    openingGroupIds[code] = opening.id;
  }

  const learners = new Map<string, RepositoryRow<'learner'>>();
  const facts = new Map<string, LearnerSpec>();
  for (const spec of LEARNERS) {
    const learner = await createLearner(fixture, { given_name: spec.name });
    learners.set(learner.id, learner);
    facts.set(learner.id, spec);
    const levelId = (levels.get(spec.level) as RepositoryRow<'level'>).id;
    await enrol(fixture, learner.id, closingGroupIds[spec.level], levelId, closingYear.id, '2028-01-05');
  }

  const service = new PromotionService({ repository: fixture.repository, actor: userId });
  const run = await service.compute({
    academicYearId: closingYear.id,
    nextAcademicYearId: openingYear.id,
    rules: RULES,
    contextFor: ({ learnerId }) => {
      const spec = facts.get(learnerId) as LearnerSpec;
      return {
        context:
          spec.average === undefined ? {} : { metrics: { 'annual.average': { value: spec.average } } },
        ...(spec.requirements === undefined ? {} : { requirements: spec.requirements }),
      };
    },
  });

  return {
    fixture,
    service,
    run,
    learners,
    userId,
    closingYearId: closingYear.id,
    openingYearId: openingYear.id,
    openingGroupIds,
  };
}

/** Settles every undecided learner so a run can commit. */
function settle(world: World): PromotionRun {
  let run = world.service.override(world.run, learnerIdOf(world, 'Cia'), {
    action: 'promote',
    reason: 'Council reviewed the case and agreed to promote.',
    actor: 'councillor-1',
  });
  run = world.service.override(run, learnerIdOf(world, 'Eve'), {
    action: 'repeat',
    reason: 'Pathway placement was never recorded; repeat Grade 9.',
    actor: 'councillor-1',
  });
  return run;
}

/** The closing-year enrolments of the run's learners. */
async function closingEnrolments(world: World): Promise<RepositoryRow<'enrolment'>[]> {
  const page = await world.fixture.repository.list('enrolment', {
    where: { academic_year_id: world.closingYearId },
    limit: 100,
  });
  return [...page.items];
}

/** The opening-year enrolments of the run's learners. */
async function openingEnrolments(world: World): Promise<RepositoryRow<'enrolment'>[]> {
  const page = await world.fixture.repository.list('enrolment', {
    where: { academic_year_id: world.openingYearId },
    limit: 100,
  });
  return [...page.items];
}

/** Bills a learner of the closing year, so the commit has a balance to carry. */
async function bill(world: World, learnerId: Id<'learner'>): Promise<void> {
  await world.fixture.repository.create('invoice', {
    institution_id: world.fixture.institutionId,
    number: `INV/2028/T1/${learnerId.slice(-4)}`,
    learner_id: learnerId,
    issue_date: '2028-01-05',
    total: { amount_minor: 600000, currency: 'KES' },
    status: 'posted',
  });
}

describe('the promotion run', () => {
  let world: World;

  beforeEach(async () => {
    world = await buildWorld();
  });

  afterEach(async () => {
    await closeTestContext(world.fixture.context);
  });

  // ------------------------------------------------------------------ compute

  it('computes a suggestion per learner, with the rule and the undecidable cases', () => {
    expect(world.run.rows).toHaveLength(6);

    const ada = rowOf(world.run, learnerIdOf(world, 'Ada'));
    expect(ada.suggestion.rule?.rule).toBe('threshold');
    expect(ada.action).toBe('promote');
    expect(ada.suggestion.to_level).toBe('G9');

    expect(rowOf(world.run, learnerIdOf(world, 'Bea')).action).toBe('repeat');

    // No annual result: the threshold cannot settle, so the engine refers the case.
    const cia = rowOf(world.run, learnerIdOf(world, 'Cia'));
    expect(cia.action).toBe('council');
    expect(cia.suggestion.complete).toBe(false);
    expect(cia.suggestion.flags.map((flag) => flag.code)).toContain('metric_unknown');

    const dan = rowOf(world.run, learnerIdOf(world, 'Dan'));
    expect(dan.suggestion.rule?.rule).toBe('stage_transition');
    expect(dan.action).toBe('promote');
    expect(dan.suggestion.to_stage).toBe('SS');
    expect(dan.suggestion.to_level).toBe('G10');

    // A missing record blocks the transition; it is not a repeat and not a promotion.
    const eve = rowOf(world.run, learnerIdOf(world, 'Eve'));
    expect(eve.action).toBe('blocked');
    expect(eve.suggestion.flags.map((flag) => flag.code)).toContain('requirement_unmet');

    const gia = rowOf(world.run, learnerIdOf(world, 'Gia'));
    expect(gia.action).toBe('graduate');
    expect(gia.suggestion.rule?.rule).toBe('graduate');

    // Nothing is presented as a decision: every row starts un-overridden.
    expect(world.run.rows.every((row) => row.override === null)).toBe(true);
  });

  it('reports a council referral and a blocked transition as conflicts, not as decisions', async () => {
    const plan = await world.service.plan(world.run);
    const undecided = plan.conflicts.filter((conflict) => conflict.code === 'undecided');
    expect(undecided).toHaveLength(2);
    expect(undecided.map((conflict) => conflict.learnerName)).toEqual(
      expect.arrayContaining([expect.stringContaining('Cia'), expect.stringContaining('Eve')])
    );
    expect(plan.placements.map((placement) => placement.row.learnerName)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Ada'),
        expect.stringContaining('Bea'),
        expect.stringContaining('Dan'),
      ])
    );
  });

  it('refuses to commit while a learner is still undecided', async () => {
    const approved = world.service.approve(world.run, { actor: world.userId, roles: ['head_teacher'] });
    await expect(world.service.commit(approved)).rejects.toMatchObject({ code: 'invalid_request' });
  });

  // ------------------------------------------------------------------- review

  it('records an override with its reason, actor, time and what the suggestion said', () => {
    const ada = rowOf(world.run, learnerIdOf(world, 'Ada'));
    const overridden = world.service.override(world.run, ada.learnerId, {
      action: 'repeat',
      reason: 'Attendance below the bar; the council agreed to repeat.',
      actor: 'councillor-2',
    });

    const row = rowOf(overridden, ada.learnerId);
    expect(row.action).toBe('repeat');
    expect(row.override).toMatchObject({
      from: 'promote',
      action: 'repeat',
      reason: 'Attendance below the bar; the council agreed to repeat.',
      actor: 'councillor-2',
    });
    expect(row.override?.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(row.override?.toLevelId).toBe(row.levelId);
  });

  it('refuses an override with no reason', () => {
    const ada = rowOf(world.run, learnerIdOf(world, 'Ada'));
    expect(() =>
      world.service.override(world.run, ada.learnerId, { action: 'repeat', reason: '   ' })
    ).toThrowError(/needs a reason/);
  });

  // ----------------------------------------------------------------- approve

  it('restricts the approval to the head and the administrator, through the repository roles', () => {
    expect(canApprovePromotion(['head_teacher'])).toBe(true);
    expect(canApprovePromotion(['administrator'])).toBe(true);
    expect(canApprovePromotion(['registrar'])).toBe(false);
    expect(canApprovePromotion(['accountant'])).toBe(false);

    expect(() =>
      world.service.approve(world.run, { actor: world.userId, roles: ['registrar'] })
    ).toThrowError(/Not allowed to approve/);
    try {
      world.service.approve(world.run, { actor: world.userId, roles: ['registrar'] });
    } catch (error) {
      expect(isRepositoryError(error, 'permission')).toBe(true);
    }

    const approved = world.service.approve(world.run, { actor: world.userId, roles: ['head_teacher'] });
    expect(approved.approvedBy).toBe(world.userId);
    expect(approved.approvedAt).not.toBeNull();
  });

  it('refuses to commit without an approval', async () => {
    await expect(world.service.commit(settle(world))).rejects.toThrowError(/has not been approved/);
  });

  // ------------------------------------------------------------------ commit

  it('commits the run in one transaction and writes the whole run record', async () => {
    // Ada owes 4,000.00 of 6,000.00 billed.
    const adaId = learnerIdOf(world, 'Ada');
    await bill(world, adaId);
    await world.fixture.repository.create('payment', {
      institution_id: world.fixture.institutionId,
      learner_id: adaId,
      amount: { amount_minor: 200000, currency: 'KES' },
      channel: 'mobile_money',
      received_at: '2028-01-10T09:00:00Z',
      status: 'posted',
    });

    const approved = world.service.approve(settle(world), { actor: world.userId, roles: ['head_teacher'] });
    const committed = await world.service.commit(approved);

    expect(committed.committedAt).not.toBeNull();
    const record = committed.record as NonNullable<PromotionRun['record']>;
    expect(record.counts).toMatchObject({
      total: 6,
      promoted: 3,
      repeated: 2,
      graduated: 1,
      pending: 0,
      overridden: 2,
      closed: 6,
      opened: 5,
      carried: 1,
    });
    expect(record.overrides).toHaveLength(2);
    expect(record.overrides.map((entry) => entry.reason)).toEqual(
      expect.arrayContaining([expect.stringContaining('Council reviewed')])
    );
    expect(record.archivedClassLists.length).toBeGreaterThan(0);

    // The closing enrolments are closed with the year's end and a reason.
    const closed = await closingEnrolments(world);
    expect(closed).toHaveLength(6);
    expect(closed.every((row) => row.status === 'left' || row.status === 'completed')).toBe(true);
    expect(closed.every((row) => row.end_date === '2028-11-30')).toBe(true);
    expect(closed.find((row) => row.learner_id === learnerIdOf(world, 'Gia'))?.exit_reason).toBe('graduated');

    // The next-year enrolments are opened in the mapped class groups.
    const opened = await openingEnrolments(world);
    expect(opened).toHaveLength(5);
    expect(opened.find((row) => row.learner_id === adaId)).toMatchObject({
      class_group_id: world.openingGroupIds.G9,
      entry_reason: 'promoted',
      status: 'active',
      start_date: '2029-01-05',
    });
    expect(opened.find((row) => row.learner_id === learnerIdOf(world, 'Bea'))).toMatchObject({
      class_group_id: world.openingGroupIds.G8,
      entry_reason: 'repeated',
      status: 'repeating',
    });
    expect(opened.find((row) => row.learner_id === learnerIdOf(world, 'Dan'))).toMatchObject({
      class_group_id: world.openingGroupIds.G10,
      entry_reason: 'promoted',
    });

    // The decision of each learner is written, with the run id and the override's reason.
    const decisions = await runDecisions(world);
    expect(decisions).toHaveLength(6);
    expect(decisions.every((row) => row.committed_at !== null)).toBe(true);
    const ciaDecision = decisions.find(
      (row) => row.enrolment_id === rowOf(world.run, learnerIdOf(world, 'Cia')).enrolmentId
    );
    expect(ciaDecision?.decision).toBe('promote');
    expect((ciaDecision?.rule_evaluation as { override?: { reason?: string } }).override?.reason).toContain(
      'Council reviewed'
    );

    // The balance is carried forward as an opening-balance invoice.
    const carried = (
      await world.fixture.repository.list('invoice', { where: { learner_id: adaId }, limit: 50 })
    ).items.find((row) => row.number.startsWith('CARRY/'));
    expect(carried).toMatchObject({ status: 'posted', total: { amount_minor: 400000, currency: 'KES' } });
    const carriedLines = await world.fixture.repository.list('invoice_line', {
      where: { invoice_id: carried?.id },
      limit: 10,
    });
    expect(carriedLines.items[0]?.kind).toBe('opening_balance');

    // The graduate moves to graduated.
    const reread = await world.fixture.repository.get('learner', learnerIdOf(world, 'Gia'));
    expect(reread?.status).toBe('graduated');
  });

  it('leaves nothing half-applied when a write fails inside the commit', async () => {
    const approved = world.service.approve(settle(world), { actor: world.userId, roles: ['head_teacher'] });

    // A repository that refuses the third create of the transaction.
    let creates = 0;
    const failing = new Proxy(world.fixture.repository, {
      get(target, property, receiver) {
        if (property === 'create') {
          return (...args: unknown[]) => {
            creates += 1;
            if (creates >= 3) throw new Error('the storage refused the write');
            return (target.create as unknown as (...a: unknown[]) => unknown).apply(target, args);
          };
        }
        const value = Reflect.get(target, property, receiver) as unknown;
        return typeof value === 'function'
          ? (value as (...a: unknown[]) => unknown).bind(target)
          : value;
      },
    }) as Repository;
    const failingService = new PromotionService({ repository: failing, actor: world.userId });

    await expect(failingService.commit(approved)).rejects.toBeTruthy();

    // Nothing landed: the enrolments are still open, and no row of the run exists.
    const closed = await closingEnrolments(world);
    expect(closed.every((row) => row.status === 'active')).toBe(true);
    expect(closed.every((row) => row.end_date == null)).toBe(true);
    expect(await openingEnrolments(world)).toHaveLength(0);
    expect(await runDecisions(world)).toHaveLength(0);
  });

  it('does not double-open or double-carry when the same run is committed twice', async () => {
    const adaId = learnerIdOf(world, 'Ada');
    await bill(world, adaId);

    const approved = world.service.approve(settle(world), { actor: world.userId, roles: ['head_teacher'] });
    const first = await world.service.commit(approved);
    const second = await world.service.commit(first);

    expect(second.record?.counts).toEqual(first.record?.counts);
    expect(await openingEnrolments(world)).toHaveLength(5);
    const carried = (
      await world.fixture.repository.list('invoice', { where: { learner_id: adaId }, limit: 50 })
    ).items.filter((row) => row.number.startsWith('CARRY/'));
    expect(carried).toHaveLength(1);
    expect(await runDecisions(world)).toHaveLength(6);
  });

  // -------------------------------------------------------------------- undo

  it('undoes a committed run, restoring the enrolments, the balances and the graduates', async () => {
    const adaId = learnerIdOf(world, 'Ada');
    await bill(world, adaId);
    const approved = world.service.approve(settle(world), { actor: world.userId, roles: ['head_teacher'] });
    const committed = await world.service.commit(approved);
    const undone = await world.service.undo(committed);

    expect(undone.committedAt).toBeNull();
    expect(undone.record).toBeNull();

    const closed = await closingEnrolments(world);
    expect(closed.every((row) => row.status === 'active')).toBe(true);
    expect(closed.every((row) => row.end_date == null && row.exit_reason == null)).toBe(true);

    // The next-year class list is empty: the run's enrolments are reversed, not left active.
    const opening = await openingEnrolments(world);
    expect(opening.every((row) => row.status === 'left')).toBe(true);

    const carried = (
      await world.fixture.repository.list('invoice', { where: { learner_id: adaId }, limit: 50 })
    ).items.find((row) => row.number.startsWith('CARRY/'));
    expect(carried?.status).toBe('void');

    const gia = await world.fixture.repository.get('learner', learnerIdOf(world, 'Gia'));
    expect(gia?.status).toBe('enrolled');

    expect(await runDecisions(world)).toHaveLength(0);
  });

  it('refuses to undo once the next year has been billed, and says why', async () => {
    const approved = world.service.approve(settle(world), { actor: world.userId, roles: ['head_teacher'] });
    const committed = await world.service.commit(approved);

    // The next year's first billing run posts an invoice for its first term.
    const period = await world.fixture.repository.create('academic_period', {
      institution_id: world.fixture.institutionId,
      academic_year_id: world.openingYearId,
      kind: 'term',
      sequence: 1,
      name: 'Term 1',
      start_date: '2029-01-05',
      end_date: '2029-04-10',
      is_reporting: true,
      is_billing: true,
      status: 'planned',
    });
    await world.fixture.repository.create('invoice', {
      institution_id: world.fixture.institutionId,
      number: 'INV/2029/T1/000001',
      learner_id: learnerIdOf(world, 'Ada'),
      academic_period_id: period.id,
      issue_date: '2029-01-05',
      total: { amount_minor: 600000, currency: 'KES' },
      status: 'posted',
    });

    await expect(world.service.undo(committed)).rejects.toThrowError(
      /cannot be undone: the next year has been billed/
    );

    // The refusal leaves the committed state alone.
    expect(await openingEnrolments(world)).toHaveLength(5);
  });
});
