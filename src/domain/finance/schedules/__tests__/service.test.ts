// ABOUTME: The fee-schedule service, proven against a real SQLite database: the spec 05 §2.2 example
// ABOUTME: reproduced to the shilling, the versioning and its immutability, the copy-with-uplift, the
// ABOUTME: maker-checker approval with a reasoned rejection, and publishing that keeps the old version readable.

import { afterEach, describe, expect, it } from 'vitest';

import {
  closeTestContext,
  createTestContext,
  TEST_ACTOR,
  type TestContext,
} from '@/data/__tests__/harness';
import { asId, type Id } from '@/domain/ids';
import { toDecimalString } from '@/domain/money';
import type { WorkflowActor } from '@/domain/workflows';

import { isScheduleError, type ScheduleErrorCode } from '../errors';
import { FeeScheduleService, type DerivedVersion } from '../service';
import { createWorkflowApprovalGateway, lastMakerOf } from '../approval';
import {
  SPEC_EXAMPLE_ITEMS,
  SPEC_EXAMPLE_LEVELS,
  SPEC_EXAMPLE_MATRIX,
  SPEC_EXAMPLE_RESIDENCES,
  SPEC_EXAMPLE_TOTALS,
  buildSpecExampleVersion,
  type SpecExampleIds,
  type SpecItemCode,
  type SpecLevel,
} from '../fixtures';
import type { ScheduleCellInput } from '../types';

const contexts: TestContext[] = [];
const CHECKER_ID = '01930000-0000-7000-8000-00000000cc03';

const MAKER: WorkflowActor = { id: TEST_ACTOR, roles: ['accountant'] };
const CHECKER: WorkflowActor = { id: CHECKER_ID, roles: ['accountant'] };

async function freshContext(): Promise<TestContext> {
  const context = await createTestContext();
  contexts.push(context);
  return context;
}

afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => closeTestContext(context)));
});

/** Creates the rows the spec's example prices, and returns the ids it addresses. */
async function specExampleIds(context: TestContext): Promise<SpecExampleIds> {
  const levelIds = new Map<SpecLevel, Id<'level'>>();
  for (const [index, level] of SPEC_EXAMPLE_LEVELS.entries()) {
    const row = await context.repository.create(
      'level',
      context.seed.inputFor('level', { code: `L${index + 1}`, name: level, ordinal: index + 1 })
    );
    levelIds.set(level, row.id);
  }
  const itemIds = new Map<SpecItemCode, Id<'fee_item'>>();
  const seededItemCode = String(context.seed.fixtureOf('fee_item').code);
  for (const [index, item] of SPEC_EXAMPLE_ITEMS.entries()) {
    if (item.code === seededItemCode) {
      // The school already has this vote head; the example prices the row it already has.
      itemIds.set(item.code, context.seed.idOf('fee_item'));
      continue;
    }
    const row = await context.repository.create(
      'fee_item',
      context.seed.inputFor('fee_item', {
        code: item.code,
        name: item.name,
        category: item.category,
        priority: index + 2,
      })
    );
    itemIds.set(item.code, row.id);
  }
  return {
    institutionId: context.seed.idOf('institution'),
    academicYearId: context.seed.idOf('academic_year'),
    academicPeriodId: context.seed.idOf('academic_period'),
    programmeId: context.seed.idOf('programme'),
    feeCategoryId: context.seed.idOf('fee_category'),
    campusId: context.seed.idOf('campus'),
    levelId: (level) => {
      const id = levelIds.get(level);
      if (!id) throw new Error(`no level row for ${level}`);
      return id;
    },
    feeItemId: (code) => {
      const id = itemIds.get(code);
      if (!id) throw new Error(`no fee item row for ${code}`);
      return id;
    },
  };
}

function serviceFor(context: TestContext): FeeScheduleService {
  return new FeeScheduleService({
    store: context.repository,
    approvals: createWorkflowApprovalGateway(context.repository),
  });
}

/** Runs a call and returns the schedule refusal code it raised. */
async function refusalCode(run: () => Promise<unknown>): Promise<ScheduleErrorCode> {
  try {
    await run();
  } catch (error) {
    if (isScheduleError(error)) return error.code;
    throw error;
  }
  throw new Error('the call was expected to be refused');
}

