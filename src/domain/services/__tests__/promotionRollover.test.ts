// ABOUTME: The promotion portion of golden path GP-5 (spec 08 section 3, year-end rollover), run
// ABOUTME: against a real repository: a school with repeats, a Grade 9 to Grade 10 stage transition and
// ABOUTME: graduates promotes in one session, the new class lists and the historical class lists both
// ABOUTME: answer, the balances are carried forward, and the run undoes and recommits.
//
// The browser half of GP-5 (a persona driving the pages on a real build) belongs to P2-Q02; this is the
// promotion portion of it, and it runs in this environment.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { ProgressionDefinition } from '@/domain/assessment/progression';
import type { RepositoryRow } from '@/data/repository';
import type { Id } from '@/domain/ids';

import { PromotionService, type PromotionRules, type PromotionRun } from '../PromotionService';
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

const DEFINITION: ProgressionDefinition = {
  progression: [
    { levels: ['G8'], rule: 'threshold', conditions: [{ metric: 'annual.average', gte: 40 }], else: 'repeat' },
    { levels: ['G9'], rule: 'stage_transition', to_stage: 'SS', requires: ['pathway_placement'] },
  ],
  graduation: [{ levels: ['G12'], rule: 'graduate' }],
};

const RULES: PromotionRules = {
  definition: DEFINITION,
  levels: [
    { code: 'G8', next: 'G9' },
    { code: 'G9', next: 'G10' },
    { code: 'G10', next: 'G11' },
    { code: 'G11', next: 'G12' },
    { code: 'G12', next: null },
  ],
  stages: [{ code: 'SS', levels: ['G10', 'G11', 'G12'] }],
};

interface LearnerSpec {
  readonly name: string;
  readonly level: 'G8' | 'G9' | 'G12';
  readonly stream: 'Blue' | 'Gold';
  readonly average?: string;
  readonly pathway?: string | null;
}

const LEARNERS: readonly LearnerSpec[] = [
  { name: 'A1', level: 'G8', stream: 'Blue', average: '70' },
  { name: 'A2', level: 'G8', stream: 'Blue', average: '30' },
  { name: 'A3', level: 'G8', stream: 'Gold', average: '65' },
  { name: 'A4', level: 'G8', stream: 'Gold', average: '20' },
  { name: 'A5', level: 'G9', stream: 'Blue', pathway: 'STEM' },
  { name: 'A6', level: 'G9', stream: 'Blue', pathway: null },
  { name: 'A7', level: 'G12', stream: 'Blue' },
];

describe('GP-5 promotion portion: the year-end rollover', () => {
  let fixture: ServiceFixture;
  let service: PromotionService;
  let userId: Id<'user'>;
  let closingYearId: Id<'academic_year'>;
  let openingYearId: Id<'academic_year'>;
  let groups: Map<string, Id<'class_group'>>;
  let learners: Map<string, RepositoryRow<'learner'>>;
  let run: PromotionRun;

  beforeAll(async () => {
    fixture = await createServiceFixture();
    userId = seededId(fixture.context, 'user');
    const closing = await createAcademicYear(fixture, { name: '2028', startDate: '2028-01-05', endDate: '2028-11-30' });
    const opening = await createAcademicYear(fixture, { name: '2029', startDate: '2029-01-05', endDate: '2029-11-30' });
    closingYearId = closing.id;
    openingYearId = opening.id;

    const levels = new Map<string, RepositoryRow<'level'>>();
    for (const code of ['G8', 'G9', 'G10', 'G11', 'G12']) {
      levels.set(code, await createLevel(fixture, code));
    }

    groups = new Map<string, Id<'class_group'>>();
    for (const [year, yearId] of [
      ['2028', closing.id],
      ['2029', opening.id],
    ] as const) {
      for (const [code, streams] of [
        ['G8', ['Blue', 'Gold']],
        ['G9', ['Blue', 'Gold']],
        ['G10', ['Blue']],
        ['G12', ['Blue']],
      ] as const) {
        if (code === 'G12' && year === '2029') continue;
        for (const stream of streams) {
          const group = await createClassGroup(fixture, {
            name: stream,
            academicYearId: yearId,
            levelId: (levels.get(code) as RepositoryRow<'level'>).id,
          });
          groups.set(`${year}|${code}|${stream}`, group.id);
        }
      }
    }

    learners = new Map<string, RepositoryRow<'learner'>>();
    for (const spec of LEARNERS) {
      const learner = await createLearner(fixture, { given_name: spec.name });
      learners.set(spec.name, learner);
      await fixture.repository.create('enrolment', {
        institution_id: fixture.institutionId,
        learner_id: learner.id,
        academic_year_id: closing.id,
        programme_id: fixture.programmeId,
        level_id: (levels.get(spec.level) as RepositoryRow<'level'>).id,
        class_group_id: groups.get(`2028|${spec.level}|${spec.stream}`) as Id<'class_group'>,
        status: 'active',
        start_date: '2028-01-05',
        entry_reason: 'new_admission',
      });
    }

    // A1 owes 3,500.00 of 6,000.00 billed.
    const a1 = learners.get('A1') as RepositoryRow<'learner'>;
    await fixture.repository.create('invoice', {
      institution_id: fixture.institutionId,
      number: 'INV/2028/T1/000001',
      learner_id: a1.id,
      issue_date: '2028-01-05',
      total: { amount_minor: 600000, currency: 'KES' },
      status: 'posted',
    });
    await fixture.repository.create('payment', {
      institution_id: fixture.institutionId,
      learner_id: a1.id,
      amount: { amount_minor: 250000, currency: 'KES' },
      channel: 'mobile_money',
      received_at: '2028-01-20T09:00:00Z',
      status: 'posted',
    });

    service = new PromotionService({ repository: fixture.repository, actor: userId });
    const specs = new Map([...learners.entries()].map(([name, row]) => [row.id, name] as const));
    const byName = new Map(LEARNERS.map((spec) => [spec.name, spec] as const));
    run = await service.compute({
      academicYearId: closing.id,
      nextAcademicYearId: opening.id,
      rules: RULES,
      contextFor: ({ learnerId }) => {
        const spec = byName.get(specs.get(learnerId) as string) as LearnerSpec;
        return {
          ...(spec.average === undefined ? {} : { context: { metrics: { 'annual.average': { value: spec.average } } } }),
          ...(spec.pathway === undefined
            ? {}
            : { requirements: { pathway_placement: spec.pathway } }),
        };
      },
    });
  });

  afterAll(async () => {
    await closeTestContext(fixture.context);
  });

  it('computes a suggestion for every learner of the closing year', () => {
    expect(run.rows).toHaveLength(7);
    const rowOf = (name: string) =>
      run.rows.find((row) => row.learnerId === (learners.get(name) as RepositoryRow<'learner'>).id);
    expect(rowOf('A1')?.action).toBe('promote');
    expect(rowOf('A2')?.action).toBe('repeat');
    expect(rowOf('A3')?.action).toBe('promote');
    expect(rowOf('A4')?.action).toBe('repeat');
    expect(rowOf('A5')?.action).toBe('promote');
    expect(rowOf('A6')?.action).toBe('blocked');
    expect(rowOf('A7')?.action).toBe('graduate');
  });

  it('settles the referral, approves and commits the rollover', async () => {
    const a6 = learners.get('A6') as RepositoryRow<'learner'>;
    const settled = service.override(run, a6.id, {
      action: 'repeat',
      reason: 'No pathway placement recorded; repeat Grade 9.',
      actor: 'councillor-1',
    });
    const approved = service.approve(settled, { actor: userId, roles: ['head_teacher'] });
    const committed = await service.commit(approved);
    run = committed;

    const record = committed.record as NonNullable<PromotionRun['record']>;
    expect(record.counts).toMatchObject({
      total: 7,
      promoted: 3,
      repeated: 3,
      graduated: 1,
      closed: 7,
      opened: 6,
      carried: 1,
    });
  });

  it('opens the next-year enrolments in the mapped class groups', async () => {
    const opened = (
      await fixture.repository.list('enrolment', { where: { academic_year_id: openingYearId }, limit: 100 })
    ).items;
    expect(opened).toHaveLength(6);

    const of = (name: string) => opened.find((row) => row.learner_id === (learners.get(name) as RepositoryRow<'learner'>).id);
    // The stream name is kept and the level advances.
    expect(of('A1')?.class_group_id).toBe(groups.get('2029|G9|Blue'));
    expect(of('A2')?.class_group_id).toBe(groups.get('2029|G8|Blue'));
    expect(of('A3')?.class_group_id).toBe(groups.get('2029|G9|Gold'));
    expect(of('A4')?.class_group_id).toBe(groups.get('2029|G8|Gold'));
    expect(of('A5')?.class_group_id).toBe(groups.get('2029|G10|Blue'));
    expect(of('A6')?.class_group_id).toBe(groups.get('2029|G9|Blue'));
    expect(of('A2')?.entry_reason).toBe('repeated');
    expect(of('A2')?.status).toBe('repeating');
    expect(of('A5')?.entry_reason).toBe('promoted');
  });

  it('still answers who was in Grade 8 Blue in 2028', async () => {
    const historical = (
      await fixture.repository.list('enrolment', {
        where: { academic_year_id: closingYearId, class_group_id: groups.get('2028|G8|Blue') as Id<'class_group'> },
        limit: 100,
      })
    ).items;
    expect(historical).toHaveLength(2);
    const names = historical.map((row) => [...learners.entries()].find(([, l]) => l.id === row.learner_id)?.[0]);
    expect(names.sort()).toEqual(['A1', 'A2']);
    expect(historical.every((row) => row.status === 'left' || row.status === 'completed')).toBe(true);
    expect(historical.every((row) => row.end_date === '2028-11-30')).toBe(true);
  });

  it('carries the fee balance forward and marks the graduate', async () => {
    const a1 = learners.get('A1') as RepositoryRow<'learner'>;
    const carried = (
      await fixture.repository.list('invoice', { where: { learner_id: a1.id }, limit: 50 })
    ).items.find((row) => row.number.startsWith('CARRY/'));
    expect(carried).toMatchObject({ status: 'posted', total: { amount_minor: 350000, currency: 'KES' } });
    expect(carried?.issue_date).toBe('2029-01-05');

    const a7 = await fixture.repository.get('learner', (learners.get('A7') as RepositoryRow<'learner'>).id);
    expect(a7?.status).toBe('graduated');
    const graduatedEnrolment = (
      await fixture.repository.list('enrolment', { where: { learner_id: a7?.id }, limit: 10 })
    ).items[0];
    expect(graduatedEnrolment?.exit_reason).toBe('graduated');
  });

  it('undoes the run and recommits it', async () => {
    const undone = await service.undo(run);
    run = undone;

    // The next-year class list is empty of active learners; the rows are reversed, not deleted.
    const reversed = (
      await fixture.repository.list('enrolment', { where: { academic_year_id: openingYearId }, limit: 100 })
    ).items;
    expect(reversed).toHaveLength(6);
    expect(reversed.every((row) => row.status === 'left')).toBe(true);

    const closing = (
      await fixture.repository.list('enrolment', { where: { academic_year_id: closingYearId }, limit: 100 })
    ).items;
    expect(closing).toHaveLength(7);
    expect(closing.every((row) => row.status === 'active' && row.end_date == null)).toBe(true);

    const a1 = learners.get('A1') as RepositoryRow<'learner'>;
    const carried = (
      await fixture.repository.list('invoice', { where: { learner_id: a1.id }, limit: 50 })
    ).items.find((row) => row.number.startsWith('CARRY/'));
    expect(carried?.status).toBe('void');

    // Recommit the undone run: the same next-year rows are moved back into the mapped groups.
    const approved = service.approve(run, { actor: userId, roles: ['head_teacher'] });
    const recommitted = await service.commit(approved);
    run = recommitted;
    expect(recommitted.record?.counts.opened).toBe(6);
    const reopened = (
      await fixture.repository.list('enrolment', { where: { academic_year_id: openingYearId }, limit: 100 })
    ).items;
    expect(reopened).toHaveLength(6);
    expect(reopened.every((row) => row.status === 'active' || row.status === 'repeating')).toBe(true);
  });
});