describe('the spec 05 §2.2 example', () => {
  it('reproduces every column of the spec\'s table, to the shilling', async () => {
    const context = await freshContext();
    const ids = await specExampleIds(context);
    const service = serviceFor(context);

    const version = await service.createVersion(buildSpecExampleVersion(ids), MAKER);

    for (const level of SPEC_EXAMPLE_LEVELS) {
      for (const residence of SPEC_EXAMPLE_RESIDENCES) {
        const cell = await service.resolveForBilling(version.id, { levelId: ids.levelId(level), residence });
        expect(cell.feeScheduleId).toBe(version.id);
        expect(cell.version).toBe(1);
        expect(cell.status).toBe('draft');
        expect(cell.total).toEqual(SPEC_EXAMPLE_TOTALS[`${level}/${residence}`]);
      }
    }
  });

  it('prices the rows the spec writes: tuition, boarding, the optional lunch, activity, exam and admission', async () => {
    const context = await freshContext();
    const ids = await specExampleIds(context);
    const service = serviceFor(context);
    const version = await service.createVersion(buildSpecExampleVersion(ids), MAKER);

    const grade10Boarder = await service.resolveForBilling(version.id, {
      levelId: ids.levelId('Grade 10'),
      residence: 'boarder',
    });
    const byItem = Object.fromEntries(
      grade10Boarder.lines.map((line) => [line.feeItemId, toDecimalString(line.amount)])
    );
    expect(byItem).toEqual({
      [ids.feeItemId('TUITION')]: '6000.00',
      [ids.feeItemId('BOARDING_MEALS')]: '18500.00',
      [ids.feeItemId('ACTIVITY')]: '1000.00',
      [ids.feeItemId('ADMISSION')]: '2000.00',
    });
    // The optional lunch is not in a boarder's cell, and the exam is not in a Grade 10 cell.
    expect(grade10Boarder.lines.map((line) => line.feeItemId)).not.toContain(ids.feeItemId('LUNCH'));
    expect(grade10Boarder.lines.map((line) => line.feeItemId)).not.toContain(ids.feeItemId('EXAM'));

    // The spec's "0 / 5,000" is the two forms priced apart: Form 3 pays nothing, Form 4 pays 5,000.
    const form3 = await service.resolveForBilling(version.id, {
      levelId: ids.levelId('Form 3'),
      residence: 'day',
    });
    const form4 = await service.resolveForBilling(version.id, {
      levelId: ids.levelId('Form 4'),
      residence: 'day',
    });
    const examOf = (cell: typeof form3) =>
      cell.lines.find((line) => line.feeItemId === ids.feeItemId('EXAM'))?.amount;
    expect(toDecimalString(examOf(form3) as never)).toBe('0.00');
    expect(toDecimalString(examOf(form4) as never)).toBe('5000.00');
  });

  it('refuses a level or residence the schedule does not price', async () => {
    const context = await freshContext();
    const ids = await specExampleIds(context);
    const service = serviceFor(context);
    const version = await service.createVersion(buildSpecExampleVersion(ids), MAKER);

    expect(
      await refusalCode(() =>
        service.resolveForBilling(version.id, {
          levelId: asId<'level'>('00000000-0000-7000-8000-0000000000ff'),
          residence: 'day',
        })
      )
    ).toBe('cell_dimension_unknown');
    expect(
      await refusalCode(() =>
        service.resolveForBilling(version.id, { levelId: ids.levelId('Form 3'), residence: 'weekly_boarder' })
      )
    ).toBe('cell_dimension_unknown');
  });
});

describe('versioning', () => {
  it('writes a draft, edits it, and freezes it once it is approved', async () => {
    const context = await freshContext();
    const ids = await specExampleIds(context);
    const service = serviceFor(context);
    const version = await service.createVersion(buildSpecExampleVersion(ids), MAKER);

    const cells = (await service.getVersion(version.id)).lines;
    expect(cells.length).toBeGreaterThan(0);

    // A draft may be re-priced.
    const edited: readonly ScheduleCellInput[] = [
      {
        levelId: ids.levelId('Grade 10'),
        residence: 'day',
        lines: [
          {
            feeItemId: ids.feeItemId('TUITION'),
            amount: { amount_minor: 610_000, currency: 'KES' },
            mandatory: true,
            frequency: 'per_term',
            prorationRule: 'full',
          },
        ],
      },
    ];
    await service.setCells(version.id, edited, MAKER);
    const repriced = await service.resolveForBilling(version.id, {
      levelId: ids.levelId('Grade 10'),
      residence: 'day',
    });
    expect(toDecimalString(repriced.total)).toBe('6100.00');

    await service.submit(version.id, MAKER);
    await service.approve(version.id, CHECKER);
    expect(await service.stateOf(version.id)).toBe('approved');

    // An approved version is frozen: a correction is a new version, not an edit.
    expect(await refusalCode(() => service.setCells(version.id, edited, MAKER))).toBe('version_immutable');
  });

  it('derives a new version with an uplift and leaves the source untouched', async () => {
    const context = await freshContext();
    const ids = await specExampleIds(context);
    const service = serviceFor(context);
    const v1 = await service.createVersion(buildSpecExampleVersion(ids), MAKER);

    const derived: DerivedVersion = await service.copyWithUplift(v1.id, {
      version: 2,
      uplift: { percent: 7.5, fixed: { [ids.feeItemId('ACTIVITY')]: { amount_minor: 5_000, currency: 'KES' } } },
      actor: MAKER,
    });
    expect(derived.from).toBe(v1.id);
    expect(derived.fromVersion).toBe(1);
    expect(derived.schedule.version).toBe(2);

    const v1Tuition = await service.resolveForBilling(v1.id, {
      levelId: ids.levelId('Grade 10'),
      residence: 'day',
    });
    const v2Tuition = await service.resolveForBilling(derived.schedule.id, {
      levelId: ids.levelId('Grade 10'),
      residence: 'day',
    });
    // Grade 10 day: 6,000 tuition × 1.075 = 6,450; 4,200 lunch × 1.075 = 4,515; activity 1,000×1.075+50 = 1,125; admission 2,000×1.075 = 2,150 → 14,240.
    expect(toDecimalString(v1Tuition.total)).toBe('13200.00');
    expect(toDecimalString(v2Tuition.total)).toBe('14240.00');
    // The source is untouched: its tuition is still 6,000, while the copy's is 6,450.
    const tuitionOf = (cell: typeof v1Tuition) =>
      cell.lines.find((line) => line.feeItemId === ids.feeItemId('TUITION'))?.amount;
    expect(toDecimalString(tuitionOf(v1Tuition) as never)).toBe('6000.00');
    expect(toDecimalString(tuitionOf(v2Tuition) as never)).toBe('6450.00');
  });
});

describe('maker-checker approval', () => {
  it('refuses an approval by the person who submitted it', async () => {
    const context = await freshContext();
    const ids = await specExampleIds(context);
    const service = serviceFor(context);
    const version = await service.createVersion(buildSpecExampleVersion(ids), MAKER);

    await service.submit(version.id, MAKER);
    expect(await service.stateOf(version.id)).toBe('submitted');

    expect(await refusalCode(() => service.approve(version.id, MAKER))).toBe('maker_cannot_approve');
    expect(await service.stateOf(version.id)).toBe('submitted');

    await service.approve(version.id, CHECKER);
    expect(await service.stateOf(version.id)).toBe('approved');
  });

  it('does not offer the maker the approval move', async () => {
    const context = await freshContext();
    const ids = await specExampleIds(context);
    const service = serviceFor(context);
    const version = await service.createVersion(buildSpecExampleVersion(ids), MAKER);
    await service.submit(version.id, MAKER);

    const forMaker = await service.availableMoves(version.id, MAKER);
    expect(forMaker.map((move) => move.transition.key)).not.toContain('approve');
    const forChecker = await service.availableMoves(version.id, CHECKER);
    expect(forChecker.map((move) => move.transition.key)).toContain('approve');
  });

  it('requires a reason to send a version back, and records it on the engine\'s audit', async () => {
    const context = await freshContext();
    const ids = await specExampleIds(context);
    const service = serviceFor(context);
    const version = await service.createVersion(buildSpecExampleVersion(ids), MAKER);
    await service.submit(version.id, MAKER);

    expect(await refusalCode(() => service.reject(version.id, CHECKER, '   '))).toBe('approval_denied');
    expect(await service.stateOf(version.id)).toBe('submitted');

    await service.reject(version.id, CHECKER, 'The boarding figure needs the bursar’s sign-off.');
    expect(await service.stateOf(version.id)).toBe('draft');

    const history = await service.history(version.id);
    const rejections = history.filter((entry) => entry.transition === 'reject');
    expect(rejections).toHaveLength(1);
    expect(rejections[0].reason).toBe('The boarding figure needs the bursar’s sign-off.');
    expect(rejections[0].actor_id).toBe(CHECKER_ID);

    // The maker-checker rule keys off the newest submission.
    expect(lastMakerOf(history)).toBe(TEST_ACTOR);
  });

  it('traces the whole life of a version through the engine\'s audit', async () => {
    const context = await freshContext();
    const ids = await specExampleIds(context);
    const service = serviceFor(context);
    const version = await service.createVersion(buildSpecExampleVersion(ids), MAKER);

    await service.submit(version.id, MAKER);
    await service.reject(version.id, CHECKER, 'Send it back for a correction.');
    await service.submit(version.id, MAKER);
    await service.approve(version.id, CHECKER);

    const history = await service.history(version.id);
    expect(history.map((entry) => `${entry.from}->${entry.to}`)).toEqual([
      'draft->submitted',
      'submitted->draft',
      'draft->submitted',
      'submitted->approved',
    ]);
    expect(history.map((entry) => entry.transition)).toEqual(['submit', 'reject', 'submit', 'approve']);
    expect(history.map((entry) => entry.actor_id)).toEqual([TEST_ACTOR, CHECKER_ID, TEST_ACTOR, CHECKER_ID]);
  });
});

describe('publishing', () => {
  it('makes the approved version the one in force and keeps the previous one readable', async () => {
    const context = await freshContext();
    const ids = await specExampleIds(context);
    const service = serviceFor(context);
    const v1 = await service.createVersion(buildSpecExampleVersion(ids), MAKER);
    await service.submit(v1.id, MAKER);
    await service.approve(v1.id, CHECKER);
    await service.publish(v1.id, MAKER);
    expect(await service.stateOf(v1.id)).toBe('published');

    const before = await service.resolveForBilling(v1.id, {
      levelId: ids.levelId('Form 4'),
      residence: 'boarder',
    });
    expect(toDecimalString(before.total)).toBe('28500.00');

    // Derive, approve and publish a second version.
    const derived = await service.copyWithUplift(v1.id, { version: 2, uplift: { percent: 10 }, actor: MAKER });
    await service.submit(derived.schedule.id, MAKER);
    await service.approve(derived.schedule.id, CHECKER);
    await service.publish(derived.schedule.id, MAKER);

    // Exactly one version is in force: v2, with the uplifted prices.
    const inForce = await service.versionInForce(ids.institutionId, derived.schedule.name);
    expect(inForce?.id).toBe(derived.schedule.id);
    expect(await service.stateOf(v1.id)).toBe('archived');

    // The previous version is still readable, and still resolves to the amounts it was billed from.
    const after = await service.resolveForBilling(v1.id, {
      levelId: ids.levelId('Form 4'),
      residence: 'boarder',
    });
    expect(toDecimalString(after.total)).toBe('28500.00');
    expect(after.status).toBe('archived');

    // The uplifted version prices 10% more.
    const v2 = await service.resolveForBilling(derived.schedule.id, {
      levelId: ids.levelId('Form 4'),
      residence: 'boarder',
    });
    expect(toDecimalString(v2.total)).toBe('31350.00');
  });
});

describe('the spec example is data, not a claim', () => {
  it('prices six cells across three levels and two residences', () => {
    expect(SPEC_EXAMPLE_MATRIX).toHaveLength(6);
    expect(new Set(SPEC_EXAMPLE_MATRIX.map((cell) => cell.level))).toEqual(new Set(SPEC_EXAMPLE_LEVELS));
    expect(new Set(SPEC_EXAMPLE_MATRIX.map((cell) => cell.residence))).toEqual(new Set(SPEC_EXAMPLE_RESIDENCES));
  });
});
